import {
  TimedBatch,
  getTimedFarmingBatch,
  getTimedPreparationBatch,
} from "./utilTimedBatch.js";

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
  var target = null;
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    target = ns.args[0];
  }
  /**
   * The time in milliseconds that shall pass between batch executions.
   * @type {Number}
   */
  var period = 1600;
  /**
   * The current time in milliseconds.
   * @type {Number}
   */
  var now = 0;
  /**
   * The number of batches that can be executed in sequence without
   * interfering with each other.
   * @type {Number}
   */
  var batchCount = 0;
  /**
   * The number of batches that still needs to be executed.
   * @type {Number}
   */
  var batchCountRemaining = 0;
  /**
   * A unique ID for each batch.
   * @type {Number}
   */
  var id = 0;
  /**
   * The amount of time in milliseconds it takes to complete a hack action.
   * @type {Number}
   */
  var hackTime = 0;
  /**
   * The batch that shall be executed.
   * @type {TimedBatch}
   */
  var batch = null;
  /**
   * The names of the host servers.
   * @type {String[]}
   */
  var hosts = [];
  /**
   * The current state of the script (1 = Waiting, 2 = Preparation, 3 = Farming).
   * @type {Number}
   */
  var state = 1;
  /**
   * The time until which the script shall wait before moving to the next state.
   * @type {Number}
   */
  var waitUntil = 0;
  /**
   * The percentage of money on the target server.
   * @type {Number}
   */
  var money = 0;
  /**
   * The difference between current and minimum security on the target
   * server.
   * @type {Number}
   */
  var security = 0;

  ns.tail();

  while (batchCountRemaining > 0) {
    /** Get the current time */
    now = ns.getTimeSinceLastAug();
    /** Update information on the target server */
    money = ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target);
    money *= 100;
    security =
      ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);

    ns.clearLog();
    ns.print("Money = " + money);
    ns.print("Security = " + security);

    switch (state) {
      case 1:
        /** ------------- State 1 = Waiting ------------- */
        if (now >= waitUntil) {
          ns.print("State = " + "Preparation");
          ns.print("Wait = " + (waitUntil - now) * 0.01);
          /** Decide if the target should be prepared or grown */
          if (money > 0.9 && security < 1) {
            state = 3;
            waitUntil = 0;
          } else {
            state = 2;
            waitUntil = 0;
          }
        }
        break;
      case 2:
        /** ------------- State 1 = Preparation --------- */
        if (now % period == 0) {
          /** Start the preparation batch */
          batch = getTimedPreparationBatch(ns, target, id);
          hosts = ns.getPurchasedServers();
          waitUntil = batch.execute(ns, hosts);
          id++;
          /** Move to the waiting state to re-evalute once its done */
          state = 1;
          batch = null;
          hosts = null;
        }
        break;
      case 3:
        /** ------------- State 3 = Farming ------------- */
        /** Start new batches until there are none remaining */
        if (now % period == 0) {
          if (hackTime) {
            batch = getTimedFarmingBatch(ns, target, id);
            hosts = ns.getPurchasedServers();
            waitUntil = batch.execute(ns, hosts);
            batchCountRemaining--;
            id++;
            ns.print("State = " + "Farming");
            ns.print("batchCountRemaining = " + batchCountRemaining);
          } else {
            /**
             * Update the number of batches that can be executed:
             * The last batch has to start it's hack action before the hack action
             * of the first one finishes so that the security on the target server
             * is still at minimum.
             */
            hackTime = ns.getHackTime(target);
            batchCount = Math.floor(hackTime / period);
            batchCountRemaining = batchCount;
          }
        }
        /** Move to the waiting state after all batches have been started */
        if (batchCountRemaining == 0) {
          state = 1;
          /** Reset the batch information to prepare for the next run */
          batch = null;
          hackTime = null;
          batchCount = null;
          batchCountRemaining = null;
        }
        break;
    }
    await ns.sleep(150);
  }
}
