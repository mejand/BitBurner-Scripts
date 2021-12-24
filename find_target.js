/**
 * Find the most suitable target.
 * @param {import(".").NS } ns
 * @param {import(".").Server[]} unlockedServers - An array of all currently unlocked servers.
 * @param {Boolean} debug - A flag that governs if debug messages shall be printed to the terminal.
 * @returns {import(".").Server} The server object of the most suitable target.
 */
export function find_target(ns, unlockedServers, debug = false) {
  /**
   * The target server.
   * @type {import(".").Server}
   */
  var target = ns.getServer("n00dles");

  /**
   * The currently highest score of any server.
   * @type {number}
   */
  var maxScore = target.moneyMax / target.minDifficulty;

  /**
   * The score of the currently inevestigated server.
   * @type {number}
   */
  var score = 0;

  /**
   * The hack lavel of the player.
   * @type {number}
   */
  var playerLevel = ns.getHackingLevel();

  // loop through all unlocked servers and find the one with the highest score
  for (let server of unlockedServers) {
    // check if ther server can be hacked at all
    if (server.requiredHackingSkill <= playerLevel) {
      // calculate the score of the server
      score = getServerScore(ns, server);
      // check if the score is better than the current target
      if (score > maxScore) {
        // update the target if necessary
        maxScore = score;
        target = server;
      }
    }
  }

  // print the new target if debugging is enabled
  if (debug) {
    ns.tprint(
      "#### Best Target: " + target.hostname + " for hacking lvl " + playerLevel
    );
  }

  return target;
}

/**
 * Get the score for a given server (higher score is more desirable).
 * @param {import(".").NS} ns
 * @param {import(".").Server} server - The server for which the score shall be calculated.
 * @returns {number} The score of the server.
 */
function getServerScore(ns, server) {
  /**
   * The amount of money stolen by a single hack.
   * @type {number}
   */
  var moneyPerHack = ns.hackAnalyze(server.hostname) * server.moneyMax;

  /**
   * The time it takes to complete a hack, grow, weaken cycle.
   * @type {number}
   */
  var cycleTime =
    Math.max(
      ns.getHackTime(server.hostname),
      ns.getGrowTime(server.hostname),
      ns.getWeakenTime(server.hostname)
    ) + 50;

  /**
   * The money per second of a hack, grow, weaken batch with 1 hack thread.
   * @type {number}
   */
  // cycle time can not be 0 because of 50ms offset
  var moneyPerSecondBatch = moneyPerHack / cycleTime;

  return moneyPerSecondBatch;
}
