/**
 * Format an amount of money for better readability.
 * @param {number} num - The amount of money that shall be formatted.
 * @returns {string} The formatted amount of money.
 */
function formatMoney(num) {
  let symbols = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc"];
  let i = 0;
  for (; num >= 1000 && i < symbols.length; i++) num /= 1000;
  return (
    (Math.sign(num) < 0 ? "-$" + (-num).toFixed(3) : "$" + num.toFixed(3)) +
    symbols[i]
  );
}

/**
 * A Stock that is traded on the stock exchange.
 */
export class Stock {
  /**
   * The amount of money that has to paid whenever stocks
   * is bought or sold.
   * @type {number}
   */
  static commission = 100000;
  /**
   * Create an instance of a tradeable stock.
   * @param {import("..").NS} ns
   * @param {string} sym - The symbol of the stock.
   */
  constructor(ns, sym) {
    /**
     * The position of the stock.
     * @type {number[]}
     */
    let position = ns.stock.getPosition(sym);
    /**
     * The symbol of the stock (unique ID).
     * @type {string}
     */
    this.sym = sym;
    /**
     * The current price of a share.
     * @type {number}
     */
    this.price = ns.stock.getPrice(sym);
    /**
     * The number of shares owned by the player.
     * @type {number}
     */
    this.shares = position[0];
    /**
     * The maximum available shares.
     * @type {number}
     */
    this.sharesMax = ns.stock.getMaxShares(sym);
    /**
     * The shares that are available to buy.
     * @type {number}
     */
    this.sharesAvailable = this.sharesMax - this.shares;
    /**
     * The average price the player payed for the shares.
     * @type {number}
     */
    this.buyPrice = position[1];
    /**
     * The percentage that the stock's price can change per cycle.
     * @type {number}
     */
    this.volatility = ns.stock.getVolatility(sym);
    /**
     * The probability that the stocks price will increase in the next cycle.
     * @type {number}
     */
    this.probability = 2 * (ns.stock.getForecast(sym) - 0.5);
    /**
     * The expected return of the stock extrapolated from change probability and
     * volatility.
     * @type {number}
     */
    this.expectedReturn = this.volatility * this.probability * 0.5;
  }
  /**
   * Update the data of the stock.
   * @param {import("..").NS} ns
   */
  update(ns) {
    /**
     * The position of the stock.
     * @type {number[]}
     */
    let position = ns.stock.getPosition(sym);

    this.price = ns.stock.getPrice(sym);
    this.shares = position[0];
    this.sharesMax = ns.stock.getMaxShares(sym);
    this.sharesAvailable = this.sharesMax - this.shares;
    this.buyPrice = position[1];
    this.volatility = ns.stock.getVolatility(sym);
    this.probability = 2 * (ns.stock.getForecast(sym) - 0.5);
    this.expectedReturn = this.volatility * this.probability * 0.5;
  }
  /**
   * Sell a defined number of shares.
   * @param {import("..").NS} ns
   * @param {number} numShares - The numbe rof shares that shall be sold.
   */
  buy(ns, numShares) {
    /** Only buy shares if there are any available */
    if (numShares <= this.sharesAvailable) {
      let price = ns.stock.buy(this.sym, numShares);
      if (price) {
        ns.print(`Bought ${this.sym} for ${formatMoney(numShares * price)}`);
      } else {
        ns.print(`Failed to buy ${numShares} of ${this.sym}`);
      }
    }
  }
  /**
   * Sell a number of shares.
   * @param {import("..").NS} ns
   * @param {number} numShares - The number of shares that shall be sold.
   */
  sell(ns, numShares) {
    /** Only attempt the sale if the player owns the shares */
    if (numShares <= this.shares) {
      /**
       * The amount of money the player earns when selling the stock.
       * The original price for buying the stock and the commission
       * for buying and selling are already subtracted.
       * @type {number}
       */
      let profit =
        numShares * (this.price - this.buyPrice) - 2 * Stock.commission;
      ns.print(`Sold ${this.sym} for profit of ${formatMoney(profit)}`);
      ns.stock.sell(this.sym, numShares);
    }
  }
}
