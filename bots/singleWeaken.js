/**
 * Start a single hack action against the specified target.
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

  await ns.weaken(targetName);
}
