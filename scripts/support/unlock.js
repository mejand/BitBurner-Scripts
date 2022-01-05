import { MyServer } from "../utilities/server.js";
import {
  getNetworkMap,
  setTarget,
  setUnlockedServers,
} from "../utilities/com.js";
import { logPrintVar } from "../utilities/log.js";

/**
 * Periodically try to gain root access to all servers in the server_map and save the servers with root access to file.
 * Identify the best target and save it to file.
 * @param {import("../..").NS } ns
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
  /**
   * The highest observed score in any unlocked server.
   * @type {number}
   */
  var maxScore = 0;
  /**
   * The most profitable hack target.
   * @type {MyServer}
   */
  var target = null;

  while (true) {
    ns.clearLog();

    /** Reset the unlocked servers */
    unlockedServers = [];

    /** Reset the target */
    maxScore = 0;
    target = null;

    /** Only continue if there are any mapped servers */
    if (servers) {
      logPrintVar(ns, "Server", "Has Root Access");

      /** loop through all servers in the network and check if they are unlocked */
      for (let server of servers) {
        /** Update the server objects to reflect their current state */
        server.update(ns);

        /** Try and unlock the server (nothing will happen if it is already unlocked) */
        if (server.getRootAccess(ns)) {
          /** Copy all text files on the server to home */
          await server.copyFilesToHome(ns);
          /** Add the server to the unlocked servers */
          unlockedServers.push(server);
          /**
           * The score of the current server.
           * @type {number}
           */
          let score = server.calcScore(ns);
          /** Update the target if appropriate */
          if (score > maxScore) {
            maxScore = score;
            target = server;
          }
        }

        logPrintVar(ns, server.name, server.server.hasAdminRights);
      }

      if (target) {
        logPrintVar(ns, "Target", target.name);
      }

      /** Save the unlocked servers for other functions */
      await setUnlockedServers(ns, unlockedServers);

      /** Save the target for other functions */
      await setTarget(ns, target);
    } else {
      /** Attempt to update the mapped servers */
      servers = getNetworkMap(ns);

      logPrintVar(ns, "No Server Map", "-");
    }

    await ns.sleep(period);
  }
}
