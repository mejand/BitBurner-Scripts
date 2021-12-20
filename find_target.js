/**
 * Find the most suitable target.
 * @param {import(".").NS } ns
 */
export async function find_target(ns, servers, debug = false) {
    // find the most lucrative target for hacking
    var max_score = 0;
    var max_money = 0;
    var max_security_factor = 0;
    var max_money_per_ram = 0;
    var total_ram = 0;
    var result = "n00dles";
    // create an array to store the data of each valid target
    var targets = [];
    for (let server of servers) {
        // check if the target server can be hacked
        if (ns.hasRootAccess(server) && ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(server)) {
            // only consider servers that are not owned by the player
            if (server != "home" && server.indexOf("basic-hack-server") == -1) {
                // calculate the security factor
                var factor = 0.0;
                if (ns.getServerSecurityLevel(server) > 0.0) {
                    factor = ns.getHackingLevel() / ns.getServerSecurityLevel(server);
                }
                // create an object to represent the server
                var server_data = {
                    name: server,
                    money: ns.getServerMaxMoney(server),
                    security_factor: factor,
                    ram: ns.getServerMaxRam(server),
                    money_per_ram: 0
                };
                targets.push(server_data);
                // calculate the maximum available ram for hacking scripts
                total_ram += server.ram;
            }
        }
    }
    // calculate the money available per ram
    for (let target of targets) {
        if (target.ram > 0) {
            target.money_per_ram = target.money / total_ram;
        }
    }
    // find the max money, security factor and ram per money for scaling
    for (let target of targets) {
        if (target.money > max_money) {
            max_money = target.money;
        }
        if (target.security_factor > max_security_factor) {
            max_security_factor = target.security_factor;
        }
        if (target.money_per_ram > max_money_per_ram) {
            max_money_per_ram = target.money_per_ram;
        }
    }
    // loop through all the possible targets and find the best one
    for (let target of targets) {
        // scale the money
        var scaled_money = target.money / max_money;
        var scaled_security_factor = target.security_factor / max_security_factor;
        var scaled_money_per_ram = target.money_per_ram / max_money_per_ram;
        // the scaled factors are weighted so that money or ease of hacking can be prioritized
        var score = (scaled_money * 1.0) + (scaled_security_factor * 1.0) + (scaled_money_per_ram * 1.0);
        if (debug) {
            ns.tprint("find_target: " + target.name + " - " + scaled_money + " - " + scaled_security_factor + " - " + score);
        }
        // check if the score is better than the maximum
        if (score > max_score) {
            max_score = score;
            result = target.name;
        }
    }
    if (debug) {
        ns.tprint("find_target: " + result);
    }
    return result;
}