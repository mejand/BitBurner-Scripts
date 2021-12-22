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
  var security_increase = 0;

  // create a variable to control how long the loop runs for
  var search = true;

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
    security_increase =
      ns.growthAnalyzeSecurity(threads.grow.count) +
      ns.hackAnalyzeSecurity(threads.hack.count);
    // calculate how many threads need to be dedicated to weaken to compensate the hack and grow actions
    while (ns.weakenAnalyze(threads.weaken.count) < security_increase) {
      threads.weaken.count++;
    }
    // print the attempted values for debugging
    if (debug) {
      ns.tprint("|Attempt" + threads.description(ns));
    }
    // go back to the old counts if the new ones are not valid
    if (threadsAvailable < threads.sum || hackAbsolute > 1.0) {
      threads = threadsOld.copy;
      search = false;
      // print the abort criteria
      if (debug) {
        ns.tprint(
          "Aborted: " +
            threadsAvailable +
            " < " +
            threads.sum +
            " || " +
            hackAbsolute +
            " > 1.0"
        );
      }
    }
    // print the selected values for debugging
    if (debug) {
      ns.tprint("|Result" + threads.description(ns));
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
}
