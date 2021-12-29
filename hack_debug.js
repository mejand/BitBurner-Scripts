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
   * The script is waiting for the right time to start its operation.
   * @type {boolean}
   */
  var running = true;

  /**
   * The text that will be printed to the terminal after the script finishes.
   * @type {string}
   */
  var debugText = "";

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
   * The time at which the operation finished.
   * @type {string}
   */
  var timeStampEnd = 0;

  /**
   * The percentage of the maximum money on the target server when the script finished.
   * @type {number}
   */
  var moneyEnd = 0;

  /**
   * The difference between current security and minimum security on the target server.
   * @type {number}
   */
  var securityEnd = 0;

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
      debugText = ns.sprintf("||Hack Finished   | ID: %3i |", id);
      runTimeRaw = ns.getHackTime(targetName);
      runTime = getTimeInRaster(runTimeRaw);
      break;
    case 1:
      debugText = ns.sprintf("||Grow Finished   | ID: %3i |", id);
      runTimeRaw = ns.getGrowTime(targetName);
      runTime = getTimeInRaster(runTimeRaw);
      break;
    case 2:
      debugText = ns.sprintf("||Weaken Finished | ID: %3i |", id);
      runTimeRaw = ns.getWeakenTime(targetName);
      runTime = getTimeInRaster(runTimeRaw);
      break;
    default:
      running = false;
      debugText += " Wrong scriptType |";
      break;
  }

  ns.print("Raw - 200ms = " + (runTimeRaw - runTime));

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

      ns.print("Started =         " + timeNow);

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

      ns.print("Finished =        " + ns.getTimeSinceLastAug());
      ns.print(
        "Error Predicted = " + (predictedFinishRaw - ns.getTimeSinceLastAug())
      );
      ns.print("Error Real =      " + (targetTime - ns.getTimeSinceLastAug()));

      /**
       * Print debug information
       */

      timeStampEnd = ns.tFormat(ns.getTimeSinceLastAug(), true);

      moneyEnd =
        ns.getServerMoneyAvailable(targetName) /
        ns.getServerMaxMoney(targetName);

      securityEnd =
        ns.getServerSecurityLevel(targetName) -
        ns.getServerMinSecurityLevel(targetName);
    } else if (predictedFinish > targetTime) {
      running = false;
      debugText += " Time Window Missed |";
    } else {
      ns.print("Waiting =         " + timeNow);

      /**
       * If the time is not right yet wait for the next 200ms step
       */
      await ns.sleep(200);
    }
  }

  debugText += ns.sprintf(
    " Money: %3.1f | Security: %3.1f | Time: %s ||",
    moneyEnd,
    securityEnd,
    timeStampEnd
  );

  // print the result to the terminal
  ns.tprint(debugText);
}

/**
 * Convert a time in milliseconds to 200ms precision.
 * @param {number} time - The time that shall be converted into 200ms steps.
 * @returns {number} The input time converted into 200ms increments.
 */
function getTimeInRaster(time) {
  return Math.floor(time / 200) * 200;
}
