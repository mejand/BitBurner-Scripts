/**
 * Handle grow, weaken and hack scripts on the same host as the control script.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  }

  /**
   * The amount of money under which a grow cycle will be started.
   * @type {number}
   */
  var moneyThresh = ns.getServerMaxMoney(targetName) * 0.75;

  /**
   * The security level under which a weaken cycle will be started.
   * @type {number}
   */
  var securityThresh = ns.getServerMinSecurityLevel(targetName) + 5;

  /**
   * The name of the host server the script runs on.
   * @type {string}
   */
  var hostName = ns.getHostname();

  /**
   * The amount of ram available on the host server.
   * @type {number}
   */
  var availableRam =
    ns.getServerMaxRam(hostName) - ns.getServerUsedRam(hostName);

  // copy the needed scripts to the host
  await ns.scp("weaken.js", "home", hostName);
  await ns.scp("grow.js", "home", hostName);
  await ns.scp("hack.js", "home", hostName);

  // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
  while (true) {
    availableRam = ns.getServerMaxRam(hostName) - ns.getServerUsedRam(hostName);
    if (ns.getServerSecurityLevel(targetName) > securityThresh) {
      // If the server's security level is above our threshold, weaken it
      let threadCount = Math.floor(availableRam / ns.getScriptRam("weaken.js"));
      if (threadCount > 0) {
        ns.run("weaken.js", threadCount, targetName);
      }
      await ns.sleep(ns.getWeakenTime(targetName));
    } else if (ns.getServerMoneyAvailable(targetName) < moneyThresh) {
      // If the server's money is less than our threshold, grow it
      let threadCount = Math.floor(availableRam / ns.getScriptRam("grow.js"));
      if (threadCount > 0) {
        ns.run("grow.js", threadCount, targetName);
      }
      await ns.sleep(ns.getGrowTime(targetName));
    } else {
      // Otherwise, hack it
      let threadCount = Math.floor(availableRam / ns.getScriptRam("hack.js"));
      if (threadCount > 0) {
        ns.run("hack.js", threadCount, targetName);
      }
      await ns.sleep(ns.getHackTime(targetName));
    }
    // await another 10ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
    await ns.sleep(10);
  }
}
