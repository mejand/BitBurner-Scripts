/** @param {import(".").NS } ns */

/**
 * Handle the start up of control scripts on the home server at the beginning of a run.
 * @param {interface} ns 
 */
export async function main(ns) {
    // download the necessary scripts from the git repository to get newest versions.

    // call the spider script to populate the network map
    ns.run("spider.ns", 1, false);
    ns.tprint(" #### Network Mapped ####");
    await ns.sleep(100);

    // start the unlock script with a 10 second period and debugging off
    ns.run("unlock.ns", 1, 10000, false);
    ns.tprint(" #### Server Unlocking Started ####");
    await ns.sleep(100);

    // start the hacknet control script with a 1 second period, a 30% budget and debugging off
    ns.run("hacknet.ns", 1, 1000, 0.3, false);
    ns.tprint(" #### Hacknet Upgrading Started ####");
    await ns.sleep(100);

    // start the server purchase script with a 10 second period and debugging off
    ns.run("server-purchase.ns", 1, 10000, 10, 0.75, false);
    ns.tprint(" #### Hacknet Upgrading Started ####");
    await ns.sleep(100);

    // start the centralized hacking control script
    ns.run("central-hack-control.ns", 1, false);
    ns.tprint(" #### Central Hack Control Started ####");
    await ns.sleep(100);
}