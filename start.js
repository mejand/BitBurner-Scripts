/**
 * Download the startup script from github and run it.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // download the file from github
    var success = await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/start_automation.js", "start_automation.js");

    // inform the user about the success or failure and start the startup script
    if (success) {
        ns.tprint("#### Startup Script download successful ####");
        ns.spawn("start_automation.js", 1);
    } else {
        ns.alert("#### Download of Startup Script failed ####");
    }
}