/**
 * Handle multiple batches targeting a defined server. All scripts are run
 * on the local host.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The name of the target server. Will be n00dles if the script was started
   * without a target.
   * @type {string}
   */
  var target = "n00dles";
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    target = ns.args[0];
  }
  var host = ns.getHostname();
  var ramFree = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
}
