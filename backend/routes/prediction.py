from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta

from services.railradar import get_live_train_data
from services.ml_service import predict_section_time
from schemas import TrainETAResponse

router = APIRouter()


def parse_datetime(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def format_time(value):
    if not value:
        return None

    return value.strftime("%H:%M")


def find_station(route, station_code):
    return next(
        (
            station
            for station in route
            if station.get("stationCode") == station_code
        ),
        None
    )


def calculate_confidence(prediction_interval):
    """
    Prototype confidence score derived from the model's
    prediction interval.

    This is NOT a calibrated probability.
    """
    confidence = 100.0 - (
        float(prediction_interval) * 2.0
    )

    return round(
        max(1.0, min(99.0, confidence)),
        1
    )


@router.get(
    "/train/{train_number}/eta/{station_code}",
    response_model=TrainETAResponse
)
def get_train_eta(
    train_number: str,
    station_code: str
):
    # ---------------------------------------------------------
    # 1. Get live train data
    # ---------------------------------------------------------

    train_data = get_live_train_data(train_number)

    route = train_data.get("route", [])

    if not route:
        raise HTTPException(
            status_code=404,
            detail="No route data available for this train"
        )

    # ---------------------------------------------------------
    # 2. Find current and target stations
    # ---------------------------------------------------------

    current_station = find_station(
        route,
        train_data.get("current_station_code")
    )

    target_station = find_station(
        route,
        station_code.upper()
    )

    if target_station is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Station {station_code.upper()} "
                "was not found on this train's route"
            )
        )

    if current_station is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Current station was not found "
                "in the train route"
            )
        )

    # ---------------------------------------------------------
    # 3. Make sure target station is ahead
    # ---------------------------------------------------------

    current_sequence = current_station.get(
        "sequence",
        0
    )

    target_sequence = target_station.get(
        "sequence",
        0
    )

    if target_sequence <= current_sequence:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Station {station_code.upper()} "
                "has already been passed by the train"
            )
        )

    # ---------------------------------------------------------
    # 4. Check scheduled arrival
    # ---------------------------------------------------------

    scheduled_arrival = parse_datetime(
        target_station.get("scheduledArrival")
    )

    if scheduled_arrival is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No scheduled arrival time available "
                f"for {station_code.upper()}"
            )
        )

    # ---------------------------------------------------------
    # 5. Run the new ML model
    # ---------------------------------------------------------

    try:
        ml_result = predict_section_time(
            train_data
        )

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"ML prediction failed: {str(error)}"
        )

    predicted_section_time = float(
        ml_result["predicted_section_time_min"]
    )

    prediction_interval = float(
        ml_result["prediction_interval_min"]
    )

    current_delay = float(
        train_data.get("current_delay") or 0
    )

    # ---------------------------------------------------------
    # 6. Calculate ETA
    # ---------------------------------------------------------
    #
    # For the immediate next station:
    #
    # Scheduled departure from current station
    # + current live delay
    # + ML predicted section travel time
    #
    # This is the important part of the new model integration.
    # ---------------------------------------------------------

    is_next_station = (
        target_station.get("stationCode")
        == train_data.get("next_station_code")
    )

    if is_next_station:

        scheduled_departure = parse_datetime(
            current_station.get("scheduledDeparture")
        )

        if scheduled_departure is not None:

            predicted_arrival = (
                scheduled_departure
                + timedelta(minutes=current_delay)
                + timedelta(
                    minutes=predicted_section_time
                )
            )

        else:

            # Fallback when the current station does not
            # provide a scheduled departure time.
            predicted_arrival = (
                scheduled_arrival
                + timedelta(minutes=current_delay)
            )

    else:

        # -----------------------------------------------------
        # For a downstream station, use the station's
        # scheduled arrival plus the current live delay.
        #
        # Later we can make this fully recursive by predicting
        # every section between the current and target station.
        # -----------------------------------------------------

        predicted_arrival = (
            scheduled_arrival
            + timedelta(minutes=current_delay)
        )

    # ---------------------------------------------------------
    # 7. Calculate final displayed delay
    # ---------------------------------------------------------

    final_delay = (
        predicted_arrival - scheduled_arrival
    ).total_seconds() / 60.0

    # ---------------------------------------------------------
    # 8. Build response
    # ---------------------------------------------------------

    confidence = calculate_confidence(
        prediction_interval
    )

    return {
        "train_number": train_number,

        "current": {
            "train_number": train_data["train_number"],
            "current_location": train_data["current_location"],
            "current_delay": int(
                round(current_delay)
            )
        },

        "stations": [
            {
                "name": target_station["stationName"],

                "scheduled_eta": format_time(
                    scheduled_arrival
                ),

                "predicted_eta": format_time(
                    predicted_arrival
                ),

                "delay": round(
                    float(final_delay),
                    1
                ),

                "confidence": confidence
            }
        ]
    }