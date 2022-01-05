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
  // call the spider script to populate the network map
  ns.run("/support/spider.js", 1);
  ns.tprint("####       Network Mapped       ####");
  await ns.sleep(wait_time);

  // start the unlock script with a 10 second period and debugging off
  ns.run("/support/unlock.js", 1, 10000);
  ns.tprint("####  Server Unlocking Started  ####");
  await ns.sleep(wait_time);

  // start the hacknet script with a 1 second period and 50 budget
  ns.run("/support/hacknet.js", 1, 1000, 0.5, false);
  ns.tprint("#### Hacknet Management Started ####");
  await ns.sleep(wait_time);

  // start the centralized hacking control script
  ns.run("/controllers/singleBatch.js", 1);
  ns.tprint("#### Local Hack Control Started ####");
  await ns.sleep(wait_time);

  // start the centralized hacking control script
  ns.run("/stocks/contLong.js", 1);
  ns.tprint("####   Stock Control Started    ####");
}
