/**
 * A class to represent an order for the execution of a script.
 */
class ScriptOrder {
  /**
   * Create an object to represent an order for the execution of a script.
   * @param {number} threads - The number of threads that the script shall be executed with.
   * @param {string} name - The name of the cript that shall be executed.
   * @param {number} delay - The time in ms that the execution of the script shall be delayed.
   * @param {import(".").Server} host - The server that the script shall be executed on.
   * @param {import(".").Server} target - The server that shall be targeted by the script.
   */
  constructor(threads, name, delay, host, target) {
    this.threads = threads;
    this.name = name;
    this.delay = delay;
    this.host = host.hostname;
    this.target = target.hostname;
  }
  /**
   * Execute the order.
   * @param {import(".").NS} ns
   */
  execute(ns) {
    if (this.threads > 0) {
      ns.exec(this.name, this.host, this.threads, this.target, this.delay);
    }
  }
}

/**
 * A class to keep track of the distribution of threads between the hack scripts.
 */
export class OrderDistribution {
  /**
   * Create a class object with a given set of threads for each script.
   * @param {import(".").Server} host - The server that the script shall be executed on.
   * @param {import(".").Server} target - The server that shall be targeted by the script.
   * @param {number} hack - The number of threads dedicated to hacking.
   * @param {number} grow - The number of threads dedicated to growing.
   * @param {number} weaken - The number of threads dedicated to weaken.
   */
  constructor(host, target, hack, grow, weaken) {
    this.hack = new ScriptOrder(hack, "hack.js", 0, host, target);
    this.grow = new ScriptOrder(grow, "grow.js", 0, host, target);
    this.weaken = new ScriptOrder(weaken, "weaken.js", 0, host, target);
  }
  /**
   * Get the sum of all threads.
   * @readonly
   */
  get sum() {
    return this.hack.threads + this.grow.threads + this.weaken.threads;
  }
  /**
   * Get a string that describes the class instance.
   * @param {import(".").NS} ns
   * @returns {string} A description of the class instance.
   */
  description(ns) {
    var description = ns.sprintf(
      "||Hack|%(threads)10i|%(delay)f||Grow|%(threads)10i|%(delay)f||Weaken: %(threads)10i|%(delay)f||",
      this.hack,
      this.hack,
      this.grow,
      this.grow,
      this.weaken,
      this.weaken
    );
    return description;
  }
  /**
   * Execute the saved orders to start the scripts.
   * @param {import(".").NS} ns
   */
  execute(ns) {
    this.hack.execute(ns);
    this.grow.execute(ns);
    this.weaken.execute(ns);
  }
}
