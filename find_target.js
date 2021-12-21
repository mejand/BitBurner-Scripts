/**
 * Find the most suitable target.
 * @param {import(".").NS } ns
 * @param {Array} unlocked_servers - An array of all currently unlocked servers.
 * @param {Boolean} debug - A flag that governs if debug messages shall be printed to the terminal.
 * @returns {import(".").Server} The server object of the most suitable target.
 */
export async function find_target(ns, unlocked_servers, debug = false) {
    // define the default target
    var target = ns.getServer("n00dles");

    // define the values needed for the search
    var max_score = 0;
    var score = 0;
    var player_level = ns.getHackingLevel();

    // loop through all unlocked servers and find the one with the highest score
    for (let server of unlocked_servers) {
        // check if ther server can be hacked at all
        if (server.requiredHackingSkill <= player_level) {
            // calculate the score of the server
            score = server.moneyMax / server.minDifficulty;
            // check if the score is better than the current target
            if (score > max_score) {
                // update the target if necessary
                max_score = score;
                target = server;
            }
        }
    }
    // print the new target if debugging is enabled
    if (debug) {
        ns.tprint("#### Best Target: " + target.hostname);
    }
    return target;
}