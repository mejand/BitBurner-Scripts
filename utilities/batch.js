import { getTimeInRaster } from "./time.js";

/**
 * The instructions needed to run a hack, grow, weaken cycle against a target server.
 */
export class Batch {
  /**
   * Create an instance of a batch.
   * @param {string} targetName - The name of the target server.
   */
  constructor(targetName) {
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
     * The time at which the hack operation shall be finished.
     * @type {number}
     */
    this.hackFinish = 0;
    /**
     * The time at which the grow operation shall be finished.
     * @type {number}
     */
    this.growFinish = 0;
    /**
     * The time at which the weaken operation shall be finished.
     * @type {number}
     */
    this.weakenFinish = 0;
  }

  /**
   * The total number of threads dedicated to this batch.
   * @type {number}
   */
  get totalThreads() {
    return this.hackThreads + this.growThreads + this.weakenThreads;
  }

  /**
   * Print a summary of the batch to the log.
   * @param {import(".").NS} ns
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
      "# Time    # %10i # %10i # %10i #\n",
      this.hackFinish,
      this.growFinish,
      this.weakenFinish
    );
    text += "##################################################";
    ns.print(text);
  }
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @returns {Batch} The number of threads needed to grow the target to max money.
 */
export function getFarmingBatch(ns, targetServer, hostServer) {
  /**
   * The batch object holding the result.
   * @type {Batch}
   */
  var result = new Batch(targetServer.hostname);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor = 1.0;
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cpuCores);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.hackDifficulty - targetServer.minDifficulty;

  /** Calculate the hack threads needed to steal half the money on the target server */
  result.hackThreads = Math.floor(0.5 / ns.hackAnalyze(targetServer.hostname));

  /** Calculate the percentage the target needs to be grown to compensate the hacking */
  growFactor =
    1.0 / (1.0 - result.hackThreads * ns.hackAnalyze(targetServer.hostname));

  /** Calculate the number of threads needed to compensate the stolen money */
  result.growThreads = ns.growthAnalyze(
    targetServer.hostname,
    growFactor,
    hostServer.cpuCores
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
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @param {number} threadsAvailable - The number of threads currently available.
 * @returns {Batch} The number of threads needed to grow the target to max money.
 */
export function getPreparationBatch(
  ns,
  targetServer,
  hostServer,
  threadsAvailable
) {
  /**
   * The batch object holding the result.
   * @type {Batch}
   */
  var result = new Batch(targetServer.hostname);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor = targetServer.moneyMax / targetServer.moneyAvailable;
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cpuCores);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.hackDifficulty - targetServer.minDifficulty;

  /** Calculate how many threads are needed to grow the target to max money */
  result.growThreads = Math.ceil(
    ns.growthAnalyze(targetServer.hostname, growFactor, hostServer.cpuCores)
  );

  /** Calculate the security impact of the grow operation */
  deltaSecurity += ns.growthAnalyzeSecurity(result.growThreads);

  /** Calculate how many threads are needed to reach min security */
  result.weakenThreads = Math.ceil(deltaSecurity / weakenReduction);

  /** Limit the number of threads to what is available */
  result.weakenThreads = Math.min(result.weakenThreads, threadsAvailable);

  result.growThreads = Math.min(
    result.growThreads,
    threadsAvailable - result.weakenThreads
  );

  /** Print information to log screen */
  logPrintVar(ns, "Mode", "Preparation");
  logPrintVar(ns, "Delta Security", deltaSecurity);
  logPrintVar(ns, "Grow Factor", growFactor);

  return result;
}

/**
 * Update the finish times of a batch.
 * @param {import(".").NS} ns
 * @param {Batch} batch - The batch object that shall be updated.
 * @param {number} timeNow - The current time stamp.
 * @param {number} period - The time between executions of the controller.
 * @param {number} timePerAction - The time that is reserved for each action.
 * @param {import(".").Server} targetServer - The server that is targeted.
 */
export function updateFinishTimes(
  ns,
  batch,
  timeNow,
  period,
  timePerAction,
  targetServer
) {
  /**
   * The time it takes to run the weaken command.
   * @type {number}
   */
  var weakenDuration = getTimeInRaster(ns.getWeakenTime(targetServer.hostname));
  /**
   * The point in time at which the batch of scripts will finish, if started now.
   * @type {number}
   */
  var weakenTime = timeNow + weakenDuration;
  /**
   * The time by which the start of the batch has to be delayed to ensure
   * that it finishes at x seconds and 600ms. A safety margin of 1 period
   * is included.
   * @type {number}
   */
  var weakenDelay = 3 * timePerAction - (weakenTime % period) + period;

  /**
   * The delay caan not be negative -> if the batch finishes too late it has to be
   * shifted to the next second.
   */
  if (weakenDelay < 0) {
    weakenDelay = period + weakenDelay;
  }

  batch.weakenFinish = timeNow + weakenDelay + weakenDuration;

  batch.growFinish = batch.weakenFinish - timePerAction;

  batch.hackFinish = batch.weakenFinish - 2 * timePerAction;

  logPrintVar(ns, "Execution Time", weakenTime);
}

/**
 * Run a batch on the local host.
 * @param {import(".").NS} ns
 * @param {Batch} batch - The batch that shall be executed.
 * @param {number} id - A number used to make up a unique id for the scripts so
 * they can run in parallel.
 * @param {string} hackScript - The name of the hack script.
 * @param {string} growScript - The name of the grow script.
 * @param {string} weakenScript - The name of the weaken script.
 */
export function runBatch(ns, batch, id, hackScript, growScript, weakenScript) {
  if (batch.hackThreads > 0) {
    ns.run(
      hackScript,
      batch.hackThreads,
      batch.targetName,
      batch.hackFinish,
      id,
      0
    );
  }

  if (batch.growThreads > 0) {
    ns.run(
      growScript,
      batch.growThreads,
      batch.targetName,
      batch.growFinish,
      id,
      1
    );
  }

  if (batch.weakenThreads > 0) {
    ns.run(
      weakenScript,
      batch.weakenThreads,
      batch.targetName,
      batch.weakenFinish,
      id,
      2
    );
  }
}
