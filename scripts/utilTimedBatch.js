import { getTimeInRaster } from "./utilTime.js";
/**
 * A batch that shall finish at a specific time.
 */
export class TimedBatch {
  /**
   * Create an instance of a timed batch.
   * @param {import("..").NS} ns
   * @param {String} targetName - The name of the target server.
   * @param {Number} id - The ID of the is batch (must be a unique number).
   */
  constructor(ns, targetName, id) {
    /**
     * The name of the target server.
     * @type {String}
     */
    this.targetName = targetName;
    /**
     * The ID of the is batch (must be a unique number).
     * @type {Number}
     */
    this.id = id;
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
   * @returns {Number} - The time at which the batch execution will be finished.
   */
  execute(ns, hosts) {
    /**
     * The time it takes to complete the weaken action.
     * @type {Number}
     */
    var weakenTime = getTimeInRaster(ns.getWeakenTime(this.targetName));

    this.hack.execute(ns, this.targetName, weakenTime, this.id, hosts);
    this.grow.execute(ns, this.targetName, weakenTime, this.id, hosts);
    this.weaken.execute(ns, this.targetName, weakenTime, this.id, hosts);

    return weakenTime;
  }
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
   * @param {Number} id - The id of the batch this action is a part of.
   * @param {String[]} hosts - The names of the available host servers.
   */
  execute(ns, targetName, finishTime, id, hosts) {
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
        ns.getServerMaxRam(hosts[i]) - ns.getServerUsedRam(hosts[i].ramUsed);
      threads = Math.min(
        this.threadsRemaining,
        Math.floor(ramAvaialble / this._ramPerThread)
      );

      /**
       * The ID of the script that was just started. Will be 0 if the
       * script could not be stared.
       * @type {Number}
       */
      let processId = ns.exec(
        this._script,
        hosts[i].hostname,
        threads,
        targetName,
        finishTime,
        id,
        this._type
      );

      /** Update the status of the host server and the reamining threads */
      if (processId > 0) {
        hosts[i].ramUsed += threads * this._ramPerThread;
        this.threadsRemaining -= threads;
      }

      /** Increment the counter to look at the next host */
      i++;
    }
  }
}
