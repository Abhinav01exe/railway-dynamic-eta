/**
 * Dynamic Railway ETA Calculation Engine
 * Integrates physics-based travel calculation, signal headway modeling,
 * weather degradation, corridor congestion, speed restrictions,
 * and scheduled slack recovery buffers.
 */

(function() {
  window.RailwayETA = window.RailwayETA || {};

  function timeToMinutes(timeStr, day = 1) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return (day - 1) * 1440 + hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    if (totalMinutes === null || isNaN(totalMinutes)) return { time: "--:--", day: 1, display: "--:--" };
    const normalizedMinutes = Math.round(totalMinutes);
    const day = Math.floor(normalizedMinutes / 1440) + 1;
    const minuteOfDay = ((normalizedMinutes % 1440) + 1440) % 1440;
    const hours = Math.floor(minuteOfDay / 60);
    const mins = minuteOfDay % 60;
    const formattedTime = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    return {
      time: formattedTime,
      day: day,
      display: day > 1 ? `${formattedTime} (+${day - 1}d)` : formattedTime
    };
  }

  function formatDelay(delayMins) {
    const rounded = Math.round(delayMins);
    if (rounded === 0) return { text: "On Time", class: "on-time", minutes: 0 };
    if (rounded > 0) return { text: `+${rounded}m Late`, class: "delayed", minutes: rounded };
    return { text: `${Math.abs(rounded)}m Early`, class: "early", minutes: rounded };
  }

  function getSignalAspect(precedingTrainGap, signalDelay) {
    if (signalDelay > 20 || precedingTrainGap === "blocking") {
      return { aspect: "RED", label: "Danger (Stop)", color: "#EF4444", safeSpeed: 0 };
    }
    if (precedingTrainGap === "close" || signalDelay > 5) {
      return { aspect: "YELLOW", label: "Caution (Prepare to Stop)", color: "#F59E0B", safeSpeed: 40 };
    }
    if (precedingTrainGap === "moderate") {
      return { aspect: "DOUBLE_YELLOW", label: "Attention (Prepare to Pass Next at Speed)", color: "#EAB308", safeSpeed: 80 };
    }
    return { aspect: "GREEN", label: "Clear (Proceed at MPS)", color: "#10B981", safeSpeed: 130 };
  }

  function calculateDynamicETAs(train, currentStationIndex, liveInputs) {
    const {
      currentDelay = 20,
      weather = "clear",
      signalDelay = 5,
      congestionPercent = 90,
      speedRestriction = "none",
      precedingTrainGap = "clear",
      historicalBias = "average"
    } = liveInputs;

    let weatherSpeedMultiplier = 1.0;
    let weatherMinsPer100Km = 0;
    let weatherRiskRating = 0;

    if (weather === "rain") {
      weatherSpeedMultiplier = 0.90;
      weatherMinsPer100Km = 1.5;
      weatherRiskRating = 15;
    } else if (weather === "fog") {
      weatherSpeedMultiplier = 0.58;
      weatherMinsPer100Km = 8.0;
      weatherRiskRating = 45;
    } else if (weather === "storm") {
      weatherSpeedMultiplier = 0.70;
      weatherMinsPer100Km = 5.0;
      weatherRiskRating = 35;
    }

    let tsrTotalDelayMins = 0;
    if (speedRestriction === "tsr30") tsrTotalDelayMins = 12;
    else if (speedRestriction === "tsr50") tsrTotalDelayMins = 7;
    else if (speedRestriction === "multiple") tsrTotalDelayMins = 24;

    let precedingDelayMins = 0;
    if (precedingTrainGap === "moderate") precedingDelayMins = 6;
    else if (precedingTrainGap === "close") precedingDelayMins = 20;
    else if (precedingTrainGap === "blocking") precedingDelayMins = 45;

    const congestionExcess = Math.max(0, congestionPercent - 100);
    const congestionMultiplier = 1 + (congestionExcess / 100) * 0.35;

    let biasRecoveryBoost = 1.0;
    let biasDelayWeight = 1.0;
    if (historicalBias === "optimistic") {
      biasRecoveryBoost = 1.4;
      biasDelayWeight = 0.75;
    } else if (historicalBias === "pessimistic") {
      biasRecoveryBoost = 0.6;
      biasDelayWeight = 1.35;
    }

    const currentStation = train.stations[currentStationIndex] || train.stations[0];
    const remainingDistanceKm = Math.max(0, train.totalDistanceKm - currentStation.distanceKm);
    const futureStationsCount = Math.max(1, train.stations.length - currentStationIndex - 1);

    let runningDelay = currentDelay + (signalDelay * 0.6);
    let totalSlackRecovered = 0;
    let totalWeatherAdded = 0;
    let totalCongestionAdded = 0;
    let totalTsrAdded = 0;
    let totalPrecedingAdded = 0;

    const stationResults = train.stations.map((stn, idx) => {
      const isCompleted = idx < currentStationIndex;
      const isCurrent = idx === currentStationIndex;
      const isFuture = idx > currentStationIndex;

      const schArrMins = timeToMinutes(stn.schArr, stn.day);
      const schDepMins = timeToMinutes(stn.schDep, stn.day);

      if (isCompleted) {
        const pastDelayRatio = idx / Math.max(1, currentStationIndex);
        const pastDelay = Math.round(currentDelay * pastDelayRatio);
        const actArrMins = schArrMins !== null ? schArrMins + pastDelay : null;
        const actDepMins = schDepMins !== null ? schDepMins + pastDelay : null;

        const actArrDisp = minutesToTime(actArrMins).display;
        return {
          ...stn,
          status: "passed",
          isCompleted: true,
          isCurrent: false,
          isFuture: false,
          arrivalDelayMins: pastDelay,
          departureDelayMins: pastDelay,
          predArrTime: actArrDisp,
          predDepTime: minutesToTime(actDepMins).display,
          p10ArrTime: actArrDisp,
          p90ArrTime: actArrDisp,
          predictedSlot: actArrDisp || "Departed (Source)",
          delayStatus: formatDelay(pastDelay)
        };
      }

      if (isCurrent) {
        const currArrDelay = Math.round(currentDelay);
        const currDepDelay = Math.round(currentDelay + signalDelay);
        const actArrMins = schArrMins !== null ? schArrMins + currArrDelay : null;
        const actDepMins = schDepMins !== null ? schDepMins + currDepDelay : null;
        const currArrDisp = minutesToTime(actArrMins).display;

        return {
          ...stn,
          status: "current",
          isCompleted: false,
          isCurrent: true,
          isFuture: false,
          arrivalDelayMins: currArrDelay,
          departureDelayMins: currDepDelay,
          predArrTime: currArrDisp,
          predDepTime: minutesToTime(actDepMins).display,
          p10ArrTime: currArrDisp,
          p90ArrTime: currArrDisp,
          predictedSlot: currArrDisp ? `${currArrDisp} (Current Station)` : "Current Station",
          delayStatus: formatDelay(currDepDelay)
        };
      }

      const prevStn = train.stations[idx - 1];
      const sectionDistanceKm = Math.max(1, stn.distanceKm - prevStn.distanceKm);

      const legWeatherDelay = (sectionDistanceKm / 100) * weatherMinsPer100Km;
      totalWeatherAdded += legWeatherDelay;

      const legTsrDelay = tsrTotalDelayMins / futureStationsCount;
      totalTsrAdded += legTsrDelay;

      const legPrecedingDelay = (precedingDelayMins / futureStationsCount) * (stn.bottleneckRisk === "Severe" ? 1.5 : 1.0);
      totalPrecedingAdded += legPrecedingDelay;

      let riskFactor = 1.0;
      if (stn.bottleneckRisk === "Medium") riskFactor = 1.25;
      if (stn.bottleneckRisk === "High") riskFactor = 1.6;
      if (stn.bottleneckRisk === "Severe") riskFactor = 2.1;

      const legCongestionDelay = (sectionDistanceKm / 100) * (congestionExcess / 20) * riskFactor * biasDelayWeight;
      totalCongestionAdded += legCongestionDelay;

      let potentialSlackRecovery = (stn.slackMins || 5) * biasRecoveryBoost;
      if (weather === "fog" || weather === "storm" || precedingTrainGap === "blocking") {
        potentialSlackRecovery = potentialSlackRecovery * 0.15;
      } else if (congestionPercent > 130) {
        potentialSlackRecovery = potentialSlackRecovery * 0.4;
      }

      const actualSlackRecovery = Math.min(runningDelay, potentialSlackRecovery);
      totalSlackRecovered += actualSlackRecovery;

      runningDelay = runningDelay + legWeatherDelay + legTsrDelay + legPrecedingDelay + legCongestionDelay - actualSlackRecovery;
      runningDelay = Math.max(0, runningDelay);

      const projectedArrMins = schArrMins !== null ? schArrMins + runningDelay : null;
      const projectedDepMins = schDepMins !== null ? schDepMins + runningDelay : null;

      const uncertaintyMinutes = Math.sqrt(sectionDistanceKm) * (1 + weatherRiskRating / 30);
      const p10Mins = projectedArrMins !== null ? projectedArrMins - (uncertaintyMinutes * 0.7) : null;
      const p90Mins = projectedArrMins !== null ? projectedArrMins + (uncertaintyMinutes * 1.3) : null;

      const p10Obj = minutesToTime(p10Mins);
      const p90Obj = minutesToTime(p90Mins);
      let stnSlot = `${p10Obj.display} – ${p90Obj.display}`;
      if (p10Obj.day === p90Obj.day) {
        const dayTag = p10Obj.day > 1 ? ` (+${p10Obj.day - 1}d)` : "";
        stnSlot = `${p10Obj.time} – ${p90Obj.time}${dayTag}`;
      }

      return {
        ...stn,
        status: "upcoming",
        isCompleted: false,
        isCurrent: false,
        isFuture: true,
        arrivalDelayMins: Math.round(runningDelay),
        departureDelayMins: Math.round(runningDelay),
        predArrTime: minutesToTime(projectedArrMins).display,
        predDepTime: minutesToTime(projectedDepMins).display,
        p10ArrTime: p10Obj.display,
        p90ArrTime: p90Obj.display,
        predictedSlot: stnSlot,
        delayStatus: formatDelay(runningDelay)
      };
    });

    const destStation = stationResults[stationResults.length - 1];
    const finalDelay = destStation.arrivalDelayMins;
    const schDestMins = timeToMinutes(destStation.schArr, destStation.day);
    const p50DestMins = schDestMins + finalDelay;

    const windowSpreadMins = Math.max(10, Math.round(10 + (remainingDistanceKm / 120) * (1 + weatherRiskRating / 40)));
    const p10DestMins = Math.max(schDestMins, p50DestMins - Math.round(windowSpreadMins * 0.4));
    const p90DestMins = p50DestMins + Math.round(windowSpreadMins * 0.8);

    const destP10Obj = minutesToTime(p10DestMins);
    const destP50Obj = minutesToTime(p50DestMins);
    const destP90Obj = minutesToTime(p90DestMins);

    let destSlot = `${destP10Obj.display} – ${destP90Obj.display}`;
    if (destP10Obj.day === destP90Obj.day) {
      const dayTag = destP10Obj.day > 1 ? ` (+${destP10Obj.day - 1}d)` : "";
      destSlot = `${destP10Obj.time} – ${destP90Obj.time}${dayTag}`;
    }

    let confidence = 95;
    confidence -= (remainingDistanceKm / train.totalDistanceKm) * 15;
    confidence -= weatherRiskRating * 0.4;
    confidence -= (congestionExcess / 100) * 15;
    if (precedingTrainGap === "close" || precedingTrainGap === "blocking") confidence -= 14;
    if (signalDelay > 15) confidence -= 8;
    confidence = Math.min(99, Math.max(35, Math.round(confidence)));

    let confidenceRating = "High";
    let confidenceColor = "#10B981";
    if (confidence < 60) {
      confidenceRating = "Low";
      confidenceColor = "#EF4444";
    } else if (confidence < 80) {
      confidenceRating = "Moderate";
      confidenceColor = "#F59E0B";
    }

    const signalInfo = getSignalAspect(precedingTrainGap, signalDelay);

    return {
      stationResults,
      destination: {
        stationName: destStation.name,
        stationCode: destStation.code,
        scheduledArr: destStation.schArr,
        scheduledDay: destStation.day,
        predictedArr: destStation.predArrTime,
        predictedSlot: destSlot,
        finalDelayMins: finalDelay,
        delayStatus: formatDelay(finalDelay),
        timeWindow: {
          slot: destSlot,
          p10: destP10Obj.display,
          p50: destP50Obj.display,
          p90: destP90Obj.display,
          spreadMins: p90DestMins - p10DestMins
        }
      },
      confidence: {
        score: confidence,
        rating: confidenceRating,
        color: confidenceColor
      },
      signalInfo,
      breakdown: {
        baseDelay: Math.round(currentDelay),
        signalDelay: Math.round(signalDelay),
        weatherDelay: Math.round(totalWeatherAdded),
        congestionDelay: Math.round(totalCongestionAdded),
        tsrDelay: Math.round(totalTsrAdded),
        precedingDelay: Math.round(totalPrecedingAdded),
        slackRecovered: Math.round(totalSlackRecovered),
        netProjectedDelay: Math.round(finalDelay)
      }
    };
  }

  // Register in RailwayETA namespace
  window.RailwayETA.timeToMinutes = timeToMinutes;
  window.RailwayETA.minutesToTime = minutesToTime;
  window.RailwayETA.formatDelay = formatDelay;
  window.RailwayETA.getSignalAspect = getSignalAspect;
  window.RailwayETA.calculateDynamicETAs = calculateDynamicETAs;
})();
