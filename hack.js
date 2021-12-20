/**
 * Run a single hack operation.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    var target = ns.args[0];
    await ns.hack(target);
}