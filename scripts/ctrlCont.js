import { MyServer } from "./utilServer.js";
import {
  SingleBatch,
  getFarmingBatch,
  getPreparationBatch,
} from "./utilBatch.js";
import { getTarget } from "./utilCom.js";
import { logPrintVar, logPrintLine } from "./utilLog.js";

/**
 * Continously start hack, grow and weaken scripts.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "None";
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  }
  /**
   * The name of the script used for hacking.
   * @type {string}
   */
  var hackScript = "/bots/singleHack.js";
  /**
   * The name of the script used for growing.
   * @type {string}
   */
  var growScript = "/bots/singleGrow.js";
  /**
   * The name of the script used for weakening.
   * @type {string}
   */
  var weakenScript = "/bots/singleWeaken.js";
  /**
   * The ram needed to run any script.
   * @type {number}
   */
  var scriptRam = Math.max(
    ns.getScriptRam(hackScript),
    ns.getScriptRam(growScript),
    ns.getScriptRam(weakenScript)
  );
  /**
   * The server this script is running on.
   * @type {MyServer}
   */
  var host = new MyServer(ns, ns.getHostname(), scriptRam);
  /**
   * The server that is targeted by this script.
   * @type {MyServer}
   */
  var target = new MyServer(ns, targetName);
  /**
   * An object holding the thread counts for hack, grow and weaken.
   * @type {SingleBatch}
   */
  var batch = new SingleBatch(target.name);
  /**
   * The time window that shall be defined for each action.
   * @type {number}
   */
  var timePerAction = 400;
  /**
   * The time for completing each action once.
   * @type {number}
   */
  var period = 3 * timePerAction;
  /**
   * The curren time stamp.
   * @type {number}
   */
  var now = ns.getTimeSinceLastAug();
  /**
   * The time stamp after which hacking can be started.
   * @type {number}
   */
  var hackStartTime = now + period + target.weakenTime - target.hackTime;
  /**
   * The time stamp after which growing can be started.
   * @type {number}
   */
  var growStartTime = now + period + target.weakenTime - target.growTime;
  /**
   * The number of hack actions that have been triggered.
   * @type {number}
   */
  var hackCount = 0;
  /**
   * The number of grow actions that have been triggered.
   * @type {number}
   */
  var growCount = 0;
  /**
   * The number of weaken actions that have been triggered.
   * @type {number}
   */
  var weakenCount = 0;

  while (true) {
    ns.clearLog();

    /** Get the current data */
    host.update(ns);
    if (targetName != "None") {
      target.update(ns);
    } else {
      target = getTarget(ns);
    }
    now = ns.getTimeSinceLastAug();

    /** Print the current status of the target to the log window */
    logPrintLine(ns);
    logPrintVar(ns, "Target", target.name);
    logPrintVar(ns, "Money", target.moneyPercent);
    logPrintVar(ns, "Security", target.deltaSecurity);
    logPrintLine(ns);

    /** Calculate the threads needed */
    if (target.farming) {
      batch = getFarmingBatch(ns, target, host);
    } else {
      batch = getPreparationBatch(ns, target, host);
    }

    /**
     * Only attempt to start an action if a full batch can be triggered.
     * The goal is to ensure that the requested actions can actually be started.
     */
    if (batch.totalThreads <= host.threadsAvailable) {
      /** Start a hack action if it will finish within it's allotted time window */
      if (batch.hackThreads > 0 && now > hackStartTime) {
        let hackRelativeFinish = now + (target.hackTime % period);
        if (hackRelativeFinish == 0) {
          ns.run(hackScript, batch.hackThreads, target.name, hackCount);
          hackCount++;
        }
      }
      /** Start a grow action if it will finish within it's allotted time window */
      if (batch.growThreads > 0 && now > growStartTime) {
        let growRelativeFinish = now + (target.growTime % period);
        if (growRelativeFinish == timePerAction) {
          ns.run(growScript, batch.growThreads, target.name, growCount);
          growCount++;
        }
      }
      /** Start a weaken action if it will finish within it's allotted time window */
      if (batch.weakenThreads > 0) {
        let weakenRelativeFinish = now + (target.weakenTime % period);
        if (weakenRelativeFinish == timePerAction * 2) {
          ns.run(weakenScript, batch.weakenThreads, target.name, weakenCount);
          weakenCount++;
        }
      }
    }

    /** Print the current status of the host to the log window */
    logPrintLine(ns);
    logPrintVar(ns, "Host", host.name);
    logPrintVar(ns, "Load", host.load);
    logPrintLine(ns);
    logPrintVar(ns, "Hack Count", hackCount);
    logPrintVar(ns, "Grow Count", growCount);
    logPrintVar(ns, "Weaken Count", weakenCount);
    logPrintLine(ns);

    await ns.sleep(150);
  }
}
