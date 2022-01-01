import { MyServer } from "./server.js";

/**
 * Get a list of all servers in the network.
 * @param {import("..").NS} ns
 */
export function getNetworkMap(ns) {
  /**
   * The rows of network_map.txt
   * @type {string[]}
   */
  var rows = ns.read("network_map.txt").split("\r\n");
  /**
   * The server objects that are in the network.
   * @type {MyServer[]}
   */
  var servers = [];

  /** loop through all server names from the file and add them the array */
  for (let row of rows) {
    // Ignore last blank row
    if (row) {
      // add the server name to the list
      servers.push(new MyServer(ns, row));
    }
  }

  return servers;
}
