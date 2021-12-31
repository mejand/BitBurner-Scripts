/**
 * Convert a time in milliseconds to 200ms precision.
 * @param {number} time - The time that shall be converted into 200ms steps.
 * @returns {number} The input time converted into 200ms increments.
 */
export function getTimeInRaster(time) {
  /**
   * Note: This method can cause the script to finish 200ms before
   * the target time. This error seems to be random since the same
   * execution time input can lead to both outcomes. Currently there
   * appears to be no way around this and the accuracy of 400ms has to
   * be accounted for in the controller script.
   */

  return Math.ceil(time / 200) * 200;
}

/**
 * The instructions needed to run a hack, grow, weaken cycle against a target server.
 */
export class Batch {
  /**
   * Create an instance of a batch.
   * @param {string} targetName - The name of the target server.
   */
  constructor(targetName) {
    /**
     * The name of the target server.
     * @type {string}
     */
    this.targetName = targetName;
    /**
     * The number of threads dedicated to hacking.
     * @type {number}
     */
    this.hackThreads = 0;
    /**
     * The number of threads dedicated to growing.
     * @type {number}
     */
    this.growThreads = 0;
    /**
     * The number of threads dedicated to weakening.
     * @type {number}
     */
    this.weakenThreads = 0;
    /**
     * The time at which the hack operation shall be finished.
     * @type {number}
     */
    this.hackFinish = 0;
    /**
     * The time at which the grow operation shall be finished.
     * @type {number}
     */
    this.growFinish = 0;
    /**
     * The time at which the weaken operation shall be finished.
     * @type {number}
     */
    this.weakenFinish = 0;
  }

  /**
   * The total number of threads dedicated to this batch.
   * @type {number}
   */
  get totalThreads() {
    return this.hackThreads + this.growThreads + this.weakenThreads;
  }

  /**
   * Print a summary of the batch to the log.
   * @param {import(".").NS} ns
   */
  print(ns) {
    var text = "############## Hack ####### Grow ###### Weaken ###\n";
    text += ns.sprintf(
      "# Threads # %10i # %10i # %10i #\n",
      this.hackThreads,
      this.growThreads,
      this.weakenThreads
    );
    text += ns.sprintf(
      "# Time    # %10i # %10i # %10i #\n",
      this.hackTime,
      this.growTime,
      this.weakenTime
    );
    text += "##################################################";
    ns.print(text);
  }
}
