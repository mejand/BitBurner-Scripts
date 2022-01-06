import { setNetworkMap } from "./utilCom.js";

/**
 * Find all servers in the network and write them to a file for use in other scripts. Needs to be called only once per run.
 * Servers purchased by the player are not included since they are not useful targets.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  /**
   * The names of all servers that have already been analyzed.
   * @type {string[]}
   */
  var networkMap = [ns.getHostname()];

  // For every server we've seen so far, do a scan
  for (var i = 0; i < networkMap.length; i++) {
    /**
     * The name of the server that is currently being analyzed.
     * @type {string}
     */
    let serverName = networkMap[i];
    /**
     * The names of all servers connected to the server currently being analyzed.
     * @type {string[]}
     */
    let serversConnected = ns.scan(serverName);

    /** Loop through the connected servers and add any new servers */
    for (var j = 0; j < serversConnected.length; j++) {
      /** If this server isn't in the network map, add it */
      if (networkMap.indexOf(serversConnected[j]) === -1) {
        /** Ensure that purchased servers are not included */
        if (!serversConnected[j].includes("owned-server")) {
          networkMap.push(serversConnected[j]);
        }
      }
    }
  }

  /** Save the network map */
  await setNetworkMap(ns, networkMap);
}
