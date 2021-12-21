import { find_target } from "find_target.js";

/**
 * Periodically try to gain root access to all servers in the server_map and save the servers with root access to file.
 * Identify the best target and save it to file.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // get the arguments or use the default values
    var period = 10000;
    if (ns.args.length > 0 && typeof (ns.args[0]) == Number) {
        period = ns.args[0];
    }
    var debug = true;
    if (ns.args.length > 1 && typeof (ns.args[1]) == Boolean) {
        debug = ns.args[1];
    }

    // define the default target
    var target = ns.getServer("n00dles");
    // define a list that holds the server objects of all unlocked servers
    var unlocked_servers = [];

    // read all servers from file and put them into an arry
    var servers = [];
    // read the file to get all servers
    var rows = ns.read("network_map.txt").split("\r\n");
    for (let row of rows) {
        // extract the individual data from the row
        var data = row.split(",");
        // Ignore last blank row
        if (data.length < 7) {
            break;
        }
        // get the server name and append it to the array
        servers.push(data[0]);
    }

    // start the loop to periodically try to unlock all servers
    while (true) {
        // clear the file of all old entries
        ns.clear("network_unlocked.txt");

        for (let server of servers) {
            // check if the server is already unlocked
            if (ns.hasRootAccess(server)) {
                // save the server to file
                await ns.write("network_unlocked.txt", server + "\r\n", "a");
            } else {
                // use all available programs to open ports
                var open_ports = 0;
                if (ns.fileExists("BruteSSH.exe", "home")) {
                    ns.brutessh(server);
                    open_ports++;
                }
                if (ns.fileExists("FTPCrack.exe", "home")) {
                    ns.ftpcrack(server);
                    open_ports++;
                }
                if (ns.fileExists("relaySMTP.exe", "home")) {
                    ns.relaysmtp(server);
                    open_ports++;
                }
                if (ns.fileExists("HTTPWorm.exe", "home")) {
                    ns.httpworm(server);
                    open_ports++;
                }
                if (ns.fileExists("SQLInject.exe", "home")) {
                    ns.sqlinject(server);
                    open_ports++;
                }
                // check if enough ports could be opened
                if (open_ports >= ns.getServerNumPortsRequired(server)) {
                    ns.nuke(server);
                    // copy the hack scripts to the server if it has ram available
                    if (ns.getServerMaxRam(server) > 0) {
                        // copy the scripts to the server
                        await ns.scp("weaken.js", "home", row);
                        await ns.scp("grow.js", "home", row);
                        await ns.scp("hack.js", "home", row);
                    }
                    // save the server to file
                    await ns.write("network_unlocked.txt", server + "\r\n", "a");
                }
            }
            // print to the terminal if debugging is enabled
            if (debug) {
                ns.tprint(server + " unlocked = " + ns.hasRootAccess(server));
            }
        }
        // re-calculate the target after the unlock attempt
        target = find_target(unlocked_servers, debug);
        // write the current target to port 1
        ns.clearPort(1);
        ns.writePort(1, target.hostname);
        // wait for the next execution
        await ns.sleep(period);
    }
}