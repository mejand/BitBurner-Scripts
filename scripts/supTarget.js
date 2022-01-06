import { MyServer } from "./utilServer.js";
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
   * The default target that shall be used if no valid target can be found.
   * @type {MyServer}
   */
  var defaultTarget = new MyServer(ns, "n00dles");
  /**
   * The target server.
   * @type {MyServer}
   */
  var target = null;
  /**
   * All potential target servers.
   * @type {MyServer[]}
   */
  var potentialTargets = getNetworkMap(ns);
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
   * The score of the current target.
   * @type {number}
   */
  var maxScore = 0;

  while (true) {
    /** Update the network map if it has not been read successfully yet */
    if (!potentialTargets) {
      potentialTargets = getNetworkMap(ns);
    }

    /** Update the list of available servers */
    availableHosts = getAvailableServers(ns);

    /** Calculate the amount of RAM theoretically available */
    ramMaxAvailable = 0;
    for (let host of availableHosts) {
      ramMaxAvailable += host.server.maxRam;
    }

    /** find a new target if possible */
    if (potentialTargets && ramMaxAvailable > 0) {
      /** Update the status of the target bevore it is examined */
      potentialTargets[i].update(ns);

      /**
       * The score of the currently investigated server.
       * @type {number}
       */
      let score = potentialTargets[i].calcScore(ns);

      /** Update the target if the score is greater than that of the last target */
      if (score > maxScore) {
        target = potentialTargets[i];
        maxScore = score;
      }

      /** Increment the counter to look at the next potential target */
      if (i < potentialTargets.length - 1) {
        i++;
      } else {
        i = 0;
      }
    }

    let targetName = await setTarget(ns, target);

    /** Print information to the debug window and set the target for other scripts */
    ns.clearLog();
    logPrintLine(ns);
    logPrintVar(ns, "Target", targetName);
    logPrintVar(ns, "Max Score", maxScore);
    logPrintLine(ns);
    logPrintVar(ns, "Number of Targets", potentialTargets.length);
    logPrintVar(ns, "Number of Hosts", availableHosts.length);
    logPrintLine(ns);

    await ns.sleep(1000);
  }
}
