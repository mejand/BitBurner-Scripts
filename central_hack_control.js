import { BatchHandler } from "./hack_distribution.js";

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
   * The RAM needed to run the hack script.
   * @type {number}
   */
  var hackRam = ns.getScriptRam("hack.js", "home");

  /**
   * The RAM needed to run the grow script.
   * @type {number}
   */
  var growRam = ns.getScriptRam("grow.js", "home");

  /**
   * The RAM needed to run the weaken script.
   * @type {number}
   */
  var weakenRam = ns.getScriptRam("weaken.js", "home");

  /**
   * The target server.
   * @type {import(".").Server}
   */
  var targetServer = ns.getServer("n00dles");

  /**
   * The available host servers.
   * @type {import(".").Server[]}
   */
  var hostServers = [];

  /**
   * The script handlers for each available host server.
   * @type {BatchHandler[]}
   */
  var handlers = [];

  /**
   * The time between each calculation cycle.
   * @type {number}
   */
  var cycleTime = 50;

  /**
   * The running count of batches that have been created.
   * @type {number}
   */
  var batchCount = 0;

  /**
   * The loading of all host servers in percent.
   * @type {number}
   */
  var load = 0;

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // clean up the log
    ns.clearLog();

    // reset values for the cycle
    handlers = [];
    batchCount = 0;
    load = 0;
    cycleTime = 0;

    // update the target if debug mode is off
    if (debug) {
      // in debug mode the default target is used (get current server object)
      targetServer = ns.getServer(targetServer.hostname);
    } else {
      // get the newest target (current copy of the server object will be provided by getTarget())
      targetServer = getTarget(ns);
    }

    // update the available servers
    hostServers = getAvailableServers(ns);

    // loop through all host servers and create batch handlers for each one
    for (let server of hostServers) {
      handlers.push(
        new BatchHandler(
          ns,
          targetServer.hostname,
          server.hostname,
          hackRam,
          growRam,
          weakenRam
        )
      );
    }

    // loop through all handlers to update and execute their batches
    for (let handler of handlers) {
      handler.update(ns);
      handler.execute(ns, batchCount);
      batchCount += handler.batchCount;
      load += handler.load;
      cycleTime = Math.max(cycleTime, handler.batchTime);
      if (debug) {
        ns.print(
          handler.hostServer.hostname +
            ": " +
            ns.tFormat(handler.batchTime) +
            " + " +
            handler.hostServer.maxRam +
            "GB"
        );
      }
    }

    if (debug) {
      ns.print("batchTime = " + ns.tFormat(cycleTime));
      ns.print("Time for batchCount = " + ns.tFormat(batchCount * 10 + 100));
      ns.print(
        "load / handlers.length = " +
          load +
          " / " +
          handlers.length +
          " = " +
          load / handlers.length
      );
    }

    // add the number of batches and padding to the cycle time
    cycleTime += batchCount * 10 + 50;

    // scale the load value by the number of hosts
    load = load / handlers.length;

    ns.tprint(
      ns.sprintf(
        "||%s|Load: %3.1f|Money: %3.1f|Security: %3.1f|Batches: %i|%s||",
        targetServer.hostname,
        load,
        (targetServer.moneyAvailable / targetServer.moneyMax) * 100,
        targetServer.hackDifficulty - targetServer.minDifficulty,
        batchCount,
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

  serverNames.push("home");

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
