import { logPrintLine, logPrintVar } from "./utilLog.js";

/**
 * Handle the automatic upgrading of hacknet nodes.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");

  /**
   * The time between the upgrade of hacknet nodes.
   * @param {number}
   */
  var period = 200;
  if (ns.args.length > 0 && typeof (ns.args[0] == "number")) {
    period = ns.args[0];
  }
  /**
   * The fraction of the earnings of hacknet nodes that shall be used for upgrades.
   * @type {number}
   */
  var moneyFactor = 1.0;
  if (ns.args.length > 1 && typeof (ns.args[1] == "number")) {
    moneyFactor = ns.args[1];
  }
  /**
   * The budget available for upgrades.
   * @type {number}
   */
  var budget = ns.getServerMoneyAvailable("home");

  /** Start the loop to periodically upgrade the hacknet servers */
  while (true) {
    budget = ns.getServerMoneyAvailable("home");
    /**
     * All possible upgrade options currently available.
     * @type {Upgrade[]}
     */
    let options = [];

    /** Add an object for purchasing a new node */
    options.push(new Upgrade(ns.hacknet.getPurchaseNodeCost(), 0, -1));

    /** Loop through all nodes and gather the different upgrade options */
    for (var i = 0; i < ns.hacknet.numNodes(); i++) {
      /**
       * The cost for an upgrade option (is Infinity if the option is maxed out).
       * @type {number}
       */
      let upgradeCost = ns.hacknet.getLevelUpgradeCost(i);

      if (isFinite(upgradeCost)) {
        options.push(new Upgrade(upgradeCost, 1, i));
      }

      upgradeCost = ns.hacknet.getRamUpgradeCost(i);

      if (isFinite(upgradeCost)) {
        options.push(new Upgrade(upgradeCost, 2, i));
      }

      upgradeCost = ns.hacknet.getCoreUpgradeCost(i);

      if (isFinite(upgradeCost)) {
        options.push(new Upgrade(upgradeCost, 3, i));
      }
    }

    /**
     * The cheapest upgrade option.
     * @type {Upgrade}
     */
    let result = null;
    /**
     * The cost of the currently cheapest upgrade.
     * @type {number}
     */
    let minCost = Infinity;

    // loop through all options and find the cheapest
    for (let option of options) {
      if (option.cost < minCost) {
        minCost = option.cost;
        result = option;
      }
    }

    // execute the option if one was chosen and it is within the budget
    if (result && result.cost <= budget) {
      // decide which type of action was selected
      // buy node:    type 0
      // buy level: 	type 1
      // buy ram: 	  type 2
      // buy core: 	  type 3
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
      // reset the maximum money when an upgrade was bought
      budget = 0;
    }

    ns.clearLog();
    logPrintLine(ns);
    logPrintVar(ns, "Budget", budget);
    logPrintLine(ns);
    logPrintVar(ns, "Result Server", result.server);
    logPrintVar(ns, "Result Type", result.type);
    logPrintVar(ns, "Result Cost", result.cost);
    logPrintLine(ns);

    await ns.sleep(period);
  }
}

/**
 * The information about an upgrade option.
 */
class Upgrade {
  /**
   * Create an upgrade option.
   * @param {number} cost - The cost of the upgrade option.
   * @param {number} type - The type of the upgrade.
   * @param {number} server - The ID of the hacknet server the upgrade applies to.
   */
  constructor(cost, type, server) {
    /**
     * @property {number} - The cost of the upgrade.
     */
    this.cost = cost;

    /**
     * @property {number} - The type of the upgrade.
     * @description The following types are supported: buy node = 0, buy level = 1,
     * buy ram = 2, buy core = 3
     */
    this.type = type;
    /**
     * @property {number} - The ID of the hacknet server the upgrade applies to.
     */
    this.server = server;
  }
}
