import { MyServer } from "./utilServer.js";

/**
 * Get a list of all servers in the network.
 * @param {import("..").NS} ns
 * @returns {MyServer[]} A list of all servers in the network.
 */
export function getNetworkMap(ns) {
  /**
   * The rows of network_map.txt
   * @type {string[]}
   */
  var rows = null;
  /**
   * The server objects that are in the network.
   * @type {MyServer[]}
   */
  var servers = [];

  if (ns.fileExists("/servers/MappedServers.txt")) {
    /** Read the contents of the file */
    rows = ns.read("/servers/MappedServers.txt").split("\r\n");

    /** loop through all server names from the file and add them the array */
    for (let row of rows) {
      // Ignore last blank row
      if (row) {
        // add the server name to the list
        servers.push(new MyServer(ns, row));
      }
    }
  }

  return servers;
}

/**
 * Define all servers in the network for use by other functions.
 * @param {import("..").NS} ns
 * @param {string[]} servers - The names of all servers in the network.
 */
export async function setNetworkMap(ns, servers) {
  /** Clear the file before writing to it */
  ns.clear("/servers/MappedServers.txt");

  /** Write all names to file */
  for (let server of servers) {
    /** save the server to file */
    await ns.write("/servers/MappedServers.txt", server + "\r\n", "a");
  }
}

/**
 * Define a list of unlocked servers for other functions to use.
 * @param {import("..").NS} ns
 * @param {MyServer[]} servers - All unlocked servers.
 */
export async function setUnlockedServers(ns, servers) {
  /** Clear the file before writing to it */
  ns.clear("/servers/UnlockedServers.txt");
  for (let server of servers) {
    /** Add the server to the list of unlocked servers if root access is enabled */
    if (server.server.hasAdminRights) {
      /** save the server to file */
      await ns.write("/servers/UnlockedServers.txt", server.name + "\r\n", "a");
    }
  }
}

/**
 * Get a list of all unlocked servers that have free RAM.
 * @param {import("..").NS} ns
 * @returns {MyServer[]} A list of all unlocked servers ready for tasking,
 * sorted by available RAM (highest comes first).
 */
export function getAvailableServers(ns) {
  /**
   * The rows of network_map.txt
   * @type {string[]}
   */
  var rows = null;
  /**
   * The server objects that are in the network.
   * @type {MyServer[]}
   */
  var servers = [];

  if (ns.fileExists("/servers/UnlockedServers.txt")) {
    /** Read the contents of the file */
    rows = ns.read("/servers/UnlockedServers.txt").split("\r\n");

    /** loop through all server names from the file and add them the array */
    for (let row of rows) {
      /** Ignore last blank row */
      if (row) {
        let server = new MyServer(ns, row);
        /** Add the server name to the list if there is ram available */
        if (server.ramAvailable > 0) {
          servers.push(server);
        }
      }
    }
  }

  /** Sort the servers by RAM available */
  servers.sort((a, b) => b.ramAvailable - a.ramAvailable);

  return servers;
}

/**
 * Define the most profitable hack target for use by other functions.
 * @param {import("..").NS} ns
 * @param {MyServer} server - The target server.
 * @returns {string} The name of the server that was acutally set as the target.
 */
export async function setTarget(ns, server) {
  var targetName = "n00dles";
  if (server) {
    targetName = server.name;
  }
  ns.clearPort(1);
  await ns.writePort(1, "n00dles");
  return targetName;
}

/**
 * Get the most profitable hack target.
 * @param {import("..").NS} ns
 * @returns {MyServer | null} The most profitable hack target.
 */
export function getTarget(ns) {
  /**
   * The name read from the port.
   * @type {string}
   */
  var name = ns.peek(1);
  /**
   * The server object corresponding to the name on the port.
   * @type {MyServer | null}
   */
  var server = null;

  if (name && name != "NULL PORT DATA") {
    server = new MyServer(ns, name);
  }

  return server;
}
