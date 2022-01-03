/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import("..").NS} ns
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
  await ns.sleep(wait_time);

  /**
   * Downloading of files was successful.
   * @type {boolean}
   */
  var success = true;

  /**
   * The names of all scripts that shall be downloaded.
   * @type {string[]}
   */
  var scripts = [
    "/bots/singleGrow.js",
    "/bots/singleHack.js",
    "/bots/singleWeaken.js",
    "/controllers/singleBatch.js",
    "/support/spider.js",
    "/support/unlock.js",
    "/utilities/batch.js",
    "/utilities/com.js",
    "/utilities/log.js",
    "/utilities/server.js",
    "/utilities/time.js",
  ];

  // download the necessary scripts from the git repository to get newest versions.
  for (let script of scripts) {
    let downloadSuccess = await download(ns, script);
    if (!downloadSuccess) {
      success = false;
    }
  }

  await ns.sleep(wait_time);

  // start running the scripts if all were downloaded successfully.
  if (success) {
    // call the spider script to populate the network map
    ns.run("/support/spider.js", 1);
    ns.tprint("#### Network Mapped ####");
    await ns.sleep(wait_time);

    // start the unlock script with a 10 second period and debugging off
    ns.run("/support/unlock.js", 1, 10000);
    ns.tprint("#### Server Unlocking Started ####");
    await ns.sleep(wait_time);

    // start the centralized hacking control script
    ns.run("/controllers/singleBatch.js", 1);
    ns.tprint("#### Local Hack Control Started ####");
    await ns.sleep(wait_time);
  } else {
    ns.alert("Download of advanced scripts failed");
  }
}

/**
 * Download a script and print the result to the terminal.
 * @param {import("..").NS} ns
 * @param {string} name - The name of the script that shall be downloaded.
 * @returns {boolean} True if the script was successfully downloaded.
 */
async function download(ns, name) {
  /**
   * The base url of the github repository.
   * @type {string}
   */
  var baseUrl =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/";

  /**
   * The download was successful.
   * @type {boolean}
   */
  var success = await ns.wget(baseUrl + name, name);

  if (success) {
    ns.tprint(ns.sprintf("---- %s Download Successful", name));
  } else {
    success = false;
    ns.tprint(ns.sprintf("---- %s Download Failed", name));
  }

  return success;
}
