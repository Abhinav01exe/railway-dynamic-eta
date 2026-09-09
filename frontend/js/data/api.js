const API_BASE_URL = "http://127.0.0.1:8000";

async function getLiveTrain(trainNumber) {
    const response = await fetch(
        `${API_BASE_URL}/train/${trainNumber}`
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch train ${trainNumber}`);
    }

    return await response.json();
}

async function getTrainETA(trainNumber, stationCode) {
    const response = await fetch(
        `${API_BASE_URL}/train/${trainNumber}/eta/${stationCode}`
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
            error.detail || `Failed to fetch ETA for ${trainNumber}`
        );
    }

    return await response.json();
}

window.TrainAPI = {
    getLiveTrain,
    getTrainETA
};