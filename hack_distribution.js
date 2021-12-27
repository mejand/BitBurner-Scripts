/**
 * A class to handle batch creation on a single host server.
 */
export class BatchHandler {
  /**
   * Create an instance of the batch handler.
   * @param {import(".").NS} ns
   * @param {string} targetName - The name of the target server.
   * @param {string} hostName - The name of the host server.
   * @param {number} hackRam - The amount of ram needed by the hack script.
   * @param {number} growRam - The amount of ram needed by the grow script.
   * @param {number} weakenRam - The amount of ram needed by the weaken script.
   */
  constructor(ns, targetName, hostName, hackRam, growRam, weakenRam) {
    /**
     * The server object of the target.
     * @type {import(".").Server}
     */
    this.targetServer = ns.getServer(targetName);

    /**
     * The server object of the host server.
     * @type {import(".").Server}
     */
    this.hostServer = ns.getServer(hostName);

    /**
     * Indcates if the host server has free ram.
     * @type {boolean}
     */
    this.useable = this.hostServer.maxRam > 0;

    /**
     * The amount of ram needed by the hack script.
     * @type {number}
     */
    this.hackRam = hackRam;

    /**
     * The amount of ram needed by the grow script.
     * @type {number}
     */
    this.growRam = growRam;

    /**
     * The amount of ram needed by the weaken script.
     * @type {number}
     */
    this.weakenRam = weakenRam;

    /**
     * The number of threads dedicated to hacking.
     * @type {number}
     */
    this.hackThreads = 1;

    /**
     * The number of threads needed to compensate the effect of hacking.
     * @type {number}
     */
    this.growThreads = 0;

    /**
     * The number of threads needed to compensate the effect of hacking and growing.
     * @type {number}
     */
    this.weakenThreads = 0;

    /**
     * The amount of time that the execution of hacking is delayed
     * compared to the start of a single batch.
     * @type {number}
     */
    this.hackDelay = 0;

    /**
     * The amount of time that the execution of growing is delayed
     * compared to the start of a single batch.
     * @type {number}
     */
    this.growDelay = 0;

    /**
     * The amount of time that the execution of weakening is delayed
     * compared to the start of a single batch.
     * @type {number}
     */
    this.weakenDelay = 0;

    /**
     * The amount of time it takes to run the hack script.
     * @type {number}
     */
    if (this.useable) {
      this.hackTime = ns.getHackTime(hostName);
    } else {
      this.hackTime = 0;
    }

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    if (this.useable) {
      this.growTime = ns.getGrowTime(hostName);
    } else {
      this.growTime = 0;
    }

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    if (this.useable) {
      this.weakenTime = ns.getWeakenTime(hostName);
    } else {
      this.weakenTime = 0;
    }

    /**
     * The amount of time it takes to run a single hack, grow, weaken batch.
     */
    this.batchTime = Math.max(this.hackTime, this.growTime, this.weakenTime);

    /**
     * The amount of ram available on the host server before
     * any scripts are started.
     * @type {number}
     */
    this.availableTotalRam = this.hostServer.maxRam - this.hostServer.ramUsed;

    /**
     * The amount of ram needed to run a single hack, grow, weaken batch.
     * @type {number}
     */
    this.ramPerBatch = 0;

    /**
     * The number of batches that can be run on the host server.
     * @type {number}
     */
    this.batchCount = 0;

    /**
     * The load of the host server after the scripts have been started in percent.
     * @type {number}
     */
    this.load = 0;
  }

  /**
   * Update the batch information and prepare for execution of the scripts.
   * @param {import(".").NS} ns
   */
  update(ns) {
    if (this.useable) {
      this.updateGrowThreads(ns);
      this.updateHackThreads(ns);
      this.consolidateBatches(ns);
      this.updateBatchCount();
      this.updateDelays();
    }
  }

  /**
   * Start the scripts for as many batches as possible.
   * @param {import(".").NS} ns
   * @param {number} batchNumberOffset - The number of batches that have already been created on others hosts.
   */
  execute(ns, batchNumberOffset) {
    if (this.useable) {
      for (let i = 0; i < this.batchCount; i++) {
        // start the scripts with their corresponding delays (10ms between batches)
        // the offset caused by other ost servers must also be considered
        if (this.hackThreads > 0) {
          ns.exec(
            "hack.js",
            this.hostServer.hostname,
            this.hackThreads,
            this.targetServer.hostname,
            this.hackDelay + (i + batchNumberOffset) * 10
          );
        }
        if (this.growThreads > 0) {
          ns.exec(
            "grow.js",
            this.hostServer.hostname,
            this.growThreads,
            this.targetServer.hostname,
            this.growDelay + (i + batchNumberOffset) * 10
          );
        }
        if (this.weakenThreads > 0) {
          ns.exec(
            "weaken.js",
            this.hostServer.hostname,
            this.weakenThreads,
            this.targetServer.hostname,
            this.weakenDelay + (i + batchNumberOffset) * 10
          );
        }
      }

      this.updateLoad(ns);
    }
  }

  /**
   * Update the value of the number of grow threads to compensate the hack threads.
   * @param {import(".").NS} ns
   */
  updateGrowThreads(ns) {
    /**
     * The factor that the available money needs to be multiplied with to get the deltaMoney.
     * @type {number}
     */
    var growFactor =
      1 + this.hackThreads * ns.hackAnalyze(this.targetServer.hostname);

    this.growThreads = Math.ceil(
      ns.growthAnalyze(
        this.hostServer.hostname,
        growFactor,
        this.hostServer.cpuCores
      )
    );
  }

  /**
   * Update the value of the number of weaken threads to compensate the hack and grow threads.
   * @param {import(".").NS} ns
   */
  updateHackThreads(ns) {
    /**
     * The security score that needs to be removed to compensate hacking and growing.
     * @type {number}
     */
    var deltaSecurity =
      ns.hackAnalyzeSecurity(this.hackThreads) +
      ns.growthAnalyzeSecurity(this.growThreads);

    /**
     * The security score that will be removed by one thread of the weaken script.
     * @type {number}
     */
    var weakenReduction = ns.weakenAnalyze(1, this.hostServer.cpuCores);

    this.weakenThreads = Math.ceil(deltaSecurity / weakenReduction);
  }

  /**
   * Update the ram needed to run a single thread.
   */
  updateRamPerBatch() {
    this.ramPerBatch =
      this.hackThreads * this.hackRam +
      this.growThreads * this.growRam +
      this.weakenThreads * this.weakenRam;
  }

  /**
   * Update the delay times for the scripts in a single batch.
   */
  updateDelays() {
    // The weaken script must finish last to compensate the security impact of hack and weaken.
    this.weakenDelay = Math.max(
      0, // ensure the dealy can not be negative
      this.growTime - this.weakenTime + 1, // if weaken finishes before grow it must be delayed
      this.hackTime - this.weakenTime + 1 // if weaken finishes before hack it must be delayed
    );

    // the grow script must finish between the hack and weaken scripts
    this.growDelay = Math.max(
      0,
      this.hackTime - this.growTime + 1,
      this.batchTime - this.growTime - 1 // the grow script must be delayed so it finishes shortly before weaken
    );

    // the hack script must finish shortly before the grow and weaken scripts
    this.hackDelay = Math.max(0, this.batchTime - this.hackTime - 2);
  }

  /**
   * Try to consolidate the 1 hack batches into larger operations to reduce calculations.
   * @param {import(".").NS} ns
   */
  consolidateBatches(ns) {
    /**
     * The number of hack threads needed to steal all money from the target Server.
     * @type {number}
     */
    let hackThreadsConsolidated = Math.floor(
      1.0 / ns.hackAnalyze(this.targetServer.hostname)
    );

    /**
     * The amount of ram needed to run a consolidated batch (steel all money from the target server).
     * @type {number}
     */
    let ramPerBatchConsolidated =
      hackThreadsConsolidated * this.hackRam +
      this.growThreads * hackThreadsConsolidated * this.growRam +
      this.weakenThreads * hackThreadsConsolidated * this.weakenRam;

    /**
     * The amount of consolidated batches that can be run on the current host server.
     * @type {number}
     */
    let batchCountConsolidated = Math.floor(
      this.availableTotalRam / ramPerBatchConsolidated
    );

    /**
     * The factor that the consolidated hack thread count has to be multiplied with to get the maximum
     * possible hack threads per consolidated batch given the available RAM.
     * @type {number}
     */
    let batchConsolidatedScaling = Math.min(
      1.0,
      this.availableTotalRam / ramPerBatchConsolidated
    );

    // scale the thread counts with the consolidated batch data
    this.hackThreads = Math.floor(
      this.hackThreads * hackThreadsConsolidated * batchConsolidatedScaling
    );
    this.growThreads = Math.floor(
      this.growThreads * hackThreadsConsolidated * batchConsolidatedScaling
    );
    this.weakenThreads = Math.floor(
      this.weakenThreads * hackThreadsConsolidated * batchConsolidatedScaling
    );

    // update the batch specific metrics
    this.batchCount = batchCountConsolidated;
    this.ramPerBatch = ramPerBatchConsolidated;
  }

  /**
   * Update the load value after starting the scripts.
   * @param {import(".").NS} ns
   */
  updateLoad(ns) {
    if (this.hostServer.maxRam > 0) {
      this.load =
        (ns.getServerUsedRam(this.hostServer.hostname) /
          this.hostServer.maxRam) *
        100;
    } else {
      this.load = 100;
    }
  }
}
