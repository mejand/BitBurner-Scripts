/**
 * A class to represent an order for the execution of a script.
 */
export class ScriptOrder {
  /**
   * Create an object to represent an order for the execution of a script.
   * @param {number} threads - The number of threads that the script shall be executed with.
   * @param {string} name - The name of the script that shall be executed.
   * @param {number} delay - The time in ms that the execution of the script shall be delayed.
   * @param {import(".").Server} host - The server that the script shall be executed on.
   * @param {import(".").Server} target - The server that shall be targeted by the script.
   */
  constructor(threads, name, delay, host, target) {
    this.threads = threads;
    this.name = name;
    this.delay = delay;
    this.hostName = host.hostname;
    this.targetName = target.hostname;
  }
  /**
   * Execute the order.
   * @param {import(".").NS} ns
   */
  execute(ns) {
    if (this.threads > 0) {
      ns.exec(
        this.name,
        this.hostName,
        this.threads,
        this.targetName,
        this.delay
      );
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
   * Set a new target server.
   * @param {import(".").Server} target - The new target.
   */
  setTarget(target) {
    this.hack.targetName = target.hostname;
    this.grow.targetName = target.hostname;
    this.weaken.targetName = target.hostname;
  }
  /**
   * Set the delay times for the scripts.
   * @param {number} hack - The delay time that shall be set for the hack script.
   * @param {number} grow - The delay time that shall be set for the grow script.
   * @param {number} weaken - The delay time that shall be set for the weaken script.
   */
  setDelay(hack, grow, weaken) {
    this.hack.delay = hack;
    this.grow.delay = grow;
    this.weaken.delay = weaken;
  }
  /**
   * Get a string that describes the class instance.
   * @param {import(".").NS} ns
   * @returns {string} A description of the class instance.
   */
  description(ns) {
    var description = ns.sprintf(
      "||Hack|%(hack.threads)10i|%(hack.delay)f||Grow|%(grow.threads)10i|%(grow.delay)f||Weaken: %(weaken.threads)10i|%(weaken.delay)f||",
      this
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
  /**
   * Reset the threads and delays of all scripts.
   */
  reset() {
    this.hack.threads = 0;
    this.hack.delay = 0;
    this.grow.threads = 0;
    this.grow.delay = 0;
    this.weaken.threads = 0;
    this.weaken.delay = 0;
  }
}
/**
 * A class to handle the distribution and targeting of the hack scripts on a single host server.
 */
export class ScriptHandler {
  /**
   * Create a class object with the given host and target.
   * @param {import(".").NS} ns
   * @param {import(".").Server} host - The server that the script shall be executed on.
   * @param {import(".").Server} target - The server that shall be targeted by the script.
   */
  constructor(ns, host, target) {
    /**
     * @property The server that hosts the hack, grow and weaken scripts.
     */
    this.host = host;
    /**
     * @property The server that hosts the hack, grow and weaken scripts.
     */
    this.targetServer = target;
    /**
     * @property The set of orders that will be executed by the scripts on the host server.
     */
    this.order = new OrderDistribution(host, target, 0, 0, 0);
    /**
     * @property The RAM that is needed to run any of the scripts on the host.
     */
    this.ramScripts = Math.max(
      ns.getScriptRam(this.order.hack.name),
      ns.getScriptRam(this.order.grow.name),
      ns.getScriptRam(this.order.weaken.name)
    );
    /**
     * @property The amount of money that will be stolen per hack.
     */
    this.moneyPerHack =
      ns.hackAnalyze(this.host.hostname) * this.targetServer.moneyAvailable;
    /**
     * @property The multiplicative factor the grow function has to achive to compensate one hack.
     */
    this.growthPerHack = this.moneyPerHack / this.targetServer.moneyAvailable;
    /**
     * @property The multiplicative factor the grow function has to achive to get to maxMoney.
     */
    this.growthToMax =
      this.targetServer.moneyMax / this.targetServer.moneyAvailable;
    /**
     * @property The amount of security the weaken function has to remove to get to minDifficulty.
     */
    this.securityToMin =
      this.targetServer.hackDifficulty - this.targetServer.minDifficulty;
    /**
     * @property The amount of security the weaken function removes per call.
     */
    this.securityPerWeaken = ns.weakenAnalyze(1, this.host.cpuCores);
    /**
     * @property The amount of security the weaken function has to remove to compensate one hack.
     */
    this.securityPerHack = ns.hackAnalyzeSecurity(1);
    /**
     * @property The amount of security the weaken function has to remove to compensate one grow.
     */
    this.securityPerGrow = ns.growthAnalyzeSecurity(1);
    /**
     * @property The time it takes to complete one hack, grow, weaken cycle.
     */
    this.cycleTime = 0;
  }
  /**
   * Set the target.
   * @param {import(".").Server} newTarget - The new target server.
   */
  set target(newTarget) {
    this.targetServer = newTarget;
    this.order.setTarget(newTarget);
  }
  /**
   * Update the class internal orders in preparation of execution.
   * @param {import(".").NS} ns
   */
  update(ns) {
    // reset the order to start with a clean slate
    this.order.reset();
    // update the host and target data
    this.host = ns.getServer(this.host.hostname);
    this.targetServer = ns.getServer(this.targetServer.hostname);
    // calculate how much ram is available on the host
    let ramAvailable = this.host.maxRam - this.host.ramUsed;
    // calculate how many threads are available on the host
    let threadsAvailable = Math.floor(ramAvailable / this.ramScripts);
    // update the host and target dependant values
    this.moneyPerHack =
      ns.hackAnalyze(this.host.hostname) * this.targetServer.moneyAvailable;
    this.growthPerHack = this.moneyPerHack / this.targetServer.moneyAvailable;
    this.growthToMax =
      this.targetServer.moneyMax / this.targetServer.moneyAvailable;
    this.securityToMin =
      this.targetServer.hackDifficulty - this.targetServer.minDifficulty;
    this.securityPerWeaken = ns.weakenAnalyze(1, this.host.cpuCores);
    this.securityPerHack = ns.hackAnalyzeSecurity(1);
    this.securityPerGrow = ns.growthAnalyzeSecurity(1);
    // only continue if there are any threads available
    if (threadsAvailable > 0) {
      // if it is impossible to reach min security and max mone in one cycle than try to grow as much as possible
      let orderNoHack = this.getOrderByHackCount(ns, 0);
      if (orderNoHack.sum >= threadsAvailable) {
        let orderOneGrowth = this.getOrderByGrowthCount(1);
        if (orderOneGrowth.sum >= threadsAvailable) {
          this.order.weaken.threads = threadsAvailable;
        } else {
          // try to find the growth count that will work best
          let search = true;
          let growthCount = 2;
          while (search) {
            let proposedOrder = this.getOrderByGrowthCount(growthCount);
            if (proposedOrder.sum < threadsAvailable) {
              this.order = proposedOrder;
              growthCount++;
            } else {
              search = false;
            }
          }
        }
      } else {
        // search for the best order set that steals all money or uses all available threads
        let search = true;
        let hackThreads = 1;
        while (search) {
          // calculate the proposed order set with the current hack count
          let proposedOrder = this.getOrderByHackCount(ns, hackThreads);
          let threadsToContinue = proposedOrder.sum < threadsAvailable;
          let moneyToContinue =
            this.moneyPerHack * hackThreads < this.targetServer.moneyAvailable;
          if (threadsToContinue && moneyToContinue) {
            // continue the search if the proposed order set does not use all available threads and more money can be stolen
            this.order = proposedOrder;
            hackThreads++;
          } else {
            // stop the search if the proposed order set uses more than the available threads and discard the proposed order set
            search = false;
          }
        }
      }
      // calculate the delay times for each script type
      let hackTime = ns.getHackTime(this.host.hostname);
      let growTime = ns.getGrowTime(this.host.hostname);
      let weakenTime = ns.getWeakenTime(this.host.hostname);
      this.cycleTime = Math.max(hackTime, growTime, weakenTime);
      this.order.weaken.delay = this.cycleTime - weakenTime;
      if (this.order.weaken.delay > 0) {
        this.order.weaken.delay = Math.ceil(this.order.weaken.delay + 5);
        weakenTime += this.order.weaken.delay;
        this.cycleTime += this.order.weaken.delay;
      }
      this.order.grow.delay = Math.max(
        0,
        hackTime + (weakenTime - hackTime) * 0.5 - growTime
      );
      if (this.order.grow.delay > 0) {
        this.order.grow.delay = Math.ceil(this.order.grow.delay);
      }
      // add a small buffer to the cycle timer to ensure that all scripts are really finished
      this.cycleTime += 5;
    }
  }
  /**
   * Execute the queued orders.
   * @param {import(".").NS} ns
   */
  execute(ns) {
    this.order.execute(ns);
  }
  /**
   * Get an order set that is needed to sustain the given number of hacking threads.
   * @param {import(".").NS} ns
   * @param {number} hackThreads - The number of threads that shall be dedicated to hacking.
   * @returns {OrderDistribution} The set of orders needed to sustain the given hacking thread count.
   */
  getOrderByHackCount(ns, hackThreads) {
    let result = new OrderDistribution(
      this.host,
      this.targetServer,
      hackThreads,
      0,
      0
    );
    // calculate how many growing threads are needed to support the hacking and reach max money
    result.grow.threads = Math.ceil(
      ns.growthAnalyze(
        this.host.hostname,
        this.growthToMax + this.growthPerHack * hackThreads,
        this.host.cpuCores
      )
    );
    // calculate how many weakening cycles are needed to support the hacking, growing and reach min security
    result.weaken.threads = Math.ceil(
      (this.securityToMin +
        this.securityPerHack * hackThreads +
        this.securityPerGrow * result.grow.threads) /
        this.securityPerWeaken
    );
    // return the resulting order set
    return result;
  }
  /**
   * Get an order set that is needed to sustain the given number of growing threads with 0 hacking.
   * @param {import(".").NS} ns
   * @param {number} growthThreads - The number of threads that shall be dedicated to growing.
   * @returns {OrderDistribution} The set of orders needed to sustain the given growing thread count.
   */
  getOrderByGrowthCount(growthThreads) {
    let result = new OrderDistribution(
      this.host,
      this.targetServer,
      0,
      growthThreads,
      0
    );
    // calculate how many weakening cycles are needed to support the hacking, growing and reach min security
    result.weaken.threads = Math.ceil(
      (this.securityToMin + this.securityPerGrow * result.grow.threads) /
        this.securityPerWeaken
    );
    // return the resulting order set
    return result;
  }
}
