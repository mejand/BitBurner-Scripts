/**
 * Run a single grow operation.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof ns.args[0] == "string") {
    targetName = ns.args[0];
  }

  /**
   * The delay time before the operation starts.
   */
  var delay = 0;
  if (ns.args.length > 1 && typeof ns.args[1] == "number") {
    delay = ns.args[1];
  }

  if (delay > 0) {
    await ns.sleep(delay);
  }

  await ns.weaken(targetName);
}
