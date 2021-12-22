/**
 * Calculate the number of threads needed per script type to hack a target in the most efficient way.
 * @param {import(".").NS } ns
 * @param {number} threadsAvailable - The total number of threads available for tasking.
 * @param {import(".").Server} target - The target server.
 * @returns {Threads} An object containing the number of threads for each script type.
 */
export function scriptDistribution(ns, threadsAvailable, target) {
  // define the starting counts for all scripts
  var threads = Threads(0, 0, 0);
  // define a variable to store the old values during each calculation step
  var threadsOld = threads;

  // get the hack amount per thread
  var hackRelative = ns.hackAnalyze(target.hostname);
  var hackAbsolute = 0;

  // create a variable to store the security increase of grow and hack
  var security_increase = 0;

  // create a variable to keep thrack of how many threads are being used in total
  var threadsTotal = 0;

  // create a variable to control how long the loop runs for
  var search = true;

  while (search) {
    // store the last thread counts before trying out the new values
    threadsOld = threads;
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
    // calculate the total number of threads used by the scripts
    threadsTotal =
      threads.hack.count + threads.grow.count + threads.weaken.count;
    // go back to the old counts if the new ones are not valid
    if (threadsAvailable < threadsTotal || hackAbsolute > 1.0) {
      threads = threadsOld;
      search = false;
    }
  }
  return threads;
}

/**
 * A class to keep track of the distribution of threads between the hack scripts.
 */
export class Threads {
  /**
   * A class to keep track of the distribution of threads between the hack scripts.
   * @param {number} hack - The number of threads dedicated to hacking.
   * @param {number} grow - The number of threads dedicated to growing.
   * @param {number} weaken - The number of threads dedicated to weaken.
   */
  constructor(hack, grow, weaken) {
    this.hack = { count: hack, script: "hack.js" };
    this.grow = { count: grow, script: "grow.js" };
    this.weaken = { count: weaken, script: "weaken.js" };
  }
}
