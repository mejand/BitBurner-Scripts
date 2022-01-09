/**
 * A batch that shall finish at a specific time.
 */
export class TimedBatch {
  /**
   * Create an instance of a timed batch.
   * @param {import("..").NS} ns
   * @param {string} targetName - The name of the target server.
   */
  constructor(ns, targetName) {}
}
class TimedAction {
  /**
   * Creat an instance of an action.
   * @param {import("..").NS} ns
   * @param {number} type - The type of action (1 = hack, 2 = grow, 3 = weaken).
   */
  constructor(ns, type) {
    /**
     * The type of action (1 = hack, 2 = grow, 3 = weaken).
     * @type {number}
     */
    this._type = type;
    /**
     * The name of the script that corresponds to the action.
     * @type {string}
     */
    this._script = "botsTimedSelect.js";
    /**
     * The amount of RAM needed to execute this action with one thread.
     * @type {number}
     */
    this._ramPerThread = ns.getScriptRam(this._script);
    /**
     * The amount of RAM needed to execute this action with all dedicated threads.
     * @type {number}
     */
    this._ram = 0;
    /**
     * The number of threads dedicated to the action.
     * @type {number}
     */
    this._threadsTotal = 0;
    /**
     * The number of threads that still have to be executed.
     * @type {number}
     */
    this._threadsRemaining = 0;

    /** Limit the type to the permitted range */
    this._type = Math.min(3, this._type);
    this._type = Math.max(1, this._type);
  }
  /**
   * The amount of RAM needed to execute this action.
   * @type {number}
   */
  get ram() {
    return this._ram;
  }
  /**
   * The number of threads dedicated to the action.
   * @type {number}
   */
  get threadsTotal() {
    return this._threadsTotal;
  }
  /**
   * The number of threads that still have to be executed.
   * @type {number}
   */
  get threadsRemaining() {
    return this._threadsRemaining;
  }
  /**
   * The number of threads dedicated to the action.
   * @param {number} number
   */
  set threadsTotal(number) {
    this._ram = this._ramPerThread * number;
    this._threadsTotal = number;
    this._threadsRemaining = number;
  }
  /**
   * The number of threads that still have to be executed.
   * @param {number} number
   */
  set threadsRemaining(number) {
    this._ram = this._ramPerThread * number;
    this._threadsRemaining = number;
  }
  /**
   * Execute the action on the given hosts.
   * @param {import("..").NS} ns
   * @param {string} targetName - The name of the target server.
   * @param {number} finishTime - The time at which the action shall be finished.
   * @param {number} id - The id of the batch this action is a part of.
   * @param {string[]} hosts - The names of the available host servers.
   */
  execute(ns, targetName, finishTime, id, hosts) {
    /**
     * Index of the host server that is currently being attempted.
     * @type {number}
     */
    var i = 0;
    /**
     * The amount of RAM left on the host server.
     * @type {number}
     */
    var ramAvaialble = 0;
    /**
     * The number of threads that can be started on the host.
     * @type {number}
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
       * @type {number}
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
