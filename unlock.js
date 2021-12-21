import { find_target } from "./find_target.js";

/**
 * Periodically try to gain root access to all servers in the server_map and save the servers with root access to file.
 * Identify the best target and save it to file.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // get the arguments or use the default values
    var period = 10000;
    if (ns.args.length > 0 && typeof (ns.args[0]) == "number") {
        period = ns.args[0];
    }
    var debug = true;
    if (ns.args.length > 1 && typeof (ns.args[1]) == "boolean") {
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
        // Ignore last blank row
        if (row) {
            // add the server name to the list
            servers.push(row);
        }
    }

    // start the loop to periodically try to unlock all servers
    while (true) {
        // clear the file of all old entries
        ns.clear("network_unlocked.txt");
        unlocked_servers = [];

        for (let server_name of servers) {
            // get the server object
            var server = ns.getServer(server_name);
            // open all possible ports
            if (!server.hasAdminRights) {
                // use all available programs to open ports
                var open_ports = 0;
                if (ns.fileExists("BruteSSH.exe", "home")) {
                    ns.brutessh(server.hostname);
                    open_ports++;
                }
                if (ns.fileExists("FTPCrack.exe", "home")) {
                    ns.ftpcrack(server.hostname);
                    open_ports++;
                }
                if (ns.fileExists("relaySMTP.exe", "home")) {
                    ns.relaysmtp(server.hostname);
                    open_ports++;
                }
                if (ns.fileExists("HTTPWorm.exe", "home")) {
                    ns.httpworm(server.hostname);
                    open_ports++;
                }
                if (ns.fileExists("SQLInject.exe", "home")) {
                    ns.sqlinject(server.hostname);
                    open_ports++;
                }
                // check if enough ports could be opened
                if (open_ports >= server.numOpenPortsRequired) {
                    // get root access
                    ns.nuke(server.hostname);
                    // update the root access flag
                    server.hasAdminRights = true;
                    // copy the hack scripts to the server if it has ram available
                    if (server.maxRam > 0) {
                        // copy the scripts to the server
                        await ns.scp("weaken.js", "home", server.hostname);
                        await ns.scp("grow.js", "home", server.hostname);
                        await ns.scp("hack.js", "home", server.hostname);
                    }
                }
                if (server.hasAdminRights) {
                    // save the server to file
                    await ns.write("network_unlocked.txt", server.hostname + "\r\n", "a");
                    // add the server to the unlocked servers list
                    unlocked_servers.push(server);
                }
            }
            // print to the terminal if debugging is enabled
            if (debug) {
                ns.tprint(server.hostname + " unlocked = " + server.hasAdminRights);
            }
        }
        // re-calculate the target after the unlock attempt
        target = find_target(ns, unlocked_servers, debug);
        // write the current target to port 1
        ns.clearPort(1);
        await ns.writePort(1, target.hostname);
        // wait for the next execution
        await ns.sleep(period);
    }
}