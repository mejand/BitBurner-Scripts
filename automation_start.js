/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import(".").NS } ns
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

  // download the necessary scripts from the git repository to get newest versions.
  var url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/spider.js";
  if (await ns.wget(url, "spider.js")) {
    ns.tprint(" ###  Spider Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Spider Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/unlock.js";
  if (await ns.wget(url, "unlock.js")) {
    ns.tprint(" ###  Unlock Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Unlock Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/hacknet.js";
  if (await ns.wget(url, "hacknet.js")) {
    ns.tprint(" ###  Hacknet Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Hacknet Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/server_purchase.js";
  if (await ns.wget(url, "server_purchase.js")) {
    ns.tprint(" ###  Server-Purchase Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Server-Purchase Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/central_hack_control.js";
  if (await ns.wget(url, "central_hack_control.js")) {
    ns.tprint(" ###  Central-Hack-Control Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Central-Hack-Control Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/hack.js";
  if (await ns.wget(url, "hack.js")) {
    ns.tprint(" ###  Hack Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Hack Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/grow.js";
  if (await ns.wget(url, "grow.js")) {
    ns.tprint(" ###  Grow Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Grow Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/weaken.js";
  if (await ns.wget(url, "weaken.js")) {
    ns.tprint(" ###  Weaken Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Weaken Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/find_target.js";
  if (await ns.wget(url, "find_target.js")) {
    ns.tprint(" ###  Find-Target Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Find-Target Download Failed  ###");
  }
  url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/hack_distribution.js";
  if (await ns.wget(url, "hack_distribution.js")) {
    ns.tprint(" ###  Hack-Distribution Download Successful  ###");
  } else {
    success = false;
    ns.tprint(" ###  Hack-Distribution Download Failed  ###");
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
