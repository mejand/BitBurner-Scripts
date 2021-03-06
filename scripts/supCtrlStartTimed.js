import { getNetworkMapNames } from "./utilCom.js";
import { logPrintLine, logPrintVar } from "./utilLog.js";
import { getAvailableServerNames } from "./utilCom.js";

/**
 * Start timed controllers against available targets.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The names of all potential target servers.
   * @type {String[]}
   */
  var potentialTargets = getNetworkMapNames(ns);
  /**
   * The names of all viable target servers.
   * @type {String[]}
   */
  var vialbleTargets = [];
  /**
   * The names of all available host servers.
   * @type {String[]}
   */
  var hServers = getAvailableServerNames(ns);
  /**
   * Counter indicating which potential target is under investigation.
   * @type {Number}
   */
  var i = 0;
  /**
   * The maximum amount of RAM theoretically available to hack the target.
   * @type {Number}
   */
  var ramMaxAvailable = 0;
  /**
   * The server this script is running on.
   * @type {String}
   */
  var host = ns.getHostname();
  /**
   * Is the potential target already being hacked.
   * @type {Boolean}
   */
  var isTargeted = false;
  /**
   * The name of the control script that manages the hacking.
   * @type {String}
   */
  var controller = "ctrlTimedBatch.js";
  /**
   * The amount of RAM needed to run the controller script.
   * @type {Number}
   */
  var controllerRam = 0;
  /**
   * The amount of ram available on the host server.
   * @type {Number}
   */
  var ramAvaialble = 0;

  /** Only continue if the controller script is available on the host */
  if (ns.fileExists(controller, host)) {
    controllerRam = ns.getScriptRam(controller, host);

    /** Select the viable targets from all potential ones */
    for (let server of potentialTargets) {
      if (server != "home" && ns.getServerMaxMoney(server) > 0) {
        vialbleTargets.push(server);
      }
    }

    if (vialbleTargets) {
      while (true) {
        /** Calculate how much RAM is free on the host */
        ramAvaialble = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);

        /** Update the list of available servers */
        hServers = getAvailableServerNames(ns);

        /** Calculate the amount of RAM theoretically available */
        ramMaxAvailable = 0;
        for (let pServer of hServers) {
          ramMaxAvailable += ns.getServerMaxRam(pServer);
        }

        /** Check if there is already a controller targeting this server */
        isTargeted = ns.isRunning(controller, host, vialbleTargets[i]);

        /**
         * Check if the server could be targeted if it is not targeted yet
         * and there is enough free RAM on the host to start the controller
         */
        if (!isTargeted && ramAvaialble > controllerRam) {
          /** Check if the target can be hacked */
          if (
            ns.getServerRequiredHackingLevel(vialbleTargets[i]) <
              ns.getHackingLevel() &&
            ns.hasRootAccess(vialbleTargets[i])
          ) {
            ns.run(controller, 1, vialbleTargets[i]);
          }
        }

        /** Print information to the debug window and set the target for other scripts */
        ns.clearLog();
        logPrintLine(ns);
        logPrintVar(ns, "Last Investigated", vialbleTargets[i]);
        logPrintVar(ns, "Already Targeted", isTargeted);
        logPrintLine(ns);
        logPrintVar(ns, "Number of Targets", vialbleTargets.length);
        logPrintVar(ns, "Number of Hosts", hServers.length);
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
