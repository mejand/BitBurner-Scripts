/**
 * Find all servers in the network and write them to a file for use in other scripts. Needs to be called only once per run.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  // get the arguments the script was called with
  var debug = true;
  if (ns.args.length > 0) {
    debug = ns.args[0];
  }

  // Create a servers_seen array, containing the host server to start with
  var servers_seen = [ns.getHostname()];

  // delete the network map from file so the newly discovered servers can be added
  ns.clear("network_map.txt");

  // For every server we've seen so far, do a scan
  for (var i = 0; i < servers_seen.length; i++) {
    // get the name of the server that is currently under investigation
    var host = servers_seen[i];
    if (debug) {
      ns.tprint(host);
    }
    // write the static information of the server to the file
    await ns.write("network_map.txt", host + "\r\n", "a");
    // get all servers connected to the current server
    var servers_connected = ns.scan(host);
    // Loop through connected servers of the host and add any new servers
    for (var j = 0; j < servers_connected.length; j++) {
      // If this server isn't in servers_seen, add it
      if (servers_seen.indexOf(servers_connected[j]) === -1) {
        servers_seen.push(servers_connected[j]);
      }
    }
  }
}
