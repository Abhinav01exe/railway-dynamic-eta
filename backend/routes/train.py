from fastapi import APIRouter
from services.railradar import get_live_train_data

router = APIRouter()


@router.get("/train/{train_number}")
def get_train(train_number: str):

    train_data = get_live_train_data(train_number)

    return train_data