import { Stock } from "./utilStock.js";
/**
 * Update the information of the stock objects and calculate the total
 * assets available to the player (cash + current value of stocks).
 * @param {import("..").NS} ns
 * @param {Stock[]} stocks - An array containing all stocks that are traded on the market.
 * @param {Stock[]} myStocks - An array containing all stocks in the players posession.
 * @returns {number} - The value of all assests the player owns (cash plus current value of
 * shares).
 */
function refresh(ns, stocks, myStocks) {
  /**
   * The value of all assests the player owns (cash plus current value of
   * shares).
   * @type {number}
   */
  let corpus = ns.getServerMoneyAvailable("home");

  /** Reset the owned stocks before updating them */
  myStocks.length = 0;

  for (let stock of stocks) {
    /** Get the current data */
    stock.update(ns);
    /** Add the stock to the owned array if necessary */
    if (stock.shares > 0) {
      myStocks.push(stock);
    }
  }
  /** Sort the stocks buy expected returns (highest first) */
  stocks.sort(function (a, b) {
    return b.expectedReturn - a.expectedReturn;
  });
  /** Return the total value of player assets */
  return corpus;
}

/**
 * Buy and sell stocks to gain money.
 * @param {import("..").NS} ns
 */
export async function main(ns) {
  /**
   * Minimum fraction of assets to keep as cash in hand.
   * @type {number}
   */
  var fracL = 0.1;
  /**
   * Maximum fraction of assets to keep as cash in hand.
   * @type {number}
   */
  var fracH = 0.2;
  /**
   * The number of cycles between executions of the script.
   * Each cycle is 5 seconds long.
   */
  var numCycles = 2;
  /**
   * All tradeable stocks.
   * @type {Stock[]}
   */
  var stocks = [];
  /**
   * All stocks the player owns shares in.
   * @type {Stock[]}
   */
  var myStocks = [];
  /**
   * The value of all assests the player owns (cash plus current value of
   * shares).
   * @type {number}
   */
  var corpus = 0;

  ns.disableLog("ALL");

  /** Get all stocks that can be traded */
  for (let sym of ns.stock.getSymbols()) {
    stocks.push(new Stock(ns, sym));
  }

  while (true) {
    /** Update the data */
    corpus = refresh(ns, stocks, myStocks);

    /** Sell underperforming shares */
    for (let myStock of myStocks) {
      if (stocks[0].expectedReturn > myStock.expectedReturn) {
        myStock.sell(ns, myStock.shares);
        corpus -= Stock.commission;
      }
    }

    /** Sell shares if not enough cash in hand */
    for (let myStock of myStocks) {
      if (ns.getServerMoneyAvailable("home") < fracL * corpus) {
        let cashNeeded =
          corpus * fracH -
          ns.getServerMoneyAvailable("home") +
          Stock.commission;
        let numShares = Math.floor(cashNeeded / myStock.price);
        myStock.sell(ns, numShares);
        corpus -= Stock.commission;
      }
    }

    /** Buy shares with cash remaining in hand */
    let cashToSpend = ns.getServerMoneyAvailable("home") - fracH * corpus;
    let numShares = Math.floor(
      (cashToSpend - Stock.commission) / stocks[0].price
    );
    numShares = Math.min(numShares, stocks[0].sharesAvailable);

    /** Only buy if the price can be recovered within the next cycles */
    if (
      numShares * stocks[0].expectedReturn * stocks[0].price * numCycles >
      Stock.commission
    ) {
      stocks[0].buy(ns, numShares);
    }

    await ns.sleep(5 * 1000 * numCycles + 200);
  }
}
