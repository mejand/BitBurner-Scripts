import { MyServer } from "./utilServer.js";
import { SingleBatch, getFarmingBatch } from "./utilBatch.js";
import { getNetworkMap, getAvailableServers } from "./utilCom.js";
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
   * The server this script is running on.
   * @type {MyServer}
   */
  var hostServer = new MyServer(ns, ns.getHostname());
  /**
   * Is the potential target already being hacked.
   * @type {boolean}
   */
  var isTargeted = false;
  /**
   * The name of the control script that manages the hacking.
   * @type {string}
   */
  var controller = "ctrlSingleBatch.js";
  /**
   * The amount of RAM needed to run the controller script.
   * @type {number}
   */
  var controllerRam = 0;

  /** Only continue if the controller script is available on the host */
  if (ns.fileExists(controller, hostServer.name)) {
    controllerRam = ns.getScriptRam(controller, hostServer.name);

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

        /** Update the status of the host */
        hostServer.update(ns);

        /** Check if there is already a controller targeting this server */
        isTargeted = ns.isRunning(
          controller,
          hostServer.name,
          vialbleTargets[i].name
        );

        /**
         * Check if the server could be targeted if it is not targeted yet
         * and there is enough free RAM on the host to start the controller
         */
        if (!isTargeted && hostServer.ramAvailable > controllerRam) {
          /** Check if there is enough free RAM only if the server is generally viable */
          if (vialbleTargets[i].calcScore(ns) > 0) {
            /** Get a representation of the server that has minimum security */
            minSecTarget = new MyServer(ns, vialbleTargets[i].name);
            minSecTarget.server.hackDifficulty =
              minSecTarget.server.minDifficulty;

            /** Get the batch that would be needed to farm the server at minimum security */
            minSecBatch = getFarmingBatch(ns, minSecTarget, 0, 0.5);

            /** Target the server if the ram needed to hack it is less than half the available ram */
            if (minSecBatch.totalRam < ramMaxAvailable * 0.5) {
              ns.run(controller, 1, vialbleTargets[i].name);
            }
          }
        }

        /** Print information to the debug window and set the target for other scripts */
        ns.clearLog();
        logPrintLine(ns);
        logPrintVar(ns, "Last Investigated", vialbleTargets[i].name);
        logPrintVar(ns, "Already Targeted", isTargeted);
        logPrintVar(ns, "Score", vialbleTargets[i].calcScore(ns));
        if (minSecBatch && minSecBatch.targetName == vialbleTargets[i].name) {
          logPrintVar(ns, "RAM needed", minSecBatch.totalRam);
        } else {
          logPrintVar(ns, "RAM needed", "-");
        }
        logPrintLine(ns);
        logPrintVar(ns, "Number of Targets", vialbleTargets.length);
        logPrintVar(ns, "Number of Hosts", availableHosts.length);
        logPrintVar(ns, "RAM available", ramMaxAvailable);
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
  } else {
    /** Print an error message if the controller script is not on the host */
    ns.clearLog();
    logPrintLine(ns);
    logPrintVar(ns, "Error", "Script Missing");
    logPrintLine(ns);
  }
}
