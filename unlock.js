/**
 * Periodically try to gain root access to all servers in the server_map and save the servers with root access to file.
 * Identify the best target and save it to file.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // get the arguments or use the default values
    var period = 10000;
    if (ns.args.length > 0) {
        period = ns.args[0];
    }
    var debug = true;
    if (ns.args.length > 1) {
        debug = ns.args[1];
    }

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

    // set a default target
    var target_server = "n00dles";
    var score = ns.getServerMaxMoney(target_server) / ns.getServerMinSecurityLevel(target_server);
    await ns.write("target_server.txt", target_server, "w");

    // start the loop to periodically try to unlock all servers
    while (true) {
        // clear the file of all old entries
        ns.clear("network_unlocked.txt");

        for (let server of servers) {
            // check if the server is already unlocked
            if (ns.hasRootAccess(server)) {
                // save the server to file
                await ns.write("network_unlocked.txt", server + "\r\n", "a");
                // calculate a score for the server if the server can be hacked
                if (ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel()) {
                    var score_new = ns.getServerMaxMoney(server) / ns.getServerMinSecurityLevel(server);
                    if (score_new > score) {
                        score = score_new;
                        target_server = server;
                        await ns.write("target_server.txt", target_server, "w");
                        if (debug) {
                            ns.tprint(" #### New Target: " + target_server + " ####");
                        }
                    }
                    if (debug) {
                        ns.tprint(server + " score = " + score_new);
                    }
                }
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
                    if (ns.getServerMaxRam(server)) {
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
        await ns.sleep(period);
    }
}