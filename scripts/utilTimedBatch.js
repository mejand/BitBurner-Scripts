import { getTimeInRaster } from "./utilTime.js";
/**
 * A batch that shall finish at a specific time.
 */
export class TimedBatch {
  /**
   * Create an instance of a timed batch.
   * @param {import("..").NS} ns
   * @param {String} targetName - The name of the target server.
   */
  constructor(ns, targetName) {
    /**
     * The name of the target server.
     * @type {String}
     */
    this.targetName = targetName;
    /**
     * The hack action for this batch.
     * @type {TimedAction}
     */
    this.hack = new TimedAction(ns, 1);
    /**
     * The grow action for this batch.
     * @type {TimedAction}
     */
    this.grow = new TimedAction(ns, 2);
    /**
     * The weaken action for this batch.
     * @type {TimedAction}
     */
    this.weaken = new TimedAction(ns, 3);
  }
  /**
   * The total RAM needed to execute the batch.
   * @type {Number}
   */
  get totalRam() {
    return this.hack.ram + this.grow.ram + this.weaken.ram;
  }
  /**
   * The number of threads dedicated to this batch.
   * @type {Number}
   */
  get threadsTotal() {
    return (
      this.hack.threadsTotal + this.grow.threadsTotal + this.weaken.threadsTotal
    );
  }
  /**
   * The number of threads still to be executed.
   * @type {Number}
   */
  get threadsRemaining() {
    return (
      this.hack.threadsRemaining +
      this.grow.threadsRemaining +
      this.weaken.threadsRemaining
    );
  }
  /**
   * Execute the batch on the given host servers.
   * @param {import("..").NS} ns
   * @param {String[]} hosts - The names of the host servers.
   * @returns {Number} The time at which the batch execution will be finished.
   */
  execute(ns, hosts) {
    /**
     * The time it takes to complete the weaken action.
     * @type {Number}
     */
    var weakenTime = getTimeInRaster(ns.getWeakenTime(this.targetName));
    /**
     * The time at which the batch shall be finished.
     * @type {Number}
     */
    var finishTime = ns.getTimeSinceLastAug() + weakenTime;
    /**
     * The amount of RAM available on all hosts.
     * @type {Number}
     */
    var ramAvaialble = 0;
    /**
     * The scaling factor needed to make the batch fit the free RAM.
     * @type {Number}
     */
    var factor = 0;

    if (hosts) {
      /** Calculate how much RAM is free */
      for (let host of hosts) {
        ramAvaialble += ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
      }

      /** Scale the batch size to the available RAM */
      factor = Math.min(1.0, ramAvaialble / this.totalRam);
      this.hack.scale(factor);
      this.grow.scale(factor);
      this.weaken.scale(factor);

      /** Execute the actions */
      this.hack.execute(ns, this.targetName, finishTime, hosts);
      this.grow.execute(ns, this.targetName, finishTime, hosts);
      this.weaken.execute(ns, this.targetName, finishTime, hosts);
    }

    return finishTime;
  }
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import("..").NS} ns
 * @param {String} target - The name of the target server.
 * @returns {TimedBatch} The number of threads needed to steal half the money
 * from the target and grow it back with no impact on security.
 */
export function getTimedFarmingBatch(ns, target) {
  /**
   * The batch object holding the result.
   * @type {TimedBatch}
   */
  var batch = new TimedBatch(ns, target);
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {Number}
   */
  var weakenReduction = ns.weakenAnalyze(1);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {Number}
   */
  var deltaSecurity = 0;

  /** Calculate the hack threads needed to steal half the money on the target server */
  batch.hack.threadsTotal = Math.floor(0.5 / ns.hackAnalyze(target));

  /** Calculate the number of threads needed to compensate the stolen money */
  batch.grow.threadsTotal = Math.ceil(ns.growthAnalyze(target, 2.1));

  /** Add the security impact of hack and grow */
  deltaSecurity += ns.hackAnalyzeSecurity(batch.hack.threadsTotal);
  deltaSecurity += ns.growthAnalyzeSecurity(batch.grow.threadsTotal);

  /** Calculate the number of threads needed to compensate the hack and grow actions */
  batch.weaken.threadsTotal = Math.ceil(deltaSecurity / weakenReduction);

  return batch;
}

/**
 * Calculate the grow and weaken threads to prepare the target for farming.
 * @param {import("..").NS} ns
 * @param {String} target - The name of the target server.
 * @returns {TimedBatch} The number of threads needed to grow the target to max money.
 */
export function getTimedPreparationBatch(ns, target) {
  /**
   * The batch object holding the result.
   * @type {TimedBatch}
   */
  var result = new TimedBatch(ns, target);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {Number}
   */
  var growFactor =
    ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target);
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {Number}
   */
  var weakenReduction = ns.weakenAnalyze(1);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {Number}
   */
  var deltaSecurity =
    ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);

  /** Calculate how many threads are needed to grow the target to max money */
  result.grow.threadsTotal = Math.ceil(ns.growthAnalyze(target, growFactor));

  /** Calculate the security impact of the grow operation */
  deltaSecurity += ns.growthAnalyzeSecurity(result.grow.threadsTotal);

  /** Calculate how many threads are needed to reach min security */
  result.weaken.threadsTotal = Math.ceil(deltaSecurity / weakenReduction);

  return result;
}

class TimedAction {
  /**
   * Creat an instance of an action.
   * @param {import("..").NS} ns
   * @param {Number} type - The type of action (1 = hack, 2 = grow, 3 = weaken).
   */
  constructor(ns, type) {
    /**
     * The type of action (1 = hack, 2 = grow, 3 = weaken).
     * @type {Number}
     */
    this._type = type;
    /**
     * The name of the script that corresponds to the action.
     * @type {String}
     */
    this._script = "botsTimedSelect.js";
    /**
     * The amount of RAM needed to execute this action with one thread.
     * @type {Number}
     */
    this._ramPerThread = ns.getScriptRam(this._script);
    /**
     * The amount of RAM needed to execute this action with all dedicated threads.
     * @type {Number}
     */
    this._ram = 0;
    /**
     * The number of threads dedicated to the action.
     * @type {Number}
     */
    this._threadsTotal = 0;
    /**
     * The number of threads that still have to be executed.
     * @type {Number}
     */
    this._threadsRemaining = 0;

    /** Limit the type to the permitted range */
    this._type = Math.min(3, this._type);
    this._type = Math.max(1, this._type);
  }
  /**
   * The amount of RAM needed to execute this action.
   * @type {Number}
   */
  get ram() {
    return this._ram;
  }
  /**
   * The number of threads dedicated to the action.
   * @type {Number}
   */
  get threadsTotal() {
    return this._threadsTotal;
  }
  /**
   * The number of threads that still have to be executed.
   * @type {Number}
   */
  get threadsRemaining() {
    return this._threadsRemaining;
  }
  /**
   * The number of threads dedicated to the action.
   * @param {Number} number
   */
  set threadsTotal(number) {
    this._ram = this._ramPerThread * number;
    this._threadsTotal = number;
    this._threadsRemaining = number;
  }
  /**
   * The number of threads that still have to be executed.
   * @param {Number} number
   */
  set threadsRemaining(number) {
    this._ram = this._ramPerThread * number;
    this._threadsRemaining = number;
  }
  /**
   * Execute the action on the given hosts.
   * @param {import("..").NS} ns
   * @param {String} targetName - The name of the target server.
   * @param {Number} finishTime - The time at which the action shall be finished.
   * @param {String[]} hosts - The names of the available host servers.
   */
  execute(ns, targetName, finishTime, hosts) {
    /**
     * Index of the host server that is currently being attempted.
     * @type {Number}
     */
    var i = 0;
    /**
     * The amount of RAM left on the host server.
     * @type {Number}
     */
    var ramAvaialble = 0;
    /**
     * The number of threads that can be started on the host.
     * @type {Number}
     */
    var threads = 0;

    /** Loop as long until there are no more threads or hosts remaning */
    while (this.threadsRemaining > 0 && i < hosts.length) {
      /** Analyze the current host */
      ramAvaialble =
        ns.getServerMaxRam(hosts[i]) - ns.getServerUsedRam(hosts[i]);
      threads = Math.min(
        this.threadsRemaining,
        Math.floor(ramAvaialble / this._ramPerThread)
      );

      if (threads > 0) {
        /**
         * The ID of the script that was just started. Will be 0 if the
         * script could not be stared.
         * @type {Number}
         */
        let processId = ns.exec(
          this._script,
          hosts[i],
          threads,
          targetName,
          finishTime,
          this._type
        );

        /** Update the status of the host server and the reamining threads */
        if (processId > 0) {
          this.threadsRemaining -= threads;
        }
      }

      /** Increment the counter to look at the next host */
      i++;
    }
  }
  /**
   * Scale the total number of threads with a given factor.
   * @param {Number} factor - The scaling factor that shall be applied.
   */
  scale(factor) {
    this.threadsTotal = Math.floor(this.threadsTotal * factor);
  }
}
