"use strict";

/*  ------------------------------------------------------------------------ */
const Promise     = require("bluebird");
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice
require('./settings.js')();
var inquirer = require('inquirer');
var therocksqv      = require ('./therocksqv.js')
let result          = {};
const functions     = require ('./functions')
require('./crime-exchange.js')();
var algo_namespace  = "crime-pump"
const SLIPPAGE = 0.30
const PROFIT = 1
var side 
var exchangeId
var symbol
var quantity
let exchange
var markets
var coin_ask ={}, coin_bid={}
var processing = true

var questions = [
  {
      type: 'input',
      name: 'symbol',
      message: 'Which is the cryptomerda to pump?',
      validate: async function(value) {
        var valid = value.length >=2 && isNaN(parseFloat(value));
        if (valid) {
          await pump(value.toUpperCase()+"/BTC");
          return true

        } else {
          return 'Please enter a valid cryptomerda';
        }
        
        
        
        
      }
      
    }
]

let printUsage = function () {
    log ('Usage: node', process.argv[1],'side (buy or sell)'.cyan,  'exchange'.green, 'symbol'.yellow,'quantity'.magenta, )
    printSupportedExchanges ()
}

let printSupportedExchanges = function () {
    log ('Supported exchanges:', ccxt.exchanges.join (', ').green)
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

async function checkTickers(exchange) {
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
    log.bright("aooo")
    var s = await exchange.loadMarkets()
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"symbol",s.green)
    var symbols = exchange.symbols.filter(symbol => symbol.endsWith('BTC'));


    for (var index=0;index<symbols.length;index++) {
      var symbol =symbols[index]
      let ticker = await exchange.fetchTicker (symbol)
      let bid = ticker['bid']
      let ask = ticker['ask']
      var price = ask
      var amount = 0.004500 / ask

      //price = (side==='buy')? price * (1 + SLIPPAGE):price
      //var price = (side==='buy')? orderbook.asks[0][0] : orderbook.bid[0][0]
      // let orderbook = await exchange.fetchOrderBook (symbol)
      // let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
      // let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
      // for (var j =0;j<6; j++ ) {
      //   var priceAsk =  orderbook.asks[j][0]
      //   var amountAsk =  orderbook.asks[j][1]
      //   priceAsk = priceAsk.toFixed (8)
      //   var partialTotalAsk = priceAsk*amountAsk
      //   log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"priceAsk", priceAsk, "amountAsk", amountAsk, "partialTotalAsk", partialTotalAsk)
      // } 
      await ccxt.sleep (exchange.rateLimit)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"symbol",symbol.green, "ask", ask, "bid", bid, "amount", amount, "quantity...")
      

    }

    

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
    // log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"trading fee taker", tradingFee_taker.toString().green)
    // log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"trading fee maker", tradingFee_maker.toString().green)
    
    //var coin = (side==='buy')? symbol.slice(symbol.indexOf('/')+1): symbol.slice(0,symbol.indexOf('/'))
    //results ::=result, master_wallet, quantity
    // var results = await checkBalances(exchange,false, undefined,coin, "100")
    // var quantity = results[2]
    
    // let orderbook = await exchange.fetchOrderBook (symbol)
    // let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
    // let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
    // for (var j =0;j<6; j++ ) {
    //   var priceAsk =  orderbook.asks[j][0]
    //   var amountAsk =  orderbook.asks[j][1]
    //   priceAsk = priceAsk.toFixed (8)
    //   var partialTotalAsk = priceAsk*amountAsk
    //   log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"priceAsk", priceAsk, "amountAsk", amountAsk, "partialTotalAsk", partialTotalAsk)
    
    // }
    //var price = (side==='buy')? orderbook.asks[0][0] : orderbook.bid[0][0]

    let ticker = await exchange.fetchTicker (symbol)
    var  bid
    var  ask 
    var price
    bid = ticker['bid']
    ask = ticker['ask']
    var price = (side==='buy')?ask:bid

    if (exchange.id==='cryptopia') {
      price = (side==='buy')? price * (1 + SLIPPAGE):price
    } 
    
    
    
    var amount = (side==='buy')?(quantity / price):quantity
    amount = (side==='buy')? amount - (amount * tradingFee_taker):amount
    //exchange.verbose = true
    let marketOrder={id:1, info:"ciao"}
    //let marketOrder = await exchange.createOrder (symbol,type, side, amount, price, {'recvWindow': 60000000})
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"price", SLIPPAGE, "quantity", quantity)
    
    log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,'market price', { bid, ask, price }, "amount", amount)
    //await ccxt.sleep (exchange.rateLimit)
    var ex_id = marketOrder.id
    var ex_info = JSON.stringify(marketOrder.info)
    log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "marketOrder","symbol",symbol,"id", ex_id, "info",ex_info )
    var result = true
    if (ex_id!== undefined) {
      result = await checkFillOrder(exchange, symbol,ex_id, price )
    }
    if (!result) {
      log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "pump closed with failure....argh!!!")
      return
    }
    await ccxt.sleep (exchange.rateLimit)

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

async function pump(symbol) {
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
    
    var bid = coin_bid[symbol][exchange.id]
    var ask = coin_ask[symbol][exchange.id]
    var price = (side==='buy')?ask:bid

    if (exchange.id==='cryptopia') {
      price = (side==='buy')? price * (1 + SLIPPAGE):price
    } 
    
    var amount = (side==='buy')?(quantity / price):quantity
    amount = (side==='buy')? amount - (amount * tradingFee_taker):amount
    //exchange.verbose = true
    //let marketOrder={id:1, info:"ciao"}
    let marketOrder = await exchange.createOrder (symbol,type, side, amount, price, {'recvWindow': 60000000})
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"price", SLIPPAGE, "quantity", quantity)
    
    log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,'market price', { bid, ask, price }, "amount", amount)
    //await ccxt.sleep (exchange.rateLimit)
    var ex_id = marketOrder.id
    var ex_info = JSON.stringify(marketOrder.info)
    log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "marketOrder","symbol",symbol,"id", ex_id, "info",ex_info )
    var result = true
    if (ex_id!== undefined) {
      result = await checkFillOrder(exchange, symbol,ex_id, price )
    }
    if (!result) {
      log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "pump closed with failure....argh!!!")
      return
    }
    processing = false
    //await ccxt.sleep (exchange.rateLimit)

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


async function fetch_volumes (exchange, symbol) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchVolumes started", "VOLUME_FILTER", VOLUME_FILTER)
  
      try {
        if ( !exchange.has["fetchTickers"]) {
          for (var x=0;x<markets.length; x++) {
            var asset = markets[x] 
            if (asset.endsWith(symbol) || asset.endsWith('/BTC')) {  //var coinQuote = asset.slice(asset.indexOf("/")+1)
              var ticker = await exchange.fetchTicker(asset);
              await ccxt.sleep ()
              var percentage = ticker['percentage']
              //log("ticker", ticker, "asset", asset)
              if (!coin_ask[asset]) coin_ask[asset] = {};
              if (!coin_bid[asset]) coin_bid[asset] = {};
              coin_ask[asset][exchange.id] = ticker['ask'];
              coin_bid[asset][exchange.id] = ticker['bid'];
            }
            
          }
          
        } else {
          const tickers = await exchange.fetchTickers();
          
          Object.keys (tickers).map (exchangeId => {
              const ticker = tickers[exchangeId]
              const asset = ticker['symbol']
              if (asset.endsWith(symbol)|| asset.endsWith('/BTC') ) {
                const percentage = ticker['percentage']
                if (!coin_ask[asset]) coin_ask[asset] = {};
                if (!coin_bid[asset]) coin_bid[asset] = {};
                coin_ask[asset][exchange.id] = ticker['ask'];
                coin_bid[asset][exchange.id] = ticker['bid'];
                
             }   
          })
        }
        //await ccxt.sleep (120*60)
        if (DEBUG) {
          log.yellow(exchangeid.green,"coin_ask", coin_ask)
          log.yellow(exchangeid.green,"coin_bid", coin_bid)
        }
      } catch (e) {
        log.red(exchange.iso8601 (Date.now ()),exchange.id.green, "error",e)
        if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
            log.bright.yellow (exchange.id,"error ",'[DDoS Protection] ' + e.message)
        } else if (e instanceof ccxt.RequestTimeout) {
            log.bright.yellow (exchange.id,"error ",'[Request Timeout] ' + e.message)
        } else if (e instanceof ccxt.AuthenticationError) {
            log.bright.yellow (exchange.id,"error ",'[Authentication Error] ' + e.message)
        } else if (e instanceof ccxt.ExchangeNotAvailable) {
            log.bright.yellow (exchange.id,"error ",'[Exchange Not Available Error] ' + e.message)
        } else if (e instanceof ccxt.ExchangeError) {
            log.bright.yellow (exchange.id,"error ",'[Exchange Error] ' + e.message)
        } else if (e instanceof ccxt.NetworkError) {
            log.bright.yellow (exchange.id,"error ",'[Network Error] ' + e.message)
        } else if (e instanceof ccxt.InvalidNonce) {
            log.bright.yellow(exchange.id,"error ",'[InvalidNonce Error] ' + e.message)
        } 
      } 
      
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchVolumes completed")
    if (processing) 
      setTimeout(fetch_volumes, 120*1000,exchange, symbol)
}
;(async function main () {

   // initFile()
    let total = 0
    let missing = 0
    let implemented = 0
    //var baseCoins = [ "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
    var accounts  = require ('./credentials-1.json')
    
    if (process.argv.length === 6) {

      side        = process.argv[2]
      exchangeId  = process.argv[3]
      symbol      = process.argv[4].toUpperCase ()
      quantity    = process.argv[5]
      exchange = new ccxt[exchangeId] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[exchangeId]))
      
      log.bright.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,".::CRIME - CLI "+algo_namespace+"::.")
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"EXCHANGE",exchangeId.green)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"SYMBOL/ASSET", symbol.toString().green)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"AMOUNT", quantity.toString().green)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"ACCOUNT", exchange.account_crime)
      
      inquirer.prompt(questions).then(answers => {
        log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"pump & dump");
        console.log(JSON.stringify(answers, null, '  '));
      });
      //await fetchTicker (exchange, symbol, side, quantity)
      //await checkTickers(exchange)

    } else if (process.argv.length > 4) {
      side        = process.argv[2]
      exchangeId  = process.argv[3]
      quantity    = process.argv[4]
      exchange = new ccxt[exchangeId] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[exchangeId]))
      markets  = await exchange.loadMarkets()
      await ccxt.sleep (exchange.rateLimit)
      log.bright.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,".::CRIME - CLI "+algo_namespace+"::.")
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"EXCHANGE",exchangeId.green)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"AMOUNT", quantity.toString().green)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"ACCOUNT", exchange.account_crime)
      fetch_volumes(exchange,"BTC")
      
      inquirer.prompt(questions).then(answers => {
        log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,'pump & dump done', JSON.stringify(answers, null, '  '));
        
      });

    }else {
      printUsage ()
    }
  }
) ()