/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
    // define the wait time between starting the individual scripts
    var wait_time = 500;

    // find all script files on the home server and delete them to remove old files
    var files = ns.ls("home", ".ns");
    files.concat(ns.ls("home", ".js"));
    // loop through the files and delete everything except the start up scripts
    for (let file of files) {
        if (file != "start.js" && file != "start_automation.js") {
            ns.rm(file, "home");
        }
    }
    ns.tprint(" #### Files Deleted ####");
    await ns.sleep(wait_time);

    // download the necessary scripts from the git repository to get newest versions.
    var success = true;
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/spider.js", "spider.js")) {
        ns.tprint(" ###  Spider Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Spider Download Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/unlock.js", "unlock.js")) {
        ns.tprint(" ###  Unlock Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Unlock Download Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/hacknet.js", "hacknet.js")) {
        ns.tprint(" ###  Hacknet Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Hacknet Download Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/server_purchase.js", "server_purchase.js")) {
        ns.tprint(" ###  Server-Purchase Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Server-Purchase Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/central_hack_control.js", "central_hack_control.js")) {
        ns.tprint(" ###  Central-Hack-Control Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Central-Hack-Control Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/hack.js", "hack.js")) {
        ns.tprint(" ###  Hack Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Hack Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/grow.js", "grow.js")) {
        ns.tprint(" ###  Grow Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Grow Failed  ###");
    }
    if (await ns.wget("https://github.com/mejand/BitBurner-Scripts/blob/main/weaken.js", "weaken.js")) {
        ns.tprint(" ###  Weaken Download Successful  ###");
    } else {
        success = false;
        ns.tprint(" ###  Weaken Failed  ###");
    }
    await ns.sleep(wait_time);

    if (success) {
        // call the spider script to populate the network map
        ns.run("spider.js", 1, false);
        ns.tprint(" #### Network Mapped ####");
        await ns.sleep(wait_time);

        // start the unlock script with a 10 second period and debugging off
        ns.run("unlock.js", 1, 10000, false);
        ns.tprint(" #### Server Unlocking Started ####");
        await ns.sleep(wait_time);

        // start the hacknet control script with a 1 second period, a 30% budget and debugging off
        ns.run("hacknet.js", 1, 1000, 0.3, false);
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