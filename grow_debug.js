/**
 * Run a single grow operation and print the result for debugging.
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
   * The delay time before the operation starts.
   */
  var delay = 0;
  if (ns.args.length > 1 && typeof ns.args[1] == "number") {
    delay = ns.args[1];
  }

  /**
   * The ID of the script instance.
   * @type {number}
   */
  var id = 0;
  if (ns.args.length > 2 && typeof ns.args[2] == "number") {
    id = ns.args[2];
  }

  if (delay > 0) {
    await ns.sleep(delay);
  }

  await ns.grow(targetName);

  /**
   * The time at which grow finished.
   * @type {string}
   */
  var timeStampEnd = ns.tFormat(ns.getTimeSinceLastAug(), true);

  /**
   * The percentage of the maximum money currently on the target server.
   * @type {number}
   */
  var money =
    ns.getServerMoneyAvailable(targetName) / ns.getServerMaxMoney(targetName);

  /**
   * The difference between current security and minimum security on the target server.
   * @type {number}
   */
  var security =
    ns.getServerRequiredHackingLevel(targetName) -
    ns.getServerMinSecurityLevel(targetName);

  // print the result to the terminal
  ns.tprint(
    ns.sprintf(
      "||Hack Finished   | ID: %3i | Money: %3.1f | Security: %3.1f | Time: %s ||",
      id,
      money,
      security,
      timeStampEnd
    )
  );
}
