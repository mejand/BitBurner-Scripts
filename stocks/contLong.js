import { Stock } from "../utilities/stock.js";
/**
 * Update the information of the stock objects and calculate the total
 * assets available to the player (cash + current value of stocks).
 * @param {NS} ns
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
  myStocks = [];

  for (let stock of stocks) {
    /** Get the current data */
    stock.update(ns);
    /** Add the stock to the owned array if necessary */
    if (stock.shares > 0) {
      myStocks.push(stocks[i]);
    }
  }
  /** Sort the stocks buy expected returns (highest first) */
  stocks.sort(function (a, b) {
    return b.expRet - a.expRet;
  });
  /** Return the total value of player assets */
  return corpus;
}

/** @param {NS} ns **/
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
  //Initialise
  ns.disableLog("ALL");
  let stocks = [];
  let myStocks = [];
  let corpus = 0;
  for (let i = 0; i < ns.stock.getSymbols().length; i++)
    stocks.push({ sym: ns.stock.getSymbols()[i] });
  while (true) {
    corpus = refresh(ns, stocks, myStocks);
    //Sell underperforming shares
    for (let i = 0; i < myStocks.length; i++) {
      if (stocks[0].expRet > myStocks[i].expRet) {
        sell(ns, myStocks[i], myStocks[i].shares);
        corpus -= commission;
      }
    }
    //Sell shares if not enough cash in hand
    for (let i = 0; i < myStocks.length; i++) {
      if (ns.getServerMoneyAvailable("home") < fracL * corpus) {
        let cashNeeded =
          corpus * fracH - ns.getServerMoneyAvailable("home") + commission;
        let numShares = Math.floor(cashNeeded / myStocks[i].price);
        sell(ns, myStocks[i], numShares);
        corpus -= commission;
      }
    }
    //Buy shares with cash remaining in hand
    let cashToSpend = ns.getServerMoneyAvailable("home") - fracH * corpus;
    let numShares = Math.floor((cashToSpend - commission) / stocks[0].price);
    if (numShares > ns.stock.getMaxShares(stocks[0].sym))
      numShares = ns.stock.getMaxShares(stocks[0].sym);

    if (numShares * stocks[0].expRet * stocks[0].price * numCycles > commission)
      buy(ns, stocks[0], numShares);
    await ns.sleep(5 * 1000 * numCycles + 200);
  }
}
