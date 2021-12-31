import {
  getTimeInRaster,
  logPrintVar,
  ActionText,
  tPrintScript,
} from "./utilities.js";

/**
 * Run a single hack, grow or weaken operation and print the result for debugging.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

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
   * The type of operation that shall be run: 0 = hack, 1 = grow, 2 = weaken.
   * @type {number}
   */
  var scriptType = 0;
  if (ns.args.length > 3 && typeof ns.args[3] == "number") {
    scriptType = ns.args[3];
  }
  /**
   * An object that holds the debug information.
   * @type {ActionText}
   */
  var debugText = new ActionText();
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
   * The time at which script execution is predicted to finish
   * (not convetred to the 200ms raster).
   * @type {number}
   */
  var predictedFinishRaw = 0;
  /**
   * The current time.
   * @type {number}
   */
  var timeNow = 0;
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

  switch (scriptType) {
    case 0:
      debugText.action = "Hack Fnshd";
      runTimeRaw = ns.getHackTime(targetName);
      runTime = getTimeInRaster(runTimeRaw);
      break;
    case 1:
      debugText.action = "Grow Fnshd";
      runTimeRaw = ns.getGrowTime(targetName);
      runTime = getTimeInRaster(runTimeRaw);
      break;
    case 2:
      debugText.action = "Weaken Fnshd";
      runTimeRaw = ns.getWeakenTime(targetName);
      runTime = getTimeInRaster(runTimeRaw);
      break;
    default:
      running = false;
      debugText.error = "WrongType";
      break;
  }

  debugText.id = id;

  logPrintVar(ns, "Runtime Error", runTimeRaw - runTime);

  /**
   * Keep looping until the execution start time has arrived
   */
  while (running) {
    timeNow = ns.getTimeSinceLastAug();

    predictedFinish = timeNow + runTime;
    predictedFinishRaw = timeNow + runTimeRaw;

    if (predictedFinish == targetTime) {
      // stop the while loop
      running = false;

      logPrintVar(ns, "Started", timeNow);

      switch (scriptType) {
        case 0:
          await ns.hack(targetName);
          break;
        case 1:
          await ns.grow(targetName);
          break;
        case 2:
          await ns.weaken(targetName);
          break;
        default:
          break;
      }

      /** Print debug information */
      debugText.time = ns.getTimeSinceLastAug();
      debugText.timeError = targetTime - debugText.time;

      logPrintVar(ns, "Finished", debugText.time);
      logPrintVar(ns, "Error Predicted", predictedFinishRaw - debugText.time);
      logPrintVar(ns, "Error Real", debugText.timeError);

      debugText.money =
        (ns.getServerMoneyAvailable(targetName) /
          ns.getServerMaxMoney(targetName)) *
        100;

      debugText.security =
        ns.getServerSecurityLevel(targetName) -
        ns.getServerMinSecurityLevel(targetName);
    } else if (predictedFinish > targetTime) {
      running = false;
      debugText.error = "Time Miss";
    } else {
      logPrintVar(ns, "Waiting", timeNow);

      /** If the time is not right yet wait for the next 200ms step */
      await ns.sleep(200);
    }
  }

  /** print the result to the terminal */
  tPrintScript(ns, debugText);
}
