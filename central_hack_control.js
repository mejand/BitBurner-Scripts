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
  var threadsAvailable = getAvailableThreads(servers, ramNeeded);

  // define a variable to keep thrack of how many threads shall be used for which script
  var threadDistributionTarget = scriptDistribution(
    ns,
    threadsAvailable,
    target
  );
  var threadDistribution = threadDistributionTarget;
  var threadDistributionActual = new Threads(0, 0, 0);

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // update the target if debug mode is off
    if (!debug) {
      // in debug mode n00dles is used because it has the shortest wait times
      target = getTarget(ns);
    }

    // get all servers that are ready for tasking
    servers = getAvailableServers(ns);

    // calculate how many threads are available for tasking
    threadsAvailable = getAvailableThreads(servers, ramNeeded);

    // update the thread distribution target and working values
    threadDistributionTarget = scriptDistribution(
      ns,
      threadsAvailable,
      target,
      debug
    );
    threadDistribution = threadDistributionTarget;

    // calculate the wait time of the cycle
    cycleTime = Math.max(
      ns.getHackTime(target.hostname),
      ns.getGrowTime(target.hostname),
      ns.getWeakenTime(target.hostname)
    );

    // loop through all servers and start the scripts
    for (let server of servers) {
      // calculate the available threads on the server
      let ramAvailable = server.maxRam - server.ramUsed;
      let threadsAvailableLocal = Math.floor(ramAvailable / ramNeeded);
      // check if there are any threads available for tasking on this server
      if (threadsAvailableLocal > 0) {
        // start the scripts
        for (let script in threadDistribution) {
          // calculate how many threads can be used for the script
          let threadsForScript = Math.min(
            threadsAvailableLocal,
            threadDistribution[script].count
          );
          if (threadsForScript > 0) {
            // update the remaining available threads and the globally demanded threads
            threadsAvailableLocal -= threadsForScript;
            threadDistribution[script].count -= threadsForScript;
            // start the script
            ns.exec(
              threadDistribution[script].script,
              server.hostname,
              threadsForScript,
              target.hostname
            );
          }
        }
      }
    }

    // print the cycle information to screen
    relativeMoney = (target.moneyAvailable / target.moneyMax) * 100;
    deltaSecurity = target.hackDifficulty - target.minDifficulty;
    threadDistributionActual = new Threads(
      threadDistributionTarget.hack.count - threadDistribution.hack.count,
      threadDistributionTarget.grow.count - threadDistribution.grow.count,
      threadDistributionTarget.weaken.count - threadDistribution.weaken.count
    );
    let threadUsage = (threadDistributionActual.sum / threadsAvailable) * 100;
    ns.tprint(
      ns.sprintf(
        "|%s|Money: %3.1f|Security: %3.1f|Hack: %6i|Grow: %6i|Weaken: %6i|Usage: %3.1f|Time: %s|",
        target.hostname,
        relativeMoney,
        deltaSecurity,
        threadDistributionActual.hack.count,
        threadDistributionActual.grow.count,
        threadDistributionActual.weaken.count,
        threadUsage,
        ns.tFormat(cycleTime)
      )
    );

    // await another 100ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
    await ns.sleep(cycleTime + 100);
  }
}

/**
 * Get an array of the servers that are ready for tasking.
 * @param {import(".").NS } ns
 * @returns {import(".").Server[]} The server objects that are available for tasking.
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
 * @param {import(".").Server[]} servers - The servers for which the number of threads shall be determined.
 * @param {number} ramNeeded - The amount of ram needed for any script.
 * @returns {number} The number of threads available for tasking.
 */
function getAvailableThreads(servers, ramNeeded) {
  // define a variable for the total available threads
  var threadsAvailable = 0;
  // loop through all servers and add up their thread count
  for (let server of servers) {
    let ramAvailable = server.maxRam - server.ramUsed;
    threadsAvailable += Math.floor(ramAvailable / ramNeeded);
  }
  return threadsAvailable;
}
