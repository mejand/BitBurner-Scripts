import { scriptDistribution, Threads } from "./hack_distribution.js";

/**
 * Handle the growing, weakening and hacking scripts from one central server.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  // clean up the log
  ns.disableLog("ALL");

  var debug = true;
  if (ns.args.length > 0 && typeof ns.args[0] == "boolean") {
    debug = ns.args[0];
  }

  // define the servers for the script
  var target = ns.getServer("n00dles");
  var servers = getAvailableServers(ns);

  // define values for terminal printing
  var relativeMoney = (target.moneyAvailable / target.moneyMax) * 100;
  var deltaSecurity = target.hackDifficulty - target.minDifficulty;

  // define a veriable to keep track of how long a script cycle takes
  var cycleTime = 10;

  // get the ram needed to run any script
  var ramNeeded = Math.max(
    ns.getScriptRam("hack.js"),
    ns.getScriptRam("grow.js"),
    ns.getScriptRam("weaken.js")
  );

  // define a variable to keep track of how many threads are available
  var threadsAvailable = getAvailableThreads(ns, servers, ramNeeded);

  // define a variable to keep thrack of how many threads shall be used for which script
  var threadDistribution = scriptDistribution(ns, threadsAvailable, target);
  var threadDistributionBase = threadDistribution;
  var threadsUsed = new Threads(0, 0, 0);

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // read the target from file and recalculate the thresholds
    if (!debug) {
      // in debug mode n00dles is used because it has the shortest wait times
      target = getTarget(ns);
    }

    // get all servers that are ready for tasking
    servers = getAvailableServers(ns);

    // calculate how many threads are available for tasking
    threadsAvailable = getAvailableThreads(ns, servers);

    // update the thread distribution
    threadDistribution = scriptDistribution(ns, threadsAvailable, target);
    threadDistributionBase = threadDistribution;

    // calculate the wait time of the cycle
    cycleTime = Math.max(
      ns.getHackTime(target.hostname),
      ns.getGrowTime(target.hostname),
      ns.getWeakenTime(target.hostname)
    );

    // loop through all servers and start the scripts
    for (let server of servers) {
      // calculate the available threads on the server
      let ramAvailable = server.mayRam - server.ramUsed;
      let threadsAvailableLocal = Math.floor(ramAvailable / ramNeeded);
      // check if there are any threads available for tasking on this server
      if (threadsAvailableLocal) {
        // define a variable to hold the information about how many threads shall be used for what on this server
        let threadsToBeUsed = new Threads(0, 0, 0);
        // calculate howm any threads can be used for weakening
        threadsToBeUsed.weaken.count = Math.min(
          threadsAvailableLocal,
          threadDistribution.weaken.count
        );
        // update the remaining available threads and the globally demanded threads
        threadsAvailableLocal -= threadsToBeUsed.weaken.count;
        threadDistribution.weaken.count -= threadsToBeUsed.weaken.count;
        // calculate howm any threads can be used for growing
        threadsToBeUsed.grow.count = Math.min(
          threadsAvailableLocal,
          threadDistribution.grow.count
        );
        // update the remaining available threads and the globally demanded threads
        threadsAvailableLocal -= threadsToBeUsed.grow.count;
        threadDistribution.grow.count -= threadsToBeUsed.grow.count;
        // calculate howm any threads can be used for hacking
        threadsToBeUsed.hack.count = Math.min(
          threadsAvailableLocal,
          threadDistribution.hack.count
        );
        // update the remaining available threads and the globally demanded threads
        threadsAvailableLocal -= threadsToBeUsed.hack.count;
        threadDistribution.hack.count -= threadsToBeUsed.hack.count;
        // start the scripts
        for (script in threadsToBeUsed) {
          if (script.count > 0) {
            ns.exec(
              script.script,
              server.hostname,
              script.count,
              target.hostname
            );
          }
        }
      }
    }

    // print the cycle information to screen
    relativeMoney = (target.moneyAvailable / target.moneyMax) * 100;
    deltaSecurity = target.hackDifficulty - target.minDifficulty;
    threadsUsed = new Threads(
      threadDistributionBase.hack.count - threadDistribution.hack.count,
      threadDistributionBase.grow.count - threadDistribution.grow.count,
      threadDistributionBase.weaken.count - threadDistribution.weaken.count
    );
    let threadUsage = (threadsUsed.sum / threadsAvailable) * 100;
    ns.tprint(
      ns.sprintf(
        "|%s|Money: %3.1f|Security: %3.1f|Hack: %10i|Grow: %10i|Weaken: %10i|Time: %s|Usage: %3.1f",
        target.hostname,
        relativeMoney,
        deltaSecurity,
        threadsUsed.hack.count,
        threadsUsed.grow.count,
        threadsUsed.weaken.count,
        ns.tFormat(cycleTime),
        threadUsage
      )
    );

    // await another 100ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
    await ns.sleep(cycleTime + 100);
  }
}

/**
 * Get an array of the servers that are ready for tasking.
 * @param {import(".").NS } ns
 * @returns {Array} The server objects that are available for tasking.
 */
function getAvailableServers(ns) {
  // get the names of all purchased servers
  var serverNames = ns.getPurchasedServers();
  // read the file to get all servers and add them to the purchased servers
  var rows = ns.read("network_unlocked.txt").split("\r\n");
  for (let row of rows) {
    // Ignore last blank row
    if (row) {
      // get the server name and append it to the array
      serverNames.push(row);
    }
  }
  // loop through all the server names and get the associated server objects
  var servers = [];
  for (let name of serverNames) {
    servers.push(ns.getServer(name));
  }
  return servers;
}

/**
 * Read the target from port 1 or provide a replacement.
 * @param {import(".").NS } ns
 * @returns {import(".").Server} The server object of the target.
 */
function getTarget(ns) {
  var targetName = ns.peek(1);
  if (!targetName || targetName == "NULL PORT DATA") {
    target = ns.getServer("n00dles");
  } else {
    target = ns.getServer(targetName);
  }
  return target;
}

/**
 * Get the number of threads available for tasking on a set of servers.
 * @param {import(".").NS} ns
 * @param {Array} servers - The servers for which the number of threads shall be determined.
 * @param {number} ramNeeded - The amount of ram needed for any script.
 * @returns {number} The number of threads available for tasking.
 */
function getAvailableThreads(ns, servers, ramNeeded) {
  // define a variable for the total available threads
  var threadsAvailable = 0;
  // loop through all servers and add up their thread count
  for (let server of servers) {
    let ramAvailable = server.mayRam - server.ramUsed;
    threadsAvailable += Math.floor(ramAvailable / ramNeeded);
  }
  return threadsAvailable;
}
