/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import(".").NS } ns
 * @param {number} ram_available - The RAM that is available for use by the scripts.
 * @returns {Object} An object containing the number of threads for each script type.
 */
export async function distribution(ns, ram_available) {
    // define the starting counts for all scripts
    var count_hack = 0;
    var count_grow = 0;
    var count_weaken = 0;

    // get the ram amount for each script
    ram_hack = ns.getScriptRam("hack.ns", "home");
    ram_grow = ns.getScriptRam("grow.ns", "home");
    ram_weaken = ns.getScriptRam("weaken.ns", "home");


    while (ram_available > count_hack * ram_hack + count_weaken * ram_weaken + count_grow * ram_grow) {
        count_hack++;
        count_grow = ns.growthAnalyze(target, 1 + ns.hackAnalyze(target) * count_hack + target_growth, cores_host)
        while (ns.weakenAnalyze(count_weaken, cores_host) < ns.growthAnalyzeSecurity(count_grow) + ns.hackAnalyzeSecurity(count_hack) + target_growth) {
            count_weaken++;
        }
    }
}