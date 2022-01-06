import { MyServer } from "./utilServer.js";
import { getNetworkMap, setUnlockedServers } from "./utilCom.js";
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
  var period = 10000;
  if (ns.args.length > 0 && typeof ns.args[0] == "number") {
    period = ns.args[0];
  }
  /**
   * All current unlock servers.
   * @type {MyServer[]}
   */
  var unlockedServers = [];
  /**
   * All servers that are in the network.
   * @type {MyServer[]}
   */
  var servers = getNetworkMap(ns);

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
        if (server.getRootAccess(ns)) {
          /** Copy the simple bot scripts to the unlocked server */
          if (server.name != "home") {
            /**
             * The names of all files on the server.
             * @type {string[]}
             */
            let filesToCopy = [
              "botsSingleGrow.js",
              "botsSingleHack.js",
              "botsSingleWeaken.js",
            ];
            await ns.scp(filesToCopy, "home", server.name);
          }
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
      servers = getNetworkMap(ns);

      logPrintLine(ns);
      logPrintVar(ns, "No Server Map", "-");
      logPrintLine(ns);
    }

    await ns.sleep(period);
  }
}
