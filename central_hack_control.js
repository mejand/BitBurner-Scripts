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
    var target_name = "n00dles";
    var target = ns.getServer(target_name);
    var moneyThresh = target.moneyMax * 0.75;
    var securityThresh = target.minDifficulty + 5;
    var available_ram = 0;
    var servers = [];
    var terminal_string = "";
    var total_threads = 0;

    // run an infinate loop that keeps evaluating the status of the target whenever a script has finished
    while (true) {
        // read the target from file and recalculate the thresholds
        target_name = ns.readPort(1);
        if (target_name == "NULL PORT DATA") {
            target = ns.getServer("n00dles");
        } else {
            target = ns.getServer(target_name);
        }
        if (debug) {
            ns.tprint("target = " + target.hostname);
        }

        // calculate the thresholds
        moneyThresh = target.moneyMax * 0.75;
        securityThresh = target.minDifficulty + 5;

        // update the string that will be displayed in the terminal
        terminal_string = "|" + target.hostname + "|Money: " + ns.nFormat((target.moneyAvailable / moneyThresh) * 100, "000.0") + " %|";
        terminal_string += ns.nFormat(securityThresh, "000.0") + " secLvl / ";
        terminal_string += ns.nFormat(target.hackDifficulty, "000.0") + " secLvl|";

        // reset the total thread count
        total_threads = 0;

        // get the purchase servers as the base of the servers to handle
        servers = ns.getPurchasedServers();
        // read the file to get all servers and add them to the purchased servers
        var rows = ns.read("network_unlocked.txt").split("\r\n");
        for (let row of rows) {
            // Ignore last blank row
            if (row) {
                // get the server name and append it to the array
                servers.push(row);
            }
        }

        // check which action needs to be performed
        if (target.hackDifficulty > securityThresh) {
            for (let server of servers) {
                available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                // If the server's security level is above our threshold, weaken it
                let thread_count = Math.floor(available_ram / ns.getScriptRam("weaken.js"));
                if (thread_count > 0) {
                    ns.exec("weaken.js", server, thread_count, target.hostname);
                }
                // update the total thread count
                total_threads += thread_count;
            }
            terminal_string += "Weaken - " + ns.tFormat(ns.getWeakenTime(target.hostname)) + "|-";
            terminal_string += ns.nFormat(ns.weakenAnalyze(total_threads), "0,0.0") + " secLvl|";
            ns.tprint(terminal_string);
            await ns.sleep(ns.getWeakenTime(target.hostname));
        } else if (target.moneyAvailable < moneyThresh) {
            for (let server of servers) {
                available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                // If the server's money is less than our threshold, grow it
                let thread_count = Math.floor(available_ram / ns.getScriptRam("grow.js"));
                if (thread_count > 0) {
                    ns.exec("grow.js", server, thread_count, target.hostname);
                }
                // update the total thread count
                total_threads += thread_count;
            }
            terminal_string += "Grow - " + ns.tFormat(ns.getGrowTime(target.hostname));
            terminal_string += "|+" + ns.nFormat(ns.growthAnalyzeSecurity(total_threads), "0,0.0") + " secLvl|";
            ns.tprint(terminal_string);
            await ns.sleep(ns.getGrowTime(target.hostname));
        } else {
            for (let server of servers) {
                available_ram = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
                // Otherwise, hack it
                let thread_count = Math.floor(available_ram / ns.getScriptRam("hack.js"));
                if (thread_count > 0) {
                    ns.exec("hack.js", server, thread_count, target.hostname);
                }
                // update the total thread count
                total_threads += thread_count;
            }
            terminal_string += "Hack - " + ns.tFormat(ns.getHackTime(target.hostname)) + "|+"
            terminal_string += ns.nFormat(ns.hackAnalyzeSecurity(total_threads), "0,0.0") + " secLvl|";
            ns.tprint(terminal_string);
            await ns.sleep(ns.getHackTime(target.hostname));
        }
        // await another 20ms to get some buffer time if there is a mismatch in the getXXXTime and sleep functions
        await ns.sleep(100);
    }
}