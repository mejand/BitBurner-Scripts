import { scriptDistribution } from "./hack_distribution.js";

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

  // define the variables for the script
  var target = getTarget(ns, debug);
  var servers = getAvailableServers(ns);

  // define values for terminal printing
  var relativeMoney = (target.moneyAvailable / target.moneyMax) * 100;
  var deltaSecurity = target.hackDifficulty - target.minDifficulty;

  // define a veriable to keep track of how long a script cycle takes
  var cycleTime = 0;

  // define an object to keep track of how many threads are used in total for each script type
  var threads_total = { hack: 0, grow: 0, weaken: 0 };

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // read the target from file and recalculate the thresholds
    target = getTarget(ns, debug);

    // get all servers that are ready for tasking
    servers = getAvailableServers(ns);

    // reset the total thread count
    threads_total.hack = 0;
    threads_total.grow = 0;
    threads_total.weaken = 0;

    // loop through all servers and start the scripts
    for (let server of servers) {
      // get the number of threads per script
      var threads = scriptDistribution(ns, server, target);
      // start the scripts
      ns.exec("hack.js", server.hostname, threads.hack, target.hostname);
      ns.exec("grow.js", server.hostname, threads.grow, target.hostname);
      ns.exec("weaken.js", server.hostname, threads.weaken, target.hostname);
      // add the scripts to the total thread count
      threads_total.hack += threads.hack;
      threads_total.grow += threads.grow;
      threads_total.weaken += threads.weaken;
    }

    // calculate the wait time of the cycle
    cycleTime = Math.max(
      ns.getHackTime(target.hostname),
      ns.getGrowTime(target.hostname),
      ns.getWeakenTime(target.hostname)
    );

    // print the cycle information to screen
    relativeMoney = (target.moneyAvailable / target.moneyMax) * 100;
    deltaSecurity = target.hackDifficulty - target.minDifficulty;
    ns.tprint(
      ns.sprintf(
        "|%(hostname)s|Money: %3.1%|Security: %3.1d|Hack: %(hack)i|Grow: %(grow)i|Weaken: %(weaken)i|Time: %s",
        target,
        relativeMoney,
        deltaSecurity,
        threads_total,
        threads_total,
        threads_total,
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
  servers = [];
  for (let name of serverNames) {
    servers.push(ns.getServer(name));
  }
  return servers;
}

/**
 * Read the target from port 1 or provide a replacement.
 * @param {import(".").NS } ns
 * @param {boolean} debug - Specify if debug mesages shall be printed to the terminal.
 * @returns {import(".").Server} The server object of the target.
 */
function getTarget(ns, debug) {
  var targetName = ns.peek(1);
  if (!targetName || targetName == "NULL PORT DATA") {
    target = ns.getServer("n00dles");
  } else {
    target = ns.getServer(targetName);
  }
  if (debug) {
    ns.tprint("target = " + target.hostname);
  }
  return target;
}
