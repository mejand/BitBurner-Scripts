import { setNetworkMap } from "./utilCom.js";

/**
 * Find all servers in the network and write them to a file for use in other scripts. Needs to be called only once per run.
 * Servers purchased by the player are not included since they are not useful targets.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  /**
   * The names of all servers that have already been analyzed. Can contain purchased servers.
   * @type {string[]}
   */
  var networkMapRaw = [ns.getHostname()];
  /**
   * The names of all servers that have already been analyzed.
   * @type {string[]}
   */
  var networkMap = [];

  // For every server we've seen so far, do a scan
  for (var i = 0; i < networkMapRaw.length; i++) {
    /**
     * The name of the server that is currently being analyzed.
     * @type {string}
     */
    let serverName = networkMapRaw[i];
    /**
     * The names of all servers connected to the server currently being analyzed.
     * @type {string[]}
     */
    let serversConnected = ns.scan(serverName);

    /** Loop through the connected servers and add any new servers */
    for (var j = 0; j < serversConnected.length; j++) {
      /** If this server isn't in the network map, add it */
      if (networkMapRaw.indexOf(serversConnected[j]) === -1) {
        networkMapRaw.push(serversConnected[j]);
      }
    }
  }

  /** Remove the purchased servers from the list */
  for (let name of networkMapRaw) {
    if (!name.includes("owned-server")) {
      networkMap.push(name);
    }
  }

  /** Save the sanitized network map */
  await setNetworkMap(ns, networkMap);
}
