import { Stock } from "../utilities/stock.js";
/**
 * Update the information of the stock objects and calculate the total
 * assets available to the player (cash + current value of stocks).
 * @param {NS} ns
 * @param {Stock[]} stocks - An array containing all stocks that are traded on the market.
 * @param {Stock[]} myStocks - An array containing all stocks in the players posession.
 */
function refresh(ns, stocks, myStocks) {
  let corpus = ns.getServerMoneyAvailable("home");
  myStocks.length = 0;
  for (let i = 0; i < stocks.length; i++) {
    let sym = stocks[i].sym;
    stocks[i].price = ns.stock.getPrice(sym);
    stocks[i].shares = ns.stock.getPosition(sym)[0];
    stocks[i].buyPrice = ns.stock.getPosition(sym)[1];
    stocks[i].vol = ns.stock.getVolatility(sym);
    stocks[i].prob = 2 * (ns.stock.getForecast(sym) - 0.5);
    stocks[i].expRet = (stocks[i].vol * stocks[i].prob) / 2;
    corpus += stocks[i].price * stocks[i].shares;
    if (stocks[i].shares > 0) myStocks.push(stocks[i]);
  }
  stocks.sort(function (a, b) {
    return b.expRet - a.expRet;
  });
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
