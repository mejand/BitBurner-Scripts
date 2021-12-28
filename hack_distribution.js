/**
 * A class to handle batch creation on a single host server.
 */
export class BatchHandler {
  /**
   * Create an instance of the batch handler.
   * @param {import(".").NS} ns
   * @param {string} targetName - The name of the target server.
   * @param {string} hostName - The name of the host server.
   * @param {number} ramPerScript - The amount of ram needed to run any script.
   */
  constructor(ns, targetName, hostName, ramPerScript) {
    /**
     * The server object of the target.
     * @type {MyServer}
     */
    this.targetServer = new MyServer(ns, targetName, ramPerScript);

    /**
     * The server object of the host server.
     * @type {MyServer}
     */
    this.hostServer = new MyServer(ns, hostName, ramPerScript);

    /**
     * All batches that shall be executed on this host.
     * @type {Batch[]}
     */
    this.batches = [];

    /**
     * The amount of time it takes to run the hack script.
     * @type {number}
     */
    if (this.hostServer.useable) {
      this.hackTime = ns.getHackTime(targetName);
    } else {
      this.hackTime = 0;
    }

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    if (this.hostServer.useable) {
      this.growTime = ns.getGrowTime(targetName);
    } else {
      this.growTime = 0;
    }

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    if (this.hostServer.useable) {
      this.weakenTime = ns.getWeakenTime(targetName);
    } else {
      this.weakenTime = 0;
    }

    /**
     * The amount of time it takes to run a single hack, grow, weaken batch.
     */
    this.batchTime = Math.max(this.hackTime, this.growTime, this.weakenTime);

    /**
     * The time in milliseconds that the weaken script has to be delayed to ensure
     * it finishes at the end of a cycle.
     * @type {number}
     */
    this.weakenDelay = Math.max(
      0, // ensure the dealy can not be negative
      this.growTime - this.weakenTime + 1, // if weaken finishes before grow it must be delayed
      this.hackTime - this.weakenTime + 1 // if weaken finishes before hack it must be delayed
    );

    /**
     * The time in milliseconds that the grow script has to be delayed to ensure
     * it finishes before the weaken, but after the hack scripts.
     * @type {number}
     */
    this.growDelay = Math.max(
      0,
      this.hackTime - this.growTime + 1,
      this.batchTime - this.growTime - 1 // the grow script must be delayed so it finishes shortly before weaken
    );

    /**
     * The time in milliseconds that the hack script has to be delayed to ensure
     * it finishes before the grow script.
     * @type {number}
     */
    this.hackDelay = Math.max(0, this.batchTime - this.hackTime - 2);

    /**
     * The load of the host server after the scripts have been started in percent.
     * @type {number}
     */
    if (this.hostServer.useable) {
      this.load = 0;
    } else {
      // ensure that non useable servers do not falsely impact averaged load calculations
      this.load = 100;
    }
  }

  /**
   * Update the batch information and prepare for execution of the scripts.
   * @param {import(".").NS} ns
   */
  update(ns) {
    if (this.hostServer.useable) {
      /**
       * The amount of hack threads needed to steal all money from the target server.
       * @type {number}
       */
      let fullBatchHackThreads = Math.floor(
        1 / ns.hackAnalyze(this.targetServer.name)
      );

      /**
       * The amount of grow threads needed to compensate the hack threads.
       * @type {number}
       */
      let fullBatchGrowThreads = this.getGrowThreads(ns, fullBatchHackThreads);

      /**
       * The amount of weaken threads needed to compensate the hack and grow threads.
       * @type {number}
       */
      let fullBatchWeakenThreads = this.getWeakenThreads(
        ns,
        fullBatchHackThreads,
        fullBatchGrowThreads
      );

      /**
       * The total number of threads to run a full batch.
       * @type {number}
       */
      let fullBatchThreads =
        fullBatchHackThreads + fullBatchGrowThreads + fullBatchWeakenThreads;

      /**
       * The amount of full threads that can be run on the host server.
       * @type {number}
       */
      let fullBatchCount = Math.floor(
        this.hostServer.threadsAvailable / fullBatchThreads
      );

      // create all full batches and add them to the queue
      for (let i = 0; i < fullBatchCount; i++) {
        this.batches.push(
          new Batch(
            this.targetServer.name,
            fullBatchHackThreads,
            fullBatchGrowThreads,
            fullBatchWeakenThreads,
            this.hackDelay,
            this.growDelay,
            this.weakenDelay
          )
        );
      }

      /**
       * The amount of threads remaining on the host server after all full batches
       * have been executed.
       * @type {number}
       */
      let remainingThreads =
        this.hostServer.threadsAvailable % fullBatchThreads;

      // create a batch to fill the reamining threads as best as possible
      if (remainingThreads >= 3) {
        /**
         * The factor by which the full batch has to be reduced to fill the remaining threads.
         * @type {number}
         */
        let scaling = remainingThreads / fullBatchThreads;

        /**
         * The amount of weaken threads to fill out the remaining threads. The value is at least 1
         * to ensure that the higher number of hack threads does not overwrite it.
         * @type {number}
         */
        let remainingWeakenThreads = Math.max(
          1,
          fullBatchWeakenThreads * scaling
        );
        remainingThreads -= remainingWeakenThreads;

        /**
         * The amount of grow threads to fill out the remaining threads. The value is at least 1
         * to ensure that the higher number of hack threads does not overwrite it.
         * @type {number}
         */
        let remainingGrowThreads = Math.max(1, fullBatchGrowThreads * scaling);
        remainingThreads -= remainingGrowThreads;

        // create the remaining batch and add it to the queue
        this.batches.push(
          new Batch(
            this.targetServer.name,
            remainingThreads,
            remainingGrowThreads,
            remainingWeakenThreads,
            this.hackDelay,
            this.growDelay,
            this.weakenDelay
          )
        );
      }
    }
  }

  /**
   * Start the scripts for as many batches as possible.
   * @param {import(".").NS} ns
   * @param {number} batchNumberOffset - The number of batches that have already been created on others hosts.
   */
  execute(ns, batchNumberOffset) {
    if (this.hostServer.useable) {
      for (let batch of this.batches) {
        batch.offsetCount = batchNumberOffset;
        batch.execute(ns, this.hostServer);
      }

      this.updateLoad(ns);
    }
  }

  /**
   * Update the value of the number of grow threads to compensate the hack threads.
   * @param {import(".").NS} ns
   * @param {number} hackThreads - The numer of hacking threads that shall be compensated.
   * @returns {number} The number of threads needed to complete the hack threads.
   */
  getGrowThreads(ns, hackThreads) {
    /**
     * The factor that the available money needs to be multiplied with to get the deltaMoney.
     * @type {number}
     */
    var growFactor = 1 + hackThreads * ns.hackAnalyze(this.targetServer.name);

    /**
     * The amount of threads needed to compensate the hack threads.
     * @type {number}
     */
    var growThreads = Math.ceil(
      ns.growthAnalyze(
        this.targetServer.name,
        growFactor,
        ns.getServer(this.hostServer.name).cpuCores
      )
    );

    return growThreads;
  }

  /**
   * Update the value of the number of weaken threads to compensate the hack and grow threads.
   * @param {import(".").NS} ns
   * @param {number} hackThreads - The number of threads dedicated to hacking.
   * @param {number} growThreads - The number of threads dedicated to growing.
   * @returns {number} The number of threads needed to compensate the hack and grow threads.
   */
  getWeakenThreads(ns, hackThreads, growThreads) {
    /**
     * The security score that needs to be removed to compensate hacking and growing.
     * @type {number}
     */
    var deltaSecurity =
      ns.hackAnalyzeSecurity(hackThreads) +
      ns.growthAnalyzeSecurity(growThreads);

    /**
     * The security score that will be removed by one thread of the weaken script.
     * @type {number}
     */
    var weakenReduction = ns.weakenAnalyze(
      1,
      ns.getServer(this.hostServer.name).cpuCores
    );

    /**
     * The number of threads needed to compensate the hack and grow threads.
     * @type {number}
     */
    var weakenThreads = Math.ceil(deltaSecurity / weakenReduction);

    return weakenThreads;
  }

  /**
   * Update the load value after starting the scripts.
   * @param {import(".").NS} ns
   */
  updateLoad(ns) {
    if (this.hostServer.useable) {
      this.load =
        (this.hostServer.threadsAvailable / this.hostServer.threadsMax) * 100;
    }
  }
}

/**
 * A batch of hack, grow and weaken scripts with defined delay times.
 */
export class Batch {
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
   * The total number of threads needed to execute the batch.
   * @type {number}
   */
  get threadsTotal() {
    return this.hackThreads + this.growThreads + this.weakenThreads;
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
