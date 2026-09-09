import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAILRADAR_API_KEY = os.getenv("RAILRADAR_API_KEY")


def get_live_train_data(train_number: str):

    url = f"https://api.railradar.in/v1/trains/{train_number}/live"

    headers = {
        "Authorization": f"Bearer {RAILRADAR_API_KEY}"
    }

    response = requests.get(url, headers=headers)
    response.raise_for_status()

    data = response.json()["data"]

    current = data["currentLocation"]

    # nextHalt may not be available for every train
    next_halt = data.get("nextHalt")

    scheduled_eta = None
    next_station = None
    next_station_code = None

    if next_halt:
        next_station = next_halt.get("stationName")
        next_station_code = next_halt.get("stationCode")

        # Find next halt inside the route
        for station in data["route"]:
            if station["stationCode"] == next_station_code:
                scheduled_eta = station.get("scheduledArrival")
                break

    return {
        "train_number": data["trainNumber"],
        "train_name": data["trainName"],

        "current_location": current["stationName"],
        "current_station_code": current["stationCode"],

        "current_delay": data["delayMinutes"],

        "next_station": next_station,
        "next_station_code": next_station_code,

        "scheduled_eta": scheduled_eta,

        "route": data["route"]
    }


def get_upcoming_stations(route, current_sequence):
    """
    Return all stations that are ahead of the train
    according to their route sequence number.
    """

    upcoming = []

    for station in route:
        if station["sequence"] > current_sequence:
            upcoming.append(station)

    return upcoming