import { logPrintVar } from "./log.js";
import { MyServer } from "./server.js";

/**
 * The instructions needed to run a hack, grow, weaken cycle against a target server.
 */
export class SingleBatch {
  /**
   * Create an instance of a batch.
   * @param {import("../..").NS} ns
   * @param {string} targetName - The name of the target server.
   */
  constructor(ns, targetName) {
    /**
     * The name of the target server.
     * @type {string}
     */
    this.targetName = targetName;
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
    this.hackScript = "/bots/singleHack.js";
    /**
     * The name of the grow script.
     * @type {string}
     */
    this.growScript = "/bots/singleGrow.js";
    /**
     * The name of the weaken script.
     * @type {string}
     */
    this.weakenScript = "/bots/singleWeaken.js";
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
    var text = "############## Hack ####### Grow ###### Weaken ###\n";
    text += ns.sprintf(
      "# Threads # %10i # %10i # %10i #\n",
      this.hackThreads,
      this.growThreads,
      this.weakenThreads
    );
    text += ns.sprintf(
      "#   RAM   # %10i # %10i # %10i #\n",
      this.hackRam * this.hackThreads,
      this.growRam * this.growThreads,
      this.weakenRam * this.weakenThreads
    );
  }
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import("..").NS} ns
 * @param {MyServer} targetServer - The target server.
 * @param {MyServer} hostServer - The host server.
 * @returns {SingleBatch} The number of threads needed to grow the target to max money.
 */
export function getFarmingBatch(ns, targetServer, hostServer) {
  /**
   * The batch object holding the result.
   * @type {SingleBatch}
   */
  var result = new SingleBatch(targetServer.name);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor = 1.0;
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cores);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.deltaSecurity;

  /** Calculate the hack threads needed to steal half the money on the target server */
  result.hackThreads = Math.floor(0.5 / ns.hackAnalyze(targetServer.name));

  /** Calculate the percentage the target needs to be grown to compensate the hacking */
  growFactor =
    1.0 / (1.0 - result.hackThreads * ns.hackAnalyze(targetServer.name));

  /** Calculate the number of threads needed to compensate the stolen money */
  result.growThreads = ns.growthAnalyze(
    targetServer.name,
    growFactor,
    hostServer.cores
  );

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
 * @param {MyServer} hostServer - The host server.
 * @returns {SingleBatch} The number of threads needed to grow the target to max money.
 */
export function getPreparationBatch(ns, targetServer, hostServer) {
  /**
   * The batch object holding the result.
   * @type {SingleBatch}
   */
  var result = new SingleBatch(targetServer.name);
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
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cores);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.deltaSecurity;

  /** Calculate how many threads are needed to grow the target to max money */
  result.growThreads = Math.ceil(
    ns.growthAnalyze(targetServer.name, growFactor, hostServer.cores)
  );

  /** Calculate the security impact of the grow operation */
  deltaSecurity += ns.growthAnalyzeSecurity(result.growThreads);

  /** Calculate how many threads are needed to reach min security */
  result.weakenThreads = Math.ceil(deltaSecurity / weakenReduction);

  /** Limit the number of threads to what is available */
  result.weakenThreads = Math.min(
    result.weakenThreads,
    hostServer.threadsAvailable
  );

  result.growThreads = Math.min(
    result.growThreads,
    hostServer.threadsAvailable - result.weakenThreads
  );

  /** Print information to log screen */
  logPrintVar(ns, "Mode", "Preparation");
  logPrintVar(ns, "Delta Security", deltaSecurity);
  logPrintVar(ns, "Grow Factor", growFactor);

  return result;
}
