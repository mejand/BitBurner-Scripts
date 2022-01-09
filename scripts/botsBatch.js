import { getFarmingBatch } from "./utilBatch.js";
import { MyServer } from "./utilServer.js";
import { logPrintVar } from "./utilLog.js";

/**
 * Handle a single batch, timed so that the actions finish as close together as possible.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.tail();
  /**
   * The name of the target server. Will be null if the script was started
   * without a target.
   * @type {string}
   */
  var targetName = null;
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  }
  var now = ns.getTimeSinceLastAug();
  var target = new MyServer(ns, targetName);
  var host = new MyServer(ns, ns.getHostname());
  var batch = getFarmingBatch(ns, target, 0, 0.5, host);
  var finishTime = now + target.weakenTime;
  var running = true;

  ns.run("botsSingleWeaken.js", batch.weakenThreads, target.name, batch.id);

  logPrintVar(ns, "Money at beginning", target.moneyPercent);
  logPrintVar(ns, "Security at beginning", target.deltaSecurity);

  while (running) {
    now = ns.getTimeSinceLastAug();
    target.update(ns);
    host.update(ns);
    if (now + target.hackTime == finishTime - 800) {
      ns.run("botsSingleHack.js", batch.hackThreads, target.name, batch.id);
    }
    if (now + target.growTime == finishTime - 400) {
      ns.run("botsSingleGrow.js", batch.growThreads, target.name, batch.id);
    }
    if (now > finishTime) {
      running = false;
      logPrintVar(ns, "Money at end", target.moneyPercent);
      logPrintVar(ns, "Security at end", target.deltaSecurity);
    }
    await ns.sleep(150);
  }
}
