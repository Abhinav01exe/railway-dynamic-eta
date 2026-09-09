/**
 * AdaptRail Application Controller
 * Manages state, train search autocomplete, side animation synchronization,
 * scenario controls, and real-time live updates.
 */

(function () {
  window.RailwayETA = window.RailwayETA || {};

  const appState = {
    currentTrainId: "12302",
    currentTrain: null,
    currentStationIndex: 2,
    selectedStationIndex: null, // null defaults to destination station

    /*
     * LIVE vs SIMULATION
     *
     * false = use real RailRadar delay
     * true  = use simulator/scenario delay
     */
    simulationMode: false,

    /*
     * Real delay received from RailRadar.
     * This value is NEVER overwritten by simulation controls.
     */
    liveDelay: 0,

    /*
     * These values are used by the simulation engine.
     */
    liveInputs: {
      currentDelay: 0,
      weather: "clear",
      signalDelay: 5,
      congestionPercent: 90,
      speedRestriction: "none",
      precedingTrainGap: "clear",
      historicalBias: "average"
    }
  };

  let simulation = null;
  let backendETA = null;


  /*
   * ------------------------------------------------------------
   * ACTIVE DELAY
   * ------------------------------------------------------------
   *
   * LIVE MODE:
   *     active delay = RailRadar delay
   *
   * SIMULATION MODE:
   *     active delay = simulator delay
   */
  function getActiveDelay() {
    if (appState.simulationMode) {
      return Number(
        appState.liveInputs.currentDelay || 0
      );
    }

    return Number(
      appState.liveDelay || 0
    );
  }


  /*
   * ------------------------------------------------------------
   * INITIALIZE APPLICATION
   * ------------------------------------------------------------
   */

  function initApp() {
    const TRAINS_DATABASE =
      window.RailwayETA.TRAINS_DATABASE || [];

    if (!TRAINS_DATABASE.length) {
      console.warn("TRAINS_DATABASE not found");
      return;
    }

    appState.currentTrain =
      TRAINS_DATABASE.find(
        t => t.id === appState.currentTrainId
      ) || TRAINS_DATABASE[0];

    appState.currentStationIndex =
      appState.currentTrain.currentStatusDefaults
        .currentStationIndex || 2;

    /*
     * Static/demo train starts with its default delay.
     *
     * This is not RailRadar data.
     */
    appState.liveDelay =
      Number(
        appState.currentTrain.currentStatusDefaults
          .baseDelayMins || 20
      );

    appState.liveInputs.currentDelay =
      appState.liveDelay;

    appState.simulationMode = false;


    const TrainSimulation =
      window.RailwayETA.TrainSimulation;

    if (TrainSimulation) {
      simulation = new TrainSimulation({
        train: appState.currentTrain,

        currentStationIndex:
          appState.currentStationIndex,

        onTick: function (data) {
          appState.currentStationIndex =
            data.currentStationIndex;

          updateSimulationPlayState();

          updateDashboard();
        }
      });
    }


    populateTrainSelector(
      TRAINS_DATABASE
    );

    setupSearchAutocomplete(
      TRAINS_DATABASE
    );

    setupInputListeners();

    setupScenarioPresets();

    setupSimulationControls();

    setupMobileDrawer();

    setupRatingAndReviews();

    updateDashboard();


    /*
     * Load live RailRadar data for the SIH prototype train.
     */
    if (window.RailwayETA.loadLiveTrain) {

      window.RailwayETA.loadLiveTrain("12919")

        .then(async function (liveTrain) {

          appState.currentTrainId =
            liveTrain.id;

          appState.currentTrain =
            liveTrain;

          appState.currentStationIndex =
            liveTrain.currentStatusDefaults
              .currentStationIndex || 0;

          appState.selectedStationIndex =
            null;


          /*
           * IMPORTANT:
           *
           * Store RailRadar delay separately.
           */
          appState.liveDelay =
            Number(
              liveTrain.currentStatusDefaults
                .baseDelayMins || 0
            );


          /*
           * Mirror the live value into the
           * simulator input initially.
           */
          appState.liveInputs.currentDelay =
            appState.liveDelay;


          /*
           * We are receiving real RailRadar data,
           * therefore start in LIVE MODE.
           */
          appState.simulationMode = false;


          /*
           * Add the live train to the existing
           * route switcher.
           */
          const select =
            document.getElementById(
              "trainSelect"
            );

          if (select) {

            let liveOption =
              select.querySelector(
                'option[value="12919"]'
              );

            if (!liveOption) {

              liveOption =
                document.createElement(
                  "option"
                );

              liveOption.value =
                liveTrain.id;

              select.appendChild(
                liveOption
              );
            }

            liveOption.textContent =
              `${liveTrain.number} - ${liveTrain.name} (${liveTrain.origin} ➔ ${liveTrain.destination})`;

            select.value =
              liveTrain.id;
          }


          if (simulation) {

            simulation.setTrain(
              liveTrain,
              appState.currentStationIndex
            );
          }


          /*
           * Ask FastAPI for the ML-powered ETA
           * to the next live station.
           */
          const nextStationIndex =
            appState.currentStationIndex + 1;

          const nextStation =
            liveTrain.stations[
            nextStationIndex
            ];


          if (
            nextStation &&
            window.TrainAPI
          ) {

            try {

              backendETA =
                await window.TrainAPI.getTrainETA(
                  liveTrain.number,
                  nextStation.code
                );

              console.log(
                "Backend ML ETA:",
                backendETA
              );

            } catch (etaError) {

              backendETA = null;

              console.warn(
                "Backend ML ETA failed:",
                etaError
              );
            }
          }


          updateDashboard();


          if (
            window.AdaptRail &&
            window.AdaptRail.showNotification
          ) {

            window.AdaptRail.showNotification(
              "Live RailRadar data loaded for train 12919",
              "success"
            );
          }

        })

        .catch(function (error) {

          console.warn(
            "Live train loading failed:",
            error
          );
        });
    }
  }


  /*
   * ------------------------------------------------------------
   * TRAIN SELECTOR
   * ------------------------------------------------------------
   */

  function populateTrainSelector(
    trains
  ) {

    const select =
      document.getElementById(
        "trainSelect"
      );

    if (!select) return;

    select.innerHTML = "";

    trains.forEach(train => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        train.id;

      option.textContent =
        `${train.number} - ${train.name} (${train.origin} ➔ ${train.destination})`;

      if (
        train.id ===
        appState.currentTrainId
      ) {

        option.selected = true;
      }

      select.appendChild(
        option
      );
    });


    select.addEventListener(
      "change",
      function (e) {

        switchTrain(
          e.target.value
        );
      }
    );
  }


  /*
   * ------------------------------------------------------------
   * SEARCH AUTOCOMPLETE
   * ------------------------------------------------------------
   */

  function setupSearchAutocomplete(
    trains
  ) {

    const searchInput =
      document.getElementById(
        "heroSearchInput"
      );

    const suggestionsBox =
      document.getElementById(
        "searchSuggestions"
      );

    const trendingPills =
      document.querySelectorAll(
        ".trending-pill"
      );


    if (
      !searchInput ||
      !suggestionsBox
    ) {
      return;
    }


    searchInput.addEventListener(
      "input",
      function (e) {

        const query =
          e.target.value
            .trim()
            .toLowerCase();


        if (!query) {

          suggestionsBox.classList.add(
            "hidden"
          );

          return;
        }


        const matches =
          trains.filter(
            t =>
              t.number
                .toLowerCase()
                .includes(query) ||

              t.name
                .toLowerCase()
                .includes(query) ||

              t.origin
                .toLowerCase()
                .includes(query) ||

              t.originName
                .toLowerCase()
                .includes(query) ||

              t.destination
                .toLowerCase()
                .includes(query) ||

              t.destinationName
                .toLowerCase()
                .includes(query) ||

              t.stations.some(
                s =>
                  s.name
                    .toLowerCase()
                    .includes(query) ||

                  s.code
                    .toLowerCase()
                    .includes(query)
              )
          );


        if (matches.length === 0) {

          suggestionsBox.innerHTML = `
            <div class="no-match-item">
              No trains found matching "${e.target.value}". Try "12302", "Rajdhani", or "Vande Bharat".
            </div>
          `;

          suggestionsBox.classList.remove(
            "hidden"
          );

          return;
        }


        suggestionsBox.innerHTML =
          matches
            .map(
              t => `
                <div
                  class="search-match-item"
                  data-train-id="${t.id}"
                >
                  <div class="match-main">
                    <span class="match-badge">
                      ${t.number}
                    </span>

                    <span class="match-name">
                      ${t.name}
                    </span>
                  </div>

                  <div class="match-sub">
                    ${t.originName} (${t.origin}) ➔
                    ${t.destinationName} (${t.destination}) •
                    ${t.totalDistanceKm} km
                  </div>
                </div>
              `
            )
            .join("");


        suggestionsBox
          .querySelectorAll(
            ".search-match-item"
          )
          .forEach(item => {

            item.addEventListener(
              "click",
              () => {

                const trainId =
                  item.dataset.trainId;

                switchTrain(
                  trainId
                );

                searchInput.value =
                  "";

                suggestionsBox.classList.add(
                  "hidden"
                );
              }
            );
          });


        suggestionsBox.classList.remove(
          "hidden"
        );
      }
    );


    /*
     * Close suggestions on outside click.
     */
    document.addEventListener(
      "click",
      (e) => {

        if (
          !e.target.closest(
            ".search-bar-wrapper"
          )
        ) {

          suggestionsBox.classList.add(
            "hidden"
          );
        }
      }
    );


    /*
     * Trending pills.
     */
    trendingPills.forEach(
      pill => {

        pill.addEventListener(
          "click",
          () => {

            const trainId =
              pill.dataset.trainId;

            if (trainId) {

              switchTrain(
                trainId
              );

              if (searchInput) {
                searchInput.value =
                  "";
              }
            }
          }
        );
      }
    );
  }


  /*
   * ------------------------------------------------------------
   * SWITCH TRAIN
   * ------------------------------------------------------------
   */

  function switchTrain(
    trainId
  ) {

    const trains =
      window.RailwayETA.TRAINS_DATABASE ||
      [];

    const train =
      trains.find(
        t => t.id === trainId
      );


    /*
     * 12919 is supplied by the live
     * RailRadar adapter.
     */
    if (
      trainId === "12919" &&
      window.RailwayETA.loadLiveTrain
    ) {

      window.RailwayETA.loadLiveTrain(
        "12919"
      )

        .then(function (liveTrain) {

          appState.currentTrainId =
            liveTrain.id;

          appState.currentTrain =
            liveTrain;

          appState.currentStationIndex =
            liveTrain.currentStatusDefaults
              .currentStationIndex || 0;

          appState.selectedStationIndex =
            null;


          /*
           * Store REAL RailRadar delay.
           */
          appState.liveDelay =
            Number(
              liveTrain.currentStatusDefaults
                .baseDelayMins || 0
            );


          /*
           * Mirror it into simulator input.
           */
          appState.liveInputs.currentDelay =
            appState.liveDelay;


          /*
           * Switching to live train returns
           * dashboard to LIVE MODE.
           */
          appState.simulationMode =
            false;


          /*
           * Clear old backend prediction.
           */
          backendETA = null;


          const select =
            document.getElementById(
              "trainSelect"
            );

          if (select) {
            select.value =
              liveTrain.id;
          }


          if (simulation) {

            simulation.setTrain(
              liveTrain,
              appState.currentStationIndex
            );
          }


          /*
           * Get fresh ML prediction for
           * the immediate next station.
           */
          const nextStationIndex =
            appState.currentStationIndex + 1;

          const nextStation =
            liveTrain.stations[
            nextStationIndex
            ];


          if (
            nextStation &&
            window.TrainAPI
          ) {

            window.TrainAPI.getTrainETA(
              liveTrain.number,
              nextStation.code
            )
              .then(function (result) {

                backendETA =
                  result;

                updateDashboard();

              })
              .catch(function (error) {

                backendETA =
                  null;

                console.warn(
                  "Failed to fetch live ML ETA:",
                  error
                );

                updateDashboard();
              });

          } else {

            updateDashboard();
          }

        })

        .catch(function (error) {

          console.warn(
            "Failed to reload live train 12919:",
            error
          );
        });


      return;
    }


    /*
     * Static/demo train.
     */
    if (!train) return;


    appState.currentTrainId =
      trainId;

    appState.currentTrain =
      train;

    appState.currentStationIndex =
      train.currentStatusDefaults
        .currentStationIndex || 0;

    appState.selectedStationIndex =
      null;


    /*
     * Static train default delay becomes
     * its live baseline for this demo.
     */
    appState.liveDelay =
      Number(
        train.currentStatusDefaults
          .baseDelayMins || 10
      );


    appState.liveInputs.currentDelay =
      appState.liveDelay;


    /*
     * Switching trains resets to LIVE/BASELINE
     * mode rather than carrying an old simulation.
     */
    appState.simulationMode =
      false;


    backendETA = null;


    /*
     * Sync dropdown.
     */
    const select =
      document.getElementById(
        "trainSelect"
      );

    if (select) {
      select.value =
        trainId;
    }


    const delaySlider =
      document.getElementById(
        "currentDelayInput"
      );

    if (delaySlider) {
      delaySlider.value =
        appState.liveDelay;
    }


    const delayVal =
      document.getElementById(
        "currentDelayVal"
      );

    if (delayVal) {

      delayVal.textContent =
        `+${appState.liveDelay} min`;
    }


    if (simulation) {

      simulation.setTrain(
        train,
        appState.currentStationIndex
      );
    }


    updateDashboard();


    if (
      window.AdaptRail &&
      window.AdaptRail.updateWatchlistUI
    ) {

      window.AdaptRail.updateWatchlistUI();
    }
  }


  /*
   * ------------------------------------------------------------
   * INPUT LISTENERS
   * ------------------------------------------------------------
   */

  function setupInputListeners() {

    /*
     * Current Delay
     */
    const delaySlider =
      document.getElementById(
        "currentDelayInput"
      );

    const delayVal =
      document.getElementById(
        "currentDelayVal"
      );


    if (
      delaySlider &&
      delayVal
    ) {

      delaySlider.value =
        appState.liveDelay;

      delayVal.textContent =
        `+${delaySlider.value} min`;


      delaySlider.addEventListener(
        "input",
        function (e) {

          /*
           * Manually changing delay means
           * the user is simulating.
           */
          appState.simulationMode =
            true;


          const val =
            parseInt(
              e.target.value,
              10
            ) || 0;


          appState.liveInputs.currentDelay =
            val;


          delayVal.textContent =
            val >= 0
              ? `+${val} min`
              : `${val} min`;


          updateDashboard();
        }
      );
    }


    /*
     * Weather
     */
    const weatherBtns =
      document.querySelectorAll(
        ".weather-btn"
      );


    weatherBtns.forEach(
      btn => {

        btn.addEventListener(
          "click",
          function () {

            /*
             * Weather scenario is simulation.
             */
            appState.simulationMode =
              true;


            weatherBtns.forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );


            btn.classList.add(
              "active"
            );


            appState.liveInputs.weather =
              btn.dataset.weather;


            updateDashboard();
          }
        );
      }
    );


    /*
     * Signal delay
     */
    const signalSlider =
      document.getElementById(
        "signalDelayInput"
      );

    const signalVal =
      document.getElementById(
        "signalDelayVal"
      );


    if (
      signalSlider &&
      signalVal
    ) {

      signalSlider.value =
        appState.liveInputs.signalDelay;

      signalVal.textContent =
        `+${signalSlider.value} min`;


      signalSlider.addEventListener(
        "input",
        function (e) {

          appState.simulationMode =
            true;


          const val =
            parseInt(
              e.target.value,
              10
            ) || 0;


          appState.liveInputs.signalDelay =
            val;


          signalVal.textContent =
            `+${val} min`;


          updateDashboard();
        }
      );
    }


    /*
     * Congestion
     */
    const congestionSlider =
      document.getElementById(
        "congestionInput"
      );

    const congestionVal =
      document.getElementById(
        "congestionVal"
      );


    if (
      congestionSlider &&
      congestionVal
    ) {

      congestionSlider.value =
        appState.liveInputs.congestionPercent;

      congestionVal.textContent =
        `${congestionSlider.value}%`;


      congestionSlider.addEventListener(
        "input",
        function (e) {

          appState.simulationMode =
            true;


          const val =
            parseInt(
              e.target.value,
              10
            ) || 0;


          appState.liveInputs.congestionPercent =
            val;


          let tag =
            "Normal";


          if (val < 70) {
            tag =
              "Light Traffic";
          }

          else if (val > 150) {
            tag =
              "Gridlock Bottleneck";
          }

          else if (val > 120) {
            tag =
              "High Saturation";
          }


          congestionVal.textContent =
            `${val}% (${tag})`;


          updateDashboard();
        }
      );
    }


    /*
     * Speed restriction
     */
    const tsrSelect =
      document.getElementById(
        "tsrSelect"
      );


    if (tsrSelect) {

      tsrSelect.value =
        appState.liveInputs.speedRestriction;


      tsrSelect.addEventListener(
        "change",
        function (e) {

          appState.simulationMode =
            true;


          appState.liveInputs.speedRestriction =
            e.target.value;


          updateDashboard();
        }
      );
    }


    /*
     * Preceding train gap
     */
    const gapSelect =
      document.getElementById(
        "gapSelect"
      );


    if (gapSelect) {

      gapSelect.value =
        appState.liveInputs.precedingTrainGap;


      gapSelect.addEventListener(
        "change",
        function (e) {

          appState.simulationMode =
            true;


          appState.liveInputs.precedingTrainGap =
            e.target.value;


          updateDashboard();
        }
      );
    }


    /*
     * Historical bias
     */
    const biasRadios =
      document.querySelectorAll(
        "input[name='historicalBias']"
      );


    biasRadios.forEach(
      radio => {

        radio.addEventListener(
          "change",
          function (e) {

            appState.simulationMode =
              true;


            appState.liveInputs.historicalBias =
              e.target.value;


            updateDashboard();
          }
        );
      }
    );
  }


  /*
   * ------------------------------------------------------------
   * SCENARIO PRESETS
   * ------------------------------------------------------------
   */

  function setupScenarioPresets() {

    const presets = {

      ideal: {
        currentDelay: 0,
        weather: "clear",
        signalDelay: 0,
        congestionPercent: 70,
        speedRestriction: "none",
        precedingTrainGap: "clear",
        historicalBias: "optimistic"
      },

      winterFog: {
        currentDelay: 48,
        weather: "fog",
        signalDelay: 15,
        congestionPercent: 135,
        speedRestriction: "tsr50",
        precedingTrainGap: "close",
        historicalBias: "pessimistic"
      },

      signalFail: {
        currentDelay: 35,
        weather: "clear",
        signalDelay: 30,
        congestionPercent: 155,
        speedRestriction: "none",
        precedingTrainGap: "blocking",
        historicalBias: "pessimistic"
      },

      freightAhead: {
        currentDelay: 22,
        weather: "rain",
        signalDelay: 12,
        congestionPercent: 125,
        speedRestriction: "tsr30",
        precedingTrainGap: "close",
        historicalBias: "average"
      },

      speedRecovery: {
        currentDelay: 28,
        weather: "clear",
        signalDelay: 0,
        congestionPercent: 60,
        speedRestriction: "none",
        precedingTrainGap: "clear",
        historicalBias: "optimistic"
      }
    };


    document
      .querySelectorAll(
        ".btn-preset"
      )
      .forEach(
        btn => {

          btn.addEventListener(
            "click",
            function () {

              const presetName =
                btn.dataset.preset;

              const presetData =
                presets[presetName];


              if (presetData) {

                applyInputs(
                  presetData
                );
              }
            }
          );
        }
      );


    /*
     * RESET BUTTON
     *
     * Reset means:
     *     leave simulation
     *     return to live/base delay
     */
    const resetBtn =
      document.getElementById(
        "btnResetDefaults"
      );


    if (resetBtn) {

      resetBtn.addEventListener(
        "click",
        function () {

          const train =
            appState.currentTrain;


          if (!train) {
            return;
          }


          /*
           * IMPORTANT:
           *
           * Reset returns to LIVE MODE.
           */
          appState.simulationMode =
            false;


          /*
           * Restore the preserved
           * live/base delay.
           */
          appState.liveInputs.currentDelay =
            appState.liveDelay;


          appState.liveInputs.weather =
            "clear";

          appState.liveInputs.signalDelay =
            5;

          appState.liveInputs.congestionPercent =
            90;

          appState.liveInputs.speedRestriction =
            "none";

          appState.liveInputs.precedingTrainGap =
            "clear";

          appState.liveInputs.historicalBias =
            "average";


          appState.currentStationIndex =
            train.currentStatusDefaults
              .currentStationIndex || 0;

          appState.selectedStationIndex =
            null;


          /*
           * Update slider.
           */
          const delaySlider =
            document.getElementById(
              "currentDelayInput"
            );

          const delayVal =
            document.getElementById(
              "currentDelayVal"
            );


          if (delaySlider) {

            delaySlider.value =
              appState.liveDelay;
          }


          if (delayVal) {

            delayVal.textContent =
              `+${appState.liveDelay} min`;
          }


          /*
           * Reset weather buttons.
           */
          document
            .querySelectorAll(
              ".weather-btn"
            )
            .forEach(btn => {

              if (
                btn.dataset.weather ===
                "clear"
              ) {

                btn.classList.add(
                  "active"
                );

              } else {

                btn.classList.remove(
                  "active"
                );
              }
            });


          /*
           * Reset signal slider.
           */
          const signalSlider =
            document.getElementById(
              "signalDelayInput"
            );

          const signalVal =
            document.getElementById(
              "signalDelayVal"
            );


          if (signalSlider) {
            signalSlider.value = 5;
          }

          if (signalVal) {
            signalVal.textContent =
              "+5 min";
          }


          /*
           * Reset congestion.
           */
          const congestionSlider =
            document.getElementById(
              "congestionInput"
            );

          const congestionVal =
            document.getElementById(
              "congestionVal"
            );


          if (congestionSlider) {
            congestionSlider.value =
              90;
          }

          if (congestionVal) {
            congestionVal.textContent =
              "90%";
          }


          /*
           * Reset TSR.
           */
          const tsrSelect =
            document.getElementById(
              "tsrSelect"
            );

          if (tsrSelect) {
            tsrSelect.value =
              "none";
          }


          /*
           * Reset preceding train gap.
           */
          const gapSelect =
            document.getElementById(
              "gapSelect"
            );

          if (gapSelect) {
            gapSelect.value =
              "clear";
          }


          /*
           * Reset historical bias.
           */
          const biasRadio =
            document.querySelector(
              "input[name='historicalBias'][value='average']"
            );

          if (biasRadio) {
            biasRadio.checked =
              true;
          }


          if (simulation) {

            simulation.setStationIndex(
              appState.currentStationIndex
            );
          }


          updateDashboard();
        }
      );
    }


    /*
     * Random chaos scenario.
     */
    const chaosBtn =
      document.getElementById(
        "btnRandomChaos"
      );


    if (chaosBtn) {

      chaosBtn.addEventListener(
        "click",
        function () {

          const weathers = [
            "clear",
            "rain",
            "fog",
            "storm"
          ];

          const tsrs = [
            "none",
            "tsr30",
            "tsr50",
            "multiple"
          ];

          const gaps = [
            "clear",
            "moderate",
            "close",
            "blocking"
          ];

          const biases = [
            "optimistic",
            "average",
            "pessimistic"
          ];


          const randomInputs = {

            currentDelay:
              Math.floor(
                Math.random() * 75
              ),

            weather:
              weathers[
              Math.floor(
                Math.random() *
                weathers.length
              )
              ],

            signalDelay:
              Math.floor(
                Math.random() * 25
              ),

            congestionPercent:
              Math.floor(
                60 +
                Math.random() * 100
              ),

            speedRestriction:
              tsrs[
              Math.floor(
                Math.random() *
                tsrs.length
              )
              ],

            precedingTrainGap:
              gaps[
              Math.floor(
                Math.random() *
                gaps.length
              )
              ],

            historicalBias:
              biases[
              Math.floor(
                Math.random() *
                biases.length
              )
              ]
          };


          applyInputs(
            randomInputs
          );
        }
      );
    }
  }


  /*
   * ------------------------------------------------------------
   * APPLY SIMULATION INPUTS
   * ------------------------------------------------------------
   */

  function applyInputs(
    inputs
  ) {

    /*
     * IMPORTANT:
     *
     * Applying any scenario means we are
     * now in SIMULATION MODE.
     *
     * appState.liveDelay remains untouched.
     */
    appState.simulationMode =
      true;


    Object.assign(
      appState.liveInputs,
      inputs
    );


    /*
     * Current delay slider.
     */
    const delaySlider =
      document.getElementById(
        "currentDelayInput"
      );

    const delayVal =
      document.getElementById(
        "currentDelayVal"
      );


    if (
      delaySlider &&
      delayVal
    ) {

      delaySlider.value =
        appState.liveInputs.currentDelay;

      delayVal.textContent =
        `+${appState.liveInputs.currentDelay} min`;
    }


    /*
     * Weather buttons.
     */
    document
      .querySelectorAll(
        ".weather-btn"
      )
      .forEach(
        btn => {

          if (
            btn.dataset.weather ===
            appState.liveInputs.weather
          ) {

            btn.classList.add(
              "active"
            );

          } else {

            btn.classList.remove(
              "active"
            );
          }
        }
      );


    /*
     * Signal delay.
     */
    const signalSlider =
      document.getElementById(
        "signalDelayInput"
      );

    const signalVal =
      document.getElementById(
        "signalDelayVal"
      );


    if (
      signalSlider &&
      signalVal
    ) {

      signalSlider.value =
        appState.liveInputs.signalDelay;

      signalVal.textContent =
        `+${appState.liveInputs.signalDelay} min`;
    }


    /*
     * Congestion.
     */
    const congestionSlider =
      document.getElementById(
        "congestionInput"
      );

    const congestionVal =
      document.getElementById(
        "congestionVal"
      );


    if (
      congestionSlider &&
      congestionVal
    ) {

      congestionSlider.value =
        appState.liveInputs.congestionPercent;

      congestionVal.textContent =
        `${appState.liveInputs.congestionPercent}%`;
    }


    /*
     * TSR.
     */
    const tsrSelect =
      document.getElementById(
        "tsrSelect"
      );

    if (tsrSelect) {

      tsrSelect.value =
        appState.liveInputs.speedRestriction;
    }


    /*
     * Preceding train gap.
     */
    const gapSelect =
      document.getElementById(
        "gapSelect"
      );

    if (gapSelect) {

      gapSelect.value =
        appState.liveInputs.precedingTrainGap;
    }


    /*
     * Historical bias.
     */
    const biasRadio =
      document.querySelector(
        `input[name='historicalBias'][value='${appState.liveInputs.historicalBias}']`
      );


    if (biasRadio) {

      biasRadio.checked =
        true;
    }


    updateDashboard();
  }


  /*
   * ------------------------------------------------------------
   * SIMULATION CONTROLS
   * ------------------------------------------------------------
   */

  function setupSimulationControls() {

    const playBtn =
      document.getElementById(
        "btnSimPlay"
      );

    const stepBtn =
      document.getElementById(
        "btnSimStep"
      );

    const speedBtns =
      document.querySelectorAll(
        ".sim-speed-btn"
      );


    if (playBtn) {

      playBtn.addEventListener(
        "click",
        function () {

          if (simulation) {

            /*
             * Playing the simulator means
             * we are in simulation mode.
             */
            appState.simulationMode =
              true;


            simulation.toggle();

            updateSimulationPlayState();

            updateDashboard();
          }
        }
      );
    }


    if (stepBtn) {

      stepBtn.addEventListener(
        "click",
        function () {

          if (simulation) {

            appState.simulationMode =
              true;

            simulation.tick();
          }
        }
      );
    }


    speedBtns.forEach(
      btn => {

        btn.addEventListener(
          "click",
          function () {

            speedBtns.forEach(
              b =>
                b.classList.remove(
                  "active"
                )
            );


            btn.classList.add(
              "active"
            );


            const speed =
              parseInt(
                btn.dataset.speed,
                10
              ) || 1;


            if (simulation) {

              simulation.setSpeed(
                speed
              );
            }
          }
        );
      }
    );
  }


  /*
   * ------------------------------------------------------------
   * SIMULATION PLAY STATE
   * ------------------------------------------------------------
   */

  function updateSimulationPlayState() {

    const playBtn =
      document.getElementById(
        "btnSimPlay"
      );


    if (
      !playBtn ||
      !simulation
    ) {
      return;
    }


    if (simulation.isPlaying) {

      playBtn.innerHTML =
        "⏸️ Pause Live Track";

      playBtn.classList.add(
        "playing"
      );

    } else {

      playBtn.innerHTML =
        "▶️ Play Live Track";

      playBtn.classList.remove(
        "playing"
      );
    }
  }


  /*
   * ------------------------------------------------------------
   * MOBILE DRAWER
   * ------------------------------------------------------------
   */

  function setupMobileDrawer() {

    const toggleBtn =
      document.getElementById(
        "btnToggleControls"
      );

    const drawer =
      document.getElementById(
        "scenarioControlsPanel"
      );

    const closeBtn =
      document.getElementById(
        "btnCloseDrawer"
      );


    if (
      toggleBtn &&
      drawer
    ) {

      toggleBtn.addEventListener(
        "click",
        function () {

          drawer.classList.toggle(
            "open"
          );
        }
      );
    }


    if (
      closeBtn &&
      drawer
    ) {

      closeBtn.addEventListener(
        "click",
        function () {

          drawer.classList.remove(
            "open"
          );
        }
      );
    }
  }


  /*
   * ------------------------------------------------------------
   * RATING + REVIEWS
   * ------------------------------------------------------------
   */

  function setupRatingAndReviews() {

    const REVIEWS_STORAGE_KEY =
      "adaptrail_user_reviews";


    const defaultReviews = [

      {
        name: "Ananya Sengupta",
        rating: 5,
        train: "12302 Howrah Rajdhani",
        comment:
          "Predicted the Mughalsarai junction delay with 95% accuracy! The arrival time slot saved me from waiting in the cold at Dhanbad.",
        time: "2 hours ago"
      },

      {
        name: "Rohan Verma",
        rating: 5,
        train: "22436 Vande Bharat",
        comment:
          "The animated side train is so cute! The winter fog delay model was spot-on between Tundla and Kanpur.",
        time: "Yesterday"
      },

      {
        name: "Pooja Nair",
        rating: 5,
        train: "12626 Kerala Express",
        comment:
          "Loved the predicted time slot feature! So much better and more realistic than static train tables.",
        time: "3 days ago"
      }

    ];


    let reviews =
      defaultReviews;


    try {

      const saved =
        localStorage.getItem(
          REVIEWS_STORAGE_KEY
        );


      if (saved) {

        reviews =
          JSON.parse(
            saved
          );
      }

    } catch (e) {

      console.warn(
        "Could not load reviews",
        e
      );
    }


    let selectedRating = 5;


    const starEls =
      document.querySelectorAll(
        ".rating-star-btn"
      );

    const ratingLabel =
      document.getElementById(
        "ratingSentimentText"
      );

    const reviewForm =
      document.getElementById(
        "formCommuterReview"
      );

    const nameInput =
      document.getElementById(
        "reviewAuthorName"
      );

    const commentsList =
      document.getElementById(
        "commuterReviewsList"
      );


    const sentimentMap = {

      1:
        "1/5 - Needs Improvement 😕",

      2:
        "2/5 - Fair 🙂",

      3:
        "3/5 - Good & Useful 😊",

      4:
        "4/5 - Very Accurate & Helpful! 😃",

      5:
        "5/5 - Loved AdaptRail! Exceptional! 💖🚂"
    };


    function updateStars(
      rating
    ) {

      starEls.forEach(
        star => {

          const starVal =
            parseInt(
              star.dataset.star,
              10
            );


          if (
            starVal <= rating
          ) {

            star.classList.add(
              "active"
            );

          } else {

            star.classList.remove(
              "active"
            );
          }
        }
      );


      if (ratingLabel) {

        ratingLabel.textContent =
          sentimentMap[rating] ||
          `${rating}/5 Stars`;
      }
    }


    starEls.forEach(
      star => {

        star.addEventListener(
          "click",
          () => {

            selectedRating =
              parseInt(
                star.dataset.star,
                10
              );

            updateStars(
              selectedRating
            );
          }
        );


        star.addEventListener(
          "mouseenter",
          () => {

            const hoverVal =
              parseInt(
                star.dataset.star,
                10
              );

            updateStars(
              hoverVal
            );
          }
        );
      }
    );


    const ratingBox =
      document.getElementById(
        "interactiveRatingBox"
      );


    if (ratingBox) {

      ratingBox.addEventListener(
        "mouseleave",
        () => {

          updateStars(
            selectedRating
          );
        }
      );
    }


    /*
     * Auto-fill author name if signed in.
     */
    try {

      const userSession =
        localStorage.getItem(
          "adaptrail_user_session"
        );


      if (
        userSession &&
        nameInput
      ) {

        const user =
          JSON.parse(
            userSession
          );


        if (
          user &&
          user.name &&
          !nameInput.value
        ) {

          nameInput.value =
            user.name;
        }
      }

    } catch (e) { }


    /*
     * Render reviews.
     */
    function renderReviews() {

      if (!commentsList) {
        return;
      }


      commentsList.innerHTML =
        reviews
          .map(
            r => `
              <div class="review-bubble-card">

                <div class="rev-header">

                  <div class="rev-author-group">

                    <span class="rev-avatar">
                      👤
                    </span>

                    <div>

                      <div class="rev-author-name">
                        ${escapeHtml(r.name)}

                        <span class="rev-verified-pill">
                          ✓ Verified Commuter
                        </span>
                      </div>

                      <div class="rev-train-tag">
                        🚆 ${escapeHtml(
              r.train ||
              "AdaptRail Traveler"
            )}
                        •
                        <span class="rev-time">
                          ${r.time}
                        </span>
                      </div>

                    </div>

                  </div>


                  <div
                    class="rev-stars"
                    title="${r.rating} out of 5 stars"
                  >
                    ${"★".repeat(r.rating)}
                    ${"☆".repeat(5 - r.rating)}
                  </div>

                </div>


                <div class="rev-comment-text">
                  "${escapeHtml(r.comment)}"
                </div>

              </div>
            `
          )
          .join("");
    }


    function escapeHtml(
      str
    ) {

      if (!str) {
        return "";
      }


      return str
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        );
    }


    /*
     * Celebration effect.
     */
    function launchCelebrationEffect() {

      const banner =
        document.getElementById(
          "thankYouAnimationBanner"
        );


      if (!banner) {
        return;
      }


      for (
        let i = 0;
        i < 16;
        i++
      ) {

        const particle =
          document.createElement(
            "span"
          );


        particle.className =
          "floating-heart-particle";


        const symbols = [
          "💖",
          "✨",
          "🚂",
          "🎉",
          "🌟",
          "🌸"
        ];


        particle.textContent =
          symbols[
          Math.floor(
            Math.random() *
            symbols.length
          )
          ];


        particle.style.left =
          `${Math.random() * 85 + 5}%`;


        particle.style.top =
          `${Math.random() * 60 + 20}%`;


        particle.style.animationDelay =
          `${Math.random() * 0.4}s`;


        banner.appendChild(
          particle
        );


        setTimeout(
          () =>
            particle.remove(),
          2500
        );
      }
    }


    /*
     * Review submission.
     */
    if (reviewForm) {

      reviewForm.addEventListener(
        "submit",
        (e) => {

          e.preventDefault();


          const authorName =
            (
              nameInput &&
              nameInput.value.trim()
            ) ||
            "Commuter";


          const commentInput =
            document.getElementById(
              "reviewCommentInput"
            );


          const commentText =
            commentInput
              ? commentInput.value.trim()
              : "";


          const trainTag =
            appState.currentTrain
              ? `${appState.currentTrain.number} ${appState.currentTrain.name}`
              : "AdaptRail Passenger";


          if (!commentText) {
            return;
          }


          const newReview = {

            name:
              authorName,

            rating:
              selectedRating,

            train:
              trainTag,

            comment:
              commentText,

            time:
              "Just now"
          };


          reviews.unshift(
            newReview
          );


          try {

            localStorage.setItem(
              REVIEWS_STORAGE_KEY,
              JSON.stringify(
                reviews
              )
            );

          } catch (e) { }


          renderReviews();

          launchCelebrationEffect();


          if (
            window.AdaptRail &&
            window.AdaptRail.showNotification
          ) {

            window.AdaptRail.showNotification(
              "Thank you for your rating & feedback! 💖🚂",
              "success"
            );
          }


          if (commentInput) {

            commentInput.value =
              "";
          }


          selectedRating =
            5;

          updateStars(
            5
          );
        }
      );
    }


    renderReviews();

    updateStars(5);
  }


  /*
   * ------------------------------------------------------------
   * UPDATE DASHBOARD
   * ------------------------------------------------------------
   */

  function updateDashboard() {

    const train =
      appState.currentTrain;

    const currentIdx =
      appState.currentStationIndex;

    const selectedIdx =
      appState.selectedStationIndex;


    if (
      !train ||
      !window.RailwayETA.calculateDynamicETAs
    ) {
      return;
    }


    /*
     * --------------------------------------------------------
     * IMPORTANT LIVE/SIMULATION FIX
     * --------------------------------------------------------
     *
     * Never blindly use liveInputs.currentDelay.
     *
     * LIVE MODE:
     *     use RailRadar delay
     *
     * SIMULATION MODE:
     *     use scenario delay
     */

    const activeDelay =
      getActiveDelay();


    /*
     * Create a copy so the original
     * liveInputs object is not corrupted.
     */
    const dashboardInputs = {
      ...appState.liveInputs,

      currentDelay:
        activeDelay
    };


    /*
     * Existing frontend ETA engine.
     *
     * It now receives the correct active delay.
     */
    const calcResult =
      window.RailwayETA.calculateDynamicETAs(
        train,
        currentIdx,
        dashboardInputs
      );


    /*
     * --------------------------------------------------------
     * BACKEND ML RESULT
     * --------------------------------------------------------
     *
     * Backend ML is only used when available.
     *
     * The backend currently predicts the immediate
     * next section for live train 12919.
     */
    if (
      backendETA &&
      train.number === "12919" &&
      backendETA.stations &&
      backendETA.stations.length > 0
    ) {

      const mlStation =
        backendETA.stations[0];


      /*
       * The backend prediction belongs to
       * the station immediately after the
       * current station.
       */
      const nextIndex =
        currentIdx + 1;


      const dashboardStation =
        calcResult.stationResults[
        nextIndex
        ];


      if (dashboardStation) {

        if (
          mlStation.predicted_eta
        ) {

          dashboardStation.predictedTime =
            mlStation.predicted_eta;

          dashboardStation.predictedSlot =
            mlStation.predicted_eta;
        }


        if (
          mlStation.delay !== undefined
        ) {

          dashboardStation.delay =
            Number(
              mlStation.delay
            );
        }


        if (
          mlStation.confidence !== undefined
        ) {

          dashboardStation.confidence =
            Number(
              mlStation.confidence
            );
        }
      }


      /*
       * Use backend confidence when available.
       */
      if (
        mlStation.confidence !== undefined
      ) {

        calcResult.confidence =
          Number(
            mlStation.confidence
          );
      }


      /*
       * Keep the ML contribution available
       * to the existing waterfall if supported.
       */
      if (
        calcResult.breakdown
      ) {

        calcResult.breakdown.mlPrediction =
          Number(
            mlStation.delay || 0
          );
      }
    }


    /*
     * --------------------------------------------------------
     * RENDER HEADER
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderHeader
    ) {

      window.RailwayETA.renderHeader(
        train
      );
    }


    /*
     * --------------------------------------------------------
     * RENDER LIVE BANNER
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderLiveBanner
    ) {

      window.RailwayETA.renderLiveBanner(

        train,

        currentIdx,

        calcResult,

        dashboardInputs,

        selectedIdx,

        function onResetDestination() {

          appState.selectedStationIndex =
            train.stations.length - 1;

          updateDashboard();
        }
      );
    }


    /*
     * --------------------------------------------------------
     * RENDER TRACK SCHEMATIC
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderTrackSchematic
    ) {

      window.RailwayETA.renderTrackSchematic(

        train,

        currentIdx,

        dashboardInputs,

        calcResult.signalInfo,

        selectedIdx,

        function onInspect(idx) {

          appState.selectedStationIndex =
            idx;

          updateDashboard();
        }
      );
    }


    /*
     * --------------------------------------------------------
     * SIDE ANIMATION
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderSideAnimation
    ) {

      window.RailwayETA.renderSideAnimation(

        train,

        currentIdx,

        dashboardInputs,

        calcResult
      );
    }


    /*
     * --------------------------------------------------------
     * CONFIDENCE
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderConfidenceGauge
    ) {

      window.RailwayETA.renderConfidenceGauge(
        calcResult.confidence
      );
    }


    /*
     * --------------------------------------------------------
     * DELAY WATERFALL
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderDelayWaterfall
    ) {

      window.RailwayETA.renderDelayWaterfall(
        calcResult.breakdown
      );
    }


    /*
     * --------------------------------------------------------
     * TIMELINE
     * --------------------------------------------------------
     */

    if (
      window.RailwayETA.renderTimeline
    ) {

      window.RailwayETA.renderTimeline(

        calcResult.stationResults,

        currentIdx,

        selectedIdx,

        function onRelocate(
          newCurrentIdx
        ) {

          appState.currentStationIndex =
            newCurrentIdx;


          if (simulation) {

            simulation.setStationIndex(
              newCurrentIdx
            );
          }


          updateDashboard();
        },


        function onInspect(
          newSelectedIdx
        ) {

          appState.selectedStationIndex =
            newSelectedIdx;


          updateDashboard();


          if (
            window.AdaptRail &&
            window.AdaptRail.showNotification
          ) {

            const stn =
              calcResult.stationResults[
              newSelectedIdx
              ];


            if (stn) {

              window.AdaptRail.showNotification(
                `📍 Showing arrival slot for ${stn.name}: ${stn.predictedSlot}`,
                "info"
              );
            }
          }
        }
      );
    }
  }


  /*
   * ------------------------------------------------------------
   * EXPORT PUBLIC API
   * ------------------------------------------------------------
   */

  window.RailwayETA.initApp =
    initApp;

  window.RailwayETA.updateDashboard =
    updateDashboard;

  window.RailwayETA.appState =
    appState;

  window.RailwayETA.switchTrain =
    switchTrain;


  /*
   * ------------------------------------------------------------
   * START APPLICATION
   * ------------------------------------------------------------
   */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initApp
    );

  } else {

    initApp();
  }

})();