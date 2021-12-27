/**
 * A class to handle batch creation on a single host server.
 */
export class BatchHandler {
  /**
   * Create an instance of the batch handler.
   * @param {import(".").NS} ns
   * @param {string} targetName - The name of the target server.
   * @param {string} hostName - The name of the host server.
   * @param {number} batchNumberOffset - The number of batches that have already been created on others hosts.
   * @param {number} hackRam - The amount of ram needed by the hack script.
   * @param {number} growRam - The amount of ram needed by the grow script.
   * @param {number} weakenRam - The amount of ram needed by the weaken script.
   */
  constructor(
    ns,
    targetName,
    hostName,
    batchNumberOffset,
    hackRam,
    growRam,
    weakenRam
  ) {
    /**
     * The server object of the target.
     * @type {import(".").Server}
     */
    this.targetServer = ns.getServer(targetName);

    /**
     * The server object of the host server.
     * @type {import(".").Server}
     */
    this.hostServer = ns.getServer(hostName);

    /**
     * The number of batches that have already been created on others hosts.
     * @type {number}
     */
    this.batchNumberOffset = batchNumberOffset;

    /**
     * The amount of ram needed by the hack script.
     * @type {number}
     */
    this.hackRam = hackRam;

    /**
     * The amount of ram needed by the grow script.
     * @type {number}
     */
    this.growRam = growRam;

    /**
     * The amount of ram needed by the weaken script.
     * @type {number}
     */
    this.weakenRam = weakenRam;

    /**
     * The number of threads dedicated to hacking.
     * @type {number}
     */
    this.hackThreads = 0;

    /**
     * The number of threads needed to compensate the effect of hacking.
     * @type {number}
     */
    this.growThreads = 0;

    /**
     * The number of threads needed to compensate the effect of hacking and growing.
     * @type {number}
     */
    this.weakenThreads = 0;

    /**
     * The amount of time that the execution of hacking is delayed
     * compared to the start of a single batch.
     * @type {number}
     */
    this.hackDelay = 0;

    /**
     * The amount of time that the execution of growing is delayed
     * compared to the start of a single batch.
     * @type {number}
     */
    this.growDelay = 0;

    /**
     * The amount of time that the execution of weakening is delayed
     * compared to the start of a single batch.
     * @type {number}
     */
    this.weakenDelay = 0;

    /**
     * The amount of time it takes to run the hack script.
     * @type {number}
     */
    this.hackTime = ns.getHackTime(hostName);

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    this.growTime = ns.getGrowTime(hostName);

    /**
     * The amount of time it takes to run the grow script.
     * @type {number}
     */
    this.weakenTime = ns.getWeakenTime(hostName);

    /**
     * The amount of time it takes to run a single hack, grow, weaken batch.
     */
    this.batchTime = Math.max(this.hackTime, this.growTime, this.weakenTime);

    /**
     * The amount of ram available on the host server before
     * any scripts are started.
     * @type {number}
     */
    this.availableTotalRam = this.hostServer.maxRam - this.hostServer.ramUsed;

    /**
     * The amount of ram needed to run a single hack, grow, weaken batch.
     * @type {number}
     */
    this.ramPerBatch = 0;

    /**
     * The number of batches that can be run on the host server.
     * @type {number}
     */
    this.batchCount = 0;
  }
}
