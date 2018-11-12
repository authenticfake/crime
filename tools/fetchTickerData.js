'use strict'
const ccxt      = require ('ccxt');
var math        = require ('mathjs');
const ansi      = require ('ansicolor').nice
const asTable   = require ('as-table')
const fs        = require ('fs')
const log       = require ('ololog').configure ({ locate: false })
var therocksqv = require ('./therocksqv.js')
var accounts  = require ('./credentials-1.json')

var exchanges =[]
require('./settings.js')(); //Includes settings file. 

let fileCSV = ''; //opportunities enalbed
var quoteCoins = ["USDT","ETH","BTC"];
//var quoteCoins = [ "USD","EUR", "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
var baseCoins = [ "BTC", "ETH","TRX","XVG", "XRP", "XLM", "NEO", "IOTA", "ADA", "OMG", "QTUM", "SC",  "ZEC", "DOGE", "LTC",  "BCH"];

function initAnalyticsFile(exchange, base, quote) {
        var timestamp = new Date().getTime();
        fileCSV = './data/opportunities.'+new Date().getFullYear() +'.'+new Date().getMonth() +'.'+exchange+'.'+base +'.'+quote +'.csv'; //opportunities enalbed
        // try {
        //     fs.unlinkSync(fileCSV,(err) => {  
        //             if (err) log.red( err.message);
        //             log.magenta('CSV created for writing the opportunity found during the arbitrage!!!');
        //         });  
        // } catch (error) {
        //     log("error during delete file");
        // }
        fs.appendFile(fileCSV, "symbol, timestamp, datetime, high, low, bid, bidVolume,ask,askVolume,vwap,open,close,last,previousClose,change,percentage,average,baseVolume,quoteVolume",(err) => {  
                    if (err) log.red( err.message);
                    log.magenta('CSV created for writing the opportunity found during the arbitrage!!!')})
    
}

(async function main() {
    log.bright.green("SQV .::cryptocurrency market data ::.Version 0.8 ")
    log.bright.green("Fetch Type:", FETCH_TYPE);
    let arrayOfRequests = [];
    

    const ids = ccxt.exchanges.filter (id => id in accounts)
    exchanges = ccxt.indexBy (await Promise.all (ids.map (async id => {
        let exchange 
        if (id==="therock") {
            // instantiate the exchange
            exchange = new therocksqv (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id]))
        } else if (id==="gdax") { 
                exchange = new ccxt[id] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id], {
                    nonce: function () { return (this.milliseconds ()/1000) }
            }) )

        } else{
            // instantiate the exchange
            exchange = new ccxt[id] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id]))
        }
        
        return exchange
    })), 'id')

    var bootEnv=true;
    // //Retrieving balnce from exchanges & markets
    for (let i = 0; i < ids.length; i++) {
        bootEnv = true
        for(var j = 0; j < baseCoins.length;j++){
            bootEnv = true
            for(var index = 0; index < quoteCoins.length;index++){
                let coinName = baseCoins[j] + "/" + quoteCoins[index];
                try {
                    if (bootEnv===true) {
                        initAnalyticsFile(ids[i], baseCoins[j],quoteCoins[index] )

                    }
                    var symbol = coinName 
                    bootEnv = false;
                    var exchange = exchanges[ids[i]];
                    //exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
                    exchange.timeout = 60000 //thanks kraken for this.
                    log.magenta("Exchange", ids[i], "loadmarket");
                    var ticker = await exchange.fetchTicker(symbol)
                    // log.cyan("quote_volume:", ticker['quoteVolume'], symbol);
                    // log.cyan("base_volume:", ticker['baseVolume'], symbol);
                    // log.magenta("ticker", ticker)
                    var textCSV = ticker.symbol+"," + ticker.timestamp +"," + ticker.datetime +"," + ticker.high +","
                    textCSV += ticker.low+"," + ticker.bid +"," + ticker.bidVolume +"," + ticker.ask +","
                    textCSV += ticker.askVolume+"," + ticker.vwap +"," + ticker.open +"," + ticker.close +","
                    textCSV += ticker.last+"," + ticker.previousClose +"," + ticker.change +"," + ticker.percentage +","
                    textCSV += ticker.average+"," + ticker.baseVolume +"," + ticker.quoteVolume
                    

                    fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                        if (err) log.red( err.message);
                        log.magenta('CSV were updated with the opportunity found !!!');
                    }); 
                    log.magenta("textCSV", textCSV)
                    

                    await ccxt.sleep (exchange.rateLimit)
                    if (!markets[ids[i]]) markets[ids[i]] = {}
                    markets[ids[i]]=_markets //for retrieving limits please see here: const market = markets[exchange.id][symbol].limits
                    //link coin pair to exchange  
                    exchanges_markets[ids[i]] = exchange.symbols.toString();
                    log (exchanges[ids[i]].id.green, 'loaded', exchange.symbols.length.toString ().bright.green, 'symbols')
                    //CHECK CAPABILITES
                    let result = {};
                    let total = 0
                    let missing = 0
                    let implemented = 0
                    
                    capabilities.forEach (key => {

                        total += 1
                        let capability = exchange.has[key].toString ()
                        if (!exchanges[ids[i]].has[key]) {
                            capability = exchange.id.red
                            missing += 1
                        } else {
                            capability = exchange.id.green
                            implemented += 1
                        }
                        result[key] = capability
                    })
                    
                    log (result)
                    log (implemented.toString ().green, 'implemented and', missing.toString ().red, 'missing methods of', total.toString ().yellow, 'methods it total')
                    await ccxt.sleep (exchanges[ids[i]].rateLimit)

                } catch (error) {
                    log.red(error.message)
                }
            }
        }
        
    }
    bootEnv = false;
    
    //checkExchangeCapabilities();
    //Retrieving quotation from exchanges & markets
    

    setTimeout(main, 6*10000);
})();