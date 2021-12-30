import { getTimeInRaster, Batch } from "./utilities.js";

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
  var targetName = "n00dles";
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
  var dummy = 0;
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

  if (debug) {
    /** Open the log window in debug mode */
    ns.tail();
    /** Use the debug hack script */
    hackScript = "hack_debug.js";
    growScript = "hack_debug.js";
    weakenScript = "hack_debug.js";
  }

  while (running) {
    /** Get the current time stamp */
    timeStamp = ns.getTimeSinceLastAug();

    /**
     * The script runs every 200ms, but the control functions are only excuted
     * when the time stamp is a multiple of the period time.
     */
    if (timeStamp % period === 0) {
      /** Clean up the log */
      ns.clearLog();
      ns.print("#######  " + targetName + "  #######");
      ns.print("timeStamp = " + timeStamp);

      /** Ensure the script only runs a certain number of times in debug mode */
      if (debug && dummy > 50) {
        running = false;
      }

      /** Get the time stamp saved on the coordination port */
      portTime = ns.peek(2);
      ns.print("portTime = " + portTime);

      /**
       * If another batch controller has already started a new batch
       * it will have updated the time stamp of the port. If the time
       * on the port is not up to date then no batch has been started yet.
       */
      if (portTime != timeStamp) {
        /** Get the current server objects to update the information */
        targetServer = ns.getServer(targetName);
        hostServer = ns.getServer(hostName);

        /** Calculate the number of threads available for tasking */
        threadsAvailable = Math.floor(
          (hostServer.maxRam - hostServer.ramUsed) / scriptRam
        );
        ns.print("threadsAvailable = " + threadsAvailable);

        ns.print("moneyAvailable    = " + targetServer.moneyAvailable);
        ns.print("moneyThreshold    = " + moneyThreshold);
        ns.print("hackDifficulty    = " + targetServer.hackDifficulty);
        ns.print("securityThreshold = " + securityThreshold);

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

        /** Update the finish times */
        updateFinishTimes(
          ns,
          batch,
          timeStamp,
          period,
          timePerAction,
          targetServer
        );

        ns.print(batch);

        if (batch.totalThreads <= threadsAvailable) {
          /** Execute the batch */
          executeBatch(ns, batch, dummy, hackScript, growScript, weakenScript);

          /** Print a statement to the terminal */
          if (debug) {
            printDebugToTerminal(ns, dummy, targetServer, timeStamp);
          }

          /** If a batch was started -> update the time stamp on the port */
          ns.clearPort(2);
          await ns.writePort(2, timeStamp);
        }

        /** Let the dummy run to the maximum available thread count and then reset it */
        if (dummy < threadsMax) {
          dummy++;
        } else {
          dummy = 0;
        }
      }
    }

    /**
     * The script runs every 200ms, but the control functions are only excuted
     * when the time stamp is a multiple of the period time.
     */
    await ns.sleep(200);
  }
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @returns {Batch} The number of threads needed to grow the target to max money.
 */
function getFarmingBatch(ns, targetServer, hostServer) {
  /**
   * The batch object holding the result.
   * @type {Batch}
   */
  var result = new Batch(targetServer.hostname);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor =
    1.0 / (1.0 - result.hackThreads * ns.hackAnalyze(targetServer.hostname));
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cpuCores);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.hackDifficulty - targetServer.minDifficulty;

  /** Calculate the hack threads needed to steal half the money on the target server */
  result.hackThreads =
    Math.floor(0.5 / ns.hackAnalyze(targetServer.hostname)) + 1;

  /** Calculate the number of threads needed to compensate the stolen money */
  result.growThreads = Math.ceil(
    ns.growthAnalyze(targetServer.hostname, growFactor, hostServer.cpuCores)
  );

  /** Add the security impact of hack and grow */
  deltaSecurity += ns.hackAnalyzeSecurity(result.hackThreads);
  deltaSecurity += ns.growthAnalyzeSecurity(result.growThreads);

  /** Calculate the number of threads needed to compensate the hack and grow actions */
  result.weakenThreads = Math.ceil(deltaSecurity / weakenReduction) + 1;

  /** Print information to log screen */
  ns.print("+++++++  Farming  +++++++");
  ns.print("deltaSecurity = " + deltaSecurity);
  ns.print("growFactor    = " + growFactor);

  return result;
}

/**
 * Calculate the hack, grow and weaken threads to prepare the target for farming.
 * The finish times are not calculated (use updateFinishTimes() to update them).
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @param {number} threadsAvailable - The number of threads currently available.
 * @returns {Batch} The number of threads needed to grow the target to max money.
 */
function getPreparationBatch(ns, targetServer, hostServer, threadsAvailable) {
  /**
   * The batch object holding the result.
   * @type {Batch}
   */
  var result = new Batch(targetServer.hostname);
  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor = targetServer.moneyMax / targetServer.moneyAvailable;
  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cpuCores);
  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.hackDifficulty - targetServer.minDifficulty;

  /** Calculate how many threads are needed to grow the target to max money */
  result.growThreads = Math.ceil(
    ns.growthAnalyze(targetServer.hostname, growFactor, hostServer.cpuCores)
  );

  /** Calculate the security impact of the grow operation */
  deltaSecurity += ns.growthAnalyzeSecurity(result.growThreads);

  /** Calculate how many threads are needed to reach min security */
  result.weakenThreads = Math.ceil(deltaSecurity / weakenReduction);

  /** Limit the number of threads to what is available */
  result.weakenThreads = Math.min(result.weakenThreads, threadsAvailable);

  result.growThreads = Math.min(
    result.growThreads,
    threadsAvailable - result.weakenThreads
  );

  /** Print information to log screen */
  ns.print("+++++++  Preparation  +++++++");
  ns.print("deltaSecurity = " + deltaSecurity);
  ns.print("growFactor    = " + growFactor);

  return result;
}

/**
 * Update the finish times of a batch.
 * @param {import(".").NS} ns
 * @param {Batch} batch - The batch object that shall be updated.
 * @param {number} timeNow - The current time stamp.
 * @param {number} period - The time between executions of the controller.
 * @param {number} timePerAction - The time that is reserved for each action.
 * @param {import(".").Server} targetServer - The server that is targeted.
 */
function updateFinishTimes(
  ns,
  batch,
  timeNow,
  period,
  timePerAction,
  targetServer
) {
  /**
   * The time it takes to run the weaken command.
   * @type {number}
   */
  var weakenDuration = getTimeInRaster(ns.getWeakenTime(targetServer.hostname));
  /**
   * The point in time at which the batch of scripts will finish, if started now.
   * @type {number}
   */
  var weakenTime = timeNow + weakenDuration;
  /**
   * The time by which the start of the batch has to be delayed to ensure
   * that it finishes at x seconds and 600ms.
   * @type {number}
   */
  var weakenDelay = 3 * timePerAction - (weakenTime % period);

  /**
   * The delay caan not be negative -> if the batch finishes too late it has to be
   * shifted to the next second.
   */
  if (weakenDelay < 0) {
    weakenDelay = period + weakenDelay;
  }

  batch.weakenFinish = timeNow + weakenDelay + weakenDuration;

  batch.growFinish = batch.weakenFinish - timePerAction;

  batch.hackFinish = batch.weakenFinish - 2 * timePerAction;
}

/**
 * Execute a batch.
 * @param {import(".").NS} ns
 * @param {Batch} batch - The batch that shall be executed.
 * @param {number} dummy - A number used to make up a unique id for the scripts so
 * they can run in parallel.
 * @param {string} hackScript - The name of the hack script.
 * @param {string} growScript - The name of the grow script.
 * @param {string} weakenScript - The name of the weaken script.
 */
function executeBatch(ns, batch, dummy, hackScript, growScript, weakenScript) {
  if (batch.hackThreads > 0) {
    ns.run(
      hackScript,
      batch.hackThreads,
      batch.targetName,
      batch.hackFinish,
      dummy,
      0
    );
  }

  if (batch.growThreads > 0) {
    ns.run(
      growScript,
      batch.growThreads,
      batch.targetName,
      batch.growFinish,
      dummy,
      1
    );
  }

  if (batch.weakenThreads > 0) {
    ns.run(
      weakenScript,
      batch.weakenThreads,
      batch.targetName,
      batch.weakenFinish,
      dummy,
      2
    );
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
   * @type {string}
   */
  var debugText = "";
  /**
   * The relative amount of money available on the target server.
   * @type {number}
   */
  var money = targetServer.moneyAvailable / targetServer.moneyMax;
  /**
   * The difference between current and minimum security on the target.
   * @type {number}
   */
  var security = targetServer.hackDifficulty - targetServer.minDifficulty;

  /** Create the bulk of the text */
  debugText += ns.sprintf("||Scripts Started | ID: %3i |", dummy);
  debugText += ns.sprintf(" Money: %3.1d |", money * 100);
  debugText += ns.sprintf(" Security: %3.1d |", security);
  debugText += ns.sprintf(" Time: %16i ms ||", timeNow);

  /** Print the finished text to the terminal */
  ns.tprint(debugText);
}
