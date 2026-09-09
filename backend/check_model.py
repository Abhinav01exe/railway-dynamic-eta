import joblib
import json
import numpy as np

folder = "/Users/abhinavsingh/Downloads/SIH ML model/eta_prediction_system"

model = joblib.load(folder + "/eta_model.joblib")
ohe = joblib.load(folder + "/ohe_encoder.joblib")

with open(folder + "/feature_names.json") as f:
    meta = json.load(f)

sample = {
    "zone": "NR",
    "train_type": "Mail/Express",
    "weather": "Clear",

    "leg_index": 5,
    "journey_progress": 0.30,
    "distance_to_next_km": 64.0,
    "scheduled_leg_time_min": 52.0,
    "current_delay_min": 12.0,
    "hour_of_day": 14,
    "is_weekend": 0,
    "congestion_level": 0.40,
    "tsr_count": 1,
    "tsr_severity_min": 5.0,
    "preceding_train_delay_min": 8.0,
    "unscheduled_stop_flag": 0,
    "level_crossing_wait_min": 0.0,
    "historical_avg_delay_route_min": 15.0,
}

numeric = np.array(
    [[sample[x] for x in meta["numeric"]]]
)

categorical = ohe.transform(
    [[sample[x] for x in meta["categorical"]]]
)

X = np.hstack([numeric, categorical])

prediction = model.predict(X)[0]

print()
print("===== MODEL OUTPUT =====")
print("Predicted additional delay:", round(prediction, 2), "minutes")
print("========================")