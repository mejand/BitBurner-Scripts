/**
 * Continously weaken a target server with all available RAM
 * to increase the hack skill level.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  /**
   * The name of the server that will be targeted.
   * @type {String}
   */
  var target = "n00dles";
  /**
   * The amount of RAM available on the host server.
   * @type {Number}
   */
  var ramAvailable = 0;
  /**
   * The number of threads that can be used for weakening.
   * @type {Number}
   */
  var threads = 0;
  /**
   * The name of the host server.
   * @type {Number}
   */
  var host = ns.getHostname();
  /**
   * The name of the weaken script.
   * @type {Number}
   */
  var weaken = "botsSingleWeaken.js";
  /**
   * The amount of RAM needed to run weaken with one thread.
   * @type {Number}
   */
  var weakenRam = ns.getScriptRam(weaken, host);
  /**
   * A unique ID for each run of the weaken script so
   * multiple can be started in parallel.
   * @type {Number}
   */
  var id = 0;
  /**
   * The fraction of the maximum RAM on the host that is allowed to be used
   * by this script.
   * @type {Number}
   */
  var ramFactor = 0.9;
  /**
   * The maximum amount of RAM that is allowed to be used by the script.
   * @type {Number}
   */
  var maximumRam = ns.getServerMaxRam(host) * ramFactor;

  while (true) {
    /** Calculate how many threads can be used (only use a ) */
    maximumRam = ns.getServerMaxRam(host) * ramFactor;
    ramAvailable = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
    ramAvailable = Math.min(ramAvailable, maximumRam);
    threads = Math.floor(ramAvailable / weakenRam);
    /** Start the weaken script if enough RAM is available */
    if (threads > 0) {
      ns.run(weaken, threads, target, id);
      id++;
    }
    await ns.sleep(200);
  }
}
