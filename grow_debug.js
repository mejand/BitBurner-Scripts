/**
 * Run a single groe operation and print the result for debugging.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * The name of the target server.
   * @type {string}
   */
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof ns.args[0] == "string") {
    targetName = ns.args[0];
  }

  /**
   * The time at which the script shall start its execution.
   * @type {number}
   */
  var targetTime = 0;
  if (ns.args.length > 1 && typeof ns.args[1] == "number") {
    targetTime = ns.args[1];
  }

  /**
   * The ID of the script instance.
   * @type {number}
   */
  var id = 0;
  if (ns.args.length > 2 && typeof ns.args[2] == "number") {
    id = ns.args[2];
  }

  /**
   * The script is waiting for the right time to start its operation.
   * @type {boolean}
   */
  var running = true;

  /**
   * Keep looping until the execution start time has arrived
   */
  while (running) {
    if (ns.getTimeSinceLastAug() >= targetTime) {
      // stop the while loop
      running = false;

      // start the actual operation of the script
      await ns.grow(targetName);

      /**
       * Print debug information
       */

      /**
       * The time at which grow finished.
       * @type {string}
       */
      let timeStampEnd = ns.tFormat(ns.getTimeSinceLastAug(), true);

      /**
       * The percentage of the maximum money currently on the target server.
       * @type {number}
       */
      let money =
        ns.getServerMoneyAvailable(targetName) /
        ns.getServerMaxMoney(targetName);

      /**
       * The difference between current security and minimum security on the target server.
       * @type {number}
       */
      let security =
        ns.getServerSecurityLevel(targetName) -
        ns.getServerMinSecurityLevel(targetName);

      // print the result to the terminal
      ns.tprint(
        ns.sprintf(
          "  ||Grow Finished   | ID: %3i | Money: %3.1f | Security: %3.1f | Time: %s ||",
          id,
          money,
          security,
          timeStampEnd
        )
      );
    } else {
      /**
       * If the time is not right yet wait for the next 200ms step
       */
      await ns.sleep(200);
    }
  }
}
