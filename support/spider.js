/**
 * Find all servers in the network and write them to a file for use in other scripts. Needs to be called only once per run.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  /**
   * Enable debug logging.
   * @type {boolean}
   */
  var debug = true;
  if (ns.args.length > 0) {
    debug = ns.args[0];
  }

  /**
   * The names of all servers that have already been analyzed.
   * @type {string[]}
   */
  var serversSeen = [ns.getHostname()];

  // delete the network map from file so the newly discovered servers can be added
  ns.clear("network_map.txt");

  // For every server we've seen so far, do a scan
  for (var i = 0; i < serversSeen.length; i++) {
    /**
     * The name of the server that is currently being analyzed.
     * @type {string}
     */
    let serverName = serversSeen[i];

    if (debug) {
      ns.tprint(serverName);
    }

    // append the name of the server to the file
    await ns.write("network_map.txt", serverName + "\r\n", "a");

    /**
     * The names of all servers connected to the server currently being analyzed.
     * @type {string[]}
     */
    let serversConnected = ns.scan(serverName);

    // Loop through the connected servers and add any new servers
    for (var j = 0; j < serversConnected.length; j++) {
      // If this server isn't in serversSeen, add it
      if (serversSeen.indexOf(serversConnected[j]) === -1) {
        serversSeen.push(serversConnected[j]);
      }
    }
  }
}
