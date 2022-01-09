import { TimedBatch, getTimedFarmingBatch } from "./utilTimedBatch.js";

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
   * The time in milliseconds that shall pass between batch executions.
   * @type {Number}
   */
  var period = 1200;
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
   * Update the number of batches that can be executed:
   * The last batch has to start it's hack action before the hack action
   * of the first one finishes so that the security on the target server
   * is still at minimum.
   */
  hackTime = ns.getHackTime(targetName);
  batchCount = Math.floor(hackTime / period);
  batchCountRemaining = batchCount;

  ns.tail();

  while (batchCountRemaining > 0) {
    now = ns.getTimeSinceLastAug();

    if (now % period == 0) {
      batch = getTimedFarmingBatch(ns, targetName, id);
      hosts = ns.getPurchasedServers();
      batch.execute(ns, hosts);
      batchCountRemaining--;
      id++;
    }

    ns.print("hackTime = " + hackTime);
    ns.print("batchCount = " + batchCount);
    ns.print("batchCountRemaining = " + batchCountRemaining);

    await ns.sleep(150);
  }
}
