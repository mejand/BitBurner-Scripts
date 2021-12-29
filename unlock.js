import { find_target as findTarget } from "./find_target.js";

/**
 * Periodically try to gain root access to all servers in the server_map and save the servers with root access to file.
 * Identify the best target and save it to file.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  /**
   * The time between trying to unlock new servers.
   * @type {number}
   */
  var period = 10000;
  if (ns.args.length > 0 && typeof ns.args[0] == "number") {
    period = ns.args[0];
  }

  /**
   * Enable debug logging.
   * @type {boolean}
   */
  var debug = true;
  if (ns.args.length > 1 && typeof ns.args[1] == "boolean") {
    debug = ns.args[1];
  }

  /**
   * The target server.
   * @type {import(".").Server}
   */
  var target = ns.getServer("n00dles");

  /**
   * All current unlock servers.
   * @type {import(".").Server[]}
   */
  var unlockedServers = [];

  /**
   * The names of all unlocked servers in the network.
   * @type {string[]}
   */
  var serverNamesInNetwork = [];

  /**
   * The rows of network_map.txt
   * @type {string[]}
   */
  var rows = ns.read("network_map.txt").split("\r\n");

  // loop through all server names from the file and add them the array.
  for (let row of rows) {
    // Ignore last blank row
    if (row) {
      // add the server name to the list
      serverNamesInNetwork.push(row);
    }
  }

  // start the loop to periodically try to unlock all servers
  while (true) {
    // clear the file of all old entries and reset the array
    ns.clear("network_unlocked.txt");
    unlockedServers = [];

    // loop through all servers in the network and check if they are unlocked
    for (let serverName of serverNamesInNetwork) {
      /**
       * The object of the server currently being analyzed.
       * @type {import(".").Server}
       */
      let server = ns.getServer(serverName);

      // open all possible ports
      if (!server.hasAdminRights) {
        /**
         * The number of ports that have been opened.
         * @type {number}
         */
        let openPorts = 0;

        if (ns.fileExists("BruteSSH.exe", "home")) {
          ns.brutessh(server.hostname);
          openPorts++;
        }
        if (ns.fileExists("FTPCrack.exe", "home")) {
          ns.ftpcrack(server.hostname);
          openPorts++;
        }
        if (ns.fileExists("relaySMTP.exe", "home")) {
          ns.relaysmtp(server.hostname);
          openPorts++;
        }
        if (ns.fileExists("HTTPWorm.exe", "home")) {
          ns.httpworm(server.hostname);
          openPorts++;
        }
        if (ns.fileExists("SQLInject.exe", "home")) {
          ns.sqlinject(server.hostname);
          openPorts++;
        }

        // check if enough ports could be opened
        if (openPorts >= server.numOpenPortsRequired) {
          // get root access
          ns.nuke(server.hostname);

          // update the root access flag
          server.hasAdminRights = true;

          /**
           * The names of all files on the server.
           * @type {string[]}
           */
          let filesToCopy = ns.ls(server.hostname);

          if (filesToCopy) {
            for (let file of filesToCopy) {
              await ns.scp(file, server.hostname, "home");
            }
          }

          // copy the hack scripts to the server if it has ram available
          if (server.maxRam > 0) {
            // copy the scripts to the server
            await ns.scp("weaken.js", "home", server.hostname);
            await ns.scp("grow.js", "home", server.hostname);
            await ns.scp("hack.js", "home", server.hostname);

            // copy the local control script and start it
            await ns.scp("local_batch_control.js", "home", server.hostname);
            ns.exec("local_batch_control.js", server.hostname, 1, false);
          }
        }
      }

      // add the server to the list of unlocked servers if root access is enabled
      if (server.hasAdminRights) {
        // save the server to file
        await ns.write("network_unlocked.txt", server.hostname + "\r\n", "a");
        // add the server to the unlocked servers list
        unlockedServers.push(server);
      }

      // print to the terminal if debugging is enabled
      if (debug) {
        ns.tprint(server.hostname + " unlocked = " + server.hasAdminRights);
      }
    }

    // re-calculate the target after the unlock attempt
    target = findTarget(ns, unlockedServers, debug);

    // write the current target to port 1
    ns.clearPort(1);
    await ns.writePort(1, target.hostname);

    // wait for the next execution
    await ns.sleep(period);
  }
}
