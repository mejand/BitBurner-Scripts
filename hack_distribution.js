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
    if (this.useable) {
      this.hackThreads = 1;
    } else {
      this.hackThreads = 0;
    }

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
      this.hackTime = ns.getHackTime(targetName);
    } else {
      this.hackTime = 0;
    }

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    if (this.useable) {
      this.growTime = ns.getGrowTime(targetName);
    } else {
      this.growTime = 0;
    }

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    if (this.useable) {
      this.weakenTime = ns.getWeakenTime(targetName);
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
      this.updateRamPerBatch();
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
        this.targetServer.hostname,
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
   * Update the number of batches that can be run on the host.
   */
  updateBatchCount() {
    // guard against division by zero
    if (this.ramPerBatch > 0) {
      this.batchCount = Math.floor(this.availableTotalRam / this.ramPerBatch);
    } else {
      this.batchCount = 0;
    }
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
      this.hackThreads * hackThreadsConsolidated * this.hackRam +
      this.growThreads * hackThreadsConsolidated * this.growRam +
      this.weakenThreads * hackThreadsConsolidated * this.weakenRam;

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
  }

  /**
   * Update the load value after starting the scripts.
   * @param {import(".").NS} ns
   */
  updateLoad(ns) {
    if (this.useable) {
      this.load =
        (ns.getServerUsedRam(this.hostServer.hostname) /
          this.hostServer.maxRam) *
        100;
    } else {
      this.load = 100;
    }
  }
}

/**
 * A batch of hack, grow and weaken scripts with defined delay times.
 */
class Batch {
  /**
   * The amount of time in milliseconds that shall be maintained between batches.
   * @type {number}
   */
  static offsetPadding = 10;

  /**
   * Create an instance of batch.
   * @param {string} targetName - The name of the target server.
   * @param {number} hackThreads - The number of threads dedicated to hacking.
   * @param {number} growThreads - The number of threads dedicated to growing.
   * @param {number} weakenThreads - The number of threads dedicated to weakening.
   * @param {number} hackDelay - The time in milliseconds that the execution of the hack script shall be delayed.
   * @param {number} growDelay - The time in milliseconds that the execution of the grow script shall be delayed.
   * @param {number} weakenDelay - The time in milliseconds that the execution of the weaken script shall be delayed.
   */
  constructor(
    targetName = "n00dles",
    hackThreads = 0,
    growThreads = 0,
    weakenThreads = 0,
    hackDelay = 0,
    growDelay = 0,
    weakenDelay = 0
  ) {
    /**
     * The name of the target server.
     * @type {string}
     */
    this.targetName = targetName;

    /**
     * The number of threads dedicated to hacking.
     * @type {number}
     */
    this.hackThreads = hackThreads;

    /**
     * The number of threads dedicated to growing.
     * @type {number}
     */
    this.growThreads = growThreads;

    /**
     * The number of threads dedicated to weakening.
     * @type {number}
     */
    this.weakenThreads = weakenThreads;

    /**
     * The time in milliseconds that the execution of the hack script shall be delayed.
     * @type {number}
     */
    this.hackDelay = hackDelay;

    /**
     * The time in milliseconds that the execution of the grow script shall be delayed.
     * @type {number}
     */
    this.growDelay = growDelay;

    /**
     * The time in milliseconds that the execution of the weaken script shall be delayed.
     * @type {number}
     */
    this.weakenDelay = weakenDelay;

    /**
     * The number of batches that shall be executed before this batch.
     * @type {number}
     */
    this._offsetCount = 0;
  }

  /**
   * @param {number} newCount - The number of batches that shall be executed before this batch.
   */
  set offsetCount(newCount) {
    /**
     * The actual offset time in milliseconds that shall be added to this batch
     * to maintain the needed distance to the prior batch.
     * @type {number}
     */
    let offsetActual = offsetCount * Batch.offsetPadding;

    this.hackDelay += offsetActual;
    this.growDelay += offsetActual;
    this.weakenDelay += offsetActual;

    this._offsetCount = newCount;
  }

  get offsetCount() {
    return this._offsetCount;
  }

  /**
   * There are still scripts that have to be started in this batch.
   * @type {boolean}
   */
  get unfinished() {
    return (
      this.hackThreads > 0 && this.growThreads > 0 && this.weakenThreads > 0
    );
  }

  /**
   * Execute as many of the scripts in the batch as possible on the given server.
   * @param {import(".").NS} ns
   * @param {MyServer} server - The MyServer object on which the scripts shall be executed.
   */
  execute(ns, server) {
    if (server.useable) {
      /**
       * The number of hack threads that can be started on this server.
       * @type {number}
       */
      let hackThreadsToExecute = Math.min(
        server.threadsAvailable,
        this.hackThreads
      );
      server.threadsAvailable -= hackThreadsToExecute;

      /**
       * The number of grow threads that can be started on this server.
       * @type {number}
       */
      let growThreadsToExecute = Math.min(
        server.threadsAvailable,
        this.growThreads
      );
      server.threadsAvailable -= growThreadsToExecute;

      /**
       * The number of weaken threads that can be started on this server.
       * @type {number}
       */
      let weakenThreadsToExecute = Math.min(
        server.threadsAvailable,
        this.weakenThreads
      );
      server.threadsAvailable -= weakenThreadsToExecute;

      if (hackThreadsToExecute > 0) {
        ns.exec(
          "hack.js",
          server.name,
          hackThreadsToExecute,
          this.targetName,
          this.hackDelay
        );
      }

      if (growThreadsToExecute > 0) {
        ns.exec(
          "grow.js",
          server.name,
          growThreadsToExecute,
          this.targetName,
          this.growDelay
        );
      }

      if (weakenThreadsToExecute > 0) {
        ns.exec(
          "weaken.js",
          server.name,
          weakenThreadsToExecute,
          this.targetName,
          this.weakenDelay
        );
      }
    }
  }
}

/**
 * All data of a server relevant for batch execution.
 */
class MyServer {
  /**
   * Create an instance of the MyServer class.
   * @param {import(".").NS} ns
   * @param {string} name - The mane of the server.
   * @param {number} ramPerScript - The amount of ram needed to run any script.
   */
  constructor(ns, name, ramPerScript) {
    /**
     * The name of the server.
     * @type {string}
     */
    this.name = name;

    /**
     * The amount of ram available on the server (when this instance was created).
     * @type {number}
     */
    this.ramAvailable = ns.getServerMaxRam(name) - ns.getServerUsedRam;

    /**
     * The maximum nunber of threads that can be run on the server.
     * @type {number}
     */
    this.threadsMax = Math.floor(ns.getServerMaxRam / ramPerScript);

    /**
     * The amount of threads available (when this instance was created).
     * @type {number}
     */
    this.threadsAvailable = Math.floor(this.ramAvailable / ramPerScript);
  }

  /**
   * Does this server have threads available for tasking.
   * @type {boolean}
   */
  get useable() {
    return this.threadsAvailable > 0;
  }
}
