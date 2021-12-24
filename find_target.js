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
      score = server.moneyMax / server.minDifficulty;
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
