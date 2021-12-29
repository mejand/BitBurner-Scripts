import { getTimeInRaster } from "./utilities.js";

/**
 * Run a single grow operation at the specified time.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof ns.args[0] == "string") {
    targetName = ns.args[0];
  }

  /**
   * The time at which the script shall finish its execution.
   * @type {number}
   */
  var targetTime = 0;
  if (ns.args.length > 1 && typeof ns.args[1] == "number") {
    targetTime = ns.args[1];
  }

  /**
   * The ID of the script instance.
   * @type {number}
   */
  var id = 0;
  if (ns.args.length > 2 && typeof ns.args[2] == "number") {
    id = ns.args[2];
  }

  /**
   * The script is waiting for the right time to start its operation.
   * @type {boolean}
   */
  var running = true;

  /**
   * The time at which script execution is predicted to finish.
   * @type {number}
   */
  var predictedFinish = 0;

  /**
   * The current time.
   * @type {number}
   */
  var timeNow = 0;

  /**
   * The time it takes for the main operation to finish.
   * @type {number}
   */
  var runTime = getTimeInRaster(ns.getGrowTime(targetName));

  /**
   * Keep looping until the execution start time has arrived
   */
  while (running) {
    /**
     * Update the current time stamp.
     */
    timeNow = ns.getTimeSinceLastAug();

    /**
     * Update the that the operation should finish if started now.
     */
    predictedFinish = timeNow + runTime;

    /**
     * Start the operation if it seems like the script will finish
     * when commanded.
     */
    if (predictedFinish == targetTime) {
      /**
       * Ensure that the loop does not continue after the operation
       * has finished.
       */
      running = false;

      /**
       * Start the main operation.
       */
      await ns.grow(targetName);
    } else if (predictedFinish > targetTime) {
      /**
       * Stop the script if the correct time was missed.
       */
      running = false;
    } else {
      /**
       * If the time is not right yet wait for the next 200ms step
       */
      await ns.sleep(200);
    }
  }
}
