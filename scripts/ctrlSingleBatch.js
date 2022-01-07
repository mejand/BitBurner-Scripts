import { logPrintVar, logPrintLine } from "./utilLog.js";
import {
  SingleBatch,
  getFarmingBatch,
  getPreparationBatch,
} from "./utilBatch.js";
import { MyServer } from "./utilServer.js";
import { getTarget, getAvailableServers } from "./utilCom.js";

/**
 * Handle a single batch at a time on the local host server.
 * @param {import("..").NS } ns
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
   * The batch object that will be started by this cotnroler.
   * @type {SingleBatch}
   */
  var batch = null;
  /**
   * The ID of the current batch.
   * @type {number}
   */
  var id = 0;
  /**
   * The total amount of RAM available to execute a new batch on.
   * @type {number}
   */
  var ramAvailable = 0;
  /**
   * The current time stamp.
   * @type {number}
   */
  var now = 0;
  /**
   * The time at which the next batch can be started.
   * @type {number}
   */
  var nextBatch = 0;

  while (true) {
    ns.clearLog();

    /** Get the current time */
    now = ns.getTimeSinceLastAug();

    /** Update the server objects */
    target = getTarget(ns);
    hosts = getAvailableServers(ns);

    /** Update the batch information if there is a target and hosts */
    if (target && hosts) {
      /** Calculate the available RAM on all hosts */
      ramAvailable = 0;
      for (let host of hosts) {
        ramAvailable += host.ramAvailable;
      }

      /** Print information to the log window */
      logPrintLine(ns);
      logPrintVar(ns, "Target", target.name);
      logPrintVar(ns, "Money on Target", target.moneyPercent);
      logPrintVar(ns, "Delta Security", target.deltaSecurity);
      logPrintVar(ns, "Success Chance", target.successChance);
      logPrintLine(ns);

      /** Only start a new patch if the time is right */
      if (now >= nextBatch) {
        /** Update the batch information (thread counts) */
        if (target.farming) {
          batch = getFarmingBatch(ns, target, id);
          logPrintVar(ns, "Mode", "Farming");
        } else {
          batch = getPreparationBatch(ns, target, id);
          logPrintVar(ns, "Mode", "Preparation");
        }

        /** Scale the batch to the available RAM */
        batch.scale(ramAvailable);

        /** Print the final resulting batch information */
        batch.print(ns);

        /** Start the batch */
        batch.execute(ns, hosts);

        /** Wait until the batch is finished to start the next patch.
         * If no patch could be started the script will try again after 400ms.
         */
        nextBatch = now + target.weakenTime + 400;

        id++;
      }

      /** Print information to the log window */
      logPrintLine(ns);
      logPrintVar(ns, "Available Hosts", hosts.length);
      logPrintVar(ns, "Available RAM", ramAvailable);
      logPrintVar(ns, "Sleep Time [s]", (nextBatch - now) / 1000);
      logPrintLine(ns);
    }

    await ns.sleep(400);
  }
}
