/**
 * A custom server object providing commonly used information.
 */
export class MyServer {
  /**
   * Create a custom server object for the given server name.
   * @param {import("..").NS} ns
   * @param {string} name - The name of the server.
   * @param {number} scriptRam - The amount of RAM needed to run any bot script.
   * @param {number} moneyFactor - If the available money is below this fraction of the
   * available money preparation is recommended before farming.
   * @param {number} securityOffset - If the difference between current and minimum
   * security is above this threshold preparation is recommended before farming.
   */
  constructor(ns, name, scriptRam = 2, moneyFactor = 0.9, securityOffset = 1) {
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
     * The amount of ram needed to run any bot script.
     * @type {number}
     */
    this.scriptRam = scriptRam;
    /**
     * The amount of RAM currently available on the server.
     * @type {number}
     */
    this.ramAvailable = server.ramMax - server.ramUsed;
    /**
     * The number of threads currently available on the server.
     * @type {number}
     */
    this.threadsAvailable = Math.floor(this.ramAvailable / scriptRam);
    /**
     * The maximum number of threads available on the server.
     * @type {number}
     */
    this.threadsMax = Math.floor(server.ramMax / scriptRam);
    /**
     * The percentage of the maximum money currently on the server.
     * @type {number}
     */
    this.moneyPercent = (server.moneyAvailable / server.moneyMax) * 100;
    /**
     * The difference between current and minimum security.
     * @type {number}
     */
    this.deltaSecurity = server.hackDifficulty - server.minDifficulty;
    /**
     * The current loading of the server.
     */
    this.load = (this.threadsAvailable / this.threadsMax) * 100;
    /**
     * The time it takes to hack the server.
     * @type {number}
     */
    this.hackTime = ns.getHackTime(this.name);
    /**
     * The time it takes to grow the server.
     * @type {number}
     */
    this.growTime = ns.getGrowTime(this.name);
    /**
     * The time it takes to weaken the server.
     * @type {number}
     */
    this.weakenTime = ns.getWeakenTime(this.name);
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
      this.moneyPercent < this.moneyFactor ||
      this.deltaSecurity > this.securityOffset;
    /**
     * The number of CPU cores available on the server.
     * @type {number}
     */
    this.cores = server.cpuCores;
  }

  /**
   * Update the server information.
   * @param {import("..").NS} ns
   */
  update(ns) {
    /**
     * The server object provided by the game.
     * @type {import("..").NS}
     */
    this.server = ns.getServer(this.name);
    this.ramAvailable = server.ramMax - server.ramUsed;
    this.threadsAvailable = Math.floor(this.ramAvailable / this.scriptRam);
    this.threadsMax = Math.floor(server.ramMax / this.scriptRam);
    this.moneyPercent = (server.moneyAvailable / server.moneyMax) * 100;
    this.deltaSecurity = server.hackDifficulty - server.minDifficulty;
    this.load = (this.threadsAvailable / this.threadsMax) * 100;
    this.hackTime = ns.getHackTime(this.name);
    this.growTime = ns.getGrowTime(this.name);
    this.weakenTime = ns.getWeakenTime(this.name);
    this.farming =
      this.moneyPercent < this.moneyFactor ||
      this.deltaSecurity > this.securityOffset;
    this.cores = server.cpuCores;
  }
}
