import { getNetworkMapNames, setUnlockedServers } from "./utilCom.js";
import { logPrintVar, logPrintLine } from "./utilLog.js";

/**
 * Periodically try to gain root access to all servers in the server_map and save the servers with root access to file.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  /**
   * The time between trying to unlock new servers.
   * @type {number}
   */
  var period = 1000;
  if (ns.args.length > 0 && typeof ns.args[0] == "number") {
    period = ns.args[0];
  }
  /**
   * All names of currently unlock servers.
   * @type {String[]}
   */
  var unlockedServers = [];
  /**
   * All server names that are in the network.
   * @type {String[]}
   */
  var servers = getNetworkMapNames(ns);

  while (true) {
    ns.clearLog();

    /** Reset the unlocked servers */
    unlockedServers = [];

    /** Only continue if there are any mapped servers */
    if (servers) {
      /** loop through all servers in the network and check if they are unlocked */
      for (let server of servers) {
        /** Update the server objects to reflect their current state */
        server.update(ns);

        /** Try and unlock the server (nothing will happen if it is already unlocked) */
        if (ns.hasRootAccess(server)) {
          /** Add the server to the unlocked servers */
          unlockedServers.push(server);
        }
      }

      logPrintLine(ns);
      logPrintVar(ns, "Unlocked Servers", unlockedServers.length);
      logPrintVar(ns, "Total Servers", servers.length);
      logPrintLine(ns);

      /** Save the unlocked servers for other functions */
      await setUnlockedServers(ns, unlockedServers);
    } else {
      /** Attempt to update the mapped servers */
      servers = getNetworkMapNames(ns);

      logPrintLine(ns);
      logPrintVar(ns, "No Server Map", "-");
      logPrintLine(ns);
    }

    await ns.sleep(period);
  }
}
