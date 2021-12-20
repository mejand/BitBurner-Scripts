/**
 * Handle grow, weaken and hack scripts on the same host as the control script.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // get the arguments the script was started with.
    var target = "n00dles";
    if (ns.args.length > 0) {
        target = ns.args[0];
    }

    // define the variables for the script
    var moneyThresh = ns.getServerMaxMoney(target) * 0.75;
    var securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    var host = ns.getHostname();
    var available_ram = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);

    // copy the needed scripts to the host
    await ns.scp("weaken.ns", "home", host);
    await ns.scp("grow.ns", "home", host);
    await ns.scp("hack.ns", "home", host);

    // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
    while (true) {
        available_ram = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            // If the server's security level is above our threshold, weaken it
            let thread_count = Math.floor(available_ram / ns.getScriptRam("weaken.ns"));
            if (thread_count > 0) {
                ns.run("weaken.ns", thread_count, target);
            }
            await ns.sleep(ns.getWeakenTime(target));
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            // If the server's money is less than our threshold, grow it
            let thread_count = Math.floor(available_ram / ns.getScriptRam("grow.ns"));
            if (thread_count > 0) {
                ns.run("grow.ns", thread_count, target);
            }
            await ns.sleep(ns.getGrowTime(target));
        } else {
            // Otherwise, hack it
            let thread_count = Math.floor(available_ram / ns.getScriptRam("hack.ns"));
            if (thread_count > 0) {
                ns.run("hack.ns", thread_count, target);
            }
            await ns.sleep(ns.getHackTime(target));
        }
        // await another 10ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
        await ns.sleep(10);
    }
}