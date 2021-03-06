import { getTimeInRaster } from "./utilTime.js";

/**
 * A custom server object providing commonly used information.
 */
export class MyServer {
  /**
   * Create a custom server object for the given server name.
   * @param {import("..").NS} ns
   * @param {string} name - The name of the server.
   * @param {number} moneyFactor - If the available money is below this fraction of the
   * available money preparation is recommended before farming.
   * @param {number} securityOffset - If the difference between current and minimum
   * security is above this threshold preparation is recommended before farming.
   */
  constructor(ns, name, moneyFactor = 0.9, securityOffset = 1) {
    /**
     * The server object provided by the game.
     * @type {import("..").Server}
     */
    this.server = ns.getServer(name);
    /**
     * The name ot the server.
     * @type {string}
     */
    this.name = name;
    /**
     * The amount of RAM currently available on the server.
     * @type {number}
     */
    this.ramAvailable = this.server.maxRam - this.server.ramUsed;
    /**
     * The percentage of the maximum money currently on the server.
     * @type {number}
     */
    this.moneyPercent =
      (this.server.moneyAvailable / this.server.moneyMax) * 100;
    /**
     * The difference between current and minimum security.
     * @type {number}
     */
    this.deltaSecurity = this.server.hackDifficulty - this.server.minDifficulty;
    /**
     * The current loading of the server.
     */
    this.load = 100 - (this.ramAvailable / this.server.maxRam) * 100;
    /**
     * The time it takes to hack the server converted to the 200ms raster.
     * @type {number}
     */
    this.hackTime = getTimeInRaster(ns.getHackTime(this.name));
    /**
     * The time it takes to grow the server converted to the 200ms raster.
     * @type {number}
     */
    this.growTime = getTimeInRaster(ns.getGrowTime(this.name));
    /**
     * The time it takes to weaken the server converted to the 200ms raster.
     * @type {number}
     */
    this.weakenTime = getTimeInRaster(ns.getWeakenTime(this.name));
    /**
     * If the available money is below this fraction of the
     * available money preparation is recommended before farming.
     * @type {number}
     */
    this.moneyFactor = moneyFactor * 100;
    /**
     * If the difference between current and minimum security is
     * above this threshold preparation is recommended before farming.
     * @type {number}
     */
    this.securityOffset = securityOffset;
    /**
     * The server is ready to be farmed.
     * @type {boolean}
     */
    this.farming =
      this.moneyPercent > this.moneyFactor &&
      this.deltaSecurity < this.securityOffset;
    /**
     * The number of CPU cores available on the server.
     * @type {number}
     */
    this.cores = this.server.cpuCores;
    /**
     * The chance for hack to succeed in percent.
     * @type {number}
     */
    this.successChance = ns.hackAnalyzeChance(this.name) * 100;
  }

  /**
   * Update the server information.
   * @param {import("..").NS} ns
   */
  update(ns) {
    this.server = ns.getServer(this.name);
    this.ramAvailable = this.server.maxRam - this.server.ramUsed;
    this.moneyPercent =
      (this.server.moneyAvailable / this.server.moneyMax) * 100;
    this.deltaSecurity = this.server.hackDifficulty - this.server.minDifficulty;
    this.load = 100 - (this.ramAvailable / this.server.maxRam) * 100;
    this.hackTime = getTimeInRaster(ns.getHackTime(this.name));
    this.growTime = getTimeInRaster(ns.getGrowTime(this.name));
    this.weakenTime = getTimeInRaster(ns.getWeakenTime(this.name));
    this.farming =
      this.moneyPercent > this.moneyFactor &&
      this.deltaSecurity < this.securityOffset;
    this.cores = this.server.cpuCores;
    this.successChance = ns.hackAnalyzeChance(this.name) * 100;
  }

  /**
   * Try to gain root access to the server.
   * @param {import("..").NS} ns
   * @returns {boolean} True if the unlock was successful.
   */
  getRootAccess(ns) {
    /** open all possible ports if root access is not available */
    if (!this.server.hasAdminRights) {
      /**
       * The number of ports that have been opened.
       * @type {number}
       */
      let openPorts = 0;

      if (ns.fileExists("BruteSSH.exe", "home")) {
        ns.brutessh(this.name);
        openPorts++;
      }
      if (ns.fileExists("FTPCrack.exe", "home")) {
        ns.ftpcrack(this.name);
        openPorts++;
      }
      if (ns.fileExists("relaySMTP.exe", "home")) {
        ns.relaysmtp(this.name);
        openPorts++;
      }
      if (ns.fileExists("HTTPWorm.exe", "home")) {
        ns.httpworm(this.name);
        openPorts++;
      }
      if (ns.fileExists("SQLInject.exe", "home")) {
        ns.sqlinject(this.name);
        openPorts++;
      }

      /** check if enough ports could be opened */
      if (openPorts >= this.server.numOpenPortsRequired) {
        /** get root access */
        ns.nuke(this.name);

        /** update the root access flag */
        this.server.hasAdminRights = true;
      }
    }

    return this.server.hasAdminRights;
  }

  /**
   * Calculate a score value for the server to determine its attractiveness
   * asa a hack target.
   * @param {import("..").NS} ns
   */
  calcScore(ns) {
    /**
     * The score of the server (higher is better).
     * @type {number}
     */
    var score = 0;
    /**
     * The player at his current hack level.
     * @type {import("..").Player}
     */
    var player = ns.getPlayer();

    /** Check if the target can be hacked at all */
    if (
      this.server.requiredHackingSkill <= player.hacking &&
      ns.hackAnalyze(this.name) > 0 &&
      this.server.hasAdminRights
    ) {
      /**
       * A server object that is set to min difficulty to get the weaken time
       * for farming mode.
       * @type {import("..").Server}
       */
      let minSecTarget = ns.getServer(this.name);
      minSecTarget.hackDifficulty = minSecTarget.minDifficulty;

      /** Check if the player has access to Formulas.exe */
      if (ns.fileExists("Formulas.exe", "home")) {
        score =
          minSecTarget.moneyMax /
          ns.formulas.hacking.weakenTime(minSecTarget, player);
        /** Consider the success chance of hacking */
        score *= ns.formulas.hacking.hackChance(minSecTarget, player);
      } else {
        /** If the player does not have access to Formulas.exe a simplified score is used */
        score = this.server.moneyMax / this.server.minDifficulty;
        /** Consider the success chance of hacking */
        score *= this.successChance * 0.01;
      }
    }

    return score;
  }
}
