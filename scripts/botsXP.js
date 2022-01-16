/**
 * Continously run weaken to gain hacking XP.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  var target = "n00dles";
  while (true) {
    if (ns.hasRootAccess(target)) {
      await ns.weaken(target);
    } else {
      await ns.sleep(1000);
    }
  }
}
