import { getTimeInRaster } from "./utilTime.js";

/**
 * Run a single hack, grow or weaken operation, timed so it finishes at a given time.
 * The finish time relates to the end of a batch (weaken action). the proper staggering
 * will be handled by this script. Hack will finish first, then grow and finally weaken.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = null;
  if (ns.args.length > 0 && typeof ns.args[0] == "string") {
    targetName = ns.args[0];
  }
  /**
   * The time at which the script shall finish its execution.
   * @type {number}
   */
  var finishTime = null;
  if (ns.args.length > 1 && typeof ns.args[1] == "number") {
    finishTime = ns.args[1];
  }
  /**
   * The type of operation that shall be run: 1 = hack, 2 = grow, 3 = weaken.
   * @type {number}
   */
  var scriptType = null;
  if (ns.args.length > 2 && typeof ns.args[2] == "number") {
    scriptType = ns.args[2];
  }
  /**
   * The script is waiting for the right time to start its operation.
   * @type {boolean}
   */
  var running = true;
  /**
   * The current time.
   * @type {number}
   */
  var now = ns.getTimeSinceLastAug();
  /**
   * The time it takes for the main operation to finish.
   * @type {number}
   */
  var runTime = 0;
  /**
   * The time it takes for the main operation to finish
   * (not convetred to the 200ms raster).
   * @type {number}
   */
  var runTimeRaw = 0;

  ns.print(targetName);
  ns.print(finishTime);
  ns.print(scriptType);

  /** Stop the script if it was started before loading a save */
  if (now < finishTime) {
    if (targetName && finishTime && scriptType) {
      switch (scriptType) {
        case 1:
          runTimeRaw = ns.getHackTime(targetName);
          runTime = getTimeInRaster(runTimeRaw) + 800;
          break;
        case 2:
          runTimeRaw = ns.getGrowTime(targetName);
          runTime = getTimeInRaster(runTimeRaw) + 400;
          break;
        case 3:
          runTimeRaw = ns.getWeakenTime(targetName);
          runTime = getTimeInRaster(runTimeRaw);
          break;
        default:
          running = false;
          break;
      }

      /**
       * Keep looping until the execution start time has arrived
       */
      while (running) {
        now = ns.getTimeSinceLastAug();

        if (now + runTime >= finishTime) {
          /** Stop the while loop */
          running = false;
          /** Start the appropriate action */
          switch (scriptType) {
            case 1:
              await ns.hack(targetName);
              break;
            case 2:
              await ns.grow(targetName);
              break;
            case 3:
              await ns.weaken(targetName);
              break;
            default:
              break;
          }
        } else {
          /** If the time is not right yet wait for the next 200ms step */
          await ns.sleep(150);
        }
      }
    }
  }
}
