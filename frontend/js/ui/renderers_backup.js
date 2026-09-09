/**
 * UI Renderers for AdaptRail Website
 * Renders the vertical timetable (runningstatus.in style), track schematic SVG,
 * prediction cards, confidence gauge, delay waterfall, and animated side rail corridor.
 */

(function() {
  window.RailwayETA = window.RailwayETA || {};

  function renderHeader(train) {
    const container = document.getElementById("trainHeaderInfo");
    if (!container) return;

    const isStarred = window.AdaptRail && window.AdaptRail.isTrainInWatchlist ? window.AdaptRail.isTrainInWatchlist(train.id) : false;

    container.innerHTML = `
      <div class="train-badge-row">
        <span class="train-type-pill">${train.type}</span>
        <span class="train-run-days">Runs: ${train.departsDay}</span>
        <span class="speed-pill">MPS: ${train.maxPermissibleSpeedKmh} km/h</span>
        <div class="train-header-actions">
          <button id="btnStarTrain" class="btn-star-train ${isStarred ? "active" : ""}" title="Save to your AdaptRail Watchlist">
            ${isStarred ? "★ In Watchlist" : "☆ Save to Watchlist"}
          </button>
        </div>
      </div>
      <div class="train-title-row">
        <h1 class="train-title">${train.number} / ${train.name}</h1>
      </div>
      <div class="train-route-meta">
        <span class="route-station origin"><strong>${train.originName}</strong> (${train.origin})</span>
        <span class="route-arrow">➔</span>
        <span class="route-station destination"><strong>${train.destinationName}</strong> (${train.destination})</span>
        <span class="route-dist">• ${train.totalDistanceKm} km</span>
      </div>
      <div class="route-via">${train.routeDescription}</div>
    `;

    // Re-bind star button
    const starBtn = document.getElementById("btnStarTrain");
    if (starBtn && window.AdaptRail && window.AdaptRail.toggleWatchlist) {
      starBtn.addEventListener("click", () => {
        window.AdaptRail.toggleWatchlist(train.id);
      });
    }
  }

  function renderLiveBanner(train, currentStationIndex, calcResult, liveInputs, selectedStationIndex, onResetDestination) {
    const container = document.getElementById("liveBannerCard");
    if (!container) return;

    const currentStn = train.stations[currentStationIndex] || train.stations[0];
    const nextStn = train.stations[currentStationIndex + 1] || null;
    const destInfo = calcResult.destination;

    let nextStnText = "Journey Completed";
    let nextDistanceText = "";
    if (nextStn) {
      const nextDist = nextStn.distanceKm - currentStn.distanceKm;
      const nextResult = calcResult.stationResults[currentStationIndex + 1];
      const nextSlot = nextResult.predictedSlot || `${nextResult.p10ArrTime} – ${nextResult.p90ArrTime}`;
      nextStnText = `Next: <strong>${nextStn.name} (${nextStn.code})</strong> • Slot: <strong>${nextSlot}</strong>`;
      nextDistanceText = `in ${nextDist} km`;
    }

    const delayPillClass = destInfo.delayStatus.class;
    const signalInfo = calcResult.signalInfo;

    // Check if user selected a specific station to inspect its arrival slot
    const hasCustomSelection = (selectedStationIndex !== null && selectedStationIndex !== undefined && selectedStationIndex >= 0 && selectedStationIndex < calcResult.stationResults.length);
    const activeStn = hasCustomSelection ? calcResult.stationResults[selectedStationIndex] : null;
    const isDestination = !hasCustomSelection || (selectedStationIndex === calcResult.stationResults.length - 1);

    const slotTitle = isDestination 
      ? `PREDICTED ARRIVAL TIME SLOT • ${destInfo.stationName} (${destInfo.stationCode})`
      : `PREDICTED ARRIVAL TIME SLOT • ${activeStn.name} (${activeStn.code})`;

    const slotValue = isDestination
      ? (destInfo.predictedSlot || destInfo.timeWindow.slot)
      : activeStn.predictedSlot;

    const slotDelayClass = isDestination
      ? destInfo.delayStatus.class
      : activeStn.delayStatus.class;

    const slotDelayText = isDestination
      ? destInfo.delayStatus.text
      : activeStn.delayStatus.text;

    let slotWindowText = "";
    if (isDestination) {
      slotWindowText = `Variance Window: <strong>${destInfo.timeWindow.p10} to ${destInfo.timeWindow.p90}</strong> (±${Math.round(destInfo.timeWindow.spreadMins / 2)}m) • Scheduled: <strong>${destInfo.scheduledArr || 'Terminus'}</strong>`;
    } else if (activeStn.isFuture) {
      slotWindowText = `Expected Slot Window: <strong>${activeStn.p10ArrTime} to ${activeStn.p90ArrTime}</strong> • Scheduled Arr: <strong>${activeStn.schArr || activeStn.schDep}</strong> (Slack Buffer: ${activeStn.slackMins}m)`;
    } else if (activeStn.isCompleted) {
      slotWindowText = `Status: <strong>Station Passed / Departed</strong> • Actual Arr: <strong>${activeStn.predArrTime}</strong> (Scheduled: ${activeStn.schArr || 'Source'})`;
    } else {
      slotWindowText = `Status: <strong>Train Currently at Platform #${activeStn.platform || '1'}</strong> • Arr: <strong>${activeStn.predArrTime}</strong>`;
    }

    container.innerHTML = `
      <div class="live-status-banner ${delayPillClass}-border">
        <div class="banner-top">
          <div class="live-beacon">
            <span class="pulsing-dot"></span>
            <span class="beacon-text">ADAPTRAIL LIVE TELEMETRY</span>
          </div>
          <div class="signal-badge" style="border-color: ${signalInfo.color}; color: ${signalInfo.color}">
            <span class="signal-dot" style="background: ${signalInfo.color}"></span>
            Signal: ${signalInfo.aspect} (${signalInfo.safeSpeed} km/h)
          </div>
        </div>

        <div class="banner-main-grid">
          <div class="banner-col current-location">
            <div class="label-sm">CURRENT TRAIN POSITION</div>
            <div class="station-hero">
              <span class="loco-icon">🚆</span>
              <div>
                <div class="hero-stn-name">${currentStn.name} <span class="stn-code">(${currentStn.code})</span></div>
                <div class="hero-dist">${currentStn.distanceKm} km completed of ${train.totalDistanceKm} km</div>
              </div>
            </div>
            <div class="next-station-pill">
              ${nextStnText} <span class="text-muted">${nextDistanceText}</span>
            </div>
          </div>

          <div class="banner-col live-delay-box">
            <div class="label-sm">CURRENT ACCUMULATED DELAY</div>
            <div class="delay-hero-val ${delayPillClass}">
              ${liveInputs.currentDelay > 0 ? `+${liveInputs.currentDelay} min` : (liveInputs.currentDelay === 0 ? "Right Time" : `${liveInputs.currentDelay} min`)}
            </div>
            <div class="delay-note">
              At ${currentStn.name} (Live Speed: ${train.currentStatusDefaults.currentSpeedKmh || 85} km/h)
            </div>
          </div>

          <div class="banner-col final-eta-box ${!isDestination ? "inspected-stn-active" : ""}">
            <div class="label-row-with-reset">
              <div class="label-sm">${slotTitle}</div>
              ${!isDestination ? `
                <button type="button" class="btn-reset-dest-slot" id="btnResetDestSlot" title="Reset view to final terminus (${destInfo.stationCode})">
                  ↺ Terminus (${destInfo.stationCode})
                </button>
              ` : `
                <span class="badge-terminus">Final Terminus</span>
              `}
            </div>
            <div class="final-eta-hero slot-hero">
              ${slotValue}
              <span class="eta-diff-badge ${slotDelayClass}">${slotDelayText}</span>
            </div>
            <div class="eta-window-text">
              ${slotWindowText}
            </div>
          </div>
        </div>
      </div>
    `;

    const resetBtn = container.querySelector("#btnResetDestSlot");
    if (resetBtn && onResetDestination) {
      resetBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onResetDestination();
      });
    }
  }

  function renderTimeline(stationResults, currentStationIndex, selectedStationIndex, onRelocateTrain, onInspectStation) {
    const container = document.getElementById("stationTimelineList");
    if (!container) return;

    container.innerHTML = "";

    // 1. Interactive Station Arrival Slot Selector Bar
    const selectorBar = document.createElement("div");
    selectorBar.className = "timeline-quick-selector-bar";
    selectorBar.innerHTML = `
      <div class="selector-header">
        <div class="selector-title-group">
          <span class="selector-icon">🎯</span>
          <div>
            <div class="selector-title">STATION ARRIVAL SLOT INSPECTOR</div>
            <div class="selector-sub">Click any station row or badge to view its dynamic predicted arrival slot</div>
          </div>
        </div>
        ${selectedStationIndex !== null && selectedStationIndex !== undefined && selectedStationIndex !== stationResults.length - 1 ? `
          <button type="button" class="btn-reset-dest-chip" id="btnResetToDestTimeline" title="Reset view to final terminus">
            ↺ Terminus (${stationResults[stationResults.length - 1].code})
          </button>
        ` : ""}
      </div>
      <div class="selector-chips-row">
        ${stationResults.map((stn, idx) => {
          const isSel = (idx === selectedStationIndex);
          let tag = "";
          if (stn.isCurrent) tag = "🚆 ";
          else if (stn.isCompleted) tag = "✓ ";
          return `
            <button type="button" class="stn-quick-chip ${isSel ? "active" : ""} ${stn.status}" data-idx="${idx}" title="Click to view predicted arrival slot at ${stn.name}">
              <span class="chip-status-icon">${tag}</span>
              <span class="chip-code">${stn.code}</span>
              <span class="chip-name">${stn.name}</span>
              ${isSel ? '<span class="chip-active-dot">● Active</span>' : ""}
            </button>
          `;
        }).join("")}
      </div>
    `;

    selectorBar.querySelectorAll(".stn-quick-chip").forEach(chip => {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(chip.dataset.idx, 10);
        if (onInspectStation) onInspectStation(idx);
      });
    });

    const resetTimelineBtn = selectorBar.querySelector("#btnResetToDestTimeline");
    if (resetTimelineBtn) {
      resetTimelineBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (onInspectStation) onInspectStation(stationResults.length - 1);
      });
    }

    container.appendChild(selectorBar);

    // 2. Station Timeline Rows
    stationResults.forEach((stn, idx) => {
      const isSelected = (idx === selectedStationIndex);
      const item = document.createElement("div");
      item.className = `timeline-station-card clickable-station-card ${stn.status} ${isSelected ? "selected-station-card" : ""}`;
      if (stn.isCurrent) item.classList.add("is-active-train");
      item.setAttribute("data-idx", idx);
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Station ${stn.name}, click to inspect arrival time slot`);

      let markerHtml = "";
      if (stn.isCompleted) {
        markerHtml = `<div class="timeline-marker passed"><span class="check-icon">✓</span></div>`;
      } else if (stn.isCurrent) {
        markerHtml = `
          <div class="timeline-marker current">
            <div class="train-loco-marker" title="Train currently here">🚆</div>
            <div class="radar-wave"></div>
          </div>
        `;
      } else {
        markerHtml = `<div class="timeline-marker upcoming ${isSelected ? "marker-selected" : ""}"><span class="dot"></span></div>`;
      }

      const schArrText = stn.schArr ? stn.schArr : "Source";
      const schDepText = stn.schDep ? stn.schDep : "Terminus";
      const predArrText = stn.schArr ? stn.predArrTime : "Source";
      const predDepText = stn.schDep ? stn.predDepTime : "Terminus";

      const isDelayed = stn.arrivalDelayMins > 0;
      const delayTag = stn.delayStatus.text;
      const delayClass = stn.delayStatus.class;

      let bottleneckBadge = "";
      if (stn.bottleneckRisk === "Severe") {
        bottleneckBadge = `<span class="bottleneck-tag severe" title="Severe junction congestion & cross-traffic history">⚠️ Congestion Junction</span>`;
      } else if (stn.bottleneckRisk === "High") {
        bottleneckBadge = `<span class="bottleneck-tag high" title="Frequent signal holding section">⚡ High Density</span>`;
      }

      let clickToMoveTip = "";
      if (!stn.isCurrent) {
        clickToMoveTip = `<button type="button" class="btn-relocate-train" title="Move live train position to this station">Relocate 🚆</button>`;
      }

      item.innerHTML = `
        <div class="timeline-track-col">
          <div class="track-line top-line ${idx === 0 ? "hidden" : ""}"></div>
          ${markerHtml}
          <div class="track-line bottom-line ${idx === stationResults.length - 1 ? "hidden" : ""}"></div>
        </div>

        <div class="timeline-content">
          <div class="stn-header-line">
            <div class="stn-name-group">
              <span class="stn-name">${stn.name}</span>
              <span class="stn-code-badge">${stn.code}</span>
              <span class="stn-pf">PF #${stn.platform || "1"}</span>
              ${bottleneckBadge}
              ${isSelected ? `<span class="inspected-station-pill">🎯 SELECTED STATION</span>` : ""}
            </div>
            <div class="stn-actions">
              <span class="stn-dist">${stn.distanceKm} km</span>
              <button type="button" class="btn-view-slot ${isSelected ? "active" : ""}" data-idx="${idx}" title="Inspect arrival slot at ${stn.name}">
                ${isSelected ? "🎯 Slot Active" : "📍 View Slot"}
              </button>
              ${clickToMoveTip}
            </div>
          </div>

          <div class="timings-grid">
            <div class="timing-cell">
              <span class="time-label">Scheduled Arr</span>
              <span class="time-val sch">${schArrText}</span>
            </div>
            <div class="timing-cell">
              <span class="time-label">Scheduled Dep</span>
              <span class="time-val sch">${schDepText}</span>
            </div>
            <div class="timing-cell">
              <span class="time-label">${stn.isCompleted ? "Actual Arr" : (stn.isCurrent ? "Current Arr" : "Predicted Slot Arr")}</span>
              <span class="time-val pred ${isDelayed ? "late-val" : "ontime-val"}">${stn.predictedSlot || predArrText}</span>
            </div>
            <div class="timing-cell">
              <span class="time-label">${stn.isCompleted ? "Actual Dep" : (stn.isCurrent ? "Expected Dep" : "Expected Dep")}</span>
              <span class="time-val pred ${isDelayed ? "late-val" : "ontime-val"}">${predDepText}</span>
            </div>
            <div class="timing-cell delay-cell">
              <span class="time-label">Delay</span>
              <span class="delay-pill ${delayClass}">${delayTag}</span>
            </div>
          </div>

          ${isSelected ? `
            <div class="selected-station-slot-banner ${stn.status}">
              <div class="selected-slot-badge-line">
                <span class="slot-badge-tag">🎯 PREDICTED ARRIVAL TIME SLOT • ${stn.name} (${stn.code})</span>
                <span class="slot-badge-delay ${delayClass}">${delayTag}</span>
              </div>
              <div class="selected-slot-hero-val">${stn.predictedSlot}</div>
              <div class="selected-slot-meta-row">
                <span>Scheduled Arr: <strong>${schArrText}</strong></span>
                <span>•</span>
                <span>${stn.isFuture ? `Expected Slot Window: <strong>${stn.p10ArrTime} to ${stn.p90ArrTime}</strong> (Slack Buffer: ${stn.slackMins}m)` : (stn.isCompleted ? `Crossed at ${stn.predArrTime}` : `Currently at Platform #${stn.platform || '1'}`)}</span>
                <span>•</span>
                <span>Distance: <strong>${stn.distanceKm} km</strong></span>
              </div>
            </div>
          ` : (stn.isFuture ? `
            <div class="prediction-window-subtext">
              Predicted Arrival Slot: <strong>${stn.predictedSlot}</strong> (Best: ${stn.p10ArrTime}, Conservative: ${stn.p90ArrTime}) • Slack: ${stn.slackMins}m
            </div>
          ` : "")}
        </div>
      `;

      // Handle clicking anywhere on station card to inspect its arrival slot
      item.addEventListener("click", (e) => {
        if (e.target.closest(".btn-relocate-train")) return;
        if (onInspectStation) onInspectStation(idx);
      });

      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (onInspectStation) onInspectStation(idx);
        }
      });

      const viewSlotBtn = item.querySelector(".btn-view-slot");
      if (viewSlotBtn) {
        viewSlotBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onInspectStation) onInspectStation(idx);
        });
      }

      const relocateBtn = item.querySelector(".btn-relocate-train");
      if (relocateBtn) {
        relocateBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onRelocateTrain) onRelocateTrain(idx);
        });
      }

      container.appendChild(item);
    });
  }

  function renderTrackSchematic(train, currentStationIndex, liveInputs, signalInfo, selectedStationIndex, onInspectStation) {
    const container = document.getElementById("trackSchematicSvgContainer");
    if (!container) return;

    const currentStn = train.stations[currentStationIndex] || train.stations[0];
    const nextStn = train.stations[currentStationIndex + 1] || currentStn;
    const isLast = currentStationIndex >= train.stations.length - 1;
    const nextStnIdx = isLast ? currentStationIndex : currentStationIndex + 1;

    const signalColor = signalInfo.color;
    const gapType = liveInputs.precedingTrainGap;
    let precedingTrainLabel = "Lead Train: >15 km (Clear)";
    if (gapType === "moderate") { precedingTrainLabel = "Lead Freight: 8.5 km ahead"; }
    if (gapType === "close") { precedingTrainLabel = "Preceding Local: 3.8 km ahead"; }
    if (gapType === "blocking") { precedingTrainLabel = "Halted Freight: 1.2 km ahead (BLOCKING)"; }

    let tsrDisplay = "";
    if (liveInputs.speedRestriction === "tsr30") tsrDisplay = "TSR 30 KM/H AHEAD";
    if (liveInputs.speedRestriction === "tsr50") tsrDisplay = "TSR 50 KM/H AHEAD";
    if (liveInputs.speedRestriction === "multiple") tsrDisplay = "MULTIPLE TSR ZONES";

    const weatherMap = {
      clear: { label: "Clear Skies", icon: "☀️", bg: "#064E3B", color: "#6EE7B7" },
      rain: { label: "Monsoon Rain", icon: "🌧️", bg: "#1E3A8A", color: "#93C5FD" },
      fog: { label: "Dense Winter Fog (<50m)", icon: "🌫️", bg: "#374151", color: "#F3F4F6" },
      storm: { label: "Severe Storm / Wind", icon: "⛈️", bg: "#78350F", color: "#FCD34D" }
    };
    const weatherMeta = weatherMap[liveInputs.weather] || weatherMap.clear;

    container.innerHTML = `
      <div class="schematic-header">
        <div class="schematic-title">
          <span>🛤️ REAL-TIME BLOCK SECTION & SIGNALLING SCHEMATIC</span>
        </div>
        <div class="schematic-badges">
          <span class="weather-chip" style="background: ${weatherMeta.bg}; color: ${weatherMeta.color}">
            ${weatherMeta.icon} ${weatherMeta.label}
          </span>
          ${tsrDisplay ? `<span class="tsr-chip">⚠️ ${tsrDisplay}</span>` : ""}
        </div>
      </div>

      <div class="schematic-canvas-box">
        <svg viewBox="0 0 900 180" class="schematic-svg" preserveAspectRatio="xMidYMid meet">
          <rect x="20" y="110" width="860" height="24" rx="4" fill="#334155" />
          
          <g stroke="#64748B" stroke-width="4">
            ${Array.from({ length: 42 }).map((_, i) => `<line x1="${35 + i * 20}" y1="106" x2="${35 + i * 20}" y2="138" />`).join("")}
          </g>

          <line x1="20" y1="114" x2="880" y2="114" stroke="#CBD5E1" stroke-width="4" />
          <line x1="20" y1="130" x2="880" y2="130" stroke="#CBD5E1" stroke-width="4" />

          <!-- Current Block Source Station -->
          <g class="clickable-schematic-stn" data-idx="${currentStationIndex}" style="cursor: pointer;" title="Click to view arrival slot at ${currentStn.name}">
            <rect x="40" y="35" width="130" height="38" rx="6" fill="${selectedStationIndex === currentStationIndex ? "#1E3A8A" : "#1E293B"}" stroke="${selectedStationIndex === currentStationIndex ? "#60A5FA" : "#3B82F6"}" stroke-width="${selectedStationIndex === currentStationIndex ? "3" : "2"}" />
            <text x="105" y="52" fill="#93C5FD" font-size="11" font-weight="700" text-anchor="middle">BLOCK SOURCE 📍</text>
            <text x="105" y="66" fill="#F8FAFC" font-size="13" font-weight="bold" text-anchor="middle">${currentStn.name} (${currentStn.code})</text>
          </g>
          <line x1="105" y1="73" x2="105" y2="106" stroke="#3B82F6" stroke-width="2" stroke-dasharray="3 3" />

          <!-- Next Block Destination Station -->
          <g class="clickable-schematic-stn" data-idx="${nextStnIdx}" style="cursor: pointer;" title="Click to view arrival slot at ${nextStn.name}">
            <rect x="730" y="35" width="130" height="38" rx="6" fill="${selectedStationIndex === nextStnIdx ? "#1E3A8A" : "#1E293B"}" stroke="${selectedStationIndex === nextStnIdx ? "#60A5FA" : (isLast ? "#10B981" : "#64748B")}" stroke-width="${selectedStationIndex === nextStnIdx ? "3" : "2"}" />
            <text x="795" y="52" fill="#94A3B8" font-size="11" font-weight="700" text-anchor="middle">${isLast ? "TERMINUS 🎯" : "NEXT BLOCK 🎯"}</text>
            <text x="795" y="66" fill="#F8FAFC" font-size="13" font-weight="bold" text-anchor="middle">${nextStn.name} (${nextStn.code})</text>
          </g>
          <line x1="795" y1="73" x2="795" y2="106" stroke="#64748B" stroke-width="2" stroke-dasharray="3 3" />

          <!-- Automatic Signalling Gantry Post -->
          <g transform="translate(560, 28)">
            <line x1="15" y1="20" x2="15" y2="82" stroke="#475569" stroke-width="5" />
            <rect x="0" y="0" width="30" height="60" rx="8" fill="#0F172A" stroke="#334155" stroke-width="2" />
            <circle cx="15" cy="18" r="8" fill="${signalColor}" filter="drop-shadow(0 0 8px ${signalColor})" />
            <circle cx="15" cy="42" r="8" fill="${signalInfo.aspect === "DOUBLE_YELLOW" ? "#EAB308" : "#1E293B"}" />
            <text x="40" y="24" fill="${signalColor}" font-size="12" font-weight="800">ASPECT: ${signalInfo.aspect}</text>
            <text x="40" y="42" fill="#94A3B8" font-size="10">Target: ${signalInfo.safeSpeed} km/h</text>
          </g>

          <!-- Current Train (Locomotive & Headlight) -->
          <g transform="translate(230, 86)">
            <polygon points="120,25 240,5 240,45" fill="url(#beamGrad)" opacity="0.65" />
            <rect x="30" y="8" width="90" height="30" rx="6" fill="#2563EB" stroke="#60A5FA" stroke-width="2" />
            <rect x="90" y="12" width="22" height="12" rx="2" fill="#93C5FD" />
            <line x1="30" y1="22" x2="118" y2="22" stroke="#FBBF24" stroke-width="3" />
            <text x="70" y="28" fill="#FFFFFF" font-size="10" font-weight="bold" text-anchor="middle">${train.number}</text>
            <circle cx="45" cy="38" r="5" fill="#0F172A" stroke="#94A3B8" stroke-width="2" />
            <circle cx="65" cy="38" r="5" fill="#0F172A" stroke="#94A3B8" stroke-width="2" />
            <circle cx="95" cy="38" r="5" fill="#0F172A" stroke="#94A3B8" stroke-width="2" />
            <circle cx="110" cy="38" r="5" fill="#0F172A" stroke="#94A3B8" stroke-width="2" />

            <rect x="25" y="-24" width="90" height="20" rx="4" fill="#1E3A8A" stroke="#60A5FA" />
            <text x="70" y="-10" fill="#93C5FD" font-size="10" font-weight="bold" text-anchor="middle">
              🚆 ${train.currentStatusDefaults.currentSpeedKmh || 85} km/h
            </text>
          </g>

          <!-- Preceding Train Ahead -->
          ${gapType !== "clear" ? `
            <g transform="translate(${gapType === "blocking" ? 420 : (gapType === "close" ? 510 : 660)}, 88)">
              <rect x="0" y="8" width="70" height="28" rx="5" fill="#475569" stroke="#94A3B8" stroke-width="1.5" />
              <text x="35" y="26" fill="#F8FAFC" font-size="9" font-weight="bold" text-anchor="middle">LEAD TRAIN</text>
              <circle cx="15" cy="36" r="4" fill="#0F172A" stroke="#64748B" />
              <circle cx="55" cy="36" r="4" fill="#0F172A" stroke="#64748B" />
              <line x1="-30" y1="22" x2="-2" y2="22" stroke="#EF4444" stroke-width="2" stroke-dasharray="3 3" />
              <text x="35" y="-8" fill="#FCA5A5" font-size="10" font-weight="bold" text-anchor="middle">
                ⚠️ ${precedingTrainLabel}
              </text>
            </g>
          ` : `
            <text x="520" y="160" fill="#10B981" font-size="11" font-weight="600" text-anchor="middle">
              ✓ Line Clear Ahead • Headway > 15 km
            </text>
          `}

          <defs>
            <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#FEF08A" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#FEF08A" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    `;

    container.querySelectorAll(".clickable-schematic-stn").forEach(stnEl => {
      stnEl.addEventListener("click", () => {
        const idx = parseInt(stnEl.dataset.idx, 10);
        if (onInspectStation) onInspectStation(idx);
      });
    });
  }

  // Render the Side Rail Corridor Animation
  function renderSideAnimation(train, currentStationIndex, liveInputs, calcResult) {
    const sideContainer = document.getElementById("sideRailAnimationContainer");
    if (!sideContainer) return;

    const currentStn = train.stations[currentStationIndex] || train.stations[0];
    const totalKm = train.totalDistanceKm || 1000;
    const progressPercent = Math.min(100, Math.round((currentStn.distanceKm / totalKm) * 100));
    const signalInfo = calcResult.signalInfo;

    // Calculate dynamic animation scroll duration based on live speed & weather
    let speed = train.currentStatusDefaults.currentSpeedKmh || 90;
    if (liveInputs.weather === "fog") speed = Math.min(speed, 60);
    if (signalInfo.safeSpeed === 0) speed = 0;
    else if (signalInfo.safeSpeed <= 40) speed = Math.min(speed, 40);

    // Duration in seconds for animation loop (higher speed = lower seconds)
    const animDuration = speed > 0 ? Math.max(0.6, (140 / speed) * 1.2).toFixed(2) : 999999;

    sideContainer.innerHTML = `
      <div class="side-rail-card" style="--track-speed: ${animDuration}s">
        <div class="side-rail-header">
          <span class="side-rail-tag">LIVE RAIL CORRIDOR</span>
          <span class="side-rail-speed" style="color: ${signalInfo.color}">${speed > 0 ? `${speed} km/h` : "HALTED"}</span>
        </div>

        <!-- Animated Railway Viewport -->
        <div class="side-track-viewport ${speed === 0 ? "halted" : ""}">
          
          <!-- Moving Catenary overhead wires & parallax masts -->
          <div class="catenary-layer">
            <div class="mast mast-1"></div>
            <div class="mast mast-2"></div>
            <div class="mast mast-3"></div>
          </div>

          <!-- Vertical steel rail line with scrolling sleepers -->
          <div class="side-rails-track">
            <div class="side-rail-steel left-steel"></div>
            <div class="side-sleepers-strip"></div>
            <div class="side-rail-steel right-steel"></div>
          </div>

          <!-- Animated High-Speed Train Sprite -->
          <div class="side-train-sprite" style="top: ${Math.max(12, Math.min(78, progressPercent))}%;">
            <div class="loco-pantograph"></div>
            <div class="loco-body">
              <span class="loco-headlight"></span>
              <span class="loco-label">${train.number}</span>
            </div>
            <div class="coach-body coach-1"></div>
            <div class="coach-body coach-2"></div>
            <div class="train-speed-tag">${speed} km/h</div>
          </div>

          <!-- Live Signal Aspect Post -->
          <div class="side-signal-post">
            <div class="signal-housing">
              <span class="sig-lamp ${signalInfo.aspect === "GREEN" ? "lit-green" : ""}"></span>
              <span class="sig-lamp ${signalInfo.aspect === "DOUBLE_YELLOW" || signalInfo.aspect === "YELLOW" ? "lit-yellow" : ""}"></span>
              <span class="sig-lamp ${signalInfo.aspect === "RED" ? "lit-red" : ""}"></span>
            </div>
          </div>

          <!-- Milestone Stone -->
          <div class="side-milestone">
            <span>KM</span>
            <strong>${currentStn.distanceKm}</strong>
          </div>
        </div>

        <!-- Journey Progress Tracker -->
        <div class="side-progress-meta">
          <div class="side-progress-label">
            <span>Route Progress</span>
            <strong>${progressPercent}%</strong>
          </div>
          <div class="side-progress-bar">
            <div class="side-progress-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="side-dest-text">
            ➔ ${train.destinationName} (${train.destination})
          </div>
        </div>
      </div>
    `;
  }

  function renderConfidenceGauge(confidence) {
    const container = document.getElementById("confidenceGaugeContainer");
    if (!container) return;

    const score = confidence.score;
    const rating = confidence.rating;
    const color = confidence.color;
    const strokeDashoffset = 283 - (283 * score) / 100;

    container.innerHTML = `
      <div class="confidence-card">
        <div class="conf-top">
          <span class="conf-label">PREDICTION CONFIDENCE</span>
          <span class="conf-pill" style="background: ${color}22; color: ${color}; border: 1px solid ${color}">
            ${rating}
          </span>
        </div>

        <div class="gauge-center">
          <svg viewBox="0 0 120 120" class="gauge-svg">
            <circle cx="60" cy="60" r="45" class="gauge-bg" />
            <circle cx="60" cy="60" r="45" class="gauge-fill"
              style="stroke: ${color}; stroke-dashoffset: ${strokeDashoffset};" />
            <text x="60" y="58" class="gauge-text" fill="${color}">${score}%</text>
            <text x="60" y="74" class="gauge-sub" fill="#94A3B8">CONFIDENCE</text>
          </svg>
        </div>

        <div class="conf-factors-summary">
          <div class="conf-bullet">
            <span class="dot-green"></span> GPS Telemetry: <strong>Fresh (<30s)</strong>
          </div>
          <div class="conf-bullet">
            <span class="dot-amber"></span> Dynamic Weather Variance: <strong>Modeled</strong>
          </div>
          <div class="conf-bullet">
            <span class="dot-blue"></span> Junction Congestion Weight: <strong>Active</strong>
          </div>
        </div>
      </div>
    `;
  }

  function renderDelayWaterfall(breakdown) {
    const container = document.getElementById("delayWaterfallContainer");
    if (!container) return;

    const items = [
      { label: "Base Accumulated Delay", val: breakdown.baseDelay, type: "add" },
      { label: "Signal Aspect Holds", val: breakdown.signalDelay, type: "add" },
      { label: "Weather Impact (Fog/Rain)", val: breakdown.weatherDelay, type: "add" },
      { label: "Corridor Congestion", val: breakdown.congestionDelay, type: "add" },
      { label: "Speed Restrictions (TSR)", val: breakdown.tsrDelay, type: "add" },
      { label: "Preceding Headway Penalty", val: breakdown.precedingDelay, type: "add" },
      { label: "Scheduled Slack Recovery", val: breakdown.slackRecovered, type: "recover" }
    ];

    const maxVal = Math.max(1, breakdown.baseDelay + breakdown.weatherDelay + breakdown.congestionDelay + breakdown.tsrDelay + breakdown.signalDelay + breakdown.precedingDelay);

    container.innerHTML = `
      <div class="waterfall-card">
        <div class="waterfall-header">
          <span class="waterfall-title">📊 DYNAMIC DELAY FACTOR CONTRIBUTION</span>
          <span class="waterfall-net">Net: <strong>${breakdown.netProjectedDelay >= 0 ? `+${breakdown.netProjectedDelay}m` : `${breakdown.netProjectedDelay}m`}</strong></span>
        </div>

        <div class="waterfall-bars">
          ${items.map(item => {
            const isRecover = item.type === "recover";
            const widthPercent = Math.min(100, Math.round((Math.abs(item.val) / maxVal) * 100));
            const valDisplay = isRecover ? `-${item.val} min` : (item.val > 0 ? `+${item.val} min` : `0 min`);
            const barColorClass = isRecover ? "bar-recover" : (item.val > 0 ? "bar-delay" : "bar-zero");

            return `
              <div class="waterfall-row">
                <div class="row-label-wrap">
                  <span class="row-label">${item.label}</span>
                  <span class="row-val ${isRecover ? "text-green" : (item.val > 0 ? "text-amber" : "text-muted")}">${valDisplay}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill ${barColorClass}" style="width: ${widthPercent}%"></div>
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="waterfall-footer">
          * Dynamic prediction engine accounts for scheduled recovery slack to reduce net destination delay.
        </div>
      </div>
    `;
  }

  window.RailwayETA.renderHeader = renderHeader;
  window.RailwayETA.renderLiveBanner = renderLiveBanner;
  window.RailwayETA.renderTimeline = renderTimeline;
  window.RailwayETA.renderTrackSchematic = renderTrackSchematic;
  window.RailwayETA.renderConfidenceGauge = renderConfidenceGauge;
  window.RailwayETA.renderDelayWaterfall = renderDelayWaterfall;
  window.RailwayETA.renderSideAnimation = renderSideAnimation;
})();
