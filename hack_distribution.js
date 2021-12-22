/**
 * Calculate the number of threads needed per script type to hack a target in the most efficient way.
 * @param {import(".").NS } ns
 * @param {number} threadsAvailable - The total number of threads available for tasking.
 * @param {import(".").Server} target - The target server.
 * @returns {Object} An object containing the number of threads for each script type.
 */
export function scriptDistribution(ns, threadsAvailable, target) {
  // define the starting counts for all scripts
  var threads = { hack: 0, grow: 0, weaken: 0 };
  // define a variable to store the old values during each calculation step
  var threadsOld = threads;

  // get the hack amount per thread
  var hack_relative = ns.hackAnalyze(target.hostname);
  var hack_absolute = 0;

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
    threads.hack++;
    // calculate the resulting percentage that will be stolen from the host
    hack_absolute = hack_relative * threads.hack;
    // calculate how many threads need to be dedicated to growing to compensate
    threads.grow = Math.ceil(
      ns.growthAnalyze(target.hostname, 1 + hack_absolute)
    );
    // calculate the resulting increase in security level
    security_increase =
      ns.growthAnalyzeSecurity(threads.grow) +
      ns.hackAnalyzeSecurity(threads.hack);
    // calculate how many threads need to be dedicated to weaken to compensate the hack and grow actions
    while (ns.weakenAnalyze(threads.weaken) < security_increase) {
      threads.weaken++;
    }
    // calculate the total number of threads used by the scripts
    threadsTotal = threads.hack + threads.grow + threads.weaken;
    // go back to the old counts if the new ones are not valid
    if (threadsAvailable < threadsTotal || hack_absolute > 1.0) {
      threads = threadsOld;
      search = false;
    }
  }
  return threads;
}
