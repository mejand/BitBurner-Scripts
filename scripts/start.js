import { logPrintLine, logPrintVar } from "./utilLog.js";
/**
 * Download the startup script from github and run it.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The wait time between each step in the start up sequence.
   * @type {number}
   */
  var waitTime = 400;
  /**
   * The name of the host server this script runs on.
   * @type {string}
   */
  var host = ns.getHostname();
  /**
   * The amount of RAM availabe on the host server.
   * @type {number}
   */
  var ramAvailable = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
  /**
   * All scripts that shall be started.
   * @type {string[]}
   */
  var scripts = [
    "supSpider.js",
    "supUnlock.js",
    "supTarget.js",
    "supHacknet.js",
    "ctrlSingleBatch.js",
  ];

  ns.tail();
  logPrintLine(ns);

  /** Attempt to start each script in turn */
  for (let script of scripts) {
    /** Only attempt to start the script if the file is on the host */
    if (ns.fileExists(script)) {
      ramAvailable = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
      /** Only attempt to start the script if there is enough free RAM */
      if (ramAvailable >= ns.getScriptRam(script)) {
        logPrintVar(ns, script, ns.run(script, 1));
      } else {
        logPrintVar(ns, script, "Insufficient RAM");
      }
    } else {
      let text = "File not on " + host;
      logPrintVar(ns, script, text);
    }
    /** Wait before trying to run the next scipt */
    await ns.sleep(waitTime);
  }
  logPrintLine(ns);
  logPrintVar(ns, "Remaining RAM", ramAvailable);
  logPrintLine(ns);
}
