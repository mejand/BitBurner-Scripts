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
   * The name of the target server. Will be null if the script was started
   * without a target.
   * @type {string}
   */
  var targetName = null;
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  }
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
  /**
   * The operating mode of the script for display in the log window.
   * @type {string}
   */
  var mode = "-";

  /**
   * Set the target to the specified server if the script
   * was started with a specific target
   */
  if (targetName) {
    target = new MyServer(ns, targetName);
  }

  while (true) {
    ns.clearLog();

    /** Get the current time */
    now = ns.getTimeSinceLastAug();

    /** Update the server objects */
    hosts = getAvailableServers(ns);

    /** Update the batch information if there is a target and hosts */
    if (target && hosts) {
      /** Calculate the available RAM on all hosts */
      ramAvailable = 0;
      for (let host of hosts) {
        ramAvailable += host.ramAvailable;
      }

      /** Only start a new patch if the time is right */
      if (now >= nextBatch) {
        /** Get the currently best target */
        if (targetName) {
          target.update(ns);
        } else {
          target = getTarget(ns);
        }
        /** Update the batch information (thread counts) */
        if (target.farming) {
          batch = getFarmingBatch(ns, target, id);
          mode = "Farming";
        } else {
          batch = getPreparationBatch(ns, target, id);
          mode = "Preparation";
        }

        /** Scale the batch to the available RAM */
        batch.scale(ramAvailable);

        /** Start the batch */
        batch.execute(ns, hosts);

        /** Wait until the batch is finished to start the next patch.
         * If no patch could be started the script will try again after 400ms.
         */
        nextBatch = now + target.weakenTime + 400;

        id++;
      } else {
        target.update(ns);
      }

      /** Print information to the log window */
      /** Print information to the log window */
      logPrintLine(ns);
      logPrintVar(ns, "Target", target.name);
      logPrintVar(ns, "Money on Target", target.moneyPercent);
      logPrintVar(ns, "Delta Security", target.deltaSecurity);
      logPrintVar(ns, "Success Chance", target.successChance);
      logPrintVar(ns, "Mode", mode);
      logPrintLine(ns);
      batch.print(ns);
      logPrintLine(ns);
      logPrintVar(ns, "Available Hosts", hosts.length);
      logPrintVar(ns, "Available RAM", ramAvailable);
      logPrintVar(ns, "Sleep Time [s]", (nextBatch - now) / 1000);
      logPrintLine(ns);
    }

    await ns.sleep(400);
  }
}
