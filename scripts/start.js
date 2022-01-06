/**
 * Download the startup script from github and run it.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  /**
   * The wait time between each step in the start up sequence.
   * @type {number}
   */
  var wait_time = 400;

  /** Call the spider script to populate the network map */
  ns.run("supSpider.js", 1);
  ns.tprint("####       Network Mapped       ####");
  await ns.sleep(wait_time);

  /** Start the unlock script with a 10 second period */
  ns.run("supUnlock.js", 1, 10000);
  ns.tprint("####  Server Unlocking Started  ####");
  await ns.sleep(wait_time);

  /** Start the target finding script */
  ns.run("supTarget.js", 1);
  ns.tprint("####  Target Finding Started  ####");
  await ns.sleep(wait_time);

  /** Start the hacknet script with a 1 second period and 50% budget */
  ns.run("supHacknet.js", 1, 1000, 0.5);
  ns.tprint("#### Hacknet Management Started ####");
  await ns.sleep(wait_time);

  if (ns.getServerMaxRam("home") >= 128) {
    /** Start the centralized hacking control script */
    ns.run("stckContLong.js", 1);
    ns.tprint("####   Stock Control Started    ####");
    await ns.sleep(wait_time);
  }

  /** Start the centralized hacking control script */
  ns.run("ctrlSingleBatch.js", 1);
  ns.tprint("#### Local Hack Control Started ####");
}
