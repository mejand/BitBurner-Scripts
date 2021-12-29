/**
 * Handle the growing, weakening and hacking scripts in batches on the local server.
 * @param {import(".").NS} ns
 */
export async function main(ns) {
  // clean up the log file
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
   * The period between executions of the scripts control functions.
   * @type {number}
   */
  var period = 2000;

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

  if (debug) {
    hackScript = "hack_debug.js";
    growScript = "hack_debug.js";
    weakenScript = "hack_debug.js";
  }

  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "iron-gym";

  if (debug) {
    targetName = "n00dles";
  }

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

  // copy the scripts to the host
  await ns.scp(hackScript, "home", hostName);
  await ns.scp(growScript, "home", hostName);
  await ns.scp(weakenScript, "home", hostName);

  ns.tail();

  while (running) {
    /**
     * The time since last Augmentation in milliseconds.
     * @type {number}
     */
    let timeStamp = ns.getTimeSinceLastAug();

    /**
     * The script runs every 200ms, but the control functions are only excuted
     * when the time stamp is a multiple of the period time.
     */
    if (timeStamp % period === 0) {
      // clean up the log
      ns.clearLog();

      // ensure the script only runs a certain number of times.
      if (debug && dummy > 10) {
        running = false;
      }

      /**
       * The server object of the target.
       * @type {import(".").Server}
       */
      let targetServer = ns.getServer(targetName);

      /**
       * The server object of the host.
       * @type {import(".").Server}
       */
      let hostServer = ns.getServer(hostName);

      /**
       * The amount of threads that are available for tasking on the host server.
       *  @type {number}
       */
      let threadsAvailable = Math.floor(
        (hostServer.maxRam - hostServer.ramUsed) / scriptRam
      );

      /**
       * The number threads dedicated to hacking the target.
       * @type {number}
       */
      let hackThreads = getHackThreads(ns, targetServer);

      /**
       * The number of threads needed to grow the target to max money.
       * @type {number}
       */
      let growThreads = getGrowThreads(
        ns,
        targetServer,
        hostServer,
        hackThreads
      );

      /**
       * The number of threads needed to reduce the target security to minimum.
       * @type {number}
       */
      let weakenThreads = getWeakenThreads(
        ns,
        targetServer,
        hostServer,
        hackThreads,
        growThreads
      );

      /**
       * The number of threads it takes to run a full batch.
       * @type {number}
       */
      let batchThreads = hackThreads + growThreads + weakenThreads;

      /**
       * The amount of batches that can be run on the host.
       * @type {number}
       */
      let batchCount = Math.floor(threadsAvailable / batchThreads);

      ns.print("dummy = " + dummy);
      ns.print(
        "Money = " + targetServer.moneyAvailable / targetServer.moneyMax
      );
      ns.print(
        "Security = " +
          (targetServer.hackDifficulty - targetServer.minDifficulty)
      );
      ns.print("hackThreads =      " + hackThreads);
      ns.print("growThreads =      " + growThreads);
      ns.print("weakenThreads =    " + weakenThreads);
      ns.print("batchThreads =     " + batchThreads);
      ns.print("threadsAvailable = " + threadsAvailable);
      ns.print("batchCount =       " + batchCount);

      /**
       * The time it takes to run the weaken command.
       * @type {number}
       */
      let weakenDuration = getTimeInRaster(
        ns.getWeakenTime(targetServer.hostname)
      );

      /**
       * The point in time at which the batch of scripts will finish, if started now.
       * @type {number}
       */
      let weakenTime = timeStamp + weakenDuration;

      /**
       * The time by which the start of the batch has to be delayed to ensure
       * that it finishes at x seconds and 600ms.
       * @type {number}
       */
      let weakenDelay = 1400 - (weakenTime % period);

      /**
       * The delay caan not be negative -> if the batch finishes too late it has to be
       * shifted to the next second.
       */
      if (weakenDelay < 0) {
        weakenDelay = period + weakenDelay;
      }

      /**
       * The point in time at which the weaken script shall finish.
       * @type {number}
       */
      let weakenEndTime = timeStamp + weakenDelay + weakenDuration;

      /**
       * The point in time at which the grow script shall finish.
       * @type {number}
       */
      let growEndTime = weakenEndTime - 400;

      /**
       * The point in time at which the hack script shall finish.
       * @type {number}
       */
      let hackEndTime = weakenEndTime - 800;

      ns.print("weakenDuration = " + ns.tFormat(weakenDuration));
      ns.print("timeStamp =      " + timeStamp);
      ns.print("hackEndTime =    " + hackEndTime);
      ns.print("growEndTime =    " + growEndTime);
      ns.print("weakenEndTime =  " + weakenEndTime);

      if (batchCount > 0) {
        if (debug) {
          /**
           * The percentage of the maximum money currently on the target server.
           * @type {number}
           */
          let money =
            ns.getServerMoneyAvailable(targetName) /
            ns.getServerMaxMoney(targetName);

          /**
           * The difference between current security and minimum security on the target server.
           * @type {number}
           */
          let security =
            ns.getServerSecurityLevel(targetName) -
            ns.getServerMinSecurityLevel(targetName);

          /**
           * The time at which scripts were started.
           * @type {string}
           */
          let timeStampStart = ns.tFormat(ns.getTimeSinceLastAug(), true);

          /**
           * The text that shall be displayed in the terminal in debug mode.
           * @type {string}
           */
          let debugText = "      ";
          debugText += ns.sprintf(
            "||Scripts Started | ID: %3i | Money: %3.1f | Security: %3.1f | Time: %s ||",
            dummy,
            money,
            security,
            timeStampStart
          );

          ns.tprint(debugText);
        }

        if (hackThreads > 0) {
          ns.run(hackScript, hackThreads, targetName, hackEndTime, dummy, 0);
          threadsAvailable -= hackThreads;
        }

        if (growThreads > 0) {
          ns.run(growScript, growThreads, targetName, growEndTime, dummy, 1);
          threadsAvailable -= growThreads;
        }

        if (weakenThreads > 0) {
          ns.run(
            weakenScript,
            weakenThreads,
            targetName,
            weakenEndTime,
            dummy,
            2
          );
          threadsAvailable -= weakenThreads;
        }
      }

      ns.print("load = " + (1.0 - threadsAvailable / threadsMax) * 100);

      // let the dummy run to the maximum available thread count and then reset it
      if (dummy < threadsMax) {
        dummy++;
      } else {
        dummy = 0;
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
 * Get the number of threads needed to steal all money from the target.
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @returns {number} The number of threads needed to hack the target.
 */
function getHackThreads(ns, targetServer) {
  /**
   * The number of threads needed to steal all money from the target.
   * @type {number}
   */
  var count = Math.floor(0.5 / ns.hackAnalyze(targetServer.hostname));
  return count + 1;
}

/**
 * Get the number of threads needed to grow the target server to max money.
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @param {number} hackThreads - The number of threads dedicated to hacking the target.
 * @returns {number} The number of threads needed to grow the target to max money.
 */
function getGrowThreads(ns, targetServer, hostServer, hackThreads) {
  /**
   * The number of threads needed to grow the target to max money.
   * @type {number}
   */
  var count = 0;

  /**
   * The factor that the money has to be grown with to compensate the hacking.
   * @type {number}
   */
  var growFactor =
    1.0 / (1.0 - hackThreads * ns.hackAnalyze(targetServer.hostname));

  ns.print("growFactor = " + growFactor);

  count = Math.ceil(
    ns.growthAnalyze(targetServer.hostname, growFactor, hostServer.cpuCores)
  );

  return count + 1;
}

/**
 *
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @param {number} hackThreads - The number of threads dedicated to hacking the target.
 * @param {number} growThreads - The number of threads dedicated to growing to max money.
 * @returns {number} The number of threads needed to grow the target to max money.
 */
function getWeakenThreads(
  ns,
  targetServer,
  hostServer,
  hackThreads,
  growThreads
) {
  /**
   * The number of threads needed to grow the target to max money.
   * @type {number}
   */
  var count = 0;

  /**
   * The security score that needs to be removed to reach min security.
   * @type {number}
   */
  var deltaSecurity = targetServer.hackDifficulty - targetServer.minDifficulty;

  deltaSecurity += ns.hackAnalyzeSecurity(hackThreads);
  deltaSecurity += ns.growthAnalyzeSecurity(growThreads);

  ns.print("deltaSecurity = " + deltaSecurity);

  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cpuCores);

  ns.print("weakenReduction = " + weakenReduction);

  count = Math.ceil(deltaSecurity / weakenReduction);

  return count + 1;
}

/**
 * Convert a time in milliseconds to 200ms precision.
 * @param {number} time - The time that shall be converted into 200ms steps.
 * @returns {number} The input time converted into 200ms increments.
 */
function getTimeInRaster(time) {
  /**
   * Note: This method can cause a script to finish 200ms before
   * the target time. This error seems to be random since the same
   * execution time input can lead to both outcomes. Currently there
   * appears to be no way around this and the accuracy of 400ms has to
   * be accounted for in the controller script.
   */

  return Math.ceil(time / 200) * 200;
}
