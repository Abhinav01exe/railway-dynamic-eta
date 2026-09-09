from datetime import datetime, timedelta


def calculate_eta(
    scheduled_eta: str,
    current_delay: int,
    additional_delay: int
):
    # Convert RailRadar timestamp into a datetime
    scheduled_time = datetime.fromisoformat(
        scheduled_eta
    )

    # Add current delay + predicted additional delay
    total_delay = current_delay + additional_delay

    predicted_time = scheduled_time + timedelta(
        minutes=total_delay
    )

    return {
        "scheduled_eta": scheduled_time.strftime("%H:%M"),
        "predicted_eta": predicted_time.strftime("%H:%M"),
        "delay": total_delay
    }