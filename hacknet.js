/**
 * Handle the automatic upgrading of hacknet nodes.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  // get the arguments or use the default values
  var period = 10000;
  if (ns.args.length > 0 && typeof (ns.args[0] == "number")) {
    period = ns.args[0];
  }
  var moneyFactor = 0.25;
  if (ns.args.length > 1 && typeof (ns.args[1] == "number")) {
    moneyFactor = ns.args[1];
  }
  var debug = true;
  if (ns.args.length > 2 && typeof (ns.args[2] == "boolean")) {
    debug = ns.args[2];
  }

  // define a variable the maximum available budget
  var maxMoney = 0;

  // adjust the money factor for the period of the script
  // production is given in $/s -> if the period is longer than 1 second
  // then more than one second of production has to be considered
  moneyFactor = moneyFactor * (1000 / period);

  // start the loop to periodically upgrade the hacknet servers
  while (true) {
    // create an array that holds information about all possible upgrade options currently available
    var options = [];
    // add an object for purchasing a new node
    options.push({
      cost: ns.hacknet.getPurchaseNodeCost(),
      type: 0,
      server: -1,
    });
    // loop through all nodes and gather the different upgrade options
    for (var i = 0; i < ns.hacknet.numNodes(); i++) {
      // get the node object and sum up the current node production
      maxMoney += ns.hacknet.getNodeStats(i).production * moneyFactor;
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
    var minCost = null;
    for (let option of options) {
      if (!minCost || option.cost < minCost) {
        minCost = option.cost;
        result = option;
      }
    }
    // execute the option if one was chosen and it is within the budget
    if (result && result.cost <= maxMoney) {
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
        ns.tprint("manage_hacknet:" + JSON.stringify(result));
      }
      // reset the maximum money when an upgrade was bought
      maxMoney = 0;
    }
    if (debug) {
      ns.tprint("maxMoney: " + maxMoney);
    }
    await ns.sleep(period);
  }
}
