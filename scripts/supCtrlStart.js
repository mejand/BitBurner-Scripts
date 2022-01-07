import { MyServer } from "./utilServer.js";
import { SingleBatch, getFarmingBatch } from "./utilBatch.js";
import { getNetworkMap, getAvailableServers } from "./utilCom.js";
import { setTarget } from "./utilCom.js";
import { logPrintLine, logPrintVar } from "./utilLog.js";

/**
 * Provide the most profitable target for use in other scripts.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * All potential target servers.
   * @type {MyServer[]}
   */
  var potentialTargets = getNetworkMap(ns);
  /**
   * All viable target servers.
   * @type {MyServer[]}
   */
  var vialbleTargets = [];
  /**
   * All available host servers.
   * @type {MyServer[]}
   */
  var availableHosts = getAvailableServers(ns);
  /**
   * Counter indicating which potential target is under investigation.
   * @type {number}
   */
  var i = 0;
  /**
   * The maximum amount of RAM theoretically available to hack the target.
   * @type {number}
   */
  var ramMaxAvailable = 0;
  /**
   * The target with minimal security level.
   * @type {MyServer}
   */
  var minSecTarget = null;
  /**
   * The batch needed to hack the target at minimum security.
   * @type {SingleBatch}
   */
  var minSecBatch = null;
  /**
   * The name of the server this script is running on.
   * @type {string}
   */
  var host = ns.getHostname();
  /**
   * Is the potential target already being hacked.
   * @type {boolean}
   */
  var isTargeted = false;

  /** Select the viable targets from all potential ones */
  for (let server of potentialTargets) {
    if (server.name != "home" && server.server.moneyMax > 0) {
      vialbleTargets.push(server);
    }
  }

  if (vialbleTargets) {
    while (true) {
      /** Update the list of available servers */
      availableHosts = getAvailableServers(ns);

      /** Calculate the amount of RAM theoretically available */
      ramMaxAvailable = 0;
      for (let host of availableHosts) {
        ramMaxAvailable += host.server.maxRam;
      }

      /** Update the status of the target bevore it is examined */
      vialbleTargets[i].update(ns);

      /** Check if there is already a controller targeting this server */
      isTargeted = ns.isRunning(
        "ctrlSingleBatch.js",
        host,
        vialbleTargets[i].name
      );

      /** Check if the server could be targeted if it is not targeted yet */
      if (!isTargeted) {
        /** Check if there is enough free RAM only if the server is generally viable */
        if (vialbleTargets[i].calcScore(ns) > 0) {
          /** Get a representation of the server that has minimum security */
          minSecTarget = new MyServer(ns, vialbleTargets[i].name);
          minSecTarget.server.hackDifficulty =
            minSecTarget.server.minDifficulty;

          /** Get the batch that would be needed to farm the server at minimum security */
          minSecBatch = getFarmingBatch(ns, minSecTarget);
        }
      }

      /** Print information to the debug window and set the target for other scripts */
      ns.clearLog();
      logPrintLine(ns);
      logPrintVar(ns, "Target", targetName);
      logPrintVar(ns, "Already Targeted", isTargeted);
      logPrintVar(ns, "Max Score", maxScore);
      logPrintVar(ns, "RAM available", ramMaxAvailable);
      logPrintLine(ns);
      logPrintVar(ns, "Last Investigated", vialbleTargets[i].name);
      logPrintVar(ns, "Score", score);
      logPrintVar(ns, "RAM needed", minSecBatch.totalRam);
      logPrintLine(ns);
      logPrintVar(ns, "Number of Targets", vialbleTargets.length);
      logPrintVar(ns, "Number of Hosts", availableHosts.length);
      logPrintLine(ns);

      /** Increment the counter to look at the next potential target */
      if (i < vialbleTargets.length - 1) {
        i++;
      } else {
        i = 0;
      }

      await ns.sleep(1000);
    }
  } else {
    /** Print an error message if no viable target was found (maybe Spider has not run yet) */
    ns.clearLog();
    logPrintLine(ns);
    logPrintVar(ns, "Error", "No Viable Targets");
    logPrintLine(ns);
  }
}
