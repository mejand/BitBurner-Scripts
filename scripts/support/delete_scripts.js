/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import("../..").NS} ns
 */
export async function main(ns) {
  /**
   * Use debug logging.
   * @type {boolean}
   */
  var debug = true;
  if (ns.args.length > 0 && typeof (ns.args[0] == "boolean")) {
    debug = ns.args[0];
  }
  /**
   * The wait time between each step in the start up sequence.
   * @type {number}
   */
  var wait_time = 400;
  /**
   * All files present on the host server.
   * @type {string[]}
   */
  var files = ns.ls("home", ".ns").concat(ns.ls("home", ".js"));

  // loop through the files and delete everything except the start up scripts
  for (let file of files) {
    if (file != "start.js" && file != "automation_start.js") {
      // try to kill the script to clear the memory on the home server
      ns.scriptKill(file, "home");

      // delete the file from the home server
      ns.rm(file, "home");

      // print information about the deleted files to the terminal if debugging is enabled
      if (debug) {
        ns.tprint("Deleted " + file);
      }
    }
  }

  ns.tprint("#### Files Deleted ####");
}
