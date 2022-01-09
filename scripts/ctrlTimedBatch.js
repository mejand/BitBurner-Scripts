/**
 * Handle a single batch at a time on the local host server.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The name of the target server. Will be null if the script was started
   * without a target.
   * @type {string}
   */
  var targetName = null;
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  }
}
