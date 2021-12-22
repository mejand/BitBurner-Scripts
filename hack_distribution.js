/**
 * Calculate the number of threads needed per script type to hack a target in the most efficient way.
 * @param {import(".").NS } ns
 * @param {number} threadsAvailable - The total number of threads available for tasking.
 * @param {import(".").Server} target - The target server.
 * @param {boolean} debug - Flag to enable debug logging to the console.
 * @returns {Threads} An object containing the number of threads for each script type.
 */
export function scriptDistribution(
  ns,
  threadsAvailable,
  target,
  debug = false
) {
  // define the starting counts for all scripts
  var threads = new Threads(0, 0, 0);
  // define a variable to store the old values during each calculation step
  var threadsOld = threads.copy;

  // get the hack amount per thread
  var hackRelative = ns.hackAnalyze(target.hostname);
  var hackAbsolute = 0;

  // create a variable to store the security increase of grow and hack
  var securityIncrease = 0;

  // create a variable to control how long the loop runs for
  var search = true;

  // get the security decrease for weaken with one thread
  var securityDecrease = ns.weakenAnalyze(1);

  while (search) {
    // store the last thread counts before trying out the new values
    threadsOld = threads.copy;
    // increase the number of threads used for hacking
    threads.hack.count++;
    // calculate the resulting percentage that will be stolen from the host
    hackAbsolute = hackRelative * threads.hack.count;
    // calculate how many threads need to be dedicated to growing to compensate
    threads.grow.count = Math.ceil(
      ns.growthAnalyze(target.hostname, 1 + hackAbsolute)
    );
    // calculate the resulting increase in security level
    securityIncrease =
      ns.growthAnalyzeSecurity(threads.grow.count) +
      ns.hackAnalyzeSecurity(threads.hack.count);
    // calculate how many threads need to be dedicated to weaken to compensate the hack and grow actions
    threads.weaken.count = Math.ceil(securityIncrease / securityDecrease);
    // go back to the old counts if the new ones are not valid
    if (threadsAvailable < threads.sum || hackAbsolute > 1.0) {
      threads = threadsOld.copy;
      search = false;
      // print the abort criteria
      if (debug) {
        ns.print(
          "Distribution Calculation Aborted: " +
            threadsAvailable +
            " < " +
            threads.sum +
            " || " +
            hackAbsolute +
            " > 1.0"
        );
      }
    }
  }
  return threads;
}

/**
 * A class to keep track of the distribution of threads between the hack scripts.
 */
export class Threads {
  /**
   * Create a class object with a given set of threads for each script.
   * @param {number} hack - The number of threads dedicated to hacking.
   * @param {number} grow - The number of threads dedicated to growing.
   * @param {number} weaken - The number of threads dedicated to weaken.
   */
  constructor(hack, grow, weaken) {
    this.hack = { count: hack, script: "hack.js" };
    this.grow = { count: grow, script: "grow.js" };
    this.weaken = { count: weaken, script: "weaken.js" };
  }

  /**
   * Get the sum of all threads.
   * @readonly
   */
  get sum() {
    return this.hack.count + this.grow.count + this.weaken.count;
  }

  /**
   * Get a string that describes the class instance.
   * @param {import(".").NS} ns
   * @returns {string} A description of the class instance.
   */
  description(ns) {
    var description = ns.sprintf(
      "|Hack: %(count)10i|Grow: %(count)10i|Weaken: %(count)10i|",
      this.hack,
      this.grow,
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
