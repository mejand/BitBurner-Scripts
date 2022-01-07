import { MyServer } from "./utilServer.js";

/**
 * The instructions needed to run a hack, grow, weaken cycle against a target server.
 */
export class SingleBatch {
  /**
   * Create an instance of a batch.
   * @param {import("..").NS} ns
   * @param {string} targetName - The name of the target server.
   * @param {number} id - Optional: a unique ID for the batch.
   */
  constructor(ns, targetName, id = 0) {
    /**
     * The name of the target server.
     * @type {string}
     */
    this.targetName = targetName;
    /**
     * A unique ID for this batch.
     * @type {number}
     */
    this.id = id;
    /**
     * The number of threads dedicated to hacking that remain to be executed.
     * @type {number}
     */
    this._hackThreadsRemaining = 0;
    /**
     * The number of threads dedicated to growing that remain to be executed.
     * @type {number}
     */
    this._growThreadsRemaining = 0;
    /**
     * The number of threads dedicated to weakening that remain to be executed.
     * @type {number}
     */
    this._weakenThreadsRemaining = 0;
    /**
     * The total number of threads dedicated to hacking.
     * @type {number}
     */
    this._hackThreadsTotal = 0;
    /**
     * The total number of threads dedicated to growing.
     * @type {number}
     */
    this._growThreadsTotal = 0;
    /**
     * The total number of threads dedicated to weakening.
     * @type {number}
     */
    this._weakenThreadsTotal = 0;
    /**
     * The name of the hack script.
     * @type {string}
     */
    this.hackScript = "botsSingleHack.js";
    /**
     * The name of the grow script.
     * @type {string}
     */
    this.growScript = "botsSingleGrow.js";
    /**
     * The name of the weaken script.
     * @type {string}
     */
    this.weakenScript = "botsSingleWeaken.js";
    /**
     * The ram needed to run the hack script.
     * @type {number}
     */
    this.hackRam = ns.getScriptRam(this.hackScript);
    /**
     * The ram needed to run the grow script.
     * @type {number}
     */
    this.growRam = ns.getScriptRam(this.growScript);
    /**
     * The ram needed to run the weaken script.
     * @type {number}
     */
    this.weakenRam = ns.getScriptRam(this.weakenScript);
  }

  /**
   * The number of threads dedicated to hacking.
   * @param {number} number - The total number of hack threads.
   */
  set hackThreads(number) {
    this._hackThreadsTotal = number;
    this._hackThreadsRemaining = number;
  }
  /**
   * The number of threads dedicated to growing.
   * @param {number} number - The total number of grow threads.
   */
  set growThreads(number) {
    this._growThreadsTotal = number;
    this._growThreadsRemaining = number;
  }
  /**
   * The number of threads dedicated to growing.
   * @param {number} number - The total number of weaken threads.
   */
  set weakenThreads(number) {
    this._weakenThreadsTotal = number;
    this._weakenThreadsRemaining = number;
  }
  get hackThreads() {
    return this._hackThreadsTotal;
  }
  get growThreads() {
    return this._growThreadsTotal;
  }
  get weakenThreads() {
    return this._weakenThreadsTotal;
  }
  /**
   * The total number of threads dedicated to this batch.
   * @type {number}
   */
  get totalThreads() {
    return (
      this._hackThreadsTotal + this._growThreadsTotal + this._weakenThreadsTotal
    );
  }
  /**
   * The number of threads dedicated to this batch that remain to be executed.
   * @type {number}
   */
  get remainingThreads() {
    return (
      this._hackThreadsRemaining +
      this._growThreadsRemaining +
      this._weakenThreadsRemaining
    );
  }
  /**
   * The total amount of RAM needed to execute this batch.
   * @type {number}
   */
  get totalRam() {
    return (
      this.hackRam * this._hackThreadsTotal +
      this.growRam * this._growThreadsTotal +
      this.weakenRam * this._weakenThreadsTotal
    );
  }
  /**
   * The remaining amount of RAM needed to finish executing this batch.
   * @type {number}
   */
  get remainingRam() {
    return (
      this.hackRam * this._hackThreadsRemaining +
      this.growRam * this._growThreadsRemaining +
      this.weakenRam * this._weakenThreadsRemaining
    );
  }
  /**
   * Print a summary of the batch to the log.
   * @param {import("..").NS} ns
   */
  print(ns) {
    var text = "+---------+------------+------------+------------+\n";
    text += "| Total   |    Hack    |    Grow    |   Weaken   |\n";
    text += ns.sprintf(
      "| Threads | %10i | %10i | %10i |\n",
      this._hackThreadsTotal,
      this._growThreadsTotal,
      this._weakenThreadsTotal
    );
    text += ns.sprintf(
      "| RAM     | %10.2f | %10.2f | %10.2f |\n",
      this.hackRam * this._hackThreadsTotal,
      this.growRam * this._growThreadsTotal,
      this.weakenRam * this._weakenThreadsTotal
    );
    text += "+---------+------------+------------+------------+\n";
    text += "| Remaing |    Hack    |    Grow    |   Weaken   |\n";
    text += ns.sprintf(
      "| Threads | %10i | %10i | %10i |\n",
      this._hackThreadsRemaining,
      this._growThreadsRemaining,
      this._weakenThreadsRemaining
    );
    text += ns.sprintf(
      "| RAM     | %10.2f | %10.2f | %10.2f |\n",
      this.hackRam * this._hackThreadsRemaining,
      this.growRam * this._growThreadsRemaining,
      this.weakenRam * this._weakenThreadsRemaining
    );
    text += "+---------+------------+------------+------------+";
    ns.print(text);
  }
  /**
   * Execute the batch on the defined host servers.
   * @param {import("..").NS} ns
   * @param {MyServer[]} hosts - An array of available host servers.
   * For optimal performance it should be sorted so the servers with
   * the most available ram come first.
   */
  execute(ns, hosts) {
    /**
     * The actual number of hack threads that will be executed on
     * a given host server.
     * @type {number}
     */
    var hackThreadsActual = 0;
    /**
     * The actual number of grow threads that will be executed on
     * a given host server.
     * @type {number}
     */
    var growThreadsActual = 0;
    /**
     * The actual number of weaken threads that will be executed on
     * a given host server.
     * @type {number}
     */
    var weakenThreadsActual = 0;
    /**
     * The counter used to loop through host servers.
     * @type {number}
     */
    var i = 0;

    /** Loop through host servers as long as there are threads left to start */
    while (this.remainingThreads > 0 && i < hosts.length) {
      /** Calculate how many weaken threads can be started on this host */
      weakenThreadsActual = Math.min(
        this._weakenThreadsRemaining,
        Math.floor(hosts[i].ramAvailable / this.weakenRam)
      );
      /** Start the weaken script if at least one thread can be executed */
      if (weakenThreadsActual > 0) {
        let result = ns.exec(
          this.weakenScript,
          hosts[i].name,
          weakenThreadsActual,
          this.targetName,
          this.id
        );
        /**
         * Update the number of threads left to start and the free ram on the host
         * if the script was started successfully.
         */
        if (result > 0) {
          this._weakenThreadsRemaining -= weakenThreadsActual;
          hosts[i].ramAvailable -= weakenThreadsActual * this.weakenRam;
        }
      }
      /** Calculate how many grow threads can be started on this host */
      growThreadsActual = Math.min(
        this._growThreadsRemaining,
        Math.floor(hosts[i].ramAvailable / this.growRam)
      );
      /** Start the grow script if at least one thread can be executed */
      if (growThreadsActual > 0) {
        let result = ns.exec(
          this.growScript,
          hosts[i].name,
          growThreadsActual,
          this.targetName,
          this.id
        );
        /**
         * Update the number of threads left to start and the free ram on the host
         * if the script was started successfully.
         */
        if (result > 0) {
          this._growThreadsRemaining -= growThreadsActual;
          hosts[i].ramAvailable -= growThreadsActual * this.growRam;
        }
      }
      /** Calculate how many hack threads can be started on this host */
      hackThreadsActual = Math.min(
        this._hackThreadsRemaining,
        Math.floor(hosts[i].ramAvailable / this.hackRam)
      );
      /** Start the hack script if at least one thread can be executed */
      if (hackThreadsActual > 0) {
        let result = ns.exec(
          this.hackScript,
          hosts[i].name,
          hackThreadsActual,
          this.targetName,
          this.id
        );
        /**
         * Update the number of threads left to start and the free ram on the host
         * if the script was started successfully.
         */
        if (result > 0) {
          this._hackThreadsRemaining -= hackThreadsActual;
          hosts[i].ramAvailable -= hackThreadsActual * this.hackRam;
        }
      }
      /** Increment the counter to check the next host */
      i++;
    }
  }
  /**
   * Scale the batch to use a maximum amount of RAM.
   * @param {number} ramAvailable - The maximum amount of RAM that shall be used by the batch.
   */
  scale(ramAvailable) {
    /**
     * The scaling factor the thread counts have to be multiplied with.
     * @type {number}
     */
    var factor = Math.min(1.0, ramAvailable / this.totalRam);

    this.hackThreads = Math.floor(this.hackThreads * factor);
    this.growThreads = Math.floor(this.growThreads * factor);
    this.weakenThreads = Math.floor(this.weakenThreads * factor);
  }
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import("..").NS} ns
 * @param {MyServer} targetServer - The target server.
 * @param {number} id - The id for the batch.
 * @param {MyServer} hostServer - Optional: the host server.
 * @returns {SingleBatch} The number of threads needed to grow the target to max money.
 */
export function getFarmingBatch(ns, targetServer, id, hostServer = null) {
  /**
   * The batch object holding the result.
   * @type {SingleBatch}
   */
  var result = new SingleBatch(ns, targetServer.name, id);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor = 1.0;
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.deltaSecurity;

  /** Consider host server if it was defined */
  if (hostServer) {
    weakenReduction = ns.weakenAnalyze(1, hostServer.cores);
  }

  /** Calculate the hack threads needed to steal half the money on the target server */
  result.hackThreads = Math.floor(0.5 / ns.hackAnalyze(targetServer.name));

  /** Calculate the percentage the target needs to be grown to compensate the hacking */
  growFactor =
    1.0 / (1.0 - result.hackThreads * ns.hackAnalyze(targetServer.name));

  /** Calculate the number of threads needed to compensate the stolen money */
  if (hostServer) {
    result.growThreads = ns.growthAnalyze(
      targetServer.name,
      growFactor,
      hostServer.cores
    );
  } else {
    result.growThreads = ns.growthAnalyze(targetServer.name, growFactor);
  }

  /** Convert growth threads to integer and add safety margin */
  result.growThreads = Math.ceil(result.growThreads * 1.2);

  /** Add the security impact of hack and grow */
  deltaSecurity += ns.hackAnalyzeSecurity(result.hackThreads);
  deltaSecurity += ns.growthAnalyzeSecurity(result.growThreads);

  /** Calculate the number of threads needed to compensate the hack and grow actions */
  result.weakenThreads = Math.ceil((deltaSecurity / weakenReduction) * 1.3);

  return result;
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import("..").NS} ns
 * @param {MyServer} targetServer - The target server.
 * @param {number} id - The id for the batch.
 * @param {MyServer} hostServer - Optional: the host server.
 * @returns {SingleBatch} The number of threads needed to grow the target to max money.
 */
export function getPreparationBatch(ns, targetServer, id, hostServer = null) {
  /**
   * The batch object holding the result.
   * @type {SingleBatch}
   */
  var result = new SingleBatch(ns, targetServer.name, id);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor =
    targetServer.server.moneyMax / targetServer.server.moneyAvailable;
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.deltaSecurity;

  /** Consider host server if it was defined */
  if (hostServer) {
    weakenReduction = ns.weakenAnalyze(1, hostServer.cores);
  }

  /** Calculate how many threads are needed to grow the target to max money */
  if (hostServer) {
    result.growThreads = Math.ceil(
      ns.growthAnalyze(targetServer.name, growFactor, hostServer.cores)
    );
  } else {
    result.growThreads = Math.ceil(
      ns.growthAnalyze(targetServer.name, growFactor)
    );
  }

  /** Calculate the security impact of the grow operation */
  deltaSecurity += ns.growthAnalyzeSecurity(result.growThreads);

  /** Calculate how many threads are needed to reach min security */
  result.weakenThreads = Math.ceil(deltaSecurity / weakenReduction);

  return result;
}
