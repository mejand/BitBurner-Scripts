/**
 * A worm that attempts to spread to conencted servers and
 * performs weaken actions to gain hacking XP.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  ns.disableLog("ALL");
  var host = ns.getHostname();
  var connected = ns.scan();
  var target = "n00dles";
  var script = ns.getScriptName();
  var ram = ns.getScriptRam(script);
  var running = true;

  while (running) {
    ns.clearLog();
    /**
     * If the script runs on the home server it shall only
     * spread to the next servers
     */
    if (host == "home") {
      running = false;
    }
    ns.print("running" + running);
    /** Try to spread to neighbouring servers */
    for (let server of connected) {
      /** Try to get access to the server */
      if (!ns.hasRootAccess(server)) {
        if (ns.fileExists("BruteSSH.exe", "home")) {
          ns.brutessh(server);
        }
        if (ns.fileExists("FTPCrack.exe", "home")) {
          ns.ftpcrack(server);
        }
        if (ns.fileExists("relaySMTP.exe", "home")) {
          ns.relaysmtp(server);
        }
        if (ns.fileExists("HTTPWorm.exe", "home")) {
          ns.httpworm(server);
        }
        if (ns.fileExists("SQLInject.exe", "home")) {
          ns.sqlinject(server);
        }
        /** check if enough ports could be opened */
        if (ns.hasRootAccess(server)) {
          /** get root access */
          ns.nuke(server);
        }
      }
      let success = false;
      /** Copy the worm to the server and start it */
      if (ns.hasRootAccess(server) && !ns.scriptRunning(script, server)) {
        /** Copy the script */
        if (await ns.scp(script, host, server)) {
          /** Start the script with all available threads */
          let threads = Math.floor(ns.getServerMaxRam(server) / ram);
          if (threads > 0) {
            if (ns.exec(script, server, threads) > 0) {
              success = true;
            }
          }
        }
      }
      ns.print("Server" + server);
      ns.print("Access" + ns.hasRootAccess(server));
      ns.print("Script Running" + ns.scriptRunning(script, server));
      ns.print("Script Started" + success);
    }
    if (running) {
      /**
       * Weaken the target server to gain hacking XP without
       * interfering with other hack scripts.
       */
      await ns.weaken(target);
    }
  }
}
