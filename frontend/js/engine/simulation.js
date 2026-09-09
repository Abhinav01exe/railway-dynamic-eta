/**
 * Real-Time Simulation Engine
 * Handles live train movement, ticking, speed changes, and periodic telemetry updates.
 */

(function() {
  window.RailwayETA = window.RailwayETA || {};

  class TrainSimulation {
    constructor(options = {}) {
      this.train = options.train;
      this.currentStationIndex = options.currentStationIndex || 0;
      this.speedMultiplier = 1;
      this.isPlaying = false;
      this.intervalId = null;
      this.onTick = options.onTick || (() => {});
    }

    setTrain(train, startStationIndex = 0) {
      this.pause();
      this.train = train;
      this.currentStationIndex = startStationIndex;
    }

    setStationIndex(index) {
      if (this.train && index >= 0 && index < this.train.stations.length) {
        this.currentStationIndex = index;
      }
    }

    setSpeed(multiplier) {
      this.speedMultiplier = multiplier;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    }

    play() {
      if (this.isPlaying) return;
      this.isPlaying = true;

      const tickRateMs = 1000 / Math.min(30, this.speedMultiplier);

      this.intervalId = setInterval(() => {
        this.tick();
      }, tickRateMs);
    }

    pause() {
      this.isPlaying = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    }

    toggle() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
      return this.isPlaying;
    }

    tick() {
      if (!this.train) return;

      if (this.currentStationIndex >= this.train.stations.length - 1) {
        this.pause();
        this.onTick({
          finished: true,
          currentStationIndex: this.currentStationIndex
        });
        return;
      }

      this.currentStationIndex += 1;

      this.onTick({
        finished: this.currentStationIndex >= this.train.stations.length - 1,
        currentStationIndex: this.currentStationIndex
      });
    }
  }

  window.RailwayETA.TrainSimulation = TrainSimulation;
})();
