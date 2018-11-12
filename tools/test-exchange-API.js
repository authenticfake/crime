"use strict";


/*  ------------------------------------------------------------------------ */
const Promise     = require("bluebird");
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice
require('./settings.js')();
var database            = require('./db-aca.js');  //sqllite3.x
var therocksqv = require ('./therocksqv.js')
let result = {};
const functions = require ('./functions')
// const binance = require('node-binance-api');
// binance.options({
//   APIKEY: 'OLCpigNxkdEGcfcXvI3wxAGUtixwreoZxBj4ts7PfthpD9o5Y9rwH9QZJMLCHY9F',
//   APISECRET: 'nn8b60cGwqlsinFWdYyUpsbw8PSMUAxvZxQLxv1iSiE7UXXra6XtHeym2PVXzj30',
//   useServerTime: false, // If you get timestamp errors, synchronize to server time at startup
//   test: false // If you want to use sandbox mode where orders are simulated
// });

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
let buffer = new Buffer('{"addresses":')
//{"addresses": { "binance" :[{ "ADA_address":"DdzFFzCqrhsqA4jTMDgVUvk6A4QrHBfZMPM7foKCqEjeWda9eZCchn2SjsYE6KLdFUNoZfiJaeQ8umgwFy1JpV8dKgbafGR24wBh46an", "ADA_tag":"", "BTG_address":"GM7bi5y9NXT8kuzDY4M7ieFAqGroM2uTDe", "BTG_tag":"", 

let printUsage = function () {
    log ('Usage: node', process.argv[1],'symbol'.yellow
    printSupportedExchanges ()
}


function costToPrecision (symbol, cost, precision) {
        return parseFloat (cost).toFixed (precision)
    } 
function toFixed (x) { // avoid scientific notation for too large and too small numbers

    if (Math.abs (x) < 1.0) {
        const e = parseInt (x.toString ().split ('e-')[1])
        if (e) {
            x *= Math.pow (10, e-1)
            x = '0.' + (new Array (e)).join ('0') + x.toString ().substring (2)
        }
    } else {
        let e = parseInt (x.toString ().split ('+')[1])
        if (e > 20) {
            e -= 20
            x /= Math.pow (10, e)
            x += (new Array (e+1)).join ('0')
        }
    }
    return x
}
var opportunities = []


;(async function main () {

  
    

   // initFile()
    let total = 0
    let missing = 0
    let implemented = 0
    //var baseCoins = [ "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
    var baseCoins = ["HOT/BTC","HOT/ETH", "ETH/BTC"]
    var accounts  = require ('./credentials-1.json')
    let exchange
    const ids = ccxt.exchanges.filter (id => id in accounts)
    var exchanges = ccxt.indexBy (await Promise.all (ids.map (async id => {
        // instantiate the exchange
        let exchange
        let nonce = 1
        
        if (id==='therock') {
            exchange = new therocksqv (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id]))
        } else {
            exchange = new ccxt[id] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id], {
                nonce: function () { return this.milliseconds ()/1000 }
        }))
       // exchange.nonce = function () { return nonce++ }
            

        }
        return exchange
    })), 'id')

    exchange = exchanges["binance"]

    if (process.argv.length > 3) {

            const symbol = process.argv[2].toUpperCase ()
            await pfetchTicker (exchange, symbol)

      } else {

            printUsage ()
      }


    // exchanges["therocksqv"]  = new therocksqv (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts["therocksqv"]))
    // ids[ids.length] = "therocksqv";
    
    for(var index = 3; index < baseCoins.length;index++){
        var currency = baseCoins[index]
        var symbol = currency
        log.bright("currency",currency)
        exchange = exchanges["binance"]
        try {
            var params = {
                nonce: Date.now().toString(),
                'new': 'true',
            }
            
            const markets = await exchange.loadMarkets()
            //log.green(exchange.id, "symbol ", symbol, "markets", markets)

            //await ccxt.sleep (exchange.rateLimit)
            const market = markets[symbol]
            //const market = exchange.getMarket(symbol)
            
            if (market.limits === undefined) {
                log.red ('market.limits property is not set')
            }
            const { price, amount, cost } = market.limits
            if (price === undefined || amount === undefined || cost === undefined) {  
                log.red ('market.limits.[price|amount|cost] property is not set.')
               
            }

            var ticker = await exchange.fetchTicker(symbol)
            //log.magenta("ticker",ticker)
            
            var bid = ticker["bid"]
            var ask = ticker["ask"]
            bid  = exchange.priceToPrecision( symbol,bid)
            ask  = exchange.priceToPrecision( symbol,ask)
            
            log.bright(symbol.green,"ticker bid ",bid.toString().green, "ask ", ask.toString().magenta)
            var profit =0.004
            
            var p = functions.fetchProfit (bid, profit, markets[symbol].precision.price )
            log.red("new profit", p)
            var bidP = bid * (1 + p)
            var askP = ask * (1 + p)
            bidP  = exchange.priceToPrecision( symbol,bidP)
            askP  = exchange.priceToPrecision(symbol,askP)
            
                 
        }
        catch (error) {
            log.red(exchange.id.toString().magenta, "error:",error)
            log.red(exchange.id.toString().magenta, "error message:",error.message)


           }
       }
       var symbol = "NCASH/BTC"
       var quantity  = 0.06

       exchange = exchanges["binance"]
       const markets = await exchange.loadMarkets()
       var ticker = await exchange.fetchTicker(symbol)
       //log.magenta("ticker",ticker)
       
       var bid = ticker["bid"]
       var ask = ticker["ask"]
       bid  = exchange.priceToPrecision( symbol,bid)
       ask  = exchange.priceToPrecision( symbol,ask)

       var amount = quantity/ask
       log.bright(symbol.green,"quantity", quantity, "amount", amount)

       log.bright(symbol.green,"ticker bid ",bid.toString().green, "ask ", ask.toString().magenta)
       var profit =0.004
       
       var p = functions.fetchProfit (bid, profit, markets[symbol].precision.price )
       log.red("new profit", p)
       var bidP = bid * (1 + p)
       var askP = ask * (1 + p)
       bidP  = exchange.priceToPrecision( symbol,bidP)
       askP  = exchange.priceToPrecision(symbol,askP)

       symbol = "NCASH/BNB"
       var ticker1 = await exchange.fetchTicker(symbol)
       var bid1 = ticker1["bid"]
       var ask1 = ticker1["ask"]
       bid1  = exchange.priceToPrecision( symbol,bid1)
       ask1  = exchange.priceToPrecision( symbol,ask1)
       log.bright(symbol.green,"ticker bid1",bid1.toString().green, "ask1", ask1.toString().magenta)
       

       symbol = "BNB/BTC"
       var ticker2 = await exchange.fetchTicker(symbol)
       var bid2 = ticker2["bid"]
       var ask2 = ticker2["ask"]
       bid2  = exchange.priceToPrecision( symbol,bid2)
       ask2  = exchange.priceToPrecision( symbol,ask2)
       log.bright(symbol.green,"ticker bid2",bid2.toString().green, "ask2 ", ask2.toString().magenta)
       

       var amountCoinsBought = amount*ask
       log.bright(symbol.green,"amountCoinsBought",exchange.priceToPrecision( symbol,amountCoinsBought))

       var amountCoinsSold = amount*bid1
       log.bright(symbol.green,"amountCoinsSold",exchange.priceToPrecision( symbol,amountCoinsSold))

       var amountCoinsReceived = amountCoinsSold*bid2
       log.bright(symbol.green,"amountCoinsSold",exchange.priceToPrecision( symbol,amountCoinsReceived))

      
      // log.magenta("ticker", ticker)
      // var balance = await exchange.fetchBalance()
      // log.magenta("balance", balance.total)
     
       }
       

) ()