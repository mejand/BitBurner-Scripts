/**
 * Handle the growing, weakening and hacking scripts in batches on the local server.
 * @param {import(".").NS} ns
 */
export async function main(ns) {
  // clean up the log file
  ns.disableLog("ALL");

  /**
   * The time in milliseconds between batch creation.
   * @type {number}
   */
  var period = 1000;

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
  var hackRam = ns.getScriptRam("hack.js", hostName);

  /**
   * The RAM needed to run the grow script.
   * @type {number}
   */
  var growRam = ns.getScriptRam("grow.js", hostName);

  /**
   * The RAM needed to run the weaken script.
   * @type {number}
   */
  var weakenRam = ns.getScriptRam("weaken.js", hostName);

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

  // copy the scripts to the host
  await ns.scp("hack.js", "home", hostName);
  await ns.scp("grow.js", "home", hostName);
  await ns.scp("weaken.js", "home", hostName);

  ns.tail();

  while (true) {
    ns.clearLog();

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
    let growThreads = getGrowThreads(ns, targetServer, hostServer, hackThreads);

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

    ns.print("Money = " + targetServer.moneyAvailable / targetServer.moneyMax);
    ns.print(
      "Security = " + targetServer.hackDifficulty - targetServer.minDifficulty
    );
    ns.print("hackThreads = " + hackThreads);
    ns.print("growThreads = " + growThreads);
    ns.print("weakenThreads = " + weakenThreads);
    ns.print("batchThreads = " + batchThreads);
    ns.print("threadsAvailable = " + threadsAvailable);
    ns.print("batchCount = " + batchCount);

    /**
     * The time it takes to run the hack command.
     * @type {number}
     */
    let hackTime = ns.getHackTime(hostServer.hostname);

    /**
     * The time it takes to run the grow command.
     * @type {number}
     */
    let growTime = ns.getGrowTime(hostServer.hostname);

    /**
     * The time it takes to run the weaken command.
     * @type {number}
     */
    let weakenTime = ns.getWeakenTime(hostServer.hostname);

    /**
     * The time that the complete hack, grow, weaken cycle takes to complete.
     * @type {number}
     */
    let batchTime = Math.max(hackTime, growTime, weakenTime);

    /**
     * The time that the weaken command has to be delayed to ensure it
     * finishes last in the cycle.
     * @type {number}
     */
    let weakenDelay = Math.max(
      0,
      growTime - weakenTime + 1,
      hackTime - weakenTime + 1
    );

    /**
     * The time that the grow command has to be delayed to ensure it
     * finishes second in the cycle.
     * @type {number}
     */
    let growDelay = Math.max(
      0,
      hackTime - growTime + 1,
      batchTime - growTime - 1
    );

    /**
     * The time that the hack command has to be delayed to ensure it
     * finishes third in the cycle.
     * @type {number}
     */
    let hackDelay = Math.max(0, batchTime - hackTime - 2);

    if (batchCount > 0) {
      if (hackThreads > 0) {
        ns.run("hack.js", hackThreads, targetName, hackDelay);
        threadsAvailable -= hackThreads;
      }

      if (growThreads > 0) {
        ns.run("grow.js", growThreads, targetName, growDelay);
        threadsAvailable -= growThreads;
      }

      if (weakenThreads > 0) {
        ns.run("weaken.js", weakenThreads, targetName, weakenDelay);
        threadsAvailable -= weakenThreads;
      }
    }

    ns.print("load = " + (1.0 - threadsAvailable / threadsMax) * 100);

    await ns.sleep(period);
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
  return count;
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
  var growFactor = 1.0 + hackThreads * ns.hackAnalyze(targetServer.hostname);

  ns.print("growFactor = " + growFactor);

  count = Math.ceil(
    ns.growthAnalyze(targetServer.hostname, growFactor, hostServer.cpuCores)
  );

  return count;
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

  /**
   * The security score that will be removed by one thread of the weaken script.
   * @type {number}
   */
  var weakenReduction = ns.weakenAnalyze(1, hostServer.cpuCores);

  count = Math.ceil(deltaSecurity / weakenReduction);

  return count;
}
