import { logPrintVar } from "../utilities/log.js";
import {
  SingleBatch,
  getFarmingBatch,
  getPreparationBatch,
} from "../utilities/batch.js";
import { MyServer } from "../utilities/server.js";
import { getTarget, getAvailableServers } from "../utilities/com.js";

/**
 * Handle a single batch at a time on the local host server.
 * @param {import("../..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The server object of the target.
   * @type {MyServer}
   */
  var target = getTarget(ns);
  /**
   * The server objects that are available for tasking.
   * @type {MyServer[]}
   */
  var hosts = getAvailableServers(ns);
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
    hosts = getAvailableServers(ns);

    /** Reset the sleep time to ensure there are no unecessary wait times */
    sleepTime = 150;

    /** Update the batch information if there is a target and hosts */
    if (target && hosts) {
      if (target.farming) {
        batch = getFarmingBatch(ns, target);
      } else {
        batch = getPreparationBatch(ns, target);
      }

      /** Start the batch */
      batch.execute(ns, hosts);

      /** Wait until the batch is finished to start the next patch.
       * If no patch could be started the script will try again after 200ms.
       */
      sleepTime = target.weakenTime + 400;

      /** Print information to the log window */
      logPrintVar(ns, "Money on Target", target.moneyPercent);
      logPrintVar(ns, "Sleep Time", sleepTime);
      batch.print(ns);
    }

    await ns.sleep(sleepTime);
  }
}
