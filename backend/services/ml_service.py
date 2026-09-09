import joblib
import pandas as pd
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "ml_model" / "railway_eta_model_new.joblib"

MODEL_PACKAGE = joblib.load(MODEL_PATH)
MODEL = MODEL_PACKAGE["model"]

PREDICTION_INTERVAL = float(
    MODEL_PACKAGE.get("prediction_interval_minutes", 9.17)
)


def _parse_time(value):
    if not value:
        return None

    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _section_time_from_schedule(current_station, next_station):
    current_departure = _parse_time(
        current_station.get("scheduledDeparture")
    )

    next_arrival = _parse_time(
        next_station.get("scheduledArrival")
    )

    if not current_departure or not next_arrival:
        return 30.0

    minutes = (
        next_arrival - current_departure
    ).total_seconds() / 60.0

    if minutes <= 0:
        return 30.0

    return float(minutes)


def _train_type(train_data):
    name = (train_data.get("train_name") or "").lower()

    if "passenger" in name or "pass" in name:
        return "Passenger"

    if "superfast" in name or "sf" in name:
        return "Superfast"

    return "Express"


def _peak_hour(hour):
    return 1 if hour in [7, 8, 9, 17, 18, 19, 20] else 0


def _get_section_stations(train_data):
    route = train_data.get("route", [])

    current_code = train_data.get("current_station_code")
    next_code = train_data.get("next_station_code")

    current_station = next(
        (
            station
            for station in route
            if station.get("stationCode") == current_code
        ),
        None
    )

    next_station = next(
        (
            station
            for station in route
            if station.get("stationCode") == next_code
        ),
        None
    )

    return current_station, next_station


def predict_section_time(train_data):
    """
    Predict travel time from the current station to the next station.
    The trained model target is actual_section_time_min.
    """

    current_station, next_station = _get_section_stations(train_data)

    if not current_station or not next_station:
        raise ValueError(
            "Could not find current and next stations in RailRadar route"
        )

    current_code = current_station["stationCode"]
    next_code = next_station["stationCode"]

    current_distance = float(
        current_station.get("distance") or 0
    )

    next_distance = float(
        next_station.get("distance") or current_distance
    )

    section_distance = max(
        0.1,
        next_distance - current_distance
    )

    current_speed = float(
        current_station.get("speedToNextStationKmph") or 60.0
    )

    if current_speed <= 0:
        current_speed = 60.0

    current_delay = float(
        train_data.get("current_delay") or 0
    )

    historical_avg_section_time = _section_time_from_schedule(
        current_station,
        next_station
    )

    now = datetime.now(ZoneInfo("Asia/Kolkata"))

    hour = now.hour
    day_of_week = now.weekday()

    # Prototype defaults.
    # These will later be connected to live operational/weather APIs.
    congestion_index = 0.30
    speed_restriction = 0.0
    preceding_train_delay = 0.0
    rain_intensity = 0.0
    visibility_km = 10.0

    features = {
        "train_type": _train_type(train_data),
        "from_station": current_code,
        "to_station": next_code,

        "section_distance_km": section_distance,
        "current_speed_kmph": current_speed,
        "current_delay_min": current_delay,
        "historical_avg_section_time_min": historical_avg_section_time,
        "congestion_index": congestion_index,
        "speed_restriction": speed_restriction,
        "preceding_train_delay_min": preceding_train_delay,
        "rain_intensity": rain_intensity,
        "visibility_km": visibility_km,

        "hour": hour,
        "day_of_week": day_of_week,
        "peak_hour": _peak_hour(hour),

        "observation_year": now.year,
        "observation_month": now.month,
        "observation_day": now.day,
        "observation_hour": now.hour,
        "observation_minute": now.minute,
        "observation_dayofweek": day_of_week,
    }

    df = pd.DataFrame([features])

    prediction = float(
        MODEL.predict(df)[0]
    )

    prediction = max(1.0, prediction)

    return {
        "predicted_section_time_min": round(prediction, 1),
        "prediction_interval_min": round(
            PREDICTION_INTERVAL,
            1
        ),
        "from_station": current_code,
        "to_station": next_code,
        "section_distance_km": round(
            section_distance,
            1
        ),
        "current_speed_kmph": round(
            current_speed,
            1
        ),
        "features": features,
        "model_version": MODEL_PACKAGE.get(
            "version",
            "unknown"
        ),
    }


def predict_additional_delay(train_data):
    """
    Temporary compatibility wrapper.

    The new model predicts section travel time, not additional delay.
    """

    result = predict_section_time(train_data)

    return result["predicted_section_time_min"]
