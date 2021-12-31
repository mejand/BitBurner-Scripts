import {
  logPrintVar,
  getFarmingBatch,
  getPreparationBatch,
} from "./utilities.js";

/**
 * Handle grow, weaken and hack scripts on the same host as the control script.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  }
  /**
   * The name of the host server the script runs on.
   * @type {string}
   */
  var hostName = ns.getHostname();
  /**
   * The server object of the target.
   * @type {import(".").Server}
   */
  var target = ns.getServer(targetName);
  /**
   * The server object of the host the script is running on.
   * @type {import(".").Server}
   */
  var host = ns.getServer(hostName);
  /**
   * The amount of ram available on the host server.
   * @type {number}
   */
  var availableRam = host.maxRam - host.ramUsed;
  var hackThreads = 1;
  var growThreads = 0;
  var weakenThreads = 0;
  var hackRam = ns.getScriptRam("dummyHack.js", hostName);
  var growRam = ns.getScriptRam("dummyGrow.js", hostName);
  var weakenRam = ns.getScriptRam("dummyWeaken.js", hostName);
  var id = 0;
  var sleepTime = 150;

  ns.tail();

  while (true) {
    ns.clearLog();
    /** Update the server objects */
    target = ns.getServer(targetName);
    host = ns.getServer(hostName);

    sleepTime = 150;

    logPrintVar(ns, "Money", (target.moneyAvailable / target.moneyMax) * 100);
    logPrintVar(
      ns,
      "Delta Security",
      target.hackDifficulty - target.minDifficulty
    );

    let ramAvailable = host.maxRam - host.ramUsed;
    let batch = null;
    if (
      target.moneyAvailable < target.moneyMax * 0.8 ||
      target.hackDifficulty - target.minDifficulty > 1
    ) {
      batch = getPreparationBatch(ns, target, host, ramAvailable / 2);
    } else {
      batch = getFarmingBatch(ns, target, host);
    }
    let ramNeeded =
      batch.hackThreads * hackRam +
      batch.growThreads +
      growRam +
      batch.weakenThreads * weakenRam;

    logPrintVar(ns, "Hack Threads", batch.hackThreads);
    logPrintVar(ns, "Grow Threads", batch.growThreads);
    logPrintVar(ns, "Weaken Threads", batch.weakenThreads);
    logPrintVar(ns, "RAM Available", ramAvailable);
    logPrintVar(ns, "RAM Needed", ramNeeded);
    logPrintVar(
      ns,
      "MoneyGain",
      ns.getScriptIncome(ns.getScriptName(), host.hostname, ns.args[0])
    );

    if (ramNeeded < ramAvailable) {
      if (batch.hackThreads > 0) {
        ns.run("dummyHack.js", batch.hackThreads, target.hostname, id);
      }
      if (batch.growThreads > 0) {
        ns.run("dummyGrow.js", batch.growThreads, target.hostname, id);
      }
      if (batch.weakenThreads > 0) {
        ns.run("dummyWeaken.js", batch.weakenThreads, target.hostname, id);
      }

      id++;

      if (id > 10000) {
        id = 0;
      }

      sleepTime = ns.getWeakenTime(target.hostname) + 400;
      logPrintVar(ns, "Sleep Time", sleepTime);
    }

    await ns.sleep(sleepTime);
  }
}
