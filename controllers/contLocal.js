import { MyServer } from "../utilities/server.js";
import {
  Batch,
  getFarmingBatch,
  getPreparationBatch,
} from "../utilities/batch.js";
import { getTarget } from "../utilities/com.js";
import { logPrintVar } from "../utilities/log.js";
import { getTimeInRaster } from "../utilities/time.js";

/**
 * Continously start hack, grow and weaken scripts.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  var hackScript = "/bots/singleHack.js";
  var growScript = "/bots/singleGrow.js";
  var weakenScript = "/bots/singleWeaken.js";
  var scriptRam = Math.max(
    ns.getScriptRam(hackScript),
    ns.getScriptRam(growScript),
    ns.getScriptRam(weakenScript)
  );
  var host = new MyServer(ns, ns.getHostname(), scriptRam);
  var target = new MyServer(ns, "iron-gym");
  var batch = new Batch(target.name);
  var timePerAction = 400;
  var period = 3 * timePerAction;
  var now = ns.getTimeSinceLastAug();
  var hackStartTime =
    now + period + getTimeInRaster(target.weakenTime - target.hackTime);
  var growStartTime =
    now + period + getTimeInRaster(target.weakenTime - target.growTime);
  var hackCount = 0;
  var growCount = 0;
  var weakenCount = 0;

  ns.tail();

  while (true) {
    ns.clearLog();

    /** Get the current data */
    host.update(ns);
    target.update(ns);
    //target = getTarget(ns);
    now = ns.getTimeSinceLastAug();

    /** Calculate the threads needed */
    if (target.farming) {
      batch = getFarmingBatch(ns, target.server, host.server);
    } else {
      batch = getPreparationBatch(
        ns,
        target.server,
        host.server,
        host.threadsAvailable
      );
    }

    if (batch.totalThreads <= host.threadsAvailable) {
      if (batch.hackThreads > 0 && now > hackStartTime) {
        let hackRelativeFinish =
          getTimeInRaster(now + target.hackTime) % period;
        if (hackRelativeFinish == 0) {
          ns.run(hackScript, batch.hackThreads, target.name, hackCount);
          hackCount++;
        }
      }
      if (batch.growThreads > 0 && now > growStartTime) {
        let growRelativeFinish =
          getTimeInRaster(now + target.growTime) % period;
        if (growRelativeFinish == timePerAction) {
          ns.run(growScript, batch.growThreads, target.name, growCount);
          growCount++;
        }
      }
      if (batch.weakenThreads > 0) {
        let weakenRelativeFinish =
          getTimeInRaster(now + target.weakenTime) % period;
        if (weakenRelativeFinish == timePerAction * 2) {
          ns.run(weakenScript, batch.weakenThreads, target.name, weakenCount);
          weakenCount++;
        }
      }
    }

    logPrintVar(ns, "Target", target.name);
    logPrintVar(ns, "Money", target.moneyPercent);
    logPrintVar(ns, "Security", target.deltaSecurity);
    logPrintVar(ns, "Load", host.load);
    logPrintVar(ns, "Hack Count", hackCount);
    logPrintVar(ns, "Grow Count", growCount);
    logPrintVar(ns, "Weaken Count", weakenCount);

    await ns.sleep(150);
  }
}
