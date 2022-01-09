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
   * @param {string} script - The name of the script corresponding to the action.
   */
  constructor(ns, script) {
    /**
     * The name of the script that corresponds to the action.
     * @type {string}
     */
    this._script = script;
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
  }
  /**
   * The name of the script that corresponds to the action.
   * @type {string}
   */
  get script() {
    return this._script;
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
}
