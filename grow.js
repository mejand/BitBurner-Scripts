/**
 * Run a single grow operation.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  var target = ns.args[0];
  await ns.grow(target);
}
