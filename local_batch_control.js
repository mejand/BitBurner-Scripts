/**
 * Handle the growing, weakening and hacking scripts in batches on the local server.
 * @param {import(".").NS} ns
 */
export async function main(ns) {
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

    await ns.sleep(10);
  }
}

/**
 * Get the number of threads needed to grow the target server to max money.
 * @param {import(".").NS} ns
 * @param {import(".").Server} targetServer - The target server.
 * @param {import(".").Server} hostServer - The host server.
 * @returns {number} The number of threads needed to grow the target to max money.
 */
function getGrowThreads(ns, targetServer, hostServer) {
  /**
   * The number of threads needed to grow the target to max money.
   * @type {number}
   */
  var count = 0;

  /**
   * The amount of money that needs to be added to reach the max money.
   * @type {number}
   */
  var deltaMoney = targetServer.moneyMax - targetServer.moneyAvailable;

  /**
   * The factor that the available money needs to be multiplied with to get the deltaMoney.
   * @type {number}
   */
  var growFactor = deltaMoney / targetServer.moneyAvailable;

  count = Math.ceil(
    ns.growthAnalyze(hostServer.hostname, growFactor, hostServer.cpuCores)
  );

  return count;
}
