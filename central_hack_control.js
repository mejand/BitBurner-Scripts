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

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // read the target from file and recalculate the thresholds
    target = getTarget(ns, debug);

    // reset the total thread count
    totalThreads = 0;

    // get all servers that are ready for tasking
    servers = getAvailableServers(ns);

    // await another 100ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
    await ns.sleep(100);
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
  var target_name = ns.peek(1);
  if (!target_name || target_name == "NULL PORT DATA") {
    target = ns.getServer("n00dles");
  } else {
    target = ns.getServer(target_name);
  }
  if (debug) {
    ns.tprint("target = " + target.hostname);
  }
  return target;
}
