import { logPrintVar } from "./utilLog.js";
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
     * The number of threads dedicated to hacking.
     * @type {number}
     */
    this.hackThreads = 0;
    /**
     * The number of threads dedicated to growing.
     * @type {number}
     */
    this.growThreads = 0;
    /**
     * The number of threads dedicated to weakening.
     * @type {number}
     */
    this.weakenThreads = 0;
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
   * The total number of threads dedicated to this batch.
   * @type {number}
   */
  get totalThreads() {
    return this.hackThreads + this.growThreads + this.weakenThreads;
  }

  /**
   * The total of RAM needed to run this batch.
   * @type {number}
   */
  get totalRam() {
    return (
      this.hackRam * this.hackThreads +
      this.growRam * this.growThreads +
      this.weakenRam * this.weakenThreads
    );
  }

  /**
   * Print a summary of the batch to the log.
   * @param {import("..").NS} ns
   */
  print(ns) {
    var text = "+---------+------------+------------+------------+\n";
    text += "|         |    Hack    |    Grow    |   Weaken   |\n";
    text += ns.sprintf(
      "| Threads | %10i | %10i | %10i |\n",
      this.hackThreads,
      this.growThreads,
      this.weakenThreads
    );
    text += ns.sprintf(
      "| RAM     | %10i | %10i | %10i |\n",
      this.hackRam * this.hackThreads,
      this.growRam * this.growThreads,
      this.weakenRam * this.weakenThreads
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
    while (this.totalThreads > 0 && i < hosts.length) {
      /** Calculate how many weaken threads can be started on this host */
      weakenThreadsActual = Math.min(
        this.weakenThreads,
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
          this.weakenThreads -= weakenThreadsActual;
          hosts[i].ramAvailable -= weakenThreadsActual * this.weakenRam;
        }
      }
      /** Calculate how many grow threads can be started on this host */
      growThreadsActual = Math.min(
        this.growThreads,
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
          this.growThreads -= growThreadsActual;
          hosts[i].ramAvailable -= growThreadsActual * this.growRam;
        }
      }
      /** Calculate how many hack threads can be started on this host */
      hackThreadsActual = Math.min(
        this.hackThreads,
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
          this.hackThreads -= hackThreadsActual;
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

  /** Print information to log window */
  logPrintVar(ns, "Mode", "Farming");
  logPrintVar(ns, "Delta Security", deltaSecurity);
  logPrintVar(ns, "Grow Factor", growFactor);

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

  /** Print information to log screen */
  logPrintVar(ns, "Mode", "Preparation");
  logPrintVar(ns, "Delta Security", deltaSecurity);
  logPrintVar(ns, "Grow Factor", growFactor);

  return result;
}
