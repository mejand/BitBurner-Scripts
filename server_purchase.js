/**
 * Handle the automatic buying of servers.
 * @param {import(".").NS } ns
 */
export async function main(ns) {
  // get the arguments or use the default values
  var period = 10000;
  if (ns.args.length > 0 && typeof (ns.args[0] == "number")) {
    period = ns.args[0];
  }
  var min_ram_level = 1;
  if (ns.args.length > 1 && typeof (ns.args[1] == "number")) {
    min_ram_level = ns.args[1];
    // limit the ram level to the maximum possible
    min_ram_level = Math.min(
      min_ram_level,
      Math.sqrt(ns.getPurchasedServerMaxRam())
    );
  }
  var max_money_factor = 0.25;
  if (ns.args.length > 2 && typeof (ns.args[2] == "number")) {
    max_money = ns.args[2];
  }
  var debug = true;
  if (ns.args.length > 3 && typeof (ns.args[3] == "boolean")) {
    debug = ns.args[3];
  }

  // define the variables for the script
  var max_money = ns.getServerMoneyAvailable("home") * max_money_factor;
  var ram = 2;
  var min_ram = 2 ** min_ram_level;
  var i = 1;
  var servers = ns.getPurchasedServers();

  // start the loop to periodically try to purchase a server
  while (true) {
    // get the current player money
    max_money = ns.getServerMoneyAvailable("home") * max_money_factor;
    // find the maximum affordable ram based on the available money
    while (
      ns.getPurchasedServerCost(ram) < max_money &&
      ram < ns.getPurchasedServerMaxRam()
    ) {
      i++;
      ram = 2 ** i;
    }
    // iterate through all currently purchased servers and delet any that are below the minimum ram
    for (let server of servers) {
      if (ns.getServerMaxRam(server) < min_ram) {
        ns.killall(server);
        ns.deleteServer(server);
        ns.tprint(server + " - deleted");
      }
    }
    // update the array of purchased servers
    servers = ns.getPurchasedServers();
    // check if the resulting ram is above the minimum desired threshold
    if (i > min_ram_level) {
      // go back one ram step since that was the last one below the money threshold
      ram = 2 ** (i - 1);
      // check if another server can be purchased
      if (servers.length < ns.getPurchasedServerLimit()) {
        // double check if a new server can be afforded
        if (
          ns.getPurchasedServerCost(ram) <= ns.getServerMoneyAvailable("home")
        ) {
          // buy the new server and store its name
          var new_server = ns.purchaseServer("basic-hack-server", ram);
          // print the name for debugging purposes
          if (debug) {
            ns.tprint("bought " + new_server + " - " + ram + "GB");
          }
        }
      }
    }
    await ns.sleep(period);
  }
}
