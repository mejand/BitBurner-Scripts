/**
 * Run a single weaken operation.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof ns.args[0] == "string") {
    targetName = ns.args[0];
  }
  var delay = 0;
  if (ns.args.length > 1 && typeof ns.args[1] == "number") {
    delay = ns.args[1];
  }
  if (delay > 0) {
    await ns.sleep(delay);
  }
  await ns.weaken(targetName);
}
