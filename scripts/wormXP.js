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
    /** Copy the worm to the server and start it */
    if (ns.hasRootAccess(server) && !ns.fileExists(script, server)) {
      /** Copy the script */
      if (await ns.scp(script, host, server)) {
        /** Start the script with all available threads */
        let threads = Math.floor(ns.getServerMaxRam(server) / ram);
        if (threads > 0) {
          ns.exec(script, server, threads);
        }
      }
    }
  }
}
