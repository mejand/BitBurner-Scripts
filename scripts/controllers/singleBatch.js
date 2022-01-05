import { logPrintVar } from "../utilities/log.js";
import {
  SingleBatch,
  getFarmingBatch,
  getPreparationBatch,
} from "../utilities/batch.js";
import { MyServer } from "../utilities/server.js";
import { getTarget } from "../utilities/com.js";

/**
 * Handle a single batch at a time on the local host server.
 * @param {import("../..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The name of the host server the script runs on.
   * @type {string}
   */
  var hostName = ns.getHostname();
  /**
   * The name of the hack script used in this controller.
   * @type {string}
   */
  var hackScript = "/bots/singleHack.js";
  /**
   * The name of the grow script used in this controller.
   * @type {string}
   */
  var growScript = "/bots/singleGrow.js";
  /**
   * The name of the hack script used in this controller.
   * @type {string}
   */
  var weakenScript = "/bots/singleWeaken.js";
  /**
   * The RAM needed to run the hack script.
   * @type {number}
   */
  var hackRam = ns.getScriptRam(hackScript, hostName);
  /**
   * The RAM needed to run the grow script.
   * @type {number}
   */
  var growRam = ns.getScriptRam(growScript, hostName);
  /**
   * The RAM needed to run the weaken script.
   * @type {number}
   */
  var weakenRam = ns.getScriptRam(weakenScript, hostName);
  /**
   * The RAM needed to run any of the bot scripts.
   * @type {number}
   */
  var scriptRam = Math.max(hackRam, growRam, weakenRam);
  /**
   * The server object of the target.
   * @type {MyServer}
   */
  var target = getTarget(ns);
  /**
   * The server object of the host the script is running on.
   * @type {MyServer}
   */
  var host = new MyServer(ns, hostName, scriptRam);
  /**
   * The time in milliseconds the script shall wait before attempting
   * to start the next batch.
   * @type {number}
   */
  var sleepTime = 150;
  /**
   * The batch object that will be started by this cotnroler.
   * @type {SingleBatch}
   */
  var batch = null;

  /** Open the log window */
  ns.tail();

  while (true) {
    ns.clearLog();
    /** Update the server objects */
    target = getTarget(ns);
    host.update(ns);

    /** Reset the sleep time to ensure there are no unecessary wait times */
    sleepTime = 150;
    if (target) {
      if (target.farming) {
        batch = getFarmingBatch(ns, target, host);
      } else {
        batch = getPreparationBatch(ns, target, host);
      }

      /** Start the batch if there are enough threads available */
      if (batch.totalRam <= host.ramAvailable) {
        let hosts = [host];
        batch.execute(ns, hosts);

        /** Wait until the batch is finished to start the next patch.
         * If no patch could be started the script will try again after 200ms.
         */
        sleepTime = target.weakenTime + 400;
      }

      /** Print information to the log window */
      logPrintVar(ns, "Money on Target", target.moneyPercent);
      logPrintVar(ns, "Load on Host", host.load);
      logPrintVar(ns, "Sleep Time", sleepTime);
      batch.print(ns);
    }

    await ns.sleep(sleepTime);
  }
}
