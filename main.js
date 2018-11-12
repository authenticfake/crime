/**
 * cripto merde - crime
 */

'use strict'
const ccxt      = require ('ccxt');
const ansi      = require ('ansicolor').nice
const asTable   = require ('as-table')
const fs        = require ('fs')
const log       = require ('ololog').configure ({ locate: false })
const functions = require ('./functions')
var tradersFee  = require ('./trading.fee.json');
var altCoinsAddesses  = require('./withdraw.addresses.json');
var therocksqv  = require ('./therocksqv.js')
var accounts    = require ('./credentials-1.json')
//exchanges_markets load all markets by exchange 
var exchanges_markets = []
var markets={}
var exchanges =[]
require('./settings.js')(); //Includes settings file. 
var database=require('./db-aca.js');  //sqllite3.x
var engine = require ('./engine-aca.js')

//opportunities tracking
let fileCSV = './data/opportunities.'+sqvAmount+'.'+sqvCoin +'.csv'; //opportunities enalbed
const NULL_CRITERIA="TBD"



const log4js = require('log4js');
// log the cheese logger messages to a file, and the console ones as well.
log4js.configure( {
    appenders: {
        file: {
            type: 'file',
            filename: 'logs/crime-arbitrage.log',
            maxLogSize: 10 * 1024 * 1024, // = 10Mb
            numBackups: 5, // keep five backup files
            compress: true, // compress the backups
            encoding: 'utf-8',
            pattern: 'yyyy-MM-dd-hh',
            mode: 0o0640,
            flags: 'w+'
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
//CACHE
const NodeCache = require( "node-cache" );
const cache = new NodeCache( { stdTTL: 86400} );

const enableRateLimit = true
var quoteCoins = ["USD", "USDT","ETH","BTC"];
//var quoteCoins = [ "USD","EUR", "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
var baseCoins = [ "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];

var bitfinexCoinsWithdraw = ['BTC','LTC','ETH','ETC','OMNI','ZEC','XMR','USD','DASH','XRP','EOS','BCH','NEO','AVT','QTUM','EDO']
var binanceCoinsNoWithdraw = ['IOTA', 'DOGE', 'XRB', 'XEM', 'SC']
var hitbtc2CoinsNoWithdraw = ['ADA', 'ICX', 'IOTA', 'NEO', 'XLM','XMR', 'XRB','TRX'] //not workin on frb 12 2018 the following altcoin: ICX, NEO, XMR, TRX. Please see withdraw.address.json
var poloniexCoinsNoWithdraw = ['ADA', 'BTG', 'EOS', 'ICX', 'IOTA', 'QTUM', 'TRX', 'XRB', 'XVG', 'ETH']
var crypropiaCoinsNoWithdraw = ['BTG', "BCH"] //BTG is BITGEM and BCH is BCash

//var quoteCoins = [ "USD", "DASH", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
//var baseCoins = [ "DASH","EOS", "ETC", "ICX", "IOTA", "NEO",  "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];
//var baseCoins = [ "ADA", "EOS","ZEC", "NEO", "XEM","XLM", "LTC", "BTC", "ETH", "XRP", "BCH"];
//var quoteCoins= ["USD", "ADA", "EOS","ZEC", "NEO", "XEM","XLM", "LTC", "BTC", "ETH", "XRP", "BCH"];
log.bright.green ('Starting app...');

const request = require('request'), Promise = require("bluebird"); //request for pulling JSON from api. Bluebird for Promises.

const express = require('express'),
app = express(),
helmet = require('helmet'),
http = require('http').Server(app),
io = require('socket.io')(http); // For websocket server functionality

app.use(helmet.hidePoweredBy({setTo: 'PHP/5.4.0'}));

const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/docs'));

http.listen(port, function () {
    log.bright.magenta('listening on', port);
});

let coinNames = [];
let sqvWallets={}


io.on('connection', function (socket) {
    log.magenta("connected")
    socket.on('buyAltCoin', async function (coin,exchange_id, amount,price, side, transaction_id) {
        await engine.buyAltCoin(coin,exchanges[exchange_id], amount,price, side, transaction_id);
    });
    socket.on('withdrawal',async function (coin,exchangeA, amount, exchangeB, side, transaction_id) {
        log.magenta('hi withdrawal');
        await engine.withdrawal(coin,exchanges[exchangeA], amount,exchanges[exchangeB], side, transaction_id);
    });
    socket.on('sellAltCoin',async function (coin,exchange_id, amount,price, side,transaction_id) {
        log.magenta('hi sellAltCoin');
        await engine.sellAltCoin(coin,exchanges[exchange_id], amount,price, side,transaction_id)
    });

    socket.emit('coinsAndMarkets', [marketNames, coinNames]);
    socket.emit('results', results);
    });

// deprecated
function currencyId (currency) {
        if (currency === 'Bitmark')
            return 'BTM';
        if (currency === 'XLM')
            return 'STR';
        return currency;
}

function initAnalyticsFile() {
    if (COUNT_OPPORTUNITIES) {
        try {
            fs.unlinkSync(fileCSV,(err) => {  
                    if (err) log.red( err.message);
                    log.magenta('CSV created for writing the opportunity found during the arbitrage!!!');
                });  
        } catch (error) {
            log("error during delete file");
        }
        fs.appendFile(fileCSV, "date, market1, market2, market1price, market2price, coin, feeTaker,feeMaker,withdrawal,deposit,quoteVolume,quoteBase,spred_wo_fee,coinToBuy,netCoinToBuy,walletAmount,futureWalletAmount,grossPriceSpread,netAmountSpread,grossPriceSpreadPerc,netAmountSpreadPerc,gainAmount,gainAmountPerc",(err) => {  
                    if (err) log.red( err.message);
                    log.magenta('CSV created for writing the opportunity found during the arbitrage!!!')})
    }
}
// coin_prices is an object with data on price differences between markets. = {BTC : {market1 : 2000, market2: 4000, p : 2}, } (P for percentage difference)
// results is a 2D array with coin name and percentage difference, sorted from low to high.
let coin_last_prices= {}, coin_prices = {}, coin_sell = {},coin_prices_quote_volume={}, coin_prices_base_volume={}, numberOfRequests = 0, results = []; // GLOBAL variables to get pushed to browser.

// retrieving ticker details by fetchTicker(symbol)
/**
 * @deprecated since version 0.5
 * See getMarketTickers(exchId, coin_prices,coin_sell)
 */
function getMarketPrices(exchId, coin_prices,coin_sell) {   //GET JSON DATA
    return  new Promise (async (resolve, reject) => {

        try {
            const exchange =  exchanges[exchId];
            var _coionName = "";
            for(var j = 0; j < baseCoins.length;j++){

                for(var i = 0; i < quoteCoins.length;i++){
                    let coinName = baseCoins[j] + "/" + quoteCoins[i];
                    if (cache.get(exchId +"-"+coinName)!=null ) { continue;}
                    if (baseCoins[j] != quoteCoins[i] && exchanges_markets[exchId].includes(coinName)) {
                        for (let numRetries = 0; numRetries < maxRetries; numRetries++) {
                            _coionName = coinName;
                            try { // try to load exchange markets using current proxy

                                if (exchId==="poloniex" && coinName.includes("XML")) {
                                    coinName = coinName.replace("XML", "STR");
                                }
                                if (exchId==="kraken" && coinName.includes("BTC")) {
                                    coinName = coinName.replace("BTC", "XBT");
                                }
                                //exchange.proxy =exchange.has['CORS']?undefined:proxies[currentProxy]
                                
                                const ticker = await exchange.fetchTicker (coinName)
                                await ccxt.sleep (exchange.rateLimit)
                                coinName = _coionName


                                //console.log ("exchange id ["+exchId+"] hasFetchTrades ["+exchange.hasFetchTrades+"] date time[" + ticker['datetime'] +"] bid [" + ticker['bid'] +"] ask ["+ ticker['ask'] +"]")
                                coinName = coinName.replace("/", "-");
                                if (!coin_prices[coinName]) coin_prices[coinName] = {};
                                if (!coin_prices_quote_volume[coinName]) coin_prices_quote_volume[coinName] = {};
                                if (!coin_prices_base_volume[coinName]) coin_prices_base_volume[coinName] = {};
                                if (!coin_sell[coinName]) coin_sell[coinName] = {};
                                if (!coin_last_prices[coinName]) coin_last_prices[coinName] = {};
                                
                                
                                coin_prices[coinName][exchId] = ticker['bid'];
                                coin_prices_quote_volume[coinName][exchId] = ticker['quoteVolume'];
                                coin_prices_base_volume[coinName][exchId] = ticker['baseVolume'];
                                
                                coin_sell[coinName][exchId] = ticker['ask'];
                                
                                coin_last_prices[coinName][exchId]=ticker['last'];
                                
                                if (DEBUG) {
                                    log.green("coin_buy:", coin_prices);
                                    log.lightBlue("coin_sell:", coin_sell);
                                    //log.cyan("coin_last_prices:", coin_last_prices);
                                    //log.cyan("coin_prices_quote_volume:", coin_prices_quote_volume);
                                    //log.cyan("coin_prices_base_volume:", coin_prices_base_volume);

                                }
                                if (numberOfRequests >= 1) computePrices(coin_prices, coin_sell, coin_last_prices);//, coin_sell);
                                numRetries = maxRetries;
                

                            } catch (e) { // rotate proxies in case of connectivity errors, catch all other exceptions

                                // swallow connectivity exceptions only
                                if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
                                    log.red ('[DDoS Protection Error] ' + e.message)
                                } else if (e instanceof ccxt.RequestTimeout) {
                                    log.red ('[Timeout Error] ' + e.message)
                                } else if (e instanceof ccxt.AuthenticationError) {
                                    log.red ('[Authentication Error] ' + e.message)
                                } else if (e instanceof ccxt.ExchangeNotAvailable) {
                                    log.red ('[Exchange Not Available Error] ' + e.message)
                                } else if (e instanceof ccxt.ExchangeError) {
                                    log.red ('[Exchange Error] ' + e.message)
                                    cache.set(exchId +"-"+coinName, "coin ["+coinName+"] not supported from ["+exchId+"]")
                                } else {
                                    //throw e; // rethrow all other exceptions
                                    //log ("exchange id ["+exchId+"] doesn't support ["+coinName+"]. Please verify it.");
                                }

                                // retry next proxy in round-robin fashion in case of error
                                currentProxy = ++currentProxy % proxies.length 
                            }
                        }
                   }
               }
           }
           numberOfRequests++;
           resolve([coin_prices, coin_sell, coin_last_prices]);
       } catch (error) {
                log.bright.red ("Error retrieving tickers ",  error); //Throws error
                reject(error);
            }
        })
}
// retrieving ticker details by fetchTickers()
function getMarketTickers(exchId, coin_prices,coin_sell) {   //GET JSON DATA
    return  new Promise (async (resolve, reject) => {

        try {
            const exchange =  exchanges[exchId];
            var coinName = "";
            for (let numRetries = 0; numRetries < maxRetries; numRetries++) {
                try { // try to load exchange markets using current proxy
                    //exchange.proxy =exchange.has['CORS']?undefined:proxies[currentProxy]
                    const tickers = await exchange.fetchTickers();
                    await ccxt.sleep (exchange.rateLimit)
                    Object.keys (tickers).map (exchangeId => {
                        const ticker = tickers[exchangeId]
                        const symbol = ticker['symbol']
                        var bCoin, qCoin 
                        bCoin = symbol.slice(0,symbol.indexOf("/"))
                        qCoin = symbol.slice(symbol.indexOf("/")+1)
                        if (quoteCoins.includes(qCoin) && baseCoins.includes(bCoin) ) {
                            coinName = symbol.replace("/", "-");
                            if (!coin_prices[coinName]) coin_prices[coinName] = {};
                            if (!coin_prices_quote_volume[coinName]) coin_prices_quote_volume[coinName] = {};
                            if (!coin_prices_base_volume[coinName]) coin_prices_base_volume[coinName] = {};
                            if (!coin_sell[coinName]) coin_sell[coinName] = {};
                            if (!coin_last_prices[coinName]) coin_last_prices[coinName] = {};
                            
                            
                            coin_prices[coinName][exchId] = ticker['bid'];
                            coin_prices_quote_volume[coinName][exchId] = ticker['quoteVolume'];
                            coin_prices_base_volume[coinName][exchId] = ticker['baseVolume'];
                            coin_sell[coinName][exchId] = ticker['ask'];
                            coin_last_prices[coinName][exchId]=ticker['last'];
                            
                            
                            if (DEBUG) {
                                log.green("coin_buy:", coin_prices);
                                log.lightBlue("coin_sell:", coin_sell);
                                //log.cyan("coin_last_prices:", coin_last_prices);
                                //log.cyan("coin_prices_quote_volume:", coin_prices_quote_volume);
                                //log.cyan("coin_prices_base_volume:", coin_prices_base_volume);

                            }
                            if (numberOfRequests >= 1) computePrices(coin_prices, coin_sell, coin_last_prices);//, coin_sell);
                            numRetries = maxRetries;

                        }
                    })               
                }
                catch (e) { // rotate proxies in case of connectivity errors, catch all other exceptions
                    // swallow connectivity exceptions only
                    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
                        log.red ('[DDoS Protection Error] ' + e.message)
                    } else if (e instanceof ccxt.RequestTimeout) {
                        log.red ('[Timeout Error] ' + e.message)
                    } else if (e instanceof ccxt.AuthenticationError) {
                        log.red ('[Authentication Error] ' + e.message)
                    } else if (e instanceof ccxt.ExchangeNotAvailable) {
                        log.red ('[Exchange Not Available Error] ' + e.message)
                    } else if (e instanceof ccxt.ExchangeError) {
                        log.red ('[Exchange Error] ' + e.message)
                        cache.set(exchId +"-"+coinName, "coin ["+coinName+"] not supported from ["+exchId+"]")
                    } else {
                        throw e; // rethrow all other exceptions
                        //log ("exchange id ["+exchId+"] doesn't support ["+coinName+"]. Please verify it.");
                    }
                    // retry next proxy in round-robin fashion in case of error
                    currentProxy = ++currentProxy % proxies.length 
                }
            }
            numberOfRequests++;
            resolve([coin_prices, coin_sell, coin_last_prices]);
       } catch (error) {
                log.bright.red ("Error retrieving tickers ",  error); //Throws error
                reject(error);
            }
        })
}

function endsWith(str, suffix) {
    console.log("endsWith str", str)
    return str.toString().indexOf(suffix, str.length - suffix.length) !== -1;
}
//https://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript
function toFixed(x) {
  if (Math.abs(x) < 1.0) {
    var e = parseInt(x.toString().split('e-')[1]);
    if (e) {
        x *= Math.pow(10,e-1);
        x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
    }
  } else {
    var e = parseInt(x.toString().split('+')[1]);
    if (e > 20) {
        e -= 20;
        x /= Math.pow(10,e);
        x += (new Array(e+1)).join('0');
    }
  }
  return x;
}
/**
* Find Bid by Exchange and Market info
*/
function findBidByExchangeAndMarket(exchange, market) {
    return coin_prices[market][exchange]
}
/**
* Find Ask by Exchange and Market info
*/
function findAskByExchangeAndMarket(exchange, market) {
    return coin_sell[market][exchange]
}
/**
* Find Last by Exchange and Market info
*/
function findLastByExchangeAndMarket(exchange, market) {
    return coin_last_prices[market][exchange]
}

//check opportunities where altcoin doens't support withdrawal features (by exchangeIdToBuy)
function checkMarketCoin(exchID,coinBase ) {
    //Feb 10 2018: SQV.TEAM EXCEL
    if (exchID=="bitfinex" && !bitfinexCoinsWithdraw.includes(coinBase)) {
        return false;
    }//Feb 10 2018: SQV.TEAM EXCEL
    if (exchID=="binance" && binanceCoinsNoWithdraw.includes(coinBase)) {
        return false;
    }//Feb 14 2018: SQV.TEAM EXCEL
    if (exchID=="hitbtc2" && hitbtc2CoinsNoWithdraw.includes(coinBase)) {
        return false;
    }//Feb 14 2018: SQV.TEAM EXCEL
    if (exchID=="poloniex" && poloniexCoinsNoWithdraw.includes(coinBase)) {
        return false;
    }
    if (exchID=="cryptopia" && crypropiaCoinsNoWithdraw.includes(coinBase)) {
        return false;
    }
    crypropiaCoinsNoWithdraw
    return true;;
}

//check if a process is already started by exchange id and coinpair
//TO BE TESTED
function isOpportunityOngoing(exchangeid, coinpair){
  try {
    
     log("database.sql_select_by_exchangeid_coinpair", exchangeid, coinpair)
    
     database.db.all(database.sql_select_by_exchangeid_coinpair, [exchangeid, coinpair], function(err, rows, fields){
        console.log("check process",rows);

        res.json({ "data" : rows });
        rows.forEach((row) => {
            return true;
        });
        return false;
       
                
     });
  } catch (err) {
    
    console.error(err.message)
    return false;
    //next(err);
  }
}



//calculate Wallet on the other side of opportunity. Used for the roundtrip. See: OPPORTUNITIES_SIDE on settings.js
function calculateFutureWallet(backWallet,coinBase, exchange, exchangeId,depositfee, price ) {
    var newWallet =0
    try {
        const trading_fee  = exchange.fees.trading.taker
        var withdraw_fee = exchange.fees.funding.withdraw[coinBase];
        if (typeof withdraw_fee === 'undefined' || isNaN(withdraw_fee))  {

            withdraw_fee = tradersFee.fee[exchangeId][0][coinBase +"_withdrawal"];
        }
        //log.green("calculateFutureWallet withdraw_fee", withdraw_fee, "trading_fee", trading_fee)
        var cost = (withdraw_fee + depositfee)*price
        newWallet = (backWallet - (backWallet*trading_fee)) - cost
    } catch (error) {
        log.red(exchangeId.toString().yellow, coinBase, error.messag)
    }
    return newWallet

}
//write a ts/sampling for a dummy dataset. 
//Used for future analyzing which is the best pair (amount/currency) for the arbitrage
async function opportunitiesDS(params={}) {
    if (COUNT_OPPORTUNITIES) {
        var textCSV  = "\n"+new Date().toISOString() + ","+ params.market1+","+params.market2+","+toFixed(params.market1price)+","+toFixed(params.market2price)+"," + params.coin + ","
            textCSV += params.feeTaker+","+params.feeMaker+","+params.withdrawal+","+params.deposit+","
            textCSV += params.quoteVolume+","+params.baseVolume+","+params.spred_wo_fee+","+params.coinToBuy+","
            textCSV += params.netCoinToBuy+","+params.walletAmount+","+params.futureWalletAmount+","+params.grossPriceSpread+","
            textCSV += params.netAmountSpread+","+params.grossPriceSpreadPerc+"%,"+params.netAmountSpreadPerc+"%,"+params.gainAmount+","
            textCSV += params.gainAmountPerc +"%"
     
            fs.appendFile(fileCSV,textCSV, (err) => {  
                if (err) log.red( err.message);
                log.magenta('CSV were updated with the opportunity found !!!');
            });    
    }
}

//calculate Volume from coin quote to USD(T)
function calculateUSDTVolume(exchangeId,coinQuote, quoteVolume, data){
    var priceCQ;
    if (!coinQuote.startsWith("USD")) {
        priceCQ = data[coinQuote+"-USDT"][exchangeId]
        //log.magenta("calculateUSDTVolume".yellow, exchangeId.green, "USDT priceCQ", priceCQ)
        if (priceCQ ===  undefined) {
            priceCQ = data[coinQuote+"-USD"][exchangeId]
            //log.magenta("calculateUSDTVolume".yellow, exchangeId.green, "USD priceCQ", priceCQ)
        }
    } else {
        priceCQ=1;//USD
    }
    
    const quoteVolumeUSD = quoteVolume * priceCQ
    //log.magenta("calculateUSDTVolume".yellow, exchangeId.green, "quoteVolume", quoteVolume, "priceCQ", priceCQ, "quoteVolumeUSD", quoteVolumeUSD)
    return quoteVolumeUSD;

}

async function computePrices(data, dataSell, dataLast) {
    results = [];

    function loopData() {
      return new  Promise(function (resolve, reject) {
        if (numberOfRequests >= 2) {

        for (let coin in data) {
            if (Object.keys(data[coin]).length > 1) {
                if (coinNames.includes(coin) == false) coinNames.push(coin);
                let arr = [];
                let arrSell = [];
                for (let market in data[coin]) {
                    arr.push([data[coin][market], market]);
                }
                for (let market in dataSell[coin]) {
                    if (dataSell[coin][market]!=null) {
                        arrSell.push([dataSell[coin][market], market]);
                    }
                }
                arr.sort(function (a, b) {
                    return a[0] - b[0];
                });
                arrSell.sort(function (a, b) {
                    return a[0] - b[0];
                });

                for (let i = 0; i < arr.length; i++) {
                    for (let j = 0 ; j < arrSell.length; j++) {
                        var boSameMarket = false;
                        if (arrSell[i]!=null) {
                            var exchangeIdToBuy = arr[i][1];
                            var exchangeIdToSell = arrSell[j][1];
                            if (exchangeIdToBuy===exchangeIdToSell){
                                //boSameMarket = true;
                                continue;
                            }
                                
                            if (arr[i][0]<arrSell[i][0] && !boSameMarket) {
                                // retreive base coin  currency
                                let coinBase = coin.slice(0,coin.indexOf("-"));
                                // retreive quote coin  currency -- the currency used for buying the base coin
                                let coinQuote = coin.slice(coin.indexOf("-")+1);
                                //exchange A - Exchange for staring the triangular arbitrage 
                                const exchangeToBuy  = exchanges[exchangeIdToBuy] 
                                //exchange B - Exchange for closing the triangular arbitrage
                                const exchangeToSell = exchanges[exchangeIdToSell] 
                                //remove opportunities where altcoin doesn't support withdrawal features by exchangeIdToBuy
                                if (!checkMarketCoin(exchangeIdToBuy,coinBase)) {
                                    continue;
                                }
                                //base and quote Volume for base and quote coin
                                var baseVolume = coin_prices_base_volume[coin][exchangeIdToBuy]
                                var quoteVolume = coin_prices_quote_volume[coin][exchangeIdToBuy]

                                if (typeof baseVolume === 'undefined' ) {
                                    baseVolume =0;
                                }
                                if (typeof quoteVolume === 'undefined' ) {
                                    quoteVolume =0;
                                }

                                //logger.info("Exchange" , exchangeIdToBuy, "base volume ", baseVolume, "quote volume ", quoteVolume, "for",  coin )
                                //Price to buy the base coin based on quote coin
                                const priceToBuy = arr[i][0];
                                //Price to sell the base coin based on quote coin
                                const priceToSell = arrSell[j][0];
                                //Trading fee for buying coins
                                let tradingFeeBuyer = exchangeToBuy.fees.trading.taker
                                 //Trading fee for selling coins
                                let tradingFeeSeller = exchangeToSell.fees.trading.maker
                                if (typeof tradingFeeBuyer === 'undefined' ) {
                                        tradingFeeBuyer = tradersFee.fee[exchangeIdToBuy][0]["tradingfee_buy"]; 
                                } 
                                if (typeof tradingFeeSeller === 'undefined' ) {
                                        tradingFeeSeller = tradersFee.fee[exchangeIdToSell][0]["tradingfee_sell"]; 
                                }
                                //amount of coins to buy
                                var walletAmount = fetchBalance(coinQuote, exchangeIdToBuy);
                                //skip opportunity with wallet balance is undefined
                                if (typeof walletAmount === 'undefined' || isNaN(walletAmount)) {
                                    continue;
                                    process.exit(1);
                                }
                                //skip opportunity where wallet balance is unavailable
                                var walletAmountSell = fetchBalance(coinQuote, exchangeIdToSell);
                                if (typeof walletAmountSell === 'undefined' || isNaN(walletAmountSell)) {
                                    continue;
                                    process.exit(1);
                                }
                                try {
                                    //skip opportunity where wallet address is unavailable
                                    var exBuyAddress =  altCoinsAddesses.addresses[exchangeIdToBuy][0][coinBase +"_address"]
                                    if (typeof exBuyAddress === 'undefined' || exBuyAddress ==='undefined') {
                                        continue;
                                    }
                                    //skip opportunity where wallet address is unavailable
                                    var exSellAddress =  altCoinsAddesses.addresses[exchangeIdToSell][0][coinBase +"_address"]
                                    //log.magenta("exSellAddress ",exchangeIdToSell,coinBase, exSellAddress)
                                    if (typeof exSellAddress === 'undefined' || exSellAddress ==='undefined') {
                                        continue;
                                    }
                                } catch (error) {
                                    log.red(error.message,exchangeIdToBuy,exchangeIdToSell, coinBase )
                                    continue;
                                }
                                //looking for the trasferback - rountrip as side (see:OPPORTUNITY_SIDE on settings.js)
                                var foundTrasfertBack = false;
                                var deposit_fee_seller = 0;
                                try {
                                    deposit_fee_seller = exchangeToBuy.fees.funding.deposit[coinBase]; //DEPOSIT CALCULALTED FOR THE ROUND TRIP 
                                } catch (error) {
                                    //log.red("no deposit details found for" ,exchangeIdToBuy, coinBase )
                                }
                                
                                if (typeof deposit_fee_seller === 'undefined' || deposit_fee_seller === 'undefined' || deposit_fee_seller ==="") {
                                    deposit_fee_seller=0;
                                }
                                if (walletAmount<=0 ) {
                                    //skip opportunity with back wallet (the remote wallet on the roundtrip side) is zero or undefined
                                    if (typeof walletAmountSell === 'undefined' ||  isNaN(walletAmountSell) || walletAmountSell ===0) {
                                        return
                                    } else {
                                        foundTrasfertBack = true
                                        //walletAmountSell = walletAmountSell - deposit_fee_seller;
                                        walletAmount = calculateFutureWallet(walletAmountSell,coinBase, exchangeToSell, exchangeIdToSell,deposit_fee_seller, priceToBuy )
                                    }
                                }
                                //trasform coin from aca format to CCXT format. Maybe it is better to use directly the CCXF format
                                var ccxtCoin = coin.replace("-","/");
                                //check amount limit. if wallet availability exeeds min and max amount -> skip opportunity.
                                //check Quote Volume, if below a threshold -> skip opportunity.
                                try {
                                	if (LIMIT_FILTER) {
                                        let marketLimits = markets[exchangeIdToBuy][ccxtCoin].limits
                                    	if (marketLimits === undefined || marketLimits["price"] === undefined || marketLimits["amount"] === undefined || marketLimits["cost"] === undefined) {
                                             log.red('market.limits.[price|amount|cost] property is not set. I don\'t care',exchangeIdToBuy, ccxtCoin )
                                            
                                    	} else{
                                        	const amount = walletAmount/priceToBuy;
                                        	if (marketLimits.amount.min>amount || marketLimits.amount.max < amount) {
                                            	continue;
                                        	}    
                                    	}
                                	}
                                    if (VOLUME_FILTER) {
                                        const quoteVolumeUSDBuyer = calculateUSDTVolume(exchangeIdToBuy,coinQuote, coin_prices_quote_volume[coin][exchangeIdToBuy], coin_prices )
                                        const quoteVolumeUSDSeller = calculateUSDTVolume(exchangeIdToSell,coinQuote,coin_prices_quote_volume[coin][exchangeIdToSell],coin_sell )
                                        //if (DEBUG) {
                                            log.magenta(exchangeIdToBuy.green, ccxtCoin, "quoteVolumeUSDBuyer", quoteVolumeUSDBuyer,"VOLUME_THRESHOLD", VOLUME_THRESHOLD, "quoteVolumeUSDBuyer< VOLUME_THRESHOLD", (quoteVolumeUSDBuyer< VOLUME_THRESHOLD))
                                            log.magenta(exchangeIdToSell.green, ccxtCoin, "quoteVolumeUSDSeller", quoteVolumeUSDSeller,"VOLUME_THRESHOLD", VOLUME_THRESHOLD, "quoteVolumeUSDSeller< VOLUME_THRESHOLD", (quoteVolumeUSDSeller< VOLUME_THRESHOLD))
                                        //}
                                        
                                        if (quoteVolumeUSDBuyer  < VOLUME_THRESHOLD ||
                                            quoteVolumeUSDSeller < VOLUME_THRESHOLD)  continue
                                    }
                                }
                                catch (error) {
                                	log.red(error.message)
                                }
                                

                                //starting withdrawal and deposit fees for trasfer coins to Exchange A to Exchange B
                                var deposit_fee  =0
                                try {
                                    deposit_fee = exchangeToSell.fees.funding.deposit[coinBase];
                                } catch (error) {
                                    log.red("no deposit details found for" ,exchangeIdToSell, coinBase )
                                }
                                //
                                if (typeof deposit_fee === 'undefined' || deposit_fee === 'undefined' || deposit_fee ==="") {
                                    deposit_fee=0;
                                }
                                var withdrawlBuyer = "";
                                try {
                                    //try to retieve amount for the withdrawal from CCXT library based on coin base 
                                    withdrawlBuyer = exchangeToBuy.fees.funding.withdraw[coinBase];
                                    
                                    if (typeof withdrawlBuyer === 'undefined' ) {
                                        //if the statement above is null try to retieve amount for the withdrawal from CCXT library not based on coin base but for the all coins
                                        //POLONIEX & YOBIT CASE. Looking for fees in trading.fee.json file 
                                        if (exchangeIdToBuy==='yobit') { //check withdraw issue across exchanges
                                            withdrawlBuyer = exchangeToBuy.fees.funding.withdraw

                                        } else if (exchangeIdToBuy==='poloniex')  { //the correct thing to do is to invoke the fetchFees api, but it doesn't work on poloniex.
                                            //withdrawlBuyer = await exchangeToBuy.fetchFees().withdraw[coinBase]
                                            withdrawlBuyer = tradersFee.fee[exchangeIdToBuy][0][coinBase +"_withdrawal"]; 

                                        } else {
                                            withdrawlBuyer = tradersFee.fee[exchangeIdToBuy][0][coinBase +"_withdrawal"]; 
                                        }
                                    }
                                } catch(error) {
                                     withdrawlBuyer = tradersFee.fee[exchangeIdToBuy][0][coinBase +"_withdrawal"];
                                }
                                if (typeof withdrawlBuyer === 'undefined' ) {
                                    log.red("withdrawal retrieved. result for the withdrawlBuyer is udenfined --> please add", coinBase.green,  "trading.fee.json to exchange", exchangeIdToBuy.magenta);
                                    withdrawlBuyer = 10000//terrificant...like a LSD. best choice is lose the opportunity than follow it.
                                    
                                }  else if (withdrawlBuyer.toString().indexOf("%") !== -1 ) { //Check if withdraw is a % or not. see therock for the withdraw on XRP.
                                     withdrawlBuyer = (walletAmount/priceToBuy)*(withdrawlBuyer.toString().slice(0, withdrawlBuyer.toString().indexOf("%"))/100)
                                }
                                //log.yellow("withdrawlBuyer", withdrawlBuyer)
                                var feeBuyerCalculated
                                const unitsBoughtToBuy = walletAmount/priceToBuy
                                try {
                                    //just for test
                                    //feeBuyerCalculated= exchangeToBuy.calculateFee(ccxtCoin,  "type", "buy", unitsBoughtToBuy, priceToBuy );
                                    //feeBuyerCalculated = functions.calculateFee(exchangeIdToBuy,ccxtCoin,  "type", "buy", unitsBoughtToBuy, priceToBuy )
                                    
                                } catch(error) {
                                    log.red("exchanges", exchangeIdToBuy,"calculateFee ", error.message)
                                    
                                }
                                //log.cyan(exchangeIdToBuy, "feeBuyerCalculated custom", feeBuyerCalculated, "ccxtCoin", ccxtCoin, "unitsBoughtToBuy", unitsBoughtToBuy, "priceToBuy", priceToBuy)
                                
                                
                                // check if we have enough amoutn to start the opportunity
                                var grossPriceSpread = priceToSell/priceToBuy;
                                //calculate trading fee for buying and for selling of coins
                                //net price for buying a single unit of coin

                                var netQuantiyCoinsToBuy     =  (walletAmount/priceToBuy);
                                var netCostToBuy             =  ((netQuantiyCoinsToBuy * priceToBuy ) + ((netQuantiyCoinsToBuy * priceToBuy )*tradingFeeBuyer))
                                var netPriceToSell           =  ((netQuantiyCoinsToBuy * priceToSell) - ((netQuantiyCoinsToBuy * priceToSell)*tradingFeeSeller))
                                var netPriceToSellWithdraw   =  ((netQuantiyCoinsToBuy - withdrawlBuyer) * priceToSell)  - (((netQuantiyCoinsToBuy-withdrawlBuyer) * priceToSell)*tradingFeeSeller)
                                var netSpread = netPriceToSell/netCostToBuy;
                                var netSpreadWithdraw = netPriceToSellWithdraw/netCostToBuy;
                                

                                //buy trading fee
                                var amountToBuy = walletAmount / priceToBuy
                                //minus trading fee
                                var netQYToBuy = amountToBuy - (amountToBuy * tradingFeeBuyer)
                                //minus withdrawal fee
                                var netQuantityCoinsMinsWithdrawalfee = netQYToBuy - withdrawlBuyer;
                                //minus deposit fee if needed
                                netQuantityCoinsMinsWithdrawalfee = netQuantityCoinsMinsWithdrawalfee - deposit_fee;
                                //sell trading fee
                                var amountToSell = netQuantityCoinsMinsWithdrawalfee * priceToSell
                                logger.debug("amountToSell",amountToSell,"netQuantityCoinsMinsWithdrawalfee", netQuantityCoinsMinsWithdrawalfee, "priceToSell", priceToSell);
                                var newWalletAmount = functions.amountToPrecision (exchangeIdToBuy,markets, ccxtCoin, (amountToSell - (amountToSell * tradingFeeSeller)));
                                logger.debug("newWalletAmount",newWalletAmount,"amountToSell", amountToSell, "tradingFeeSeller", tradingFeeSeller);
                                
                                var realAmount = functions.amountToPrecision(exchangeIdToBuy,markets, ccxtCoin,amountToBuy*priceToBuy)
                                logger.debug("realAmount",realAmount,"amountToBuy", amountToBuy, "priceToBuy", priceToBuy);
                                
                                if (DEBUG)
                                    if (newWalletAmount>realAmount)
                                        log.magenta("newWalletAmount", newWalletAmount, "walletAmount", walletAmount, "realAmount", realAmount, "diff", (walletAmount-realAmount) );

                                var netAmountSpread = newWalletAmount/walletAmount
                                //guadagno
                                var gainAmount = newWalletAmount - walletAmount;
                                //guadagno in percentuale
                                var percGainAmount = (100 * gainAmount) / walletAmount;

                                //just for logging...
                                var spreadAmountPerc =((grossPriceSpread - 1) * 100).toFixed(3)
                                var spreadPricePerc  =((netAmountSpread - 1) * 100).toFixed(3)

                                
                                foundTrasfertBack = (OPPORTUNITIES_SIDE==='oneway')?false:true
                                // log.yellow("foundTrasfertBack", foundTrasfertBack)
                                //log.green("(newWalletAmount <= walletAmount)", (newWalletAmount <= walletAmount))
                                if((newWalletAmount <= realAmount) && (!foundTrasfertBack)) continue; 

                                if (DEBUG) {
                                    log.magenta(".:: BEGIN ::.");
                                    log.magenta("Exchange to buy", exchangeIdToBuy.toString().cyan, "Exchange to sell", exchangeIdToSell.toString().cyan);
                                    log.magenta("Price to buy", priceToBuy.toString().cyan, "Price to sell", priceToSell.toString().cyan, "pair coin", coin.toString().cyan);
                                    log.magenta("Item on Array")
                                    log.magenta("arrSell[j][0]", arrSell[j][0].toString().cyan, "arr[i][0]", arr[i][0].toString().cyan)
                                    log.magenta("market1:", arr[i][1].toString().cyan, "market2:", arrSell[j][1].toString().cyan)
                                    log.magenta("trading fee taker", tradingFeeBuyer.toString().cyan, "trading fee maker", tradingFeeSeller.toString().cyan)
                                    log.magenta("withdrawal", withdrawlBuyer.toString().cyan, "deposit", deposit_fee.toString().cyan)
                                    log.magenta("quote volume", quoteVolume.toString().cyan, "base volume", baseVolume.toString().cyan)
                                    
                                    // log.magenta("net price to buy", netCostToBuy)
                                    // log.magenta("net price to sell", netPriceToSell)
                                    log.magenta("spread w/o trading fee and withdrawal", (arrSell[j][0] / arr[i][0]).toString().cyan)
                                    //log.magenta("netSpread w/ trading fee", netSpread)
                                    //log.magenta("netSpread w/ trading fee & Withdraw", netSpreadWithdraw)
                                    log.magenta("wallet amount", walletAmount.toString().cyan)
                                    log.magenta("wallet amount for trading", realWallet.toString().cyan)
                                    log.magenta("quantity of coins to buy", netQuantiyCoinsToBuy.toString().cyan)
                                    log.magenta("coins to buy (trading fee included)", netQYToBuy.toString().cyan);
                                    log.magenta("coins to buy (trading fee & withdrawal included)", netQuantityCoinsMinsWithdrawalfee.toString().cyan);
                                    log.magenta("newWalletAmount", newWalletAmount.toString().cyan);
                                    log.magenta("gross (price)   spread   ", grossPriceSpread.toString().cyan);
                                    log.magenta("net   (amount)  spread   ", netAmountSpread.toString().cyan);
                                    log.magenta("gross (price)   spread(%)", spreadAmountPerc.toString().cyan, "%".cyan);
                                    log.magenta("net   (amount)  spread(%)", spreadPricePerc.toString().cyan, "%".cyan);
                                    log.magenta("Gain Amount", gainAmount.toString().cyan);
                                    log.magenta("Perc Gain Amount", percGainAmount.toString().cyan);
                                    log.magenta(".:: END ::.");
                                }
                                //wite the opportunity found for fute analysis
                                opportunitiesDS ({
                                    market1:exchangeIdToBuy,
                                    market2:exchangeIdToSell,
                                    market1price:priceToBuy,
                                    market2price:priceToSell,
                                    coin:ccxtCoin,
                                    feeTaker: tradingFeeBuyer,
                                    feeMaker: tradingFeeSeller,
                                    withdrawal:withdrawlBuyer,
                                    deposit:deposit_fee,
                                    quoteVolume:quoteVolume,
                                    baseVolume:baseVolume,
                                    walletAmount:walletAmount,
                                    coinToBuy:netQuantiyCoinsToBuy,
                                    netCoinToBuy:netQuantityCoinsMinsWithdrawalfee,
                                    futureWalletAmount:newWalletAmount,
                                    spred_wo_fee:(arrSell[j][0] / arr[i][0]),
                                    grossPriceSpread:grossPriceSpread,
                                    netAmountSpread:netAmountSpread,
                                    grossPriceSpreadPerc:spreadAmountPerc,
                                    netAmountSpreadPerc:spreadPricePerc,
                                    gainAmount: gainAmount,
                                    gainAmountPerc: percGainAmount

                                })
                                logger.info(".:: BEGIN ::.");
                                logger.info("Exchange to buy", exchangeIdToBuy, "Exchange to sell", exchangeIdToSell);
                                logger.info("Price to buy", priceToBuy, "Price to sell", priceToSell, "pair coin", coin);
                                logger.info("Item on Array")
                                logger.info("arrSell[j][0]", arrSell[j][0], "arr[i][0]", arr[i][0])
                                logger.info("market1:", arr[i][1], "market1: buy", arr[i][0], "market2:", arrSell[j][1], "market2: sell", arrSell[j][0])
                                logger.info("trading fee taker", tradingFeeBuyer, "trading fee maker", tradingFeeSeller)
                                logger.info("withdrawal", withdrawlBuyer, "deposit", deposit_fee)
                                logger.info("quote volume", quoteVolume, "base volume", baseVolume)
                                // logger.info("net price to buy", netCostToBuy)
                                // logger.info("net price to sell", netPriceToSell)
                                logger.info("spread w/o trading fee and withdrawal", arrSell[j][0] / arr[i][0])
                                //logger.info("netSpread w/ trading fee", netSpread)
                                //logger.info("netSpread w/ trading fee & Withdraw", netSpreadWithdraw)
                                logger.info("wallet amount", walletAmount)
                                logger.info("quantity of coins to buy", netQuantiyCoinsToBuy)
                                logger.info("coins to buy (trading fee included)", netQYToBuy);
                                logger.info("coins to buy (trading fee & withdrawal included)", netQuantityCoinsMinsWithdrawalfee);
                                logger.info("newWalletAmount", newWalletAmount);
                                logger.info("gross (price)   spread   ", grossPriceSpread);
                                logger.info("net   (amount)  spread   ", netAmountSpread);
                                logger.info("gross (price)   spread(%)", spreadAmountPerc, "%");
                                logger.info("net   (amount)  spread(%)", spreadPricePerc, "%");
                                logger.info("Gain Amount", gainAmount);
                                logger.info("Perc Gain Amount", percGainAmount);
                                logger.info(".:: END ::.");
                                //log.magenta("results.push", coin, netAmountSpread, arrSell[j][1],arrSell[j][0], arr[i][1],arr[i][0]);
                                results.push(
                                {
                                    coin: coin,
                                    amount: realAmount,
                                    //spread: arrSell[j][0] / arr[i][0],
                                    spread: netAmountSpread,
                                    journey: OPPORTUNITIES_SIDE,
                                    market2: {
                                        name: arrSell[j][1],
                                        last: arrSell[j][0]
                                    },
                                    market1: {
                                        name: arr[i][1],
                                        last: arr[i][0] 
                                    }
                                }
                                );
                            }
                        }

                    }
                }

            }
        }
        results.sort(function (a, b) {
            return a.spread - b.spread;
        });
        //log.cyan('Finishing function...');
        resolve();     
        }
        })
    }

    await loopData();
    //log.green("Emitting Results...")
    io.emit('wallets',[coinNames, sqvWallets]);
    io.emit('results', results);
    }



// Retrieve Wallet by AltCoin and Exchange
function fetchBalance(altcoin, exchId) {
    var result = undefined;
    try {
        result = sqvWallets[exchId][altcoin]
        if (typeof result === 'undefined' || result === NULL_CRITERIA) {
            result = undefined
        }
        return result;
        
    } catch (error) {
        //empty wallet for the specific exchage and altcoin
        //log.red ('empty wallet for the specific exchage and altcoin', exchId,altcoin )
        return undefined;
    }

}
// Retrieve Wallet from Exchange fro all coins
function fetchBalances(exchId) {   //GET BALANCE DATA
    return  new Promise (async (resolve, reject) => {

        try {
            const exchange =  exchanges[exchId];

            //exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
            //exchange.proxy ='http://localhost:8080/'
            //exchange.timeout = 60000
            let balance
            if (exchId ==='binance') {
                let binance = new ccxt.binance  (accounts[exchId])
                
                balance = await binance.fetchBalance({'recvWindow': 60000000})
                //exchange.verbose = true
            } else {
                // output the balance from the exchange
                balance = await exchange.fetchBalance ()    
            }
            //HITBTC has two kind of wallet: Bank and Exchange wallet --> move to Exchange for trading
            if (exchId === "hitbtc2") {
                var balanceAccount = await exchange.fetchBalance ({ type: 'account' })
                var balanceTotal =balanceAccount.total
                for(var i = 0; i < baseCoins.length; i++) {
                    var amount = balanceTotal[baseCoins[i]];
                    if (typeof amount !== 'undefined' &&  amount >0) {
                        exchange.private_post_account_transfer({'currency': baseCoins[i], 'amount': amount, 'type': 'bankToExchange'})
                        //log (exchange.name.green, "currency",baseCoins[i], 'balance', "amount", amount)
                    }
                }
            } 
            if (STUB) {
                sqvWallets[exchId]=JSON.parse('{"' + sqvCoin + '":"' + sqvAmount +'"}')
            } else {
                //store the total balance by altcoin
                sqvWallets[exchId]=balance.total
            }
            
            
            await ccxt.sleep (exchange.rateLimit)


            resolve(balance);
        } catch (error) {
                console.log("Error retrieving balances ",  error); //Throws error
                //reject(error);
        }
    })

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

function fetchPrice(exchangeId, priceToBuy, priceToSell) {

    if (FETCH_TYPE==="ticker") { 
        return getMarketPrices(exchangeId, priceToBuy, priceToSell)

    } else if (FETCH_TYPE==="tickers") {
        if ( !exchanges[exchangeId].has["fetchTickers"]) {
             return getMarketPrices(exchangeId, priceToBuy, priceToSell)
        } else {
            return getMarketTickers(exchangeId, priceToBuy, priceToSell)

        }
        
    } else {
        log.red.error ("PLEASE CHECK FETCH TYPE FOR STARTING ARBITRAGE...")
        process.exit(1);
    }

}


//helper function for sending message to specific topic/channel via io
async function sendNotification (channel, message) {
    log.magenta("sendNotification",channel, message )
    io.emit(channel,message);
}

var bootEnv = true;
//MAIN ACA (crime) Engine
(async function main() {
    log.bright.green("SQV .::cryptocurrency arbitrage - CRIME::.Version "+version)
    log.bright.green("Arbitrage Criteria:", ARBITRAGE_CRITERIA);
    log.bright.green("Arbitrage Side:", OPPORTUNITIES_SIDE);
    log.bright.green("Arbitrage Engine:", ARBITRAGE_ENGINE);
    log.bright.green("Fetch Type:", FETCH_TYPE);
    let arrayOfRequests = [];
    

    const ids = ccxt.exchanges.filter (id => id in accounts)
    exchanges = ccxt.indexBy (await Promise.all (ids.map (async id => {
        let exchange 
        if (id==="therock") {
            // instantiate the exchange
            exchange = new therocksqv (ccxt.extend ( { enableRateLimit: ENABLE_RATE_LIMIT }, accounts[id]))
        } else if (id==="gdax") { 
                exchange = new ccxt[id] (ccxt.extend ( { enableRateLimit: ENABLE_RATE_LIMIT }, accounts[id], {
                    nonce: function () { return (this.milliseconds ()/1000) }
            }) )

        } else{
            // instantiate the exchange
            exchange = new ccxt[id] (ccxt.extend ( { enableRateLimit: ENABLE_RATE_LIMIT }, accounts[id]))
        }
        exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
        exchange.timeout = 60000 //thanks kraken for this.
        return exchange
    })), 'id')

    if (bootEnv===true) {
        initAnalyticsFile()

    }
    // //Retrieving balnce from exchanges & markets
    for (let i = 0; i < ids.length; i++) {
        if (!sqvWallets[ids[i]]) sqvWallets[ids[i]] = NULL_CRITERIA;
        fetchBalances(ids[i]);
        if (bootEnv===true) {
            try {
                if (!exchanges[ids[i]]) exchanges[ids[i]] = {}
                var exchange = exchanges[ids[i]];
                log.magenta("Exchange", ids[i], "loadmarket");
                const _markets = await exchange.loadMarkets()

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
    bootEnv = false;
    io.emit('wallets',[coinNames, sqvWallets]);
    
    //checkExchangeCapabilities();
    //Retrieving quotation from exchanges & markets
    for (let i = 0; i < ids.length; i++) {
        arrayOfRequests.push(fetchPrice(ids[i], coin_prices, coin_sell));
    }

    await Promise.all(arrayOfRequests.map(p => p.catch(e => e)))
    .then(results => computePrices(coin_prices,coin_sell, coin_last_prices))
    .catch(e => console.log("main", e));

    setTimeout(main, 20000);
})();

module.exports.fetchBalance=fetchBalance
module.exports.sendNotification=sendNotification
module.exports.costToPrecision=functions.costToPrecision
module.exports.priceToPrecision=functions.priceToPrecision
module.exports.feeToPrecision=functions.feeToPrecision
module.exports.amountToPrecision=functions.amountToPrecision
module.exports.markets=markets
module.exports.STUB=STUB
