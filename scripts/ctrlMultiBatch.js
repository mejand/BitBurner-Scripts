/**
 * Handle multiple batches targeting a defined server. All scripts are run
 * on the local host.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The name of the target server. Will be n00dles if the script was started
   * without a target.
   * @type {string}
   */
  var target = "n00dles";
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    target = ns.args[0];
  }
  var period = 3 * 400;
  var host = ns.getHostname();
  var ramFree = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  var actions = [
    new Action(ns, 1, 0),
    new Action(ns, 2, 0),
    new Action(ns, 3, 0),
  ];
  /** Calculate how big one batch should be */
  /** Calculate how many batches can be started (don't forget to subtract one for safety) */
  /** Calculate the RAM needed to run all batches */
  /** Scale the number of batches if not enough RAM is available */
  /** Check if growing is necessary */
  /** Calculate a growing batch if growing is necessary */
  /** Scale the size of the batch if not enough RAM is available */
  /** Execute the batches with a space of one period in between */
  /** Wait until the next multi batch can be started and then stop the script */
  /** Print the values of each variable to the log for debugging */
}

class Action {
  /**
   * Create an instance of an action.
   * @param {import("..").NS} ns
   * @param {Number} type - The type of the script (hack, grow, weaken).
   * @param {Number} threads - The number of threads dedicated to the action.
   */
  constructor(ns, type, threads) {
    this.script = "botsTimedSelect.js";
    this.type = type;
    this.ram = ns.getScriptRam(this.script);
    this.threads = threads;
  }
  /**
   * The total amount of RAM needed to execute the action with all threads.
   * @type {Number}
   */
  get totalRam() {
    return this.ram * this.threads;
  }
  /**
   * Execute the action against the target server.
   * @param {import("..").NS} ns
   * @param {Stri} target - The name of the target server.
   * @param {String} host - The name of the host server.
   * @param {Number} time - The time at which the action shall finish.
   * @returns {Boolean} True if the action was executed.
   */
  execute(ns, target, host, time) {
    /**
     * The action was executed successfully.
     * @type {Boolean}
     */
    var success = false;
    if (this.threads > 0 && ns.hasRootAccess(target)) {
      if (ns.exec(this.script, host, this.threads, target, time, this.type)) {
        success = true;
      }
    }
    return true;
  }
}
