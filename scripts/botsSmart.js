/**
 * A smart bot that takes its targeting data from a port.
 * @param {import("..").NS } ns
 */
export async function main(ns) {
  /**
   * The port used to provide orders.
   * @type {any[]}
   */
  var portOrder = ns.getPortHandle(4);
  /**
   * The port used to keep track of the number of idle scripts.
   * @type {any[]}
   */
  var portIdle = ns.getPortHandle(5);
  /**
   * The current order that can be executed.
   * @type {Order}
   */
  var order = null;
  /**
   * How long the script has been idle;
   * @type {Number}
   */
  var idleCounter = 0;

  /** Register the script as free on start up */
  setIdle(ns, portIdle);

  while (true) {
    /** Try to get an available order (null if none are there) */
    order = getOrder(ns, portOrder);
    /** Grind XP if there is no order and the script has been idle for too long */
    if (!order && idleCounter > 100) {
      order = new Order("n00dles,0,weaken,1");
      order.time = ns.getTimeSinceLastAug() + ns.getWeakenTime("n00dles") + 400;
    }
    /** Try to execute the order if one was retrieved */
    if (order) {
      /** Report that the script is busy */
      setBusy(ns, portIdle);
      /** Reset the idle counter if an action is being executed */
      idleCounter = 0;
      /** Execute the order */
      await executeOrder(ns, order);
      /** Report that the script is idle */
      setIdle(ns, portIdle);
    } else {
      /** Sleep if no order was available */
      await ns.sleep(200);
      idleCounter++;
    }
  }
}

/**
 * Try to get a targting order.
 * @param {import("..").NS} ns
 * @param {any[]} port - The port handler object.
 * @returns {Order | null} An order that needs to be executed or null if
 * no orders are available.
 */
function getOrder(ns, port) {
  /** One thread has to be removed from the order on the port */
  return null;
}
/**
 * Execute a given order.
 * @param {import("..").NS} ns
 * @param {Order} order - The order that shall be executed.
 * @returns {Boolean} True if the order was executed successfully.
 */
async function executeOrder(ns, order) {
  /**
   * Order was successfully executed.
   * @type {Boolean}
   */
  var success = true;
  /**
   * The current time stamp.
   * @type {Number}
   */
  var now = ns.getTimeSinceLastAug();
  /**
   * The time the script needs to sleep to meet the target time.
   * @type {Number}
   */
  var sleep = 0;

  /** Decide which action shall be carried out */
  if (order.type == "hack" && ns.serverExists(order.target)) {
    sleep = order.time - now - ns.getHackTime(order.target);
    if (sleep >= 0) {
      await ns.sleep(sleep);
      await ns.hack(order.target);
    } else {
      /** Sleep if target time was not valid */
      success = false;
      await ns.sleep(200);
    }
  } else if (order.type == "grow" && ns.serverExists(order.target)) {
    sleep = order.time - now - ns.getGrowTime(order.target);
    if (sleep >= 0) {
      await ns.sleep(sleep);
      await ns.grow(order.grow);
    } else {
      /** Sleep if target time was not valid */
      success = false;
      await ns.sleep(200);
    }
  } else if (order.type == "weaken" && ns.serverExists(order.target)) {
    sleep = order.time - now - ns.getWeakenTime(order.target);
    if (sleep >= 0) {
      await ns.sleep(sleep);
      await ns.weaken(order.grow);
    } else {
      /** Sleep if target time was not valid */
      success = false;
      await ns.sleep(200);
    }
  } else {
    /** Sleep if order type or target was not valid */
    success = false;
    await ns.sleep(200);
  }
  return success;
}
/**
 * Report this script as idle.
 * @param {import("..").NS} ns
 * @param {any[]} port - The port object used for communication.
 * @returns {Boolean} True if the idle state was updated.
 */
function setIdle(ns, port) {
  return false;
}
/**
 * Report this script as busy.
 * @param {import("..").NS} ns
 * @param {any[]} port - The port object used for communication.
 * @returns {Boolean} True if the idle state was updated.
 */
function setBusy(ns, port) {
  return false;
}

/**
 * A class that represents and order for hack, grow or weaken.
 */
class Order {
  /**
   * Create an order instance.
   * @param {String} dataRaw - The data retrieved from one index of the port.
   */
  constructor(dataRaw) {
    /**
     * The data extracted from a port seperated into an array.
     * @type {String[]}
     */
    var data = dataRaw.split(",");
    /**
     * The name of the target server.
     * @type {String}
     */
    this.target = data[0];
    /**
     * The time at which the action shall be finished.
     * @type {Number}
     */
    this.time = parseInt(data[1]);
    /**
     * The type of action that shall be executed.
     * @type {String}
     */
    this.type = data[2];
    /**
     * The numer of threads that shall be dedicated to the action.
     * @type {Number}
     */
    this.threads = parseInt(data[3]);
  }
  /**
   * The data of the order in a single string for upload to a port.
   * @type {String}
   */
  get data() {
    /**
     * The data of the instance in a single array.
     * @type {String[]}
     */
    var data = [
      this.target,
      this.time.toString(),
      this.type,
      this.threads.toString,
    ];
    /**
     * The data converted to a single string.
     * @type {String}
     */
    var dataString = data.join(",");
    return dataString;
  }
}
