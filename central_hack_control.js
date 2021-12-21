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
  var available_ram = 0;
  var servers = [];
  var total_threads = 0;

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    // read the target from file and recalculate the thresholds
    target = getTarget(ns, debug);

    // reset the total thread count
    total_threads = 0;

    // get the purchase servers as the base of the servers to handle
    servers = ns.getPurchasedServers();
    // read the file to get all servers and add them to the purchased servers
    var rows = ns.read("network_unlocked.txt").split("\r\n");
    for (let row of rows) {
      // Ignore last blank row
      if (row) {
        // get the server name and append it to the array
        servers.push(row);
      }
    }

    // check which action needs to be performed
    if (target.hackDifficulty > securityThresh) {
      for (let server of servers) {
        available_ram =
          ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        // If the server's security level is above our threshold, weaken it
        let thread_count = Math.floor(
          available_ram / ns.getScriptRam("weaken.js")
        );
        if (thread_count > 0) {
          ns.exec("weaken.js", server, thread_count, target.hostname);
        }
        // update the total thread count
        total_threads += thread_count;
      }
      await ns.sleep(ns.getWeakenTime(target.hostname));
    } else if (target.moneyAvailable < moneyThresh) {
      for (let server of servers) {
        available_ram =
          ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        // If the server's money is less than our threshold, grow it
        let thread_count = Math.floor(
          available_ram / ns.getScriptRam("grow.js")
        );
        if (thread_count > 0) {
          ns.exec("grow.js", server, thread_count, target.hostname);
        }
        // update the total thread count
        total_threads += thread_count;
      }
      await ns.sleep(ns.getGrowTime(target.hostname));
    } else {
      for (let server of servers) {
        available_ram =
          ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        // Otherwise, hack it
        let thread_count = Math.floor(
          available_ram / ns.getScriptRam("hack.js")
        );
        if (thread_count > 0) {
          ns.exec("hack.js", server, thread_count, target.hostname);
        }
        // update the total thread count
        total_threads += thread_count;
      }
      await ns.sleep(ns.getHackTime(target.hostname));
    }
    // await another 100ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
    await ns.sleep(100);
  }
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
