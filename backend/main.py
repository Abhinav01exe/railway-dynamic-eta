from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.train import router as train_router
from routes.prediction import router as prediction_router


app = FastAPI(
    title="Dynamic Train ETA API",
    description="Backend for the SIH Dynamic Train ETA project",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(train_router)
app.include_router(prediction_router)


@app.get("/")
def root():
    return {
        "message": "Dynamic Train ETA Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }