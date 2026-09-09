(function() {
  window.RailwayETA = window.RailwayETA || {};

  async function loadLiveTrain(trainNumber) {
    const data = await window.TrainAPI.getLiveTrain(trainNumber);

    const route = (data.route || []).map((station) => ({
      code: station.stationCode,
      name: station.stationName,
      distanceKm: station.distance || 0,
      day: station.day || 1,
      schArr: station.scheduledArrival ? station.scheduledArrival.slice(11, 16) : null,
      schDep: station.scheduledDeparture ? station.scheduledDeparture.slice(11, 16) : null,
      platform: station.platform || null,
      slackMins: 0,
      historicalAvgDelayMins: 0,
      bottleneckRisk: "Unknown"
    }));

    const currentIndex = route.findIndex(
      station => station.code === data.current_station_code
    );

    return {
      id: data.train_number,
      number: data.train_number,
      name: data.train_name,
      type: "Live Train",
      origin: route.length ? route[0].code : "",
      originName: route.length ? route[0].name : "",
      destination: route.length ? route[route.length - 1].code : "",
      destinationName: route.length ? route[route.length - 1].name : "",
      totalDistanceKm: route.length
        ? route[route.length - 1].distanceKm
        : 0,
      avgSpeedKmh: 0,
      maxPermissibleSpeedKmh: 0,
      departsDay: "Live",
      scheduledDepartureTime: route.length ? route[0].schDep : null,
      scheduledArrivalTime: route.length
        ? route[route.length - 1].schArr
        : null,
      daysOfJourney: 1,
      routeDescription: "Live RailRadar route",
      currentStatusDefaults: {
        currentStationIndex: currentIndex >= 0 ? currentIndex : 0,
        distanceTraveledKm: 0,
        currentSpeedKmh: 0,
        baseDelayMins: data.current_delay || 0
      },
      stations: route
    };
  }

  window.RailwayETA.loadLiveTrain = loadLiveTrain;
})();
