import { ScriptHandler } from "./hack_distribution.js";

/**
 * Handle the growing, weakening and hacking scripts from one central server.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * Enable debug actions.
   * @type {boolean}
   */
  var debug = true;
  if (ns.args.length > 0 && typeof ns.args[0] == "boolean") {
    debug = ns.args[0];
  }

  // clean up the log
  ns.disableLog("ALL");

  /**
   * The target server.
   * @type {import(".").Server}
   */
  var target = ns.getServer("n00dles");

  /**
   * The available host servers.
   * @type {import(".").Server[]}
   */
  var servers = [];

  /**
   * The script handlers for each available host server.
   * @type {ScriptHandler[]}
   */
  var handlers = [];

  /**
   * The time between each calculation cycle.
   * @type {number}
   */
  var cycleTime = 1000;

  /**
   * The combined load of all available servers.
   * @type {number}
   */
  var load = 0;

  /**
   * The percentage of money currently on the target server.
   * @type {number}
   */
  var moneyPercent = 0;

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // update the target if debug mode is off
    if (debug) {
      // in debug mode the default target is used (get current server object)
      target = ns.getServer(target.hostname);
    } else {
      // get the newest target (current copy of the server object will be provided by getTarget())
      target = getTarget(ns);
    }

    /**
     * The available servers, updated in the current calculation cycle to check if new servers became available.
     * @type {import(".").Server[]}
     */
    let newServers = getAvailableServers(ns);

    // check if new servers have become available
    if (servers.length != newServers.length) {
      // reset the handlers and create new handlers for each available server
      handlers = [];
      for (let server of newServers) {
        handlers.push(new ScriptHandler(ns, server, target));
      }
    }

    // take over the new server list
    servers = newServers;

    // reset the cycle time
    cycleTime = 0;

    // reset the load
    load = 0;

    // loop through all handlers, update them and start their scripts
    for (let handler of handlers) {
      handler.update(ns);
      handler.execute(ns);
      cycleTime = Math.max(cycleTime, handler.cycleTime);
      load += handler.load;
      if (debug) {
        ns.print(handler.description(ns));
      }
    }

    // rescale the laod based on the number of available servers
    load = load / handlers.length;

    // update the money percent
    moneyPercent = (target.moneyAvailable / target.moneyMax) * 100;

    // print a status update to the terminal
    ns.tprint(
      ns.sprintf(
        "|%s|Load: %3.1f|Money: %3.1f|%s|",
        target.hostname,
        load,
        moneyPercent,
        ns.tFormat(cycleTime)
      )
    );

    // sleep while the scripts are active
    await ns.sleep(cycleTime);
  }
}

/**
 * Get an array of the servers that are ready for tasking.
 * @param {import(".").NS } ns
 * @returns {import(".").Server[]} The server objects that are available for tasking.
 */
function getAvailableServers(ns) {
  /**
   * The names of all available servers
   * @type {string[]}
   */
  var serverNames = ns.getPurchasedServers();

  /**
   * The rows of the network_unlocked.txt file.
   * @type {string[]}
   */
  var rows = ns.read("network_unlocked.txt").split("\r\n");

  // loop through all rows and add the names to the available servers
  for (let row of rows) {
    // Ignore last blank row
    if (row) {
      // get the server name and append it to the array
      serverNames.push(row);
    }
  }

  /**
   * All available servers.
   * @type {import(".").Server[]}
   */
  var servers = [];

  // loop through all server names and get the corresponding server objects
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
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = ns.peek(1);

  /**
   * The target server object.
   * @type {import(".").Server}
   */
  var target = null;

  // check if the target name is valid and provide a replacement value if necessary
  if (ns.serverExists(targetName)) {
    target = ns.getServer(targetName);
  } else {
    target = ns.getServer("n00dles");
  }

  return target;
}
