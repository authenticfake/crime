"use strict";
/*  ------------------------------------------------------------------------ */
const Promise     = require("bluebird");
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice

log.configure ({ time: true })
const algo_namespace="crime-cdc2"

require('./settings-'+algo_namespace+'.js')();
const log4js = require('log4js');
// log the cheese logger messages to a file, and the console ones as well.
log4js.configure( {
    appenders: {
        file: {
            type: 'file',
            filename: 'logs/crime-'+algo_namespace+'.log',
            maxLogSize: 10 * 1024 * 1024, // = 10Mb
            numBackups: 25, // keep five backup files
            compress: true, // compress the backups
            encoding: 'utf-8',
            pattern: 'yyyy-MM-dd-hh',
            mode: 0o0640,
            keepFileExt: true,
            flags: 'a'
        },
        out: {
            type: 'stdout'
        }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug' }
    }
});

const logger = log4js.getLogger();
const fs        = require ('fs')
const functions = require ('./functions')
var database   = require('./db-aca.js');  //sqllite3.x
var therocksqv = require ('./therocksqv.js')
require('./crime-ti.js')();
require('./crime-exchange.js')();

let coin_last= {}, coin_bid = {}, coin_ask = {}
var mainError = false

let fileCSV = ''; //opportunities enalbed
let fileStubCSV= '' //stub logging
var bootEnv = true; //load environment during the first launch

let result = {};
var accounts    = require ('./credentials-1.json')
var symbols
var exchanges =[]

var markets={};
var exchanges_markets = []

var dateBuy, dateSell

let tradingFee_taker
let tradingFee_maker
//date1 the start of our age
var date1
var crime_account
var pricesBuy=[]  //used for the exit criteria
var pricesSell=[] //used for the exit criteria


const exchangeId = TDC_EXCHANGE
const symbol =TDC_COIN
var profit = TDC_PROFIT
const stoploss= TDC_STOPLOSS
const stoploss_counter = TDC_STOPLOSS_COUNTER
const wallet_percentage = TDC_WALLET_QUANTITY_PERCENTAGE
const wallet_enabled=TDC_WALLET_ENABLED
const wallet_divider= TDC_WALLET_DIVIDER
const ohlcv_period = TDC_OHLCV_PERIOD
const coin_fee_autocharge = TDC_COIN_FEE_AUTOCHARGE
const coin_fee = TDC_COIN_FEE
const coin_fee_charge = TDC_COIN_FEE_CHARGE
const coin_fee_threshold = TDC_COIN_FEE_THRESHOLD
const ob_level = TDC_OB_LEVEL
const ob_filter = ORDERBOOK_FILTER
const direction = TDC_TREND_DIRECTIONL
const price_changed = TDC_PRICE_CHANGED
const stoploss_enabled= STOPLOSS_ENABLED

const spread_high_low_threshold = SPREAD_HIGH_LOW_THRESHOLD
const spread_hl_filter =SPREAD_HL_FILTER
const spread_hl_level =SPREAD_HIGH_LOW_LEVEL
const stoploss_timewindows = 1000 * 60 * STOPLOSS_TIMEWINDOWS
const ma_period = MA_PERIOD
const fibonacci_ohlcv_period = TDC_FIBONACCI_OHLCV_PERIOD
const coin_pair =  COIN_PAIR

const indexOpen     = 1 // [ timestamp, open, high, low, close, volume ]
const indexHigh     = 2 // [ timestamp, open, high, low, close, volume ]
const indexLow      = 3 // [ timestamp, open, high, low, close, volume ]
const indexClose    = 4 // [ timestamp, open, high, low, close, volume ]
const indexVolume   = 5 // [ timestamp, open, high, low, close, volume ]


module.exports = function () {
  this.algo_namespace=algo_namespace
}

let human_value = function (price) {
  return typeof price === 'undefined' ? 'N/A' : price
}

var capabilities = [
  'publicAPI',
  'privateAPI',
  'CORS',
  'fetchTicker',
  'fetchTickers',
  'fetchOrderBook',
  'fetchTrades',
  'fetchOHLCV',
  'fetchBalance',
  'createOrder',
  'createMarketOrder',
  'createLimitOrder',
  'editOrder',
  'cancelOrder',
  'fetchOrder',
  'fetchOrders',
  'fetchOpenOrders',
  'fetchClosedOrders',
  'fetchMyTrades',
  'fetchCurrencies',
  'fetchDepositAddress',
  'createDepositAddress',
  'withdraw',
];


function initFile(exchangeid) {
  var timestamp = new Date().getTime();
  fileCSV = './data/'+algo_namespace+'.'+exchangeid +'.'+ crime_account+'.'+ symbol +'.'+  new Date().getFullYear() +'.'+ (new Date().getMonth() +1)+'.'+new Date().getDate()+'.csv'; //opportunities enalbed
  if (!fs.existsSync(fileCSV)) {
    fs.appendFile(fileCSV, "datetime, symbol, open, high, low, close, volume",(err) => {  
    if (err) log.red( err.message);
    log.magenta('CSV created for writing the opportunity found during the arbitrage single exchange!!!')})
  }
  if (STUB) {
    fileStubCSV = './data/'+algo_namespace+'.'+exchangeid +'.'+ crime_account+'.'+ symbol +'.'+  new Date().getFullYear() +'.'+(new Date().getMonth() +1)+'.'+new Date().getDate()+'.csv'; //opportunities enalbed
  
    if (!fs.existsSync(fileStubCSV)) {
      fs.appendFile(fileStubCSV, "datetime, symbol, open, high, low, close, volume",(err) => {  
      if (err) log.red( err.message);
      log.magenta('CSV created for writing the opportunity found during the arbitrage single exchange!!!')})
    }
  } 
}



//fetch KPI every tot mins -- maybe the best is every tot + another tot mins.
async function checkKPIs(exchangeid, symbol, sync) {
  log.bright(CDC2_EXCHANGE.green, "checkKPIs started", "sync",sync )
  var date2 = new Date();
  if (date2.getTime()>((date1.getTime())+ (1000*60*5))) {
    await fetchKPIs(exchangeid, symbol, sync)
    date1.setTime(new Date())
  } else {
    date2.setTime(new Date())
    
  }
}

// fetch sync KPI: TIs and Volumes if needed
async function fetchKPIs(exchangeId, asset, sync) {
  log.bright(exchangeId.green, "fetchKPIs started", "sync",sync)
  if (sync){
    await fetchTIs(exchanges[exchangeId],asset,ohlcv_period )
  } 
  else {
    fetchTIs(exchanges[exchangeId],asset, ohlcv_period )
  }
} 

async function rollbackSellOrder (exchangeid, symbol, priceBuy, orderSell) {
  var exchange = exchanges[exchangeid]
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackSellOrder order id", orderSell.id, "symbol", symbol)
  var result = true;
  if (!stoploss_enabled) return result

  await fetchTIs (exchange, symbol, ohlcv_period)
  if (ADX_FILTER) {
    var adxResult = await checkADX(exchangeid,symbol,10)
    if (adxResult[0]) {
      log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ADX ti for (",symbol,") positive trend, skip the rollback on sell order",adxResult[0], adxResult[1])
      return true;
    } 
  }
  if (RSI_FILTER) {
    var rsiResult = await checkRSI(exchangeid, symbol, 10)
    if (rsiResult[1]<RSI_OVERSOLD || rsiResult[0]) {
      log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "RSI ti for (",symbol,") positive trend, skip the rollback on sell order",rsiResult)
      return true;
    }
  }
  
  try {
    var price  = orderSell.price
    var filled = orderSell.filled
    var status = orderSell.status
    var amount = orderSell.amount

    if (status==='open') {
      // let orderbook = await exchange.fetchOrderBook (symbol)
      // let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
      // let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
      let ticker = await exchange.fetchTicker(symbol)
      let bid = ticker['bid']
      await ccxt.sleep (exchange.rateLimit)
      let new_order
      var ex_id_sell,ex_info_sell
      var new_amount =  amount-filled
      //add an half of profit to the new price hoping to close the opportunity quickly
      if (bid <= price * (1-stoploss))  {
        await exchange.cancelOrder(orderSell.id, symbol)
        await ccxt.sleep (exchange.rateLimit*2)
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackSellOrder sell order id",orderSell.id, "cancelled stoploss reached")
        
        new_order = await exchange.createOrder (symbol,'limit', 'sell',new_amount, bid, {'recvWindow': 60000000})
        ex_id_sell = new_order.id
        ex_info_sell = JSON.stringify(new_order.info)
        log.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackSellOrder new_order","symbol",symbol, "id", ex_id_sell, "info",ex_info_sell )
        extra = {
              'rollbackSellOrder timestamp': exchange.iso8601 (Date.now ()),
              'current bid': bid,
              'price': price,
              'stoploss reached':true
        };
        functions.addToLog(exchange,extra)
        logger.debug("rollbackSellOrder timestamp",exchange.iso8601(Date.now()),"current bid",bid, 'price', price, "stoploss reached true");
        await ccxt.sleep (exchange.rateLimit)
       result = false
      } else if ((bid < priceBuy) && (pricesSell.length<stoploss_counter)) {
        pricesSell.push(bid)
        result = true
        if (pricesSell.length===stoploss_counter) {
          
        
          await exchange.cancelOrder(orderSell.id, symbol)
          await ccxt.sleep (exchange.rateLimit*2)
          log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackSellOrder sell order id",orderSell.id, "cancelled max price above the sell price reached")
          new_order = await exchange.createOrder (symbol,'limit', 'sell', new_amount, bid, {'recvWindow': 60000000})
          ex_id_sell = new_order.id
          ex_info_sell = JSON.stringify(new_order.info)
          log.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackSellOrder new_order","symbol",symbol, "id", ex_id_sell, "info",ex_info_sell )
          await ccxt.sleep (exchange.rateLimit)
          logger.debug("rollbackSellOrder timestamp",exchange.iso8601(Date.now()),"current bid",bid, 'price', price, "stoploss reached true");
          extra = {
                'rollbackSellOrder timestamp': exchange.iso8601 (Date.now ()),
                'current bid': bid,
                'price': price,
                'stoploss reached':true
          };
          functions.addToLog(exchange,extra)
          result = false
        }
      } else {
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackSellOrder nothing to do for sell order id",orderSell.id, "price is in the buy and sell price","buy price", priceBuy, "bid", bid, "sell price", price)
        result = true
      }
      
    }
  }catch (e) {
    log.red(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "error during the rollebackSellOrder", orderSell.id, "error",e)
    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchange.id,"error rollebackSellOrder",'[DDoS Protection] ' + e.message)
    } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchange.id,"error rollebackSellOrder",'[Request Timeout] ' + e.message)
    } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchange.id,"error rollebackSellOrder",'[Authentication Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchange.id,"error rollebackSellOrder",'[Exchange Not Available Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchange.id,"error rollebackSellOrder",'[Exchange Error] ' + e.message)
    } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchange.id,"error rollebackSellOrder",'[Network Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidNonce) {
        log.bright.yellow(exchange.id,"error rollebackSellOrder",'[InvalidNonce Error] ' + e.message)
    } else if (e instanceof ccxt.OrderNotFound) {
        log.bright.yellow(exchange.id,"error rollebackSellOrder",'[OrderNotFound Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidOrder) {
        log.bright.yellow(exchange.id,"error rollebackSellOrder",'[InvalidOrder Error] ' + e.message)
    } else if (e instanceof ccxt.InsufficientFunds) {
       log.bright.yellow(exchange.id,"error rollebackSellOrder",'[InsufficientFunds Error] ' + e.message)
    }
  }
  
  return result
}

async function rollbackOrders (exchangeid, symbol, orderBuy, orderSell) {
  var exchange = exchanges[exchangeid]
  var result = true;
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackOrders ", "order buy", orderBuy.id,  "order sell",orderSell.id)
  
  try {
    var priceBuy  = orderBuy.price
    var filledBuy = orderBuy.filled
    var statusBuy = orderBuy.status
    var amountBuy = orderBuy.amount

    var priceSell  = orderSell.price
    var filledSell = orderSell.filled
    var statusSell = orderSell.status
    var amountSell = orderSell.amount

    if (statusBuy==='open' && statusSell === 'open' && filledSell ===0 && filledBuy==0) {
      if (filledSell === filledBuy) {
        await exchange.cancelOrder(orderBuy.id, symbol)
        await ccxt.sleep (exchange.rateLimit)
        await exchange.cancelOrder(orderSell.id, symbol)
        await ccxt.sleep (exchange.rateLimit)
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "order ids (",orderBuy.id, orderSell.id, ") cancelled")
        result = false
        extra = {
              'rollbackOrders timestamp': exchange.iso8601 (Date.now ()),
              'stoploss reached':true
        };
        functions.addToLog(exchange,extra)
        logger.debug("rollbackOrders timestamp",exchange.iso8601(Date.now()), "stoploss reached true");
        
      } 
    }
  }
  catch (e) {
    log.red(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "error during the rollebackOrders", orderBuy.id, orderSell.id, "error",e)
    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchange.id,"error rollebackOrders",'[DDoS Protection] ' + e.message)
    } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchange.id,"error rollebackOrders",'[Request Timeout] ' + e.message)
    } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchange.id,"error rollebackOrders",'[Authentication Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchange.id,"error rollebackOrders",'[Exchange Not Available Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchange.id,"error rollebackOrders",'[Exchange Error] ' + e.message)
    } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchange.id,"error rollebackOrders",'[Network Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidNonce) {
        log.bright.yellow(exchange.id,"error rollebackOrders",'[InvalidNonce Error] ' + e.message)
    } else if (e instanceof ccxt.OrderNotFound) {
        log.bright.yellow(exchange.id,"error rollebackOrders",'[OrderNotFound Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidOrder) {
        log.bright.yellow(exchange.id,"error rollebackOrders",'[InvalidOrder Error] ' + e.message)
    } else if (e instanceof ccxt.InsufficientFunds) {
       log.bright.yellow(exchange.id,"error rollebackOrders",'[InsufficientFunds Error] ' + e.message)
    }
    result = true
  }
  return result
}

async function rollbackBuyOrder (exchangeid, symbol, order, priceSell) {
  
  var exchange = exchanges[exchangeid]
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollebackBuyOrder order id", order.id)
  var result = true;
  if (!stoploss_enabled) return result
  await fetchTIs (exchange, symbol, ohlcv_period)
  if (ADX_FILTER) {
    var adxResult = await checkADX(exchangeid,symbol,3 )
    if (!adxResult[0]) {
      log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ADX ti for (",symbol,") says: negative trend, skip the rollback on sell order",adxResult[1], "adx trend",adxResult[0])
      return result;
    } 
  }
  if (RSI_FILTER) {
    var rsiResult = await checkRSI(exchangeid, symbol, 3)
    if (rsiResult[1]>RSI_OVERBOUGHT-20 || !rsiResult[0]) {
      log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "RSI ti for (",symbol,") says: negative trend, skip the rollback on sell order",rsiResult[1])
      return result;
    }
  }

  try {
    var price  = order.price
    var filled = order.filled
    var status = order.status
    var amount = order.amount
    let ticker = await exchange.fetchTicker(symbol)
    let ask = ticker['ask']
    let bid = ticker['bid']
    var new_order
    
    if (status==='open' && filled===0) {
      await ccxt.sleep (exchange.rateLimit)
      //add an half of profit to the new price hoping to close the opportunity quickly
      if (ask >= price * (1+stoploss))  {
        
        await exchange.cancelOrder(order.id, symbol)
        await ccxt.sleep (exchange.rateLimit)
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollbackBuyOrder buy order id",order.id, "cancelled stoploss reached")
        result = false
        extra = {
              'rollbackBuyOrder timestamp': exchange.iso8601 (Date.now ()),
              'current ask': ask,
               'price': price,
               'stoploss reached':true
        };
        functions.addToLog(exchange,extra)
        logger.debug("rollbackBuyOrder timestamp",exchange.iso8601(Date.now()),"current ask",ask, 'price', price, "stoploss reached true ");
        
      } else if ((ask > priceSell) && (pricesBuy.length<stoploss_counter)) {
        pricesBuy.push(ask)
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollbackBuyOrder new ask prices",ask," pushed on pricesBuy" )
          
        if (pricesBuy.length===stoploss_counter) {
          await exchange.cancelOrder(order.id, symbol)
          await ccxt.sleep (exchange.rateLimit)
          log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollbackBuyOrder buy order id",order.id, "cancelled max ask price above the sell price reached")
          result = false
        } else {
          result = true
        }
      } else {
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollbackBuyOrder nothing to do for buy order id",order.id, "ask price is in the buy and sell price","buy price", price, "ask price", ask, "sell price", priceSell)
        result = true
      }
    } else {
      if (bid >= price * (1+0.0015))  {
        
        await exchange.cancelOrder(order.id, symbol)
        await ccxt.sleep (exchange.rateLimit*2)
        log.bright.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollbackBuyOrder buy order id",order.id, "cancelled stoploss reached")
        
        new_order = await exchange.createOrder (symbol,'limit', 'sell',filled, bid, {'recvWindow': 60000000})
        ex_id_sell = new_order.id
        ex_info_sell = JSON.stringify(new_order.info)
        log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "rollbackBuyOrder sell order executed symbol",symbol, "to this price", bid, "id", ex_id_sell, "info",ex_info_sell )
        logger.debug("rollbackBuyOrder timestamp",exchange.iso8601(Date.now()),"current bid",bid, 'price', price, "stoploss reached true ");
        extra = {
              'rollbackBuyOrder timestamp': exchange.iso8601 (Date.now ()),
              'current bid': bid,
              'price': price,
              'stoploss reached':true
        };
        functions.addToLog(exchange,extra)
        result = false
      }
    }
  }catch (e) {
    log.red(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "error rollebackBuyOrder", order.id, "error",e)
    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchange.id,"error rollbackBuyOrder",'[DDoS Protection] ' + e.message)
    } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchange.id,"error rollbackBuyOrder",'[Request Timeout] ' + e.message)
    } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchange.id,"error rollbackBuyOrder",'[Authentication Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchange.id,"error rollbackBuyOrder",'[Exchange Not Available Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchange.id,"error rollbackBuyOrder",'[Exchange Error] ' + e.message)
    } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchange.id,"error rollbackBuyOrder",'[Network Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidNonce) {
        log.bright.yellow(exchange.id,"error rollbackBuyOrder",'[InvalidNonce Error] ' + e.message)
    } else if (e instanceof ccxt.OrderNotFound) {
        log.bright.yellow(exchange.id,"error rollbackBuyOrder",'[OrderNotFound Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidOrder) {
        log.bright.yellow(exchange.id,"error rollbackBuyOrder",'[InvalidOrder Error] ' + e.message)
    } else if (e instanceof ccxt.InsufficientFunds) {
       log.bright.yellow(exchange.id,"error rollbackBuyOrder",'[InsufficientFunds Error] ' + e.message)
    }
    result = true
  }
  return result
}

//return true if order executed succesful false otherwise
async function checkFillOrder(exchange ,symbol,orderid, orderidsell, priceBuy, priceSell) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "checkFillOrder started for", symbol,"buy order id", orderid, "sell order id",orderidsell, "stoploss enabled", stoploss_enabled)
  var dateFill = new Date()
  var processedBuy  = false
  var processedSell = false

  var boBuy = false
  var boSell = false
  var buyOrder, sellOrder

  var found = true
  var orders

  //inizialazed variables
  pricesBuy = []
  pricesSell = []
  
  while (found) {
    try {
      orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
      await ccxt.sleep (exchange.rateLimit)
      found=false
      boBuy = false;
      boBuy = false;
    
      for (var j=0;j<orders.length;j++) {
        var order = orders[j]
        if (orderid===order.id || orderidsell===order.id){
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
          if (order.side === 'buy') {
            boBuy = true;
            buyOrder = order
          } else {
            boSell = true;
            sellOrder = order
          }
        }
      }
      //Checking for rollback actions
      if (dateFill.getTime()>(dateBuy.getTime()+ (stoploss_timewindows))) {
        log.bright.cyan(exchange.iso8601 (Date.now ()),"start rollback if it is possibile","buy order", boBuy,  "sell order", boSell )
        if (boBuy && boSell) {
          found =  rollbackOrders(exchange.id,symbol, buyOrder, sellOrder)
        } else if (boBuy && !boSell) {
          found = rollbackBuyOrder(exchange.id,symbol, buyOrder, priceSell)
        } else if (!boBuy && boSell) {
          found = rollbackSellOrder(exchange.id,symbol, priceBuy, sellOrder)
        }
        dateFill.setTime(new Date())
        dateBuy.setTime(new Date())
      } else {
        dateFill.setTime(new Date())
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
      found = true
      // orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
      // await ccxt.sleep (exchange.rateLimit)
    }
  }
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "checkFillOrder completed for", symbol, "order(",orderid,",",orderidsell,") closed", found)
  return found;
}

//see:http://www.metastocktools.com/downloads/turtlerules.pdf
async function fetchTickers(exchangeid, assets) {
  const exchange = exchanges[exchangeid];
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "fetchTickers started")
  // TODO: skip the iteration if there is an open order pending. 
  var asset
  var amount
  var transaction_id
 //log.red("exchange",exchange.id,"assets", assets, "account", crime_account);
  try {
    for (var j=0;j<assets.length;j++) {
      asset = assets[j][0]
      var trend
      var details, extra
      details = {
            'exchange': exchangeid,
            'asset': asset,
            'account': crime_account,
      };
      functions.addToLog(exchange,asset, details,true)
      
      logger.debug(" ");
      logger.debug("exchange",exchangeid,"asset", asset, "account", crime_account);
                                
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "fetchTickers asset", asset)
      transaction_id = "CRIME_"+ algo_namespace + "_" + new Date().getTime()
      
      var _profit ="0%"
      var result = false
      var ex_id_buy=null, ex_info_buy, ex_error_buy, ex_error;
      var ex_id_sell=null, ex_info_sell, ex_error_sell;
      var cashOut, cashIn
      
      var textCSV
      var coin_db = coin_pair + '_' + algo_namespace 
      var selectOpp = await database.selectOpportunities (crime_account, exchange.id, coin_db)
      var orderPending = selectOpp.rows_length;
      
      if (VOLUME_FILTER) {
        var usdVolume = await calculateUSDTVolume(exchange,asset)

        extra = {
              'volume': usdVolume,
              'volume thresold': VOLUME_THRESHOLD,
        };
        functions.addToLog(exchange,extra)
        logger.debug("volume",usdVolume,"volume thresold", VOLUME_THRESHOLD);
        
        if (isNaN(usdVolume) || usdVolume < VOLUME_THRESHOLD ) {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset)
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "volumes below the threshold[",VOLUME_THRESHOLD,"]",usdVolume)
          continue;
        }
      }

      await fetchTIs(exchange, asset, ohlcv_period)
      var candlesticks  = fetchOHLCV().slice(-2)
      var close, open, low, high
      var p_close, p_open, p_low, p_high
      const previousCS    = candlesticks[0]
      const currentCS     = candlesticks[1]
      
      var rsi     = await checkRSI(exchange.id,asset )
      var adx     = await checkADX(exchange.id,asset,10 )
      var bb      = await checkBB(exchange.id,asset, 15)
      var mom     = await checkMOM(exchange.id,asset, 15)
      var ma      = await checkMA(exchange.id,asset, 15)
      var ema     = await checkEMA(exchange.id,asset, 15)
      var wma     = await checkWMA(exchange.id,asset, 15)
      var atr     = await checkATR(exchange.id,asset, 15)
      var fp      = await checkFloorPivots(exchange.id,asset, 15)
      var tdp     = await checkTomDemarksPoints(exchange.id,asset, 15)
      var woodies = await checkWoodiesPoints(exchange.id,asset, 15)
      var fibonacci   = await checkFibonacci(exchange.id,asset, 15)
      var macd        = await checkMACD(exchange.id,asset)
      var stochastic  = await checkKD(exchange.id,asset)
      if (adx === undefined) { 
        adx = []
        adx[0]=undefined 
        adx[1]=undefined 
      }
      if (DEBUG) {
        log.green("kpi RSI TI", rsi)
        log.green("kpi ADX TI", adx)
        log.green("kpi BB TI", bb)
        log.green("kpi mom TI", mom)
        log.green("kpi ma TI", ma)
        log.green("kpi ema TI", ma)
        log.green("kpi wma TI", wma)
        log.green("kpi atr TI", atr)
        log.green("kpi MACD TI", macd)
        log.green("kpi Stochastic TI", stochastic)
        log.green("kpi FloorPivots TI", fp)
        log.green("kpi TomDemarks TI", tdp)
        log.green("kpi Woodies TI", woodies)
        log.green("kpi fibonacci TI", fibonacci)
        log.green("bullshift" , isBullish())

      }
      if (adx === undefined) { 
        adx = []
        adx[0]=undefined 
        adx[1]=undefined 
      }
      if (macd === undefined) { 
          macd = []
          macd[0]=undefined 
          macd[1]=undefined 
      }
      if (rsi === undefined) { 
        rsi = []
        rsi[0]=undefined 
        rsi[1]=undefined 
      }
      if (bb === undefined) { 
        bb = []
        bb[0]=undefined 
        bb[1]=undefined 
        bb[2]=undefined 
        bb[3]=undefined 
      }
      if (stochastic === undefined) { 
        stochastic = []
        stochastic[0]=undefined 
        stochastic[1]=undefined 
        stochastic[2]=undefined 
        stochastic[3]=undefined 
      }
      extra = {
             'macd': macd[1],
             'rsi': rsi[1],
             'rsi-trend': rsi[0],
             'mom': mom[1],
             'ma': ma[1],
             'ema': ema[1],
             'wma': wma[1],
             'atr': atr[1],
             'macd': macd[1],
             'adx': adx[1],
             'adx-result': adx[0],
             'bb' : bb[3],
             'stochastic-kd': stochastic[0],
             'stochastic-kd-data': stochastic[1],
             'bullish' : isBullish(),
             'fibonacci-up':fibonacci[0],
             'fibonacci-down':fibonacci[1],
       };
      functions.addToLog(exchange,extra)
      functions.logToFile(exchange.id,symbol,algo_namespace)
      logger.debug("extra",extra);
      if (ADX_FILTER) {
        //check if we are in uptrend market leveraging on ADX indicator
        if (adx === undefined || adx[0] === undefined ) {
         log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow,algo_namespace.yellow, "skip the following assets",symbol )
         log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ti ADX check is undefined. No trend found",adx[1])
         continue;
        }
        if (adx[1]<ADX_LEVEL_4 -5 ||  !adx[0]){
          //skip the opportunitiy if the market is lateral
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ti ADX below the threshold and not alingend to trend: result ",adx[1], "adx trend", adx[0])
          continue
        }
        if (adx[0]) {
          trend = 'up'
        } else {
          trend = 'down'
        }
      }
      if (RSI_FILTER) {
        log.yellow()
        //check if we are in uptrend market leveraging on RSI indicator
        if ((rsi[1]>RSI_OVERBOUGHT-10 && !rsi[0]) || (rsi[1]>RSI_OVERBOUGHT-10 && rsi[0]===undefined) ){
          //skip the opportunitiy if the market is lateral
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ti RSI not alingend to trend: result ",rsi)
          continue
        }

        if (!isBullish()) {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "bullshift",isBullish())
          continue
        } else if (isBullish() && trend==='up') {
          trend = 'up'
        }
      }

      if (MA_FILTER) {
        close = currentCS[indexClose]
        open  = currentCS[indexOpen]
        low   = currentCS[indexLow]
        high  = currentCS[indexHigh]
        if (ma[0] && trend==='up') {
          trend = 'up'
        } else if (!ma[0] && trend==='down') {
          trend = 'down'
          continue
        } else {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ma",ma)
          continue
        }
      }
      
      
      

      if (MACD_FILTER ) {
        if (macd[0] && trend==='up') {
          trend = "up"
        } else if (!macd[0] && trend==='down'){
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "macd",macd,"trend",trend )
          trend = "down"
          continue;
        } else {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "macd",macd,"trend",trend )
          
          continue;
        }
      }
      if (KD_FILTER) {
        if (stochastic[0] && trend==='up') {
          trend = "up"
        } else if (!stochastic[0] && trend==='down'){
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow,  "stochastic", stochastic,"trend",trend )
          //trend = "down"
          continue;
        } else {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "stochastic", stochastic,"trend",trend ) 
          continue;
        }
      }
     
      if (BB_FILTER) {
        /**
          In linea di massima quando i prezzi salgono per andare a contatto con la banda superiore, 
          si ha la conferma di un trend rialzista, 
          mentre quando invece i prezzi scendono verso la banda inferiore si conferma la presenza di un trend ribassista.
          In questi casi possiamo ricevere un segnale di inversione del trend, 
          nel caso in cui il prezzo esce dalla banda superiore per poi rientrarci (segnale ribassista), 
          oppure se il prezzo sfonda la banda inferiore per poi rientrarci (segnale di acquisto). 

          Riceviamo un SEGNALE DI ACQUISTO quando:
          1) Il prezzo "sfonda" la banda di Bollinger inferiore
          2) Lo Stocastico è in condizione di ipervenduto o la sta lasciando spostandosi verso l'alto.
          3) Siamo in presenza di un pattern candelstick di inversione bullish (doji, bullish harami, morning star, bullish engulfing, hammer, etc - vedi l'elenco dei pattern)
          Se siamo in presenza di queste condizioni, si può piazzare un buy stop order 2-5pips sopra il massimo di quel pattern di inversione rialzista. Quello sarà il nostro punto di ingresso.

          Viceversa, riceviamo un SEGNALE DI VENDITA quando:
          1) Il prezzo "sfonda" la banda di Bollinger superiore
          2) Lo Stocastico è in condizione di ipercomprato o la sta lasciando spostandosi verso il basso.
          3) Siamo in presenza di un pattern candelstick di inversione bearish (come ad esempio doji, bearish harami, evening star, bearish engulfing, hammer, etc - vedi l'elenco dei pattern)
          Se siamo in presenza di queste condizioni, si può piazzare un sell stop order 2-5pips sotto il minimo di quel pattern di inversione rialzista. Quello sarà il nostro punto di ingresso.
        */
        close = currentCS[indexClose]
        open  = currentCS[indexOpen]
        low   = currentCS[indexLow]
        high  = currentCS[indexHigh]

        p_close = previousCS[indexClose]
        p_open  = previousCS[indexOpen]
        p_low   = previousCS[indexLow]
        p_high  = previousCS[indexHigh]

        //current BB
        var bb_lower = functions.priceToPrecision(exchange.id,markets, symbol,bb[3].lower)
        var bb_middle = functions.priceToPrecision(exchange.id,markets, symbol,bb[3].middle)
        var bb_upper = functions.priceToPrecision(exchange.id,markets, symbol,bb[3].upper)
        //previous BB
        var previous_bb_lower = functions.priceToPrecision(exchange.id,markets, symbol,bb[4].lower)
        var previous_bb_middle = functions.priceToPrecision(exchange.id,markets, symbol,bb[4].middle)
        var previous_bb_upper = functions.priceToPrecision(exchange.id,markets, symbol,bb[4].upper)



        if (high >= bb_upper && low > bb_middle && trend==='down' ) {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",symbol )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ti BB is not alignet to the trend",bb, "high", high, "low", low)
          await ccxt.sleep (exchange.rateLimit)
          continue;
          trend = "down"
        } else if (low<= bb_lower && high < bb_middle && trend==='up'  ) {
          log.bright(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "trend changed by BB previous", trend, "current UP")
          trend = "up"
        } else {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",symbol )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "ti BB is not alignet to the trend",bb, "high", high, "low", low)
          await ccxt.sleep (exchange.rateLimit)
          continue;

        }
      }
      //results ::=[result, master_wallet, quantity]
      var results = await checkBalances(exchange,coin_fee_autocharge, coin_fee,symbol, wallet_percentage)
      var quantity = results[2]
      var master_wallet = results[1]
      if (!results[0]) continue 

      quantity = quantity / (wallet_divider - orderPending)
      log.bright(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "fetchTickers percentage [",wallet_percentage,"] of wallet available based on order pending [",orderPending,"] wallet divider [", wallet_divider, "] quantity [",quantity, "]")
      
      
      var priceBuy, priceSell, priceClose,priceLast,priceBid,priceAsk, priceOpen, priceLow, priceHigh
      const ticker = await exchange.fetchTicker(asset);
      var strongTrend = false

      priceBuy = ticker['last'] //as default
      priceSell = ticker['last'] //as default 
      priceLast = ticker['last']
      priceAsk = ticker['ask']
      priceBid = ticker['bid']

      priceLast  = functions.priceToPrecision(exchange.id,markets, asset,priceLast)
      priceClose = functions.priceToPrecision(exchange.id,markets, asset,ticker['close'])
      priceOpen = functions.priceToPrecision(exchange.id,markets, asset,ticker['open'])
      priceLow = functions.priceToPrecision(exchange.id,markets, asset,ticker['low'])
      priceHigh = functions.priceToPrecision(exchange.id,markets, asset,ticker['high'])

      if (SPREAD_FILTER) {
        var spreadBidAsk =  ticker['ask'] - ticker['bid']
        if (spreadBidAsk > SPREAD_THRESHOLD) {
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
          log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "spread ",spreadBidAsk.toString().magenta,"below the threshold",SPREAD_THRESHOLD)
          await ccxt.sleep (exchange.rateLimit)
          continue;
        }
        extra = {
                'spreadBidAsk': spreadBidAsk,
                'spread threshold': SPREAD_THRESHOLD, 
        };
        functions.addToLog(exchange,extra)
      }
      

      if (trend==='down'){
        strongTrend = true
        priceBuy = ticker['ask'] *  (1 - profit);
        priceSell = ticker['ask']
        log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "skip the following assets",asset )
        log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green,algo_namespace.yellow, "trend down".magenta)
        await ccxt.sleep (exchange.rateLimit)
    //    continue;
      } else if (trend==='up'){
        if (ADX_FILTER) {
          if (adx[1]>=ADX_LEVEL_5-5){
            strongTrend = true
            profit = functions.fetchProfit (priceAsk, profit, markets[exchange.id][asset].precision.price )
            priceBuy = ticker['ask']
            priceSell = ticker['ask'] *  (1 + profit)
            if (exchange.id==='gdax' || exchange.id==='coinbaseprime' || exchange.id==='coinbasepro' || exchange.id==='coinbase' ) {
              priceBuy  = priceBuy * (1 + SLIPPAGE_ALLOWED)
              priceSell = priceSell * (1 + SLIPPAGE_ALLOWED)  
            }
          } else {
            profit = functions.fetchProfit (priceLast, (profit/2), markets[exchange.id][asset].precision.price )
            priceBuy  = priceLast *  (1 - profit);
            priceSell = priceLast *  (1 + profit);
            profit=profit*2
          }
        } else if (!ADX_FILTER && RSI_FILTER) {
          if (rsi[1]<=RSI_OVERSOLD-5) {
            strongTrend = true
            profit = functions.fetchProfit (priceAsk, profit, markets[exchange.id][asset].precision.price )
            priceBuy = ticker['ask']
            priceSell = ticker['ask'] *  (1 + profit)
            if (exchange.id==='gdax' || exchange.id==='coinbaseprime' || exchange.id==='coinbasepro' || exchange.id==='coinbase' ) {
              priceBuy = priceBuy * (1 + SLIPPAGE_ALLOWED)
              priceSell = priceSell * (1 + SLIPPAGE_ALLOWED)  
            }
            
          } else {
            profit = functions.fetchProfit (priceLast, (profit/2), markets[exchange.id][asset].precision.price )
            
            priceBuy  = priceLast *  (1 - profit);
            priceSell = priceLast *  (1 + profit);
            profit=profit*2
          }
        } else {  //TODO: TO BE COMLETED ALL cases
          profit = functions.fetchProfit (priceLast, (profit/2), markets[exchange.id][asset].precision.price ) 
          priceBuy  = priceLast *  (1 - profit);
          priceSell = priceLast *  (1 + profit);
          profit=profit*2
        }
      } else {
        profit = functions.fetchProfit (priceLast, (profit/2), markets[exchange.id][asset].precision.price )
        priceBuy  = priceLast *  (1 - profit);
        priceSell = priceLast *  (1 + profit);
        profit=profit*2
      }

      
      //resistence::=[rResult, sResult,priceBuy, priceSell ]
      // var resistence = await checkResistenceSupport(exchange, priceAsk,priceBid, priceLast, fibonacci )
      // if (resistence[0] && resistence[1]) {
      //   priceBuy = resistence[2]
      //   priceSell = resistence[3]
      // } else {
      //   continue;
      // }
      

      
      priceBuy = functions.priceToPrecision(exchange.id,markets, asset,priceBuy)
      priceSell = functions.priceToPrecision(exchange.id,markets, asset,priceSell)

      amount = (quantity / priceBuy)
      amount = amount - (amount * tradingFee_maker)
      amount = functions.amountToPrecision(exchange.id,markets, asset, amount )
      extra = {
        'trend': trend,
        'strongTrend': strongTrend,
        'priceLast': priceLast,
        'priceAsk': priceAsk,
        'priceBid': priceBid,
        'priceClose': priceClose,
        'priceBuy': priceBuy,
        'priceSell': priceSell,
        'quantity': quantity,
        'amount (quantity/buy)': amount,
        'profit':profit,
      };
      functions.addToLog(exchange,extra)

      logger.debug("trend",trend,"strongTrend", strongTrend );
      logger.debug("priceLast", priceLast,"priceAsk",priceAsk,"priceBid",priceBid,"priceClose",priceClose,"priceBuy",priceBuy,"priceSell",priceSell);
      logger.debug("quantity",quantity,"amount (quantity/buy)",amount,"profit",profit);
      
      var sync = false;
      // if (base_wallet < (amount * priceSell)) {
      //   log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "the order for the following assets",asset, "needs to be sync/sequential" )
      //   log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "wallet for (",base_wallet,") is below the order cost",(amount * priceSell),"amout", amount, "price",  priceSell)
      //   sync= true;
      // }
      
      cashOut = functions.priceToPrecision(exchange.id,markets, asset, (amount * priceBuy))
      cashIn  = functions.priceToPrecision(exchange.id,markets, asset, ((amount * priceSell) - (amount * priceSell * tradingFee_maker)))
      
      //go to trade if there is an opportunity with profit            
      _profit = priceSell/priceBuy
      _profit =((_profit - 1) * 100).toFixed(3)
      _profit = _profit + "%"
      //inizialize
      result = true
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "asset", asset, "profit",profit.toString().green,"priceBuy", priceBuy.toString().green,"priceSell",priceSell.toString().magenta)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "priceLast", priceLast,"priceAsk",priceAsk.toString().magenta,"priceBid",priceBid.toString().green,"priceClose",priceClose)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "trend", trend.green,"strongTrend", strongTrend, "amount to buy", amount, "quantity",functions.toFixed(quantity).toString().yellow)
      if (!STUB) {
        var params = {//0.04600452
           'test': true,  // test if it's valid, but don't actually place it
        }
        var insertOppHistory, boBuy=false, boSell=false
        try {
          //buy 
          let marketBuyOrder = await exchange.createOrder (asset,'limit', 'buy', amount,priceBuy, {'recvWindow': 60000000})
          dateBuy = new Date()
          await ccxt.sleep (exchange.rateLimit)
          boBuy = true
          ex_id_buy = marketBuyOrder.id
          ex_info_buy = JSON.stringify(marketBuyOrder.info)
          log.green(exchange.iso8601(Date.now()),exchange.id.green,algo_namespace.yellow, "marketBuyOrder","asset",asset,"id", ex_id_buy, "info",ex_info_buy )
          
          var insertOpp = database.insertOpportunity(transaction_id,crime_account, exchange.id, symbol, asset, "","", amount,_profit,"SHOOT" )
          insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, exchange.id, symbol, asset, amount,"SHOOT-BUY", ex_id_buy, ex_info_buy, ex_error )
          extra = {
                'buy ordet timestamp': exchange.iso8601(Date.now()),
                'buy order id': ex_id_buy,
                'buy order info': ex_info_buy,
          };
          functions.addToLog(exchange,extra)
          logger.debug("buy order timestamp",exchange.iso8601(Date.now()),"order id",ex_id_buy,"order info",ex_info_buy);
          
          result = await checkFillOrder(exchange, asset,ex_id_buy, undefined, priceBuy, priceSell)
          extra = {
                'timestamp (buy) result': exchange.iso8601(Date.now()),
                'result': result,
               
          };
          functions.addToLog(exchange,extra)
          logger.debug("close buy order timestamp",exchange.iso8601(Date.now()),"result",result);
          
          if (result) {
            log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "fetchTicker --> checkFillOrder","asset",asset,"id", ex_id_buy, "failure" )
            insertOppHistory = database.insertOpportunityHistory(transaction_id,crime_account, exchange.id, symbol, asset, amount,"SHOOT-ERROR", "", "", ex_error )
            umse = database.updateOpportunity("SHOOT", 3, amount, transaction_id)
            functions.logToFile(exchange.id,asset, algo_namespace)
            continue;
          }
          //sell
          let marketSellOrder = await exchange.createOrder(asset,'limit', 'sell', amount, priceSell, {'recvWindow': 60000000})
          dateSell = new Date()
          await ccxt.sleep (exchange.rateLimit)
          boSell = true
          ex_id_sell = marketSellOrder.id
          ex_info_sell = JSON.stringify(marketSellOrder.info)
          log.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "marketSellOrder","asset",asset, "id", ex_id_sell, "info",ex_info_sell )
          extra = {
                'sell ordet timestamp': exchange.iso8601(Date.now()),
                'sell order id': ex_id_sell,
                'sell order info': ex_info_sell,
          };
          functions.addToLog(exchange,extra)
          logger.debug("sell order timestamp",exchange.iso8601(Date.now()),"order id",ex_id_sell,"order info",ex_info_sell);
          
          result = await checkFillOrder(exchange, asset,ex_id_buy, ex_id_sell, priceBuy, priceSell)
          extra = {
                'timestamp (sell) result': exchange.iso8601(Date.now()),
                'result': result,
          };
          functions.addToLog(exchange,extra)
          logger.debug("close sell order timestamp",exchange.iso8601(Date.now()),"result",result);
          functions.logToFile(exchange.id,asset, algo_namespace)
          if (result) {
            log.green(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "fetchTicker --> checkFillOrder","asset",asset,"id", ex_id_buy, "failure" )
            insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, exchange.id, symbol, asset, amount,"SHOOT-ERROR", "", "", ex_error )
            var umse = database.updateOpportunity ("SHOOT", 3, amount, transaction_id)
            continue;
          }
        }
        catch (e) {
          if (e instanceof ccxt.InvalidOrder) {
            // it has thrown the exception as expected
            log.bright.yellow(exchange.id,"error fetchTicker",'[InvalidOrder Error] ' + e.message)
          } else if (e instanceof ccxt.InsufficientFunds) {
            // it has thrown the exception as expected
            log.bright.yellow(exchange.id,"error fetchTicker",'[InsufficientFunds Error] ' + e.message)
          }
          

          log.red(exchange.id, "order error", e)
          ex_error=e.message
          if (boBuy && !boSell ) {
            await exchange.cancelOrder(ex_id_buy, asset)
          }
          insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, exchange.id, coin_db, asset, amount,"SHOOT-ERROR", "", "", ex_error )
          var umse = database.updateOpportunity ("SHOOT", 3, amount, transaction_id)
        }
        if (boSell && boBuy ) {
          var sellamount = functions.amountToPrecision(exchange.id,markets, asset,(amount*priceSell))
          var updateOppPair = database.updateOpportunity ("SHOOT", 2, sellamount, transaction_id)
          insertOppHistory  = database.insertOpportunityHistory (transaction_id,crime_account, exchange.id, coin_db, asset, sellamount,"SHOOT-SELL", ex_id_sell, ex_info_sell, ex_error )
        } 
        //ERROR MANAGEMENT
        if (!boBuy || !boSell) {
          var umse = database.updateOpportunity ("SHOOT", 3, amount, transaction_id)
        }
      }
      else {
        var startDatetime = new Date().toISOString()
        await checkLastPrice(exchange, asset, priceBuy, priceSell)
        extra = {
              'timestamp (sell) result': exchange.iso8601(Date.now()),
              'result (STUB)': result,
             
        };
        functions.addToLog(exchange,extra)
        functions.logToFile(exchange.id,asset, algo_namespace)
        logger.debug("close orders timestamp (STUB)",exchange.iso8601(Date.now()),"result",result);
        //"start datetime, asset, amount,price buy,price sell,price last,type,end datetime"
        var textStubCSV = startDatetime+"," +asset+"," + amount+"," +priceBuy+"," +priceSell+"," +priceLast+"," +type+"," +coin_rsi[asset][exchange.id].slice(coin_rsi[asset][exchange.id].length-5).toString() +","+coin_adx[asset][exchange.id]+","+coin_bb[asset][exchange.id]+","+new Date().toISOString()
        fs.appendFile(fileStubCSV,"\n"+textStubCSV, (err) => {  
                     if (err) log.red( err.message);}); 
      }
      log(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "amount bought", amount.toString().green, "cash out",(amount * priceBuy),  "cash in", cashIn.toString().magenta );
      log(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "_profit", _profit.toString().green) 
      
      textCSV = new Date().toISOString()+"," +asset+","  +priceLast+"," +cashOut+"," +cashIn+","  +(profit.toString())+"," + result
      fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                     if (err) log.red( err.message);}); 
      await ccxt.sleep (exchange.rateLimit*2)
      //checkKPIs(true)

    
     }
  }
  catch (e) {
    log.red("fetchTickers Error", e)
    insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, exchange.id, symbol, asset, amount,"SHOOT-ERROR", "", "", e.message )
    umse = database.updateOpportunity ("SHOOT", 3, amount, transaction_id)
    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
      log.bright.yellow (exchange.id,"error fetchTickers",'[DDoS Protection] ' + e.message)
    } else if (e instanceof ccxt.RequestTimeout) {
      log.bright.yellow (exchange.id,"error fetchTickers",'[Request Timeout] ' + e.message)
    } else if (e instanceof ccxt.AuthenticationError) {
      log.bright.yellow (exchange.id,"error fetchTickers",'[Authentication Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
      log.bright.yellow (exchange.id,"error fetchTickers",'[Exchange Not Available Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeError) {
      log.bright.yellow (exchange.id,"error fetchTickers",'[Exchange Error] ' + e.message)
    } else if (e instanceof ccxt.NetworkError) {
      log.bright.yellow (exchange.id,"error fetchTickers",'[Network Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidNonce) {
      // it has thrown the exception as expected
      log.bright.yellow(exchange.id,"error fetchTickers",'[InvalidNonce Error] ' + e.message)
    } else if (e instanceof ccxt.OrderNotFound) {
      // it has thrown the exception as expected
      log.bright.yellow(exchange.id,"error fetchTickers",'[OrderNotFound Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidOrder) {
      // it has thrown the exception as expected
      log.bright.yellow(exchange.id,"error fetchTickers",'[InvalidOrder Error] ' + e.message)
    } else if (e instanceof ccxt.InsufficientFunds) {
      // it has thrown the exception as expected
      log.bright.yellow(exchange.id,"error fetchTickers",'[InsufficientFunds Error] ' + e.message)
    }
  }
}

async function initialize() {
  log.bright(exchangeId.green, "initialize started")
  return  new Promise (async (resolve, reject) => {
    try {
      resolve()
    } catch (error) {
      log.red("error during the initialize data", error)
      reject(error)
    }
  })
}



async function handle_data () {
  log.bright(exchangeId.green, "handle_data started")
  return  new Promise (async (resolve, reject) => {
    try {
      //results::= [coin_prices_quote_volume, coin_prices_base_volume, coin_last, assets]
      var results = await fetchVolumes(exchanges[exchangeId], coin_pair,symbol,  symbols)
      var assets  = results[3]
      assets.sort(function (a, b) {
        if (direction==="upper") { //upper to lower
          return b[1] - a[1];
        } else {
          return a[1] - b[1];   //lower to upper
        }
        
      });
      
      if (DEBUG) {
        for (var i=0; i<assets.length;i++) {
          log.bright(exchangeId.green, "asset i-esimo", assets[i], "direction", direction.green, "price changed", price_changed.green);
        }
      }

      await fetchTickers(exchangeId, assets)
      resolve()
    } catch (error) {
      log.red("error during the handling data", error)
      reject(error)
    }
    
  })
}

//MAIN ACA (crime) Engine
(async function main() {
  let exchange
  const ids = ccxt.exchanges.filter (id => id in accounts)
  exchanges = ccxt.indexBy (await Promise.all (ids.map (async id => {
      // instantiate the exchange
      let exchange
      let nonce = 1
      
      if (id==='therock') {
          exchange = new therocksqv (ccxt.extend ( { enableRateLimit: true }, accounts[id]))
          
      } else {
          exchange = new ccxt[id] (ccxt.extend ( { enableRateLimit:true }, {'recvWindow': 60000000}, {"timeout": 30000}, accounts[id] 
      ))
     //exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
     exchange.timeout = 60000 //thanks kraken for this.
  }
  return exchange
  })), 'id')
  crime_account = exchanges[exchangeId].account_crime
  initFile(exchangeId)
  if (bootEnv===true) {
    log.bright.green("SQV .::CRIME - cryptocurrency "+algo_namespace+"::. - Version",version)
    log.bright("EXCHANGE",exchangeId.green)
    log.bright("SYMBOL/ASSET", symbol.toString().green)
    log.bright("COIN PAIR", coin_pair.toString().green)
    log.bright("PROFIT", profit.toString().green)

    log.bright("WALLET PERCENTAGE", wallet_percentage.toString().green)
    log.bright("WALLET DIVIDER", wallet_divider.toString().green)
    log.bright("COIN FEE", coin_fee.toString().green)
    log.bright("COIN FEE CHARGE", coin_fee_charge.toString().green)
    log.bright("COIN FEE THRESHOLD", coin_fee_threshold.toString().green)
    log.bright("OHLCV TIMEWINDOW", ohlcv_period.toString().green)
    log.bright("TI FILTER", TI_FILTER.toString().green)
    log.bright("ORDERBOOK FILTER", ob_filter.toString().green)
    log.bright("RSI FILTER", RSI_FILTER.toString().green)
    log.bright("RSI OVERSOLD", RSI_OVERSOLD.toString().green)
    log.bright("RSI OVERBOUGHT", RSI_OVERBOUGHT.toString().green)
    log.bright("MFI FILTER", MFI_FILTER.toString().green)
    log.bright("MFI OVERSOLD", MFI_OVERSOLD.toString().green)
    log.bright("MFI OVERBOUGHT", MFI_OVERBOUGHT.toString().green)
    log.bright("CCI FILTER", CCI_FILTER.toString().green)
    log.bright("CCI OVERSOLD", CCI_OVERSOLD.toString().green)
    log.bright("CCI OVERBOUGHT", CCI_OVERBOUGHT.toString().green)
    log.bright("ADX FILTER", ADX_FILTER.toString().green)
    log.bright("BB FILTER", BB_FILTER.toString().green)

    log.bright("STUB", STUB.toString().green)
    log.bright("STUB WALLET COIN", sqvCoin.toString().green)
    log.bright("STUB WALLET AMOUNT", sqvAmount.toString().green)
    log.bright("STOPLOSS ENABLED", stoploss_enabled.toString().green)
    log.bright("STOPLOSS THRESHOLD", stoploss.toString().green)
    log.bright("STOPLOSS COUNTER", stoploss_counter.toString().green)
    log.bright("STOPLOSS TIME WINDOW", stoploss_timewindows.toString().green)
    log.bright("HISTORY TREND", direction.toString().green)
    log.bright("HISTORY PRICE CHANGED", price_changed.toString().green)
    log.bright("SPREAD HIGH LOW THRESHOLD", spread_high_low_threshold.toString().green)
    log.bright("SPREAD HIGH LOW ENABLED", spread_hl_filter.toString().green)
    log.bright("SPREAD HIGH LOW LEVEL", spread_hl_level.toString().green)
    log.bright("VOLUME FILTER", VOLUME_FILTER.toString().green)
    log.bright("VOLUME THRESHOLD", VOLUME_THRESHOLD.toString().green)
    log.bright("SPREAD FILTER", SPREAD_FILTER.toString().green)
    log.bright("SPREAD THRESHOLD", SPREAD_THRESHOLD.toString().green)
    log.bright("LIMIT FILTER", LIMIT_FILTER.toString().green)


    let total = 0
    let missing = 0
    let implemented = 0
    try {
     
      log.bright("CRIME ACCOUNT", crime_account.green)
      
      //Retrieving balnce from exchanges & markets
      await fetchBalances(exchanges[exchangeId]);
      var master_wallet = fetchBalance(symbol, exchanges[exchangeId])

      if (typeof master_wallet === 'undefined' || isNaN(master_wallet) ) {
          log.red ("no wallet enough for arbitrage",master_wallet )
          process.exit(1);
      }
      //....now
      date1 = new Date();
      
      if (!exchanges[exchangeId]) exchanges[exchangeId] = {}
      exchange = exchanges[exchangeId];
      log.magenta("Exchange", exchangeId, "loadmarket");
      const _markets = await exchange.loadMarkets()
      //log.magenta("Exchange", exchangeId, "loadmarket", _markets);
      await ccxt.sleep (exchange.rateLimit)
      
      if (!markets[exchangeId]) markets[exchangeId] = {}
      markets[exchangeId]=_markets //for retrieving limits please see here: const market = markets[exchange.id][symbol].limits
      tradingFee_taker  = exchange.fees.trading.taker
      tradingFee_maker  = exchange.fees.trading.maker

      log.magenta (exchangeId.green,algo_namespace.yellow, "trading fee taker", tradingFee_taker.toString().green)
      log.green (exchangeId.green,algo_namespace.yellow,"trading fee maker", tradingFee_maker.toString().green)
      //link coin pair to exchange  
      exchanges_markets[exchangeId] = exchange.symbols.toString();
      log (exchanges[exchangeId].id.green, 'loaded', exchange.symbols.length.toString ().bright.green, 'symbols')
      symbols = exchange.symbols
      log.bright(exchangeId.green,algo_namespace.yellow,"symbols", symbols.toString().green);

      //CHECK CAPABILITES
      let result = {};
      let total = 0
      let missing = 0
      let implemented = 0
      capabilities.forEach (key => {

          total += 1
          let capability = exchange.has[key].toString ()
          if (!exchanges[exchangeId].has[key]) {
              capability = exchange.id.red
              missing += 1
          } else {
              capability = exchange.id.green,algo_namespace.yellow
              implemented += 1
          }
          result[key] = capability
      })
      
      log (result)
      log (implemented.toString ().green, 'implemented and', missing.toString ().red, 'missing methods of', total.toString ().yellow, 'methods it total')
      await ccxt.sleep (exchanges[exchangeId].rateLimit)
     
      var  quantity =  (master_wallet * wallet_percentage)/100
      log (exchanges[exchangeId].id.green, 'wallet amount available for trading ('+symbol.toString().bright.green+')', quantity.toString().bright.green)
      quantity = exchanges[exchangeId].amountToPrecision(coin_pair, quantity)
      master_wallet = exchanges[exchangeId].amountToPrecision(coin_pair, master_wallet)
      if (master_wallet<quantity) {
        log.red ("no wallet enough for arbitrage +++",master_wallet )
        log.red ("quantity is more than amout available","wallet", master_wallet, "quantity set", quantity )
        process.exit(1);
      
      }

      await initialize()
      
    } catch (e) {
      log.bright.red (exchangeId,"error main",e)
      if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchangeId,"error main",'[DDoS Protection] ' + e.message)
      } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchangeId,"error main",'[Request Timeout] ' + e.message)
      } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchangeId,"error main",'[Authentication Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchangeId,"error main",'[Exchange Not Available Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchangeId,"error main",'[Exchange Error] ' + e.message)
      } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchangeId,"error main",'[Network Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidNonce) {
        log.bright.yellow(exchangeId,"error main",'[InvalidNonce Error] ' + e.message)
      }else if (e instanceof ccxt.OrderNotFound) {
        log.bright.yellow(exchangeId,"error main",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
        log.bright.yellow(exchangeId,"error main",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
        log.bright.yellow(exchangeId,"error main",'[InsufficientFunds Error] ' + e.message)
      }
      mainError = true 
    }
  }
  if (!mainError) {
    bootEnv = false;
    try {
      await handle_data()
      //await fetchTIs("binance", "ETH/BTC")
    } catch (e) {
      log.red (exchangeId.green,"error main",e)
      if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchangeId,"error main",'[DDoS Protection] ' + e.message)
      } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchangeId,"error main",'[Request Timeout] ' + e.message)
      } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchangeId,"error main",'[Authentication Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchangeId,"error main",'[Exchange Not Available Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchangeId,"error main",'[Exchange Error] ' + e.message)
      } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchangeId,"error main",'[Network Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidNonce) {
        log.bright.yellow(exchange.id,"error main",'[InvalidNonce Error] ' + e.message)
      } else if (e instanceof ccxt.OrderNotFound) {
        log.bright.yellow(exchange.id,"error main",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
        log.bright.yellow(exchange.id,"error main",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
        log.bright.yellow(exchange.id,"error main",'[InsufficientFunds Error] ' + e.message)
      }
    }

  }
  setTimeout(main, 5000); 
}

) ()
