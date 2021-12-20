/**
 * Handle the automatic upgrading of hacknet nodes.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // get the arguments or use the default values
    var period = 10000;
    if (ns.args.length > 0) {
        period = ns.args[0];
    }
    var money_factor = 0.25;
    if (ns.args.length > 1) {
        money_factor = ns.args[1];
    }
    var debug = true;
    if (ns.args.length > 2) {
        debug = ns.args[2];
    }

    // calculate the maximum available budget
    var max_money = ns.getServerMoneyAvailable("home") * money_factor;

    // start the loop to periodically upgrade the hacknet servers
    while (true) {
        // create an array that holds information about all possible upgrade options currently available
        var options = [];
        // add an object for purchasing a new node
        options.push({ cost: ns.hacknet.getPurchaseNodeCost(), type: 0, server: -1 });
        // loop through all nodes and gather the different upgrade options
        for (var i = 0; i < ns.hacknet.numNodes(); i++) {
            // check if the upgrade is possible (infinity is returned if upgrade is maxed out)
            var upgrade_cost = ns.hacknet.getLevelUpgradeCost(i);
            if (isFinite(upgrade_cost)) {
                options.push({ cost: upgrade_cost, type: 1, server: i });
            }
            upgrade_cost = ns.hacknet.getRamUpgradeCost(i);
            if (isFinite(upgrade_cost)) {
                options.push({ cost: upgrade_cost, type: 2, server: i });
            }
            upgrade_cost = ns.hacknet.getCoreUpgradeCost(i);
            if (isFinite(upgrade_cost)) {
                options.push({ cost: upgrade_cost, type: 3, server: i });
            }
        }
        // loop through all options and find the cheapest
        var result = null;
        var min_cost = null;
        for (let option of options) {
            if (!min_cost || option.cost < min_cost) {
                min_cost = option.cost;
                result = option;
            }
        }
        // execute the option if one was chosen and it is within the budget
        if (result && result.cost <= max_money) {
            // decide which type of action was selected
            // buy node:	type 0
            // buy level: 	type 1
            // buy ram: 	type 2
            // buy core: 	type 3
            switch (result.type) {
                case 0:
                    ns.hacknet.purchaseNode();
                    break;
                case 1:
                    ns.hacknet.upgradeLevel(result.server, 1);
                    break;
                case 2:
                    ns.hacknet.upgradeRam(result.server, 1);
                    break;
                case 3:
                    ns.hacknet.upgradeCore(result.server, 1);
                    break;
                default:
                    break;
            }
            if (debug) {
                ns.tprint("manage_hacknet:" + JSON.stringify(option));
            }
        }
        await ns.sleep(period);
    }
}