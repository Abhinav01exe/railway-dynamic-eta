from pydantic import BaseModel
from typing import List


class TrainStatus(BaseModel):
    train_number: str
    current_location: str
    current_delay: int


class StationETA(BaseModel):
    name: str
    scheduled_eta: str
    predicted_eta: str
    delay: float
    confidence: float


class TrainETAResponse(BaseModel):
    train_number: str
    current: TrainStatus
    stations: List[StationETA]