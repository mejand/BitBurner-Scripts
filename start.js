/**
 * Download the startup script from github and run it.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // download the file from github
    var url = "https://raw.githubusercontent.com/mejand/BitBurner-Scripts/main/start_automation.js";
    var success = await ns.wget(url, "start_automation.js");

    // inform the user about the success or failure and start the startup script
    if (success) {
        ns.tprint("#### Startup Script download successful ####");
        ns.spawn("start_automation.js", 1, false);
    } else {
        ns.alert("#### Download of Startup Script failed ####");
    }
}