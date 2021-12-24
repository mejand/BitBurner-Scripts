/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import(".").NS} ns
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
  var wait_time = 500;

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

  ns.tprint(" #### Files Deleted ####");
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
    "spider.js",
    "unlock.js",
    "hacknet.js",
    "server_purchase.js",
    "central_hack_control.js",
    "hack.js",
    "grow.js",
    "weaken.js",
    "find_target.js",
    "hack_distribution.js",
  ];

  // download the necessary scripts from the git repository to get newest versions.
  for (let script of scripts) {
    if (!download(ns, script)) {
      success = false;
    }
  }

  await ns.sleep(wait_time);

  // start running the scripts if all were downloaded successfully.
  if (success) {
    // call the spider script to populate the network map
    ns.run("spider.js", 1, false);
    ns.tprint(" #### Network Mapped ####");
    await ns.sleep(wait_time);

    // start the unlock script with a 10 second period and debugging off
    ns.run("unlock.js", 1, 10000, false);
    ns.tprint(" #### Server Unlocking Started ####");
    await ns.sleep(wait_time);

    // start the hacknet control script with a 5 second period, a 50% budget and debugging off
    ns.run("hacknet.js", 1, 5000, 0.5, false);
    ns.tprint(" #### Hacknet Upgrading Started ####");
    await ns.sleep(wait_time);

    // start the server purchase script with a 10 second period and debugging off
    ns.run("server_purchase.js", 1, 10000, 10, 0.75, false);
    ns.tprint(" #### Hacknet Upgrading Started ####");
    await ns.sleep(wait_time);

    // start the centralized hacking control script
    ns.run("central_hack_control.js", 1, false);
    ns.tprint(" #### Central Hack Control Started ####");
    await ns.sleep(wait_time);
  } else {
    ns.alert("Download of advanced scripts failed");
  }
}

/**
 * Download a script and print the result to the terminal.
 * @param {import(".").NS} ns
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
    ns.tprint(ns.sprintf("----  %s Download Successful  ----", name));
  } else {
    success = false;
    ns.tprint(ns.sprintf("----  %s Download Failed  ----", name));
  }

  return success;
}
