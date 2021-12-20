/**
 * Handle the growing, weakening and hacking scripts from one central server.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // clean up the log
    ns.disableLog("getServerSecurityLevel");
    ns.disableLog("getServerMaxRam");
    ns.disableLog("getServerUsedRam");
    ns.disableLog("getScriptRam");
    ns.disableLog("getWeakenTime");
    ns.disableLog("getServerMoneyAvailable");
    ns.disableLog("getGrowTime");
    ns.disableLog("getHackTime");

    var debug = true;
    if (ns.args.length > 0) {
        debug = ns.args[0];
    }

    // define the variables for the script
    var target = "n00dles";
    var moneyThresh = ns.getServerMaxMoney(target) * 0.75;
    var securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    var available_ram = 0;
    var servers = [];
    var terminal_string = "";
    var total_threads = 0;

    // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
    while (true) {
        // read the target from file and recalculate the thresholds
        target = ns.read("target_server.txt");
        if (debug) {
            ns.tprint("read target from file = " + target);
        }
        moneyThresh = ns.getServerMaxMoney(target) * 0.75;
        securityThresh = ns.getServerMinSecurityLevel(target) + 5;

        // update the string that will be displayed in the terminal
        terminal_string = "|" + target + "|" + moneyThresh + " $ - " + ns.getServerMoneyAvailable(target) + " $|";
        terminal_string += securityThresh + " secLvl - " + ns.getServerSecurityLevel(target) + " secLvl|";

        // reset the total thread count
        total_threads = 0;

        // get the purchase servers as the base of the servers to handle
        servers = ns.getPurchasedServers();
        // read the file to get all servers and add them to the purchased servers
        var rows = ns.read("network_unlocked.txt").split("\r\n");
        for (let row of rows) {
            // Ignore last blank row
            if (!row) {
                break;
            }
            // get the server name and append it to the array
            servers.push(row);
            if (row != "home") {
                // copy the scripts to the server
                await ns.scp("weaken.ns", "home", row);
                await ns.scp("grow.ns", "home", row);
                await ns.scp("hack.ns", "home", row);
                if (debug) {
                    ns.tprint(row);
                }
            }
        }

        // check which action needs to be performed
        if (ns.getServerSecurityLevel(target) > securityThresh) {
            for (let server of servers) {
                available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                // If the server's security level is above our threshold, weaken it
                let thread_count = Math.floor(available_ram / ns.getScriptRam("weaken.ns"));
                if (thread_count > 0) {
                    ns.exec("weaken.ns", server, thread_count, target);
                }
                // update the total thread count
                total_threads += thread_count;
            }
            terminal_string += "Weaken - " + ns.tFormat(ns.getWeakenTime(target)) + "|-";
            terminal_string += ns.weakenAnalyze(total_threads) + " secLvl|";
            ns.tprint(terminal_string);
            await ns.sleep(ns.getWeakenTime(target));
        } else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
            for (let server of servers) {
                available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                // If the server's money is less than our threshold, grow it
                let thread_count = Math.floor(available_ram / ns.getScriptRam("grow.ns"));
                if (thread_count > 0) {
                    ns.exec("grow.ns", server, thread_count, target);
                }
                // update the total thread count
                total_threads += thread_count;
            }
            terminal_string += "Grow - " + ns.tFormat(ns.getGrowTime(target));
            terminal_string += "|+" + ns.growthAnalyzeSecurity(total_threads) + " secLvl|";
            ns.tprint(terminal_string);
            await ns.sleep(ns.getGrowTime(target));
        } else {
            for (let server of servers) {
                available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                // Otherwise, hack it
                let thread_count = Math.floor(available_ram / ns.getScriptRam("hack.ns"));
                if (thread_count > 0) {
                    ns.exec("hack.ns", server, thread_count, target);
                }
                // update the total thread count
                total_threads += thread_count;
            }
            terminal_string += "Hack - " + ns.tFormat(ns.getHackTime(target)) + "|+"
            terminal_string += ns.hackAnalyzeSecurity(total_threads) + " secLvl|";
            ns.tprint(terminal_string);
            await ns.sleep(ns.getHackTime(target));
        }
        // await another 10ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
        await ns.sleep(10);
    }
}