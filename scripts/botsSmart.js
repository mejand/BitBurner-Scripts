/**
 * A smart bot that takes its targeting data from a port.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  /**
   * The provided arguments are valid.
   * @type {Boolean}
   */
  var argsValid = true;
  /**
   * The name of the target server.
   * @type {String}
   */
  var targetName = "n00dles";
  if (ns.args.length > 0 && typeof (ns.args[0] == "string")) {
    targetName = ns.args[0];
  } else {
    argsValid = false;
  }
  /**
   * The type of action this script shall perform.
   * @type {String}
   */
  var action = "weaken";
  if (ns.args.length > 1 && typeof (ns.args[1] == "string")) {
    action = ns.args[1];
  } else {
    argsValid = false;
  }
  /**
   * The place this script takes in a multi-batch.
   * @type {Number}
   */
  var position = 0;
  if (ns.args.length > 2 && typeof (ns.args[2] == "number")) {
    position = ns.args[2];
  } else {
    argsValid = false;
  }
  /**
   * The number of threads this script is running with.
   * @type {Number}
   */
  var threads = 0;
  if (ns.args.length > 3 && typeof (ns.args[3] == "number")) {
    threads = ns.args[3];
  } else {
    argsValid = false;
  }

  if (argsValid) {
    while (true) {
      await ns.sleep(200);
    }
  }
}
