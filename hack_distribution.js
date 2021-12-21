/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import(".").NS } ns
 * @param {import(".").Server} host - The server that will run the scripts.
 * @param {import(".").Server} target - The target server.
 * @returns {Object} An object containing the number of threads for each script type.
 */
export function scriptDistribution(ns, host, target) {
  // define the starting counts for all scripts
  var threads = { hack: 0, grow: 0, weaken: 0 };
  // define a variable to store the old values during each calculation step
  var threads_old = threads;

  // get the ram amount for each script
  var ram_hack = ns.getScriptRam("hack.js", "home");
  var ram_grow = ns.getScriptRam("grow.js", "home");
  var ram_weaken = ns.getScriptRam("weaken.js", "home");
  var ram_used = 0;
  var ram_available = host.maxRam - host.ramUsed;

  // get the hack amount per thread
  var hack_relative = ns.hackAnalyze(target.hostname);
  var hack_absolute = 0;

  // create a variable to store the security increase of grow and hack
  var security_increase = 0;

  // create a variable to control how long the loop runs for
  var search = true;

  while (search) {
    // store the last thread counts before trying out the new values
    threads_old = threads;
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
    ram_used =
      threads.hack * ram_hack +
      threads.weaken * ram_weaken +
      threads.grow * ram_grow;
    // go back to the old counts if the new ones are not valid
    if (ram_available > ram_used && hack_absolute < 1.0) {
      threads = threads_old;
      search = false;
    }
  }
  return threads;
}
