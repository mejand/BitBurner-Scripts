/**
 * A class to represent an order for the execution of a script.
 */
class ScriptOrder {
  /**
   * Create an object to represent an order for the execution of a script.
   * @param {number} threads - The number of threads that the script shall be executed with.
   * @param {string} name - The name of the cript that shall be executed.
   * @param {number} delay - The time in ms that the execution of the script shall be delayed.
   * @param {import(".").Server} host - The server that the script shall be executed on.
   * @param {import(".").Server} target - The server that shall be targeted by the script.
   */
  constructor(threads, name, delay, host, target) {
    this.threads = threads;
    this.name = name;
    this.delay = delay;
    this.host = host.hostname;
    this.target = target.hostname;
  }
  /**
   * Execute the order.
   * @param {import(".").NS} ns
   */
  execute(ns) {
    if (this.threads > 0) {
      ns.exec(this.name, this.host, this.threads, this.target, this.delay);
    }
  }
}

/**
 * A class to keep track of the distribution of threads between the hack scripts.
 */
export class OrderDistribution {
  /**
   * Create a class object with a given set of threads for each script.
   * @param {import(".").Server} host - The server that the script shall be executed on.
   * @param {import(".").Server} target - The server that shall be targeted by the script.
   * @param {number} hack - The number of threads dedicated to hacking.
   * @param {number} grow - The number of threads dedicated to growing.
   * @param {number} weaken - The number of threads dedicated to weaken.
   */
  constructor(host, target, hack, grow, weaken) {
    this.hack = new ScriptOrder(hack, "hack.js", 0, host, target);
    this.grow = new ScriptOrder(grow, "grow.js", 0, host, target);
    this.weaken = new ScriptOrder(weaken, "weaken.js", 0, host, target);
  }

  /**
   * Get the sum of all threads.
   * @readonly
   */
  get sum() {
    return this.hack.threads + this.grow.threads + this.weaken.threads;
  }

  /**
   * Get a string that describes the class instance.
   * @param {import(".").NS} ns
   * @returns {string} A description of the class instance.
   */
  description(ns) {
    var description = ns.sprintf(
      "||Hack|%(threads)10i|%(delay)f||Grow|%(threads)10i|%(delay)f||Weaken: %(threads)10i|%(delay)f||",
      this.hack,
      this.hack,
      this.grow,
      this.grow,
      this.weaken,
      this.weaken
    );
    return description;
  }

  /**
   * Get a clone of the object without referencing the original.
   * @readonly
   */
  get copy() {
    return new Threads(this.hack.count, this.grow.count, this.weaken.count);
  }

  /**
   * Add another threads object to this one.
   * @param {Threads} a - The threads object that shall be added to this instance.
   */
  add(a) {
    // limit the values to 0 because a negative thread count makes no sense
    this.hack.count = Math.min(this.hack.count + a.hack.count, 0);
    this.grow.count = Math.min(this.grow.count + a.grow.count, 0);
    this.weaken.count = Math.min(this.weaken.count + a.weaken.count, 0);
  }

  /**
   * Subtract another threads object to this one.
   * @param {Threads} a - The threads object that shall be subtracted from this instance.
   */
  subtract(a) {
    // limit the values to 0 because a negative thread count makes no sense
    this.hack.count = Math.min(this.hack.count - a.hack.count, 0);
    this.grow.count = Math.min(this.grow.count - a.grow.count, 0);
    this.weaken.count = Math.min(this.weaken.count - a.weaken.count, 0);
  }
}

/**
 * Calculate the distribution needed for a given number of hacking threads.
 * @param {import(".").NS} ns
 * @param {number} hackCount - The number of threads that shall be used for hacking.
 * @param {import(".").Server} target - The target server.
 * @returns {Threads} The distribution needed to support the given number of hacking threads.
 */
function getDistributionForHackCount(ns, hackCount, target) {
  // create a new thread distribution based on the given hacking thread count
  var distribution = new Threads(hackCount, 0, 0);
  // calculate the security score that needs to be compensated to reach the min level
  var deltaSecurity = target.hackDifficulty - target.minDifficulty;
  // calculate the multiplicative factor that is needed to reach max money
  var growthAmount =
    (target.moneyMax +
      target.moneyAvailable *
        ns.hackAnalyze(target.hackDifficulty) *
        hackCount) /
    target.moneyAvailable;
  // calculate how many threads are needed for the grow function
  distribution.grow.count = ns.growthAnalyze(target.hostname, growthAmount);
  // calculate how many threads are needed for the weaken function to compensate
  distribution.weaken.count =
    (deltaSecurity +
      ns.hackAnalyzeSecurity(hackCount) +
      ns.growthAnalyzeSecurity(distribution.grow.count)) /
    ns.weakenAnalyze(1);
  // ensure that the thread counts are integers
  distribution.grow.count = Math.ceil(distribution.grow.count);
  distribution.weaken.count = Math.ceil(distribution.weaken.count);
  return distribution;
}
