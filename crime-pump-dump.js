"use strict";

/*  ------------------------------------------------------------------------ */
const Promise     = require("bluebird");
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice
require('./settings.js')();
var therocksqv      = require ('./therocksqv.js')
let result          = {};
const functions     = require ('./functions')
require('./crime-exchange.js')();
var algo_namespace  = "crime-pump"
const SLIPPAGE = 0.15
const PROFIT = 0.60

let printUsage = function () {
    log ('Usage: node', process.argv[1],'side (buy or sell)'.cyan,  'exchange'.green, 'symbol'.yellow,'quantity'.magenta, )
    printSupportedExchanges ()
}

let printSupportedExchanges = function () {
    log ('Supported exchanges:', ccxt.exchanges.join (', ').green)
}
//return true if order executed succesful false otherwise
async function createSellOrder(exchange, symbol, type, price, amount) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "createSellOrder started for", symbol,"price", price, "amount", amount)

  var found = true
  var orders

  while (found) {
    try {
      let orderbook = await exchange.fetchOrderBook (symbol)
      let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
      let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
      let bidAmount = orderbook.bids.length ? orderbook.bids[0][1] : undefined
      let askAmount = orderbook.asks.length ? orderbook.asks[0][1] : undefined

      if (bidAmount  > price * (1+ PROFIT)) {
        var marketOrder = await exchange.createOrder (symbol,type, 'sell', amount, price, {'recvWindow': 60000000})
        log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,'market price', { bid, ask, price }, "amount", amount)
        await ccxt.sleep (exchange.rateLimit)
        var ex_id = marketOrder.id
        var ex_info = JSON.stringify(marketOrder.info)
        log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "marketOrder","symbol",symbol,"id", ex_id, "info",ex_info)
        found = false
      } else if (price < bidAmount * (1+ PROFIT)) {
        found = false
        log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "somethings wrong")
      }
    }
    catch (e) {
      log.bright.red (exchange.id,"error checkFillOrder",e.message, "Try to retrieve order list another time", symbol )
      if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[DDoS Protection] ' + e.message)
      } else if (e instanceof ccxt.RequestTimeout) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Request Timeout] ' + e.message)
      } else if (e instanceof ccxt.AuthenticationError) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Authentication Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeNotAvailable) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Exchange Not Available Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeError) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Exchange Error] ' + e.message)
      } else if (e instanceof ccxt.NetworkError) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Network Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidNonce) {
          log.bright.yellow(exchange.id,"error checkFillOrder",'[InvalidNonce Error] ' + e.message)
      } else if (e instanceof ccxt.OrderNotFound) {
          log.bright.yellow(exchange.id,"error checkFillOrder",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
          log.bright.yellow(exchange.id,"error checkFillOrder",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
         log.bright.yellow(exchange.id,"error checkFillOrder",'[InsufficientFunds Error] ' + e.message)
      }
      found = false
      // orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
      // await ccxt.sleep (exchange.rateLimit)
    }
  }
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "checkFillOrder completed for", symbol, "order(",orderid,") closed", (!found))
  return !found;
}
//return true if order executed succesful false otherwise
async function checkFillOrder(exchange ,symbol,orderid,  price) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "checkFillOrder started for", symbol,"order id (buy)", orderid, "price", price)

  var found = true
  var orders

  while (found) {
    try {
      orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
      await ccxt.sleep (exchange.rateLimit)
      found=false
      
    
      for (var j=0;j<orders.length;j++) {
        var order = orders[j]
        if (orderid===order.id ){
          if (DEBUG) {
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order(s) found...still pending")
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.amount", order.amount)
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.cost", order.cost)
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.price", order.price)
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.filled", order.filled)
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.status", order.status)
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.fee", order.fee)
            log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order.side", order.side)
          }
          found=true
          continue;
          
        }
      }
      
    }
    catch (e) {
      log.bright.red (exchange.id,"error checkFillOrder",e.message, "Try to retrieve order list another time", symbol )
      if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[DDoS Protection] ' + e.message)
      } else if (e instanceof ccxt.RequestTimeout) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Request Timeout] ' + e.message)
      } else if (e instanceof ccxt.AuthenticationError) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Authentication Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeNotAvailable) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Exchange Not Available Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeError) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Exchange Error] ' + e.message)
      } else if (e instanceof ccxt.NetworkError) {
          log.bright.yellow (exchange.id,"error checkFillOrder",'[Network Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidNonce) {
          log.bright.yellow(exchange.id,"error checkFillOrder",'[InvalidNonce Error] ' + e.message)
      } else if (e instanceof ccxt.OrderNotFound) {
          log.bright.yellow(exchange.id,"error checkFillOrder",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
          log.bright.yellow(exchange.id,"error checkFillOrder",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
         log.bright.yellow(exchange.id,"error checkFillOrder",'[InsufficientFunds Error] ' + e.message)
      }
      found = false
      // orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
      // await ccxt.sleep (exchange.rateLimit)
    }
  }
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "checkFillOrder completed for", symbol, "order(",orderid,") closed", (!found))
  return !found;
}
async function fetchTicker(exchange, symbol, side, quantity) {
  try {
    var tradingFee_taker  = exchange.fees.trading.taker
    var tradingFee_maker  = exchange.fees.trading.maker
    var type = 'market'
    if (tradingFee_taker === undefined) {
      tradingFee_taker = 0.002 //as defualt
      tradingFee_maker = 0.002 //as default
    }
    if (exchange.id==='cryptopia') {
      type = 'limit'
    }
    log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"trading fee taker", tradingFee_taker.toString().green)
    log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"trading fee maker", tradingFee_maker.toString().green)
    
    var coin = (side==='buy')? symbol.slice(symbol.indexOf('/')+1): symbol.slice(0,symbol.indexOf('/'))
    //results ::=result, master_wallet, quantity
    //var results = await checkBalances(exchange,false, undefined,coin, "100")
    //var quantity = results[2]
    //var quantity = 0.016152
    
    let orderbook = await exchange.fetchOrderBook (symbol)
    let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
    let ask = orderbook.asks.length ? orderbook.asks[4][0] : undefined
    // log(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"SLIPPAGE", SLIPPAGE)
    // let ticker = await exchange.fetchTicker (symbol)
    // log(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"price", SLIPPAGE)
    // let bid = ticker['bid']
    // let ask = ticker['ask']
    // var price = ask

    price = price * (1 - SLIPPAGE)


    var amount = quantity / ask
    amount = amount - (amount * tradingFee_taker)
    let marketOrder={id:1, info:"ciao"}
    //let marketOrder = await exchange.createOrder (symbol,type, 'buy', amount, price, {'recvWindow': 60000000})
    log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,'market price', { bid, ask, price }, "amount", amount)
    await ccxt.sleep (exchange.rateLimit)
    var ex_id = marketOrder.id
    var ex_info = JSON.stringify(marketOrder.info)
    log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "marketOrder","symbol",symbol,"id", ex_id, "info",ex_info)
    var result = true
    if (ex_id!== undefined) {
      result = await checkFillOrder(exchange, symbol,ex_id, price )
    }
    if (!result) {
      log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "pump closed with failure....argh!!!")
      return
    }

    var sellOreder = await putSellOrder(exchange, symbol, price, amount)


    

  } catch (e) {
      log.red(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "error fetchTicker",e)
      if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
          log.bright.yellow (exchange.id,"error fetchTicker",'[DDoS Protection] ' + e.message)
      } else if (e instanceof ccxt.RequestTimeout) {
          log.bright.yellow (exchange.id,"error fetchTicker",'[Request Timeout] ' + e.message)
      } else if (e instanceof ccxt.AuthenticationError) {
          log.bright.yellow (exchange.id,"error fetchTicker",'[Authentication Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeNotAvailable) {
          log.bright.yellow (exchange.id,"error fetchTicker",'[Exchange Not Available Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeError) {
          log.bright.yellow ("error fetchTicker",'[Exchange Error] ' + e.message)
      } else if (e instanceof ccxt.NetworkError) {
          log.bright.yellow (exchange.id,"error fetchTicker",'[Network Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidNonce) {
          log.bright.yellow(exchange.id,"error fetchTicker",'[InvalidNonce Error] ' + e.message)
      } else if (e instanceof ccxt.OrderNotFound) {
          log.bright.yellow(exchange.id,"error fetchTicker",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
          log.bright.yellow(exchange.id,"error fetchTicker",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
         log.bright.yellow(exchange.id,"error fetchTicker",'[InsufficientFunds Error] ' + e.message)
      }
  }
}

;(async function main () {

   // initFile()
    let total = 0
    let missing = 0
    let implemented = 0
    //var baseCoins = [ "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
    var accounts  = require ('./credentials-1.json')
    let exchange
    
    if (process.argv.length > 5) {

      const side  = process.argv[2]
      const exchangeId  = process.argv[3]
      const symbol      = process.argv[4].toUpperCase ()
      const quantity    = process.argv[5]
      log.bright.green(".::CRIME - CLI "+algo_namespace+"::.")
      log.bright("EXCHANGE",exchangeId.green)
      log.bright("SYMBOL/ASSET", symbol.toString().green)
      log.bright("AMOUNT", quantity.toString().green)
      
      exchange = new ccxt[exchangeId] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[exchangeId]))
      
      await fetchTicker (exchange, symbol, side, quantity)

    } else {
      printUsage ()
    }
  }
) ()