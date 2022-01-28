import { logPrintVar, logPrintLine } from "./utilLog.js";

/**
 * Handle the automatic buying of serversNames.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  /**
   * The time between executions of the automatic buying.
   * @type {number}
   */
  var period = 1000;
  if (ns.args.length > 0 && typeof (ns.args[0] == "number")) {
    period = ns.args[0];
  }
  /**
   * The fraction of the player's money that can be spent on buying serversNames.
   * @type {number}
   */
  var maxMoneyFactor = 0.75;
  if (ns.args.length > 1 && typeof (ns.args[1] == "number")) {
    maxMoney = ns.args[1];
  }
  /**
   * The maximum money that can be spent on buying a new server.
   * @type {number}
   */
  var maxMoney = ns.getServerMoneyAvailable("home") * maxMoneyFactor;
  /**
   * The names of all currently purchased servers.
   * @type {string[]}
   */
  var serversNames = ns.getPurchasedServers();
  /**
   * The maximum amount of RAM that can be purchased.
   * @type {number}
   */
  var maxAffordableRam = 0;
  /**
   * The purchased server with the lowest RAM.
   * @type {import("..").Server}
   */
  var minRamServer = null;
  /**
   * The maximum number of servers that can be purchased.
   * @type {number}
   */
  var maxServerCount = ns.getPurchasedServerLimit();
  /**
   * The names of scripts on the home server.
   * @type {String[]}
   */
  var filesToCopy = ns.ls("home", ".js");

  /** Start the loop to periodically try to purchase a server */
  while (true) {
    // get the current player money
    maxMoney = ns.getServerMoneyAvailable("home") * maxMoneyFactor;

    /** Get the maximum amount of RAM that could be purchased */
    maxAffordableRam = getMaxAffordableRam(ns, maxMoney);

    /** Check if an existing server can be replaced by a new one */
    if (serversNames.length == maxServerCount) {
      /** Get the server with the maximum amount of RAM */
      minRamServer = getMinRamServer(ns, serversNames);

      /** Check if a better server can be afforded */
      if (minRamServer.maxRam < maxAffordableRam) {
        /** Delete the old server */
        ns.killall(minRamServer.hostname);
        ns.deleteServer(minRamServer.hostname);
        logPrintLine(ns);
        logPrintVar(ns, "Deleted", minRamServer.hostname);
        logPrintVar(ns, "RAM of Deleted", minRamServer.maxRam);
        logPrintLine(ns);
      }
    }

    /** Update the array of purchased servers */
    serversNames = ns.getPurchasedServers();

    /** Check if another server can be purchased */
    if (serversNames.length < maxServerCount && maxAffordableRam > 0) {
      /**
       * The name of the new server that was purchased this cycle.
       * @type {string}
       */
      let newServerName = ns.purchaseServer("owned-server", maxAffordableRam);

      /** Copy the hacking scripts to the new server */
      await ns.scp(filesToCopy, "home", newServerName);

      /** Print the name for debugging purposes */
      logPrintLine(ns);
      logPrintVar(ns, "Bought", newServerName);
      logPrintVar(ns, "RAM of Bought", maxAffordableRam);
      logPrintLine(ns);
    }

    /** Wait for the next execution cycle */
    await ns.sleep(period);
  }
}

/**
 * Get the maximum amount of RAM that can be purchased for a given price.
 * @param {import("..").NS} ns
 * @param {number} money - The maximum money available for purchase of RAM.
 * @returns {number} The maximum amount RAM that can be purchased.
 */
function getMaxAffordableRam(ns, money) {
  /**
   * The amount of RAM that can be purchased.
   * @type {number}
   */
  var ram = 0;
  /**
   * The exponent for RAM calculation (2 ** i).
   * @type {number}
   */
  var i = 1;
  /**
   * Maximum RAM not reached -> continue the search.
   * @type {boolean}
   */
  var search = true;
  /**
   * The upper threshold for how much RAM can be purchased.
   * @type {number}
   */
  var maxRam = ns.getPurchasedServerMaxRam();

  /** Iteratively increase the RAM amount until the price reaches the threshold */
  while (search) {
    /**
     * The proposed RAM for examination of validity.
     * @type {number}
     */
    let proposedRam = 2 ** i;
    /**
     * The price for buying the proposed RAM.
     * @type {number}
     */
    let price = ns.getPurchasedServerCost(proposedRam);

    if (proposedRam <= maxRam && price <= money) {
      /** Take over the proposal and continue the search */
      ram = proposedRam;
      i++;
    } else {
      /** Stop the search if the maximum RAM has been reached */
      search = false;
    }
  }

  return ram;
}

/**
 * Get the server with the lowest RAM.
 * @param {import("..").NS} ns
 * @param {string[]} serversNames - The names of the servers from which to select.
 * @returns {import("..").Server}
 */
function getMinRamServer(ns, serversNames) {
  /**
   * The current minimum RAM.
   * @type {number}
   */
  var minRam = Infinity;
  /**
   * The name of the server with the lowest RAM.
   * @type {string}
   */
  var minRamServerName = "";

  for (let serverName of serversNames) {
    let ram = ns.getServerMaxRam(serverName);
    if (ram < minRam) {
      minRam = ram;
      minRamServerName = serverName;
    }
  }

  return ns.getServer(minRamServerName);
}
