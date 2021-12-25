/**
 * Handle the growing, weakening and hacking scripts in batches on the local server.
 * @param {import(".").NS} ns
 */
export async function main(ns) {
  // clean up the log file
  ns.disableLog("ALL");

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

  // copy the scripts to the host
  await ns.scp("hack.js", "home", hostName);
  await ns.scp("grow.js", "home", hostName);
  await ns.scp("weaken.js", "home", hostName);

  while (true) {
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
     * The number threads dedicated to hacking the target.
     * @type {number}
     */
    let hackThreads = 1;

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
     * The amount of ram on the host server available for tasking.
     * @type {number}
     */
    let availableRam = hostServer.maxRam - hostServer.ramUsed;

    // limit the thread counts to the available ram
    // start with weakening to ensure the minimum security is reached as quickly as possible
    weakenThreads = Math.min(
      weakenThreads,
      Math.floor(availableRam / weakenRam)
    );

    // update the available ram to account for the weakening
    availableRam -= weakenThreads * weakenRam;

    // continue with growing to ensure the maximum money is reached as quickly as possible
    growThreads = Math.min(growThreads, Math.floor(availableRam / growRam));

    // update the available ram to account for the growing
    availableRam -= growThreads * growRam;

    // continue with hacking
    hackThreads = Math.min(hackThreads, Math.floor(availableRam / hackRam));

    // update the available ram to account for the hacking
    availableRam -= hackThreads * hackRam;

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
    let cycleTime = Math.max(hackTime, growTime, weakenTime);

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
      cycleTime - growTime - 1
    );

    /**
     * The time that the hack command has to be delayed to ensure it
     * finishes third in the cycle.
     * @type {number}
     */
    let hackDelay = Math.max(0, cycleTime - hackTime - 2);

    // start the scripts with their corresponding delays
    if (hackThreads > 0) {
      ns.run("hack.js", hackThreads, targetServer.hostname, hackDelay);
    }
    if (growThreads > 0) {
      ns.run("grow.js", growThreads, targetServer.hostname, growDelay);
    }
    if (weakenThreads > 0) {
      ns.run("weaken.js", weakenThreads, targetServer.hostname, weakenDelay);
    }

    ns.print(
      ns.sprintf(
        "|hack|%i|%s||grow|%i|%s||weaken|%i|%s||",
        hackThreads,
        ns.tFormat(hackDelay),
        growThreads,
        ns.tFormat(growDelay),
        weakenThreads,
        ns.tFormat(weakenDelay)
      )
    );

    ns.tprint(
      ns.sprintf(
        "||%s|Load: %3.1f|Money: %3.1f|Security: %3.1f||",
        targetServer.hostname,
        availableRam / hostServer.maxRam,
        targetServer.moneyAvailable / targetServer.moneyMax,
        targetServer.securityAvailable / targetServer.securityMax
      )
    );

    await ns.sleep(10);
  }
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
   * The factor that the available money needs to be multiplied with to get the deltaMoney.
   * @type {number}
   */
  var growFactor =
    targetServer.moneyMax / targetServer.moneyAvailable +
    hackThreads * ns.hackAnalyze(targetServer.hostname);

  count = Math.ceil(
    ns.growthAnalyze(hostServer.hostname, growFactor, hostServer.cpuCores)
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
