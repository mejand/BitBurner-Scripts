import {
  logPrintVar,
  ActionText,
  tPrintScript,
  tPrintHeader,
} from "./utilities/log.js";

import {
  Batch,
  getFarmingBatch,
  getPreparationBatch,
  updateFinishTimes,
  runBatch,
} from "./utilities/batch.js";

/**
 * Handle the growing, weakening and hacking scripts in batches on the local server.
 * @param {import(".").NS} ns
 */
export async function main(ns) {
  /** Clean up the log file */
  ns.disableLog("ALL");

  /**
   * Enable debug actions.
   * @type {boolean}
   */
  var debug = true;
  if (ns.args.length > 0 && typeof ns.args[0] == "boolean") {
    debug = ns.args[0];
  }
  /**
   * The time stamp currently on the coordination port.
   * @type {number}
   */
  var portTime = ns.peek(2);
  /**
   * The time since last Augmentation in milliseconds.
   * @type {number}
   */
  var timeStamp = ns.getTimeSinceLastAug();
  /**
   * The amount of time that shall be reserved between actions.
   * @type {number}
   */
  var timePerAction = 400;
  /**
   * The period between executions of the scripts control functions.
   * There are 4 actions: hack, grow, weaken, control (this script).
   * @type {number}
   */
  var period = 4 * timePerAction;
  /**
   * The name of the hack script.
   * @type {string}
   */
  var hackScript = "hack.js";
  /**
   * The name of the grow script.
   * @type {string}
   */
  var growScript = "grow.js";
  /**
   * The name of the weaken script.
   * @type {string}
   */
  var weakenScript = "weaken.js";
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "iron-gym";
  /**
   * The name of the host server.
   * @type {string}
   */
  var hostName = ns.getHostname();
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
   * The amount of RAM needed to run any script.
   * @type {number}
   */
  var scriptRam = Math.max(hackRam, growRam, weakenRam);
  /**
   * The maximum number of threads that can be run on the host.
   * @type {number}
   */
  var threadsMax = Math.floor(ns.getServerMaxRam(hostName) / scriptRam);
  /**
   * A dummy argument to allow multiple scripts of the same type to run at the same time.
   * @type {string}
   */
  var scriptId = 0;
  /**
   * The script is executed periodically.
   * @type {boolean}
   */
  var running = true;
  /**
   * The server object of the target.
   * @type {import(".").Server}
   */
  var targetServer = ns.getServer(targetName);
  /**
   * The server object of the host.
   * @type {import(".").Server}
   */
  var hostServer = ns.getServer(hostName);
  /**
   * The amount of threads that are available for tasking on the host server.
   *  @type {number}
   */
  var threadsAvailable = Math.floor(
    (hostServer.maxRam - hostServer.ramUsed) / scriptRam
  );
  /**
   * The batch that shall be exectued on the host server.
   * @type {Batch}
   */
  var batch = new Batch(targetName);
  /**
   * The threshold of available money below which the controller switches
   * to "Preparation Mode".
   * @type {number}
   */
  var moneyThreshold = targetServer.moneyMax * 0.8;
  /**
   * The delta security below which controller switches to "Preparation Mode".
   * @type {number}
   */
  var securityThreshold = targetServer.minDifficulty + 5;

  /** Print a new header line to the terminal */
  tPrintHeader(ns);

  if (debug) {
    /** Open the log window in debug mode */
    ns.tail();
    /** Use the debug hack script */
    hackScript = "hack_debug.js";
    growScript = "hack_debug.js";
    weakenScript = "hack_debug.js";
    /** Re-calculate the script ram usage */
    hackRam = ns.getScriptRam(hackScript, hostName);
    growRam = ns.getScriptRam(growScript, hostName);
    weakenRam = ns.getScriptRam(weakenScript, hostName);
    scriptRam = Math.max(hackRam, growRam, weakenRam);
  }

  while (running) {
    /** Get the current time stamp */
    timeStamp = ns.getTimeSinceLastAug();

    /**
     * The script runs every 200ms, but the control functions are only excuted
     * when the time stamp is a multiple of the period time.
     */
    if (timeStamp % period === 0) {
      /** Ensure the script only runs a certain number of times in debug mode */
      if (debug && scriptId > 50) {
        running = false;
      }

      /** Get the time stamp saved on the coordination port */
      portTime = ns.peek(2);

      /**
       * If another batch controller has already started a new batch
       * it will have updated the time stamp of the port. If the time
       * on the port is not up to date then no batch has been started yet.
       */
      if (portTime != timeStamp) {
        /** Clean up the log */
        ns.clearLog();
        logPrintVar(ns, "#####################", "#####################");
        logPrintVar(ns, "Target Name", targetName);
        logPrintVar(ns, "Time", timeStamp);
        logPrintVar(ns, "Port Time", portTime);

        /** Get the current server objects to update the information */
        targetServer = ns.getServer(targetName);
        hostServer = ns.getServer(hostName);

        /** Calculate the number of threads available for tasking */
        threadsAvailable = Math.floor(
          (hostServer.maxRam - hostServer.ramUsed) / scriptRam
        );
        logPrintVar(ns, "Threads Available", threadsAvailable);
        logPrintVar(ns, "Money Available", targetServer.moneyAvailable);
        logPrintVar(ns, "Money Threshold", moneyThreshold);
        logPrintVar(ns, "Hack Difficulty", targetServer.hackDifficulty);
        logPrintVar(ns, "Difficulty Threshold", securityThreshold);

        /** Decide if the controller should use Preparation or Farming Mode */
        if (
          targetServer.moneyAvailable < moneyThreshold ||
          targetServer.hackDifficulty > securityThreshold
        ) {
          /** Get the batch for Preparation Mode */
          batch = getPreparationBatch(
            ns,
            targetServer,
            hostServer,
            threadsAvailable
          );
        } else {
          /** Get the batch for Farming Mode */
          batch = getFarmingBatch(ns, targetServer, hostServer);
        }

        if (batch.totalThreads <= threadsAvailable && batch.totalThreads > 0) {
          /** Update the finish times */
          updateFinishTimes(
            ns,
            batch,
            timeStamp,
            period,
            timePerAction,
            targetServer
          );

          /** Print the batch informtion to the log window */
          batch.print(ns);

          /** Execute the batch */
          runBatch(ns, batch, scriptId, hackScript, growScript, weakenScript);

          /** Print a statement to the terminal */
          if (debug) {
            printDebugToTerminal(ns, scriptId, targetServer, timeStamp);
          }

          /** Let the dummy run to the maximum available thread count and then reset it */
          if (scriptId < threadsMax) {
            scriptId++;
          } else {
            scriptId = 0;
          }

          /** If a batch was started -> update the time stamp on the port */
          ns.clearPort(2);
          await ns.writePort(2, timeStamp);
        }
      }
    }

    /**
     * The script runs every 200ms, but the control functions are only excuted
     * when the time stamp is a multiple of the period time. It seems that the
     * script is only consistently executed every 200ms if the sleep time is set to
     * less than 200ms. If it is set to 200ms the script is sometimes only executed
     * after 400ms.
     */
    await ns.sleep(150);
  }
}

/**
 * Print information to the terminal for debugging.
 * @param {import(".").NS} ns
 * @param {number} dummy - The ID of the started batch.
 * @param {import(".").Server} targetServer - The server object of the target.
 * @param {number} timeNow - The current time stamp.
 */
function printDebugToTerminal(ns, dummy, targetServer, timeNow) {
  /**
   * The text that shall be displayed in the terminal in debug mode.
   * @type {ActionText}
   */
  var debugText = new ActionText();

  debugText.action = "Controller";
  debugText.money = (targetServer.moneyAvailable / targetServer.moneyMax) * 100;
  debugText.security = targetServer.hackDifficulty - targetServer.minDifficulty;
  debugText.id = dummy;
  debugText.time = timeNow;

  /** Print the finished text to the terminal */
  tPrintScript(ns, debugText);
}
