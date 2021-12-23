/**
 * Download the startup script from github and run it.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * The url to the automated start up script.
   * @type {string}
   */
  var url =
    "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/automation_start.js";

  /**
   * Download was successful.
   * @type {boolean}
   */
  var success = await ns.wget(url, "start_automation.js", "home");

  // inform the user about the success or failure and start the startup script
  if (success) {
    ns.tprint("#### Startup Script download successful ####");
    ns.exec("automation_start.js", "home", 1, false);
  } else {
    ns.alert("#### Download of Startup Script failed ####");
  }
}
