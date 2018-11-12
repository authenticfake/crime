"use strict";


/*  ------------------------------------------------------------------------ */
const Promise     = require("bluebird");
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice

log.configure ({ time: true })
const algo_namespace="arbitrage"
require('./settings-'+algo_namespace+'.js')();
const concurrentProcess = ARBITRAGE_EXCHANGE_WALLET_DIVIDER
const fs        = require ('fs')
const functions = require ('./functions')
var database   = require('./db-aca.js');  //sqllite3.x
var therocksqv = require ('./therocksqv.js')
const technicalindicators = require('technicalindicators')
var RSI = require('technicalindicators').RSI;
var MFI = require('technicalindicators').MFI;
var CCI = require('technicalindicators').CCI;
var ADX = require('technicalindicators').ADX;
var BB  = require('technicalindicators').BollingerBands
var MACD = require('technicalindicators').MACD;
var OBV = require('technicalindicators').OBV;
var KD = require('technicalindicators').Stochastic;
let coin_last= {}, coin_bid = {}, coin_macd={}, coin_obv={}, coin_kd={},coin_rsi ={},coin_mfi ={},coin_cci ={}, coin_adx={}, coin_bb={}, coin_ask = {},coin_prices_quote_volume={}, coin_prices_base_volume={}

let fileCSV = ''; //opportunities enalbed
let fileStubCSV = ''
var bootEnv = true; //load environment during the first launch
const NULL_CRITERIA="TBD"
let result = {};
var accounts    = require ('./credentials-1.json')
var exchanges =[]
let sqvWallets={}
var markets={};
var exchanges_markets = []
var coinMaster = ARBITRAGE_EXCHANGE_COIN
var quantity=0
var master_wallet

let coinPairsMaster=[]
let coinPairs=[]

let tradingFee_taker
let tradingFee_maker
//date1 the start of our age
var date1, dateOrder
var crime_account

var amountFilled=0

const wallet_percentage = ARBITRAGE_WALLET_QUANTITY_PERCENTAGE
const stoploss_timewindows = ARBITRAGE_STOPLOSS_TIMEWINDOWS

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


function initFile(exchange) {
        var timestamp = new Date().getTime();
        fileCSV = './data/'+algo_namespace+'.'+exchange +'.'+ crime_account+'.'+ ARBITRAGE_EXCHANGE_COIN +'.'+  new Date().getFullYear() +'.'+(new Date().getMonth() +1)+'.'+new Date().getDate()+'.csv'; //opportunities enalbed
        // try {
        //     fs.unlinkSync(fileCSV,(err) => {  
        //             if (err) log.red( err.message);
        //             log.magenta('CSV created for writing the opportunity found during the arbitrage!!!');
        //         });  
        // } catch (error) {
        //     log("error during delete file");
        // }
        if (!fs.existsSync(fileCSV)) {
          fs.appendFile(fileCSV, "datetime, head_symbol, pair_symbol, tail_symbol, head_price, pair_price, tail_price, cash_out, cash_pair_in, cash_tail_in, profit, result",(err) => {  
                      if (err) log.red( err.message);
                      log.magenta('CSV created for writing the opportunity found during the arbitrage single exchange!!!')})
        }
        if (STUB) {
          fileStubCSV = './data/'+algo_namespace+'.stub.'+exchange +'.'+ crime_account+'.'+ ARBITRAGE_EXCHANGE_COIN +'.'+  new Date().getFullYear() +'.'+(new Date().getMonth() +1)+'.'+new Date().getDate()+'.csv'; //opportunities enalbed
          // try {
          //     fs.unlinkSync(fileCSV,(err) => {  
          //             if (err) log.red( err.message);
          //             log.magenta('CSV created for writing the opportunity found during the arbitrage!!!');
          //         });  
          // } catch (error) {
          //     log("error during delete file");
          // }
          if (!fs.existsSync(fileStubCSV)) {
            fs.appendFile(fileStubCSV, "start datetime, symbol, amount,price,rsi-1,rsi-2,rsi-3,rsi-4,rsi-5,end datetime",(err) => {  
                        if (err) log.red( err.message);
                        log.magenta('CSV created for writing the opportunity found during the arbitrage single exchange!!!')})
          }

        } 
        
    
}

//calculate Volume from coin quote to USD(T)
async function calculateUSDTVolume(exchangeId, asset){
  //log.bright(ARBITRAGE_EXCHANGE.green, "calculateUSDTVolume started", asset)
    var priceCQ;
    var quoteVolume = coin_prices_quote_volume[asset][exchangeId]
    var coinQuote = asset.slice(asset.indexOf("/")+1) 
    if (!coinQuote.startsWith("USD")) {
        priceCQ = coin_last[coinQuote+"/USDT"][exchangeId]
        //log.magenta("calculateUSDTVolume".yellow, exchangeId.green, "USDT priceCQ", priceCQ)
        if (priceCQ ===  undefined) {
            priceCQ = coin_last[coinQuote+"/USD"][exchangeId]
            //log.magenta("calculateUSDTVolume".yellow, exchangeId.green, "USD priceCQ", priceCQ)
        }
    } else {
        priceCQ=1;//already in USD
    }
    
    const quoteVolumeUSD = quoteVolume * priceCQ
    return quoteVolumeUSD;

}

// Retrieve Volumes for all master and pair coins
async function fetchVolumes(exchangeId) {   //GET Volume DATA
  log.bright(ARBITRAGE_EXCHANGE.green, "fetchVolumes started", "VOLUME_FILTER", VOLUME_FILTER)
  if (!VOLUME_FILTER) return
    return new Promise (async (resolve, reject) => {
      const exchange = exchanges[ARBITRAGE_EXCHANGE];
      const tickers = await exchange.fetchTickers();
      
      Object.keys (tickers).map (exchangeId => {
          const ticker = tickers[exchangeId]
          const symbol = ticker['symbol']
          if (!coin_prices_quote_volume[symbol]) coin_prices_quote_volume[symbol] = {};
          if (!coin_prices_base_volume[symbol]) coin_prices_base_volume[symbol] = {};
          if (!coin_last[symbol]) coin_last[symbol] = {};
          coin_last[symbol][exchange.id] = ticker['last'];
          coin_prices_quote_volume[symbol][exchange.id] = ticker['quoteVolume'];
          coin_prices_base_volume[symbol][exchange.id] = ticker['baseVolume'];
      })
      if (DEBUG) {
        log.yellow(ARBITRAGE_EXCHANGE.green,"coin_prices_quote_volume", coin_prices_quote_volume)
        log.yellow(ARBITRAGE_EXCHANGE.green,"coin_prices_base_volume", coin_prices_base_volume)
        log.yellow(ARBITRAGE_EXCHANGE.green,"coin_last", coin_last)
      }
      await ccxt.sleep (120)
      resolve()
    })
}

//fetch KPI every 5 mins
async function checkKPIs(sync) {
  log.bright(ARBITRAGE_EXCHANGE.green, "checkKPIs started", "sync",sync )
  var date2 = new Date();
  if (date2.getTime()>((date1.getTime())+ (1000*60*5))) {
    await fetchKPIs(sync)
    date1.setTime(new Date())
  } /*else {
    date2.setTime(new Date())
  } */
}

// fetch sync KPI
async function fetchKPIs(sync) {
  log.bright(ARBITRAGE_EXCHANGE.green, "fetchKPIs started", "sync",sync )
  if (sync){
    await fetchVolumes()
  } 
  else {
    fetchVolumes()

  }
  
}
//check Technical Indicator : RSI, MFI and CCI
//true for positive growing trend - false otherwise
async function checkRSI (exchId, asset, length) {
  //log.bright.magenta(exchanges[exchId].iso8601 (Date.now ()),exchId.green, "checkRFI started", exchId, asset)
  if (!TI_FILTER && !RSI_FILTER) return
  var rsi = coin_rsi[asset][exchId]
  var currentRsi =rsi[rsi.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var incRsi = true
  if ((currentRsi - rsi[rsi.length-length])<0) incRsi=false
  result = incRsi
  if (DEBUG){
    log.bright(exchanges[exchId].iso8601 (Date.now ()),exchId.green,asset, "checkRFI output", [result,currentRsi])
  }

  return [result,currentRsi]
}


async function checkBB (exchId, asset, length) {
  log.bright.magenta(exchanges[exchId].iso8601 (Date.now ()),exchId.green, "checkBB started", exchId, asset)
  if (!BB_FILTER) return
  var bb = coin_bb[asset][exchId]
  
  var currentBB =bb[bb.length-1]
  var result = false
  //one based and no zero based
  length =length+1;
  var incBBLower = true
  var incBBMiddle = true
  var incBBUpper = true
  var bbs =bb[bb.length-length]
  
  if ((currentBB.lower - bbs.lower)<0) incBBLower=false 
  if ((currentBB.middle - bbs.middle)<0) incBBMiddle=false 
  if ((currentBB.upper - bbs.upper)<0) incBBUpper=false 
  if (DEBUG){
    log.bright(exchanges[exchId].iso8601 (Date.now ()),exchId.green,asset, "checkBB output", [!incBBLower, !incBBMiddle, !incBBUpper, currentBB]) 
  }

  return [incBBLower, incBBMiddle, incBBUpper, currentBB]
}
//check Technical Indicator : MACD
//true for positive growing trend - false ; undefined to skip the opportunity
async function checkMACD (exchId, asset, length) {
  if (!MACD_FILTER) return
  log.bright.magenta(exchId.green, "checkMACD started", exchId, asset)
  var macd = coin_macd[asset][exchId]
  var currentMacd =macd[macd.length-1]
  var previousMacd =macd[macd.length-2]
  
  var result = undefined 
  
  if (DEBUG){
    log.bright(exchId.green,asset, "currentMacd", currentMacd.MACD, "signal",currentAdx.signal, "histogram", currentAdx.histogram)
  }
  if (currentMacd.MACD > currentMacd.signal && previousMacd.MACD <= previousMacd.signal) {
    result = true //# If the MACD crosses the signal line upward  -- "BUY"
  } else if ((currentMacd.MACD < currentMacd.signal && previousMacd.MACD >= previousMacd.signal) ) {
     result = false //# The other way around -- "SELL"
  } else {
    result = undefined 
  }
  return [result, currentMacd]
}

//check Technical Indicator : KD
//true for positive growing trend - false ; undefined to skip the opportunity
async function checkKD (exchId, asset, length) {
  if (!KD_FILTER) return
  log.bright.magenta(exchId.green, "checkKD started", exchId, asset, "andrea")
  var kd = coin_kd[asset][exchId]
  var currentKD =kd[kd.length-1]
  
  var result = undefined 
  
  if (DEBUG){
    log.bright(exchId.green,asset, "currentKD", currentKD, "K",currentKD.k, "D", currentKD.d)
  }
  if (currentKD.k >= KD_OVERBOUGHT && currentKD.d>=KD_OVERBOUGHT) {
    result = false //#  -- "SELL"
  } else if (currentKD.k <= KD_OVERSOLD && currentKD.d<=KD_OVERSOLD ) {
     result = true //# The other way around -- "BUY"
  } else {
    result = undefined 
  }
  return [result, currentKD]
}
async function checkStrengthTrend (exchId, side, length,  asset) {
 // log.bright.magenta(exchId.green, "checkStrengthTrend started", exchId, side, "length", length,  asset)

  var adx = coin_adx[asset][exchId]
  
  
  var currentAdx =adx[adx.length-1]
  
  var result = false 
  
  if (DEBUG){
    log.bright(exchId.green,asset, "currentAdx", currentAdx.adx, "PDI",currentAdx.pdi, "MDI", currentAdx.mdi)
    log.bright(exchId.green,asset, "currentAdx", currentAdx.adx, "ADX_LEVEL_5", ADX_LEVEL_5, "ADX_LEVEL_2",ADX_LEVEL_2)
  }
  log.bright(exchId.green,asset, "currentAdx", currentAdx.adx.toString().yellow, "PDI",currentAdx.pdi.toString().green, "MDI", currentAdx.mdi.toString().magenta, "ADX_LEVEL_7", ADX_LEVEL_7, "ADX_LEVEL_3 (+5)",(ADX_LEVEL_3+5))
  var _adx= currentAdx.adx
  if ( _adx<= ADX_LEVEL_7 && _adx>=ADX_LEVEL_3+5) {
    var pdi = currentAdx.pdi
    var mdi = currentAdx.mdi
    if (side==='buy') {
      if (pdi>mdi) result = true
       
    } else {
      if (mdi>pdi) result = true
    }
  }
  return result
}

async function checkTIs (exchId, side, length,  asset) {
  log.bright.magenta(exchId.green, "checkTIs started", exchId, side, "length", length,  asset)

  var rsi = coin_rsi[asset][exchId]
  var mfi = coin_mfi[asset][exchId]
  var cci = coin_cci[asset][exchId]

  var adx = coin_adx[asset][exchId]
  var bb = coin_bb[asset][exchId]

  var currentRsi =rsi[rsi.length-1]
  var currentMfi =mfi[mfi.length-1]
  var currentCci =cci[cci.length-1]

  var currentAdx =adx[adx.length-1]
  var currentBb =bb[bb.length-1]
  
  var result = false 
  var resultRsi, resultMfi, resultCci 
  //check RSI, MFI and CCI momentum trend
  var incRsi = true
  if ((currentRsi - rsi[rsi.length-length])<0) incRsi=false
  var incMfi =true
  if ((currentMfi - mfi[mfi.length-length])<0) incMfi=false
  var incCci = true
  if ((currentCci - cci[cci.length-length])<0) incCci=false

  if (DEBUG){
    log.bright(exchId.green,asset, "currentRsi", currentRsi, "curent-length","("+length+")", rsi[rsi.length-length], "rsi length", rsi.length)
    log.bright(exchId.green,asset, "currentMfi", currentMfi,"curent-length","("+length+")", mfi[mfi.length-length],  "mfi length", mfi.length)
    log.bright(exchId.green,asset, "currentCci", currentCci, "curent-length","("+length+")",cci[cci.length-length], "cci length", cci.length)
    log.bright(exchId.green,asset,  "incRsi", incRsi,  "incMfi", incMfi,  "incCci", incCci)
    log.bright(exchId.green,asset, "currentAdx", currentAdx.adx, "PDI",currentAdx.pdi, "MDI", currentAdx.mdi)
    log.bright(exchId.green,asset, "currentAdx", currentAdx.adx, "ADX_LEVEL_5", ADX_LEVEL_5, "ADX_LEVEL_2",ADX_LEVEL_2)
  
  }
  if (side==='buy') { 
    if ((!incRsi) || 
      (incRsi && currentRsi>=RSI_OVERSOLD))
      result = true
    else
      result = false

  } else {
    if  ((incRsi ) || 
      (currentRsi <= RSI_OVERSOLD +10))
      result = true
    else
      result = false
  }
  
  // if (side==='buy') { 
  //   if (( !incRsi &&  !incMfi &&  !incCci) || 
  //     ((incRsi && currentRsi>=RSI_OVERSOLD ) &&
  //     (incMfi && currentMfi>=MFI_OVERSOLD)) || 
  //     ((incRsi && currentRsi>=RSI_OVERSOLD ) &&
  //     (incCci && currentCci>=CCI_OVERSOLD) ) ||
  //     ((incMfi && currentMfi>=MFI_OVERSOLD ) &&
  //     (incCci && currentCci>=CCI_OVERSOLD) ))
  //     result = true
  //   else
  //     result = false

  // } else {
  //   if  ((incRsi &&  incMfi &&  incCci) || 
  //     (incMfi &&  incCci) || (incRsi &&  incCci) || (incRsi &&  incMfi) ||
  //     ((currentRsi <= RSI_OVERSOLD +10) &&
  //     ( currentMfi <= MFI_OVERSOLD +10) && 
  //     ( currentCci <= CCI_OVERSOLD ) ))
  //     result = true
  //   else
  //     result = false
  // }

  
  // if (side==='buy') { //RSI_OVERBOUGHT 70
  //   if ( (RSI_OVERSOLD  <= currentRsi) &&  (currentRsi<= RSI_OVERBOUGHT) &&  result) 
  //     result = true
  //   else
  //     result = false

  // } else {//RSI_OVERSOLD 30
  //   if ((RSI_OVERBOUGHT >= currentRsi) && (currentRsi>= RSI_OVERSOLD) &&  result) 
  //     result = true
  //   else
  //     result = false
  // }
  //log.bright(ARBITRAGE_EXCHANGE.green,side, asset,"rsi",currentRsi, result, "RSI_OVERBOUGHT", RSI_OVERBOUGHT, "RSI_OVERSOLD", RSI_OVERSOLD)
  return result
}

async function fetchTIs (exchId, coins) {
  log.bright(ARBITRAGE_EXCHANGE.green, "fetchTIs started for", coins.length, "symbols", "TI_FILTER", TI_FILTER)
  if (!TI_FILTER && !ADX_FILTER) return;

  const exchange =  exchanges[exchId];
  const indexOpen     = 1 // [ timestamp, open, high, low, close, volume ]
  const indexHigh     = 2 // [ timestamp, open, high, low, close, volume ]
  const indexLow      = 3 // [ timestamp, open, high, low, close, volume ]
  const indexClose    = 4 // [ timestamp, open, high, low, close, volume ]
  const indexVolume   = 5 // [ timestamp, open, high, low, close, volume ]
  for (var i =0; i<coins.length; i++) {
    //coins[i] ="ARK/ETH"
    const ohlcv = await exchange.fetchOHLCV (coins[i], ARBITRAGE_OHLCV_PERIOD)
    // const lastPrice = ohlcv[ohlcv.length - 1][indexClose] // closing price
    const seriesHigh    = ohlcv.slice (-80).map (x => x[indexHigh])         // high price
    const seriesLow     = ohlcv.slice (-80).map (x => x[indexLow])          // low price
    const seriesOpen    = ohlcv.slice (-80).map (x => x[indexOpen])         // popening price
    const seriesClose = ohlcv.slice (-80).map (x => x[indexClose])          // closing price
    const seriesVolume  = ohlcv.slice (-80).map (x => x[indexVolume])       // volume price

    // const seriesHigh    = ohlcv.map (x => x[indexHigh])         // high price
    // const seriesLow     = ohlcv.map (x => x[indexLow])          // low price
    // const seriesOpen    = ohlcv.map (x => x[indexOpen])         // popening price
    // const seriesClose = ohlcv.map (x => x[indexClose])          // closing price
    // const seriesVolume  = ohlcv.map (x => x[indexVolume])       // volume price

    if (RSI_FILTER) {
      var inputRSI = {
        values : seriesClose,
        period : 8
      }
      var rsi = RSI.calculate(inputRSI)
      if (!coin_rsi[coins[i]]) coin_rsi[coins[i]] = {};
      coin_rsi[coins[i]][exchId] = rsi
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "rsi:", rsi[rsi.length-1], "coin_rsi", coin_rsi[coins[i]][exchId]);
      }
    }
    
    if (MFI_FILTER) {
      var inputMFI = {
        high :   seriesHigh,
        low  :   seriesLow,
        close : seriesClose,
        volume : seriesVolume,
        period : 14
      }
      var mfi = MFI.calculate(inputMFI)
      if (!coin_mfi[coins[i]]) coin_mfi[coins[i]] = {};
      coin_mfi[coins[i]][exchId] = mfi
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "mfi:", mfi[mfi.length-1], "coin_mfi", coin_mfi[coins[i]][exchId]);
      }
    }
    
    if (CCI_FILTER) {
      var inputCII = {
        open : seriesOpen,
        high :   seriesHigh,
        low  :   seriesLow,
        close : seriesClose,
        period : 20
      }
      var cci = CCI.calculate(inputCII)
      if (!coin_cci[coins[i]]) coin_cci[coins[i]] = {};
      coin_cci[coins[i]][exchId] = cci
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "cci:", cci[cci.length-1], "coin_cci", coin_cci[coins[i]][exchId]);
      }
    }
    
    if (ADX_FILTER) {
      var inputADX = {
        high :   seriesHigh,
        low  :   seriesLow,
        close : seriesClose,
        period : 20 //like a binary trading
      }
      var adx = ADX.calculate(inputADX)
      if (!coin_adx[coins[i]]) coin_adx[coins[i]] = {};
      coin_adx[coins[i]][exchId] = adx
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "adx[adx.length-1]:", adx[adx.length-1], "coin_adx", coin_adx[coins[i]][exchId]);
        log(exchange.id.yellow, "asset", coins[i].toString().green, "adx[0]:", adx[0], "coin_adx", coin_adx[coins[i]][exchId]);
      }
    }
    
    if (BB_FILTER) {
      var inputBB = {
        values : seriesClose,
        period : 20, //binary trading
        stdDev : 2 //binary trading
      }
      var bb = BB.calculate(inputBB)
      if (!coin_bb[coins[i]]) coin_bb[coins[i]] = {};
      coin_bb[coins[i]][exchId] = bb
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "bb[adx.length-1]:", bb[bb.length-1], "coin_bb", coin_bb[coins[i]][exchId]);
        log(exchange.id.yellow, "asset", coins[i].toString().green, "bb[0]:", bb[0], "coin_bb", coin_bb[coins[i]][exchId]);
      }
    }
    if (MACD_FILTER) {
      var inputMACD = {
        values            : seriesClose,
        fastPeriod        : 5,
        slowPeriod        : 8,
        signalPeriod      : 3 ,
        SimpleMAOscillator: false,
        SimpleMASignal    : false
      }

      var macd = MACD.calculate(inputMACD);
      if (!coin_macd[coins[i]]) coin_macd[coins[i]] = {};
      coin_macd[coins[i]][exchId] = macd
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "macd:", macd[macd.length-1], "coin_macd", coin_macd[coins[i]][exchId]);
      }
    }
    if (OBV_FILTER) {
      let inputOBV = {
        close : seriesClose,
        volume : seriesVolume
      }

      var obv = OBV.calculate(inputOBV)
      if (!coin_obv[coins[i]]) coin_obv[coins[i]] = {};
      coin_obv[coins[i]][exchId] =obv
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "obv:", obv[obv.length-1], "coin_obv", coin_obv[coins[i]][exchId]);
      }
    }
    if (KD_FILTER) {
      let inputKD = {
        high: seriesHigh,
        low: seriesLow,
        close: seriesClose,
        period: 14,
        signalPeriod: 3
      };

      var kd = KD.calculate(inputKD)

      
      if (!coin_kd[coins[i]]) coin_kd[coins[i]] = {};
      coin_kd[coins[i]][exchId] = kd
      if (DEBUG) {
        log(exchange.id.yellow, "asset", coins[i].toString().green, "kd:", kd[kd.length-1], "coin_kd", coin_kd[coins[i]][exchId]);
      }
      log(exchange.id.yellow, "asset", coins[i].toString().green, "kd:", kd[kd.length-1], "coin_kd", coin_kd[coins[i]][exchId]);

    }
    

    

  }
  await ccxt.sleep (exchange.rateLimit*concurrentProcess)
}

// Retrieve Wallet by AltCoin and Exchange
function fetchBalance(altcoin, exchId) {
    var result = undefined;
    try {
      log.bright(ARBITRAGE_EXCHANGE.green, "fetchBalance started", altcoin, sqvWallets[exchId][altcoin])
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
// Retrieve balances by Exchange for all coins
async function fetchBalances(exchId) {
   // return  new Promise (async (resolve, reject) => {

        try {
            const exchange =  exchanges[exchId];
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
            //log("balance.total", balance.total)
            if (STUB) {
                sqvWallets[exchId]=JSON.parse('{"' + sqvCoin + '":"' + sqvAmount +'"}')
            } else {
              //store the total balance by altcoin
              sqvWallets[exchId]=balance.free
            }
            await ccxt.sleep (exchange.rateLimit*concurrentProcess)
            //resolve(balance);
        } catch (e) {
          log.red("Error retrieving balances (fetchBalances)",  e.message);
          if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
              log.bright.yellow (exchange.id,"error fetchBalances",'[DDoS Protection] ' + e.message)
          } else if (e instanceof ccxt.RequestTimeout) {
              log.bright.yellow (exchange.id,"error fetchBalances",'[Request Timeout] ' + e.message)
          } else if (e instanceof ccxt.AuthenticationError) {
              log.bright.yellow (exchange.id,"error fetchBalances",'[Authentication Error] ' + e.message)
          } else if (e instanceof ccxt.ExchangeNotAvailable) {
              log.bright.yellow (exchange.id,"error fetchBalances",'[Exchange Not Available Error] ' + e.message)
          } else if (e instanceof ccxt.ExchangeError) {
              log.bright.yellow (exchange.id,"error fetchBalances",'[Exchange Error] ' + e.message)
          } else if (e instanceof ccxt.NetworkError) {
              log.bright.yellow (exchange.id,"error fetchBalances",'[Network Error] ' + e.message)
          } else if (e instanceof ccxt.InvalidNonce) {
              log.bright.yellow(exchange.id,"error fetchBalances",'[InvalidNonce Error] ' + e.message)
          } 


        }
   // })

}
async function rollbackSellOrder (exchangeid, symbol, order, priceTail, symbolTail, priceBuy, symbolBuy) {
  var exchange = exchanges[exchangeid]
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder", order.id)
  var result = true
  var price  = order.price
  var filled = order.filled
  var status = order.status
  var amount = order.amount
  var umse
  amountFilled = 0
  var ticker
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder status", status, "filled", filled)
    
  if (status==='open' && filled!==0 ) {
    //check if the trading for the tail is a good opportunity
    ticker = await exchange.fetchTicker (symbolTail)
    //if the ticker for the tail has a price greater than the previous one the cancel the current order 
    var _price = ticker['bid']
    //order price is minus than
    if (_price>priceTail && symbolBuy !== undefined) {
      //fetch ticker for the rollback trading (head side)
      ticker = await exchange.fetchTicker (symbolBuy)
      var price_bought_to_sell = ticker['bid']
      if (price_bought_to_sell>=(priceBuy * (1+0.0015))) {

        let order_ = await exchange.createOrder (symbolBuy,'limit', 'sell', (amount-filled),price_bought_to_sell, {'recvWindow': 60000000})
        amountFilled=filled
        await exchange.cancelOrder(order.id, symbol)
        await ccxt.sleep (exchange.rateLimit*3)
        order_ = await exchange.createOrder (symbolTail,'limit', 'sell', filled,_price, {'recvWindow': 60000000})
        
        result = false;
      } 
    } 
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder price for tail order(sell)", price, "origianl price tail", priceTail)
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder price for rollback order symbol", symbolBuy, "price", price_bought_to_sell, "vs original price", priceBuy)
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder closed successfully", !result)
    await ccxt.sleep (exchange.rateLimit*5*concurrentProcess)

  } else if (status==='open' && filled===0) {
    ticker = await exchange.fetchTicker (symbolBuy)
    var price_bought_to_sell = ticker['bid']
    if (price_bought_to_sell>=priceBuy * (1+0.0015)) {
      await exchange.cancelOrder(order.id, symbol)
      await ccxt.sleep (exchange.rateLimit*2)
      let order_ = await exchange.createOrder (symbolBuy,'limit', 'sell', amount,price_bought_to_sell, {'recvWindow': 60000000})
      await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder rollback order done for symbol", symbolBuy, "new order id", order_.id, "price", price_bought_to_sell, "vs original price", priceBuy)
      result = false;
    } else if (symbolBuy !== undefined) { //pair opportunity on going
      //check if the trading for the tail is a good opportunity
      var tickerPair = await exchange.fetchTicker (symbol)
      var __price = tickerPair['bid'] //the current bid price for the current order 
      var newPairAmount = __price    * amount  //the new current amount selling to the current bid price
      var newTailAmount = _price     * newPairAmount 
      var theOriginalAmount  = price * amount * _price
      log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder current bid price", __price, "amout based on current bid price", newPairAmount, "new tail amount", newTailAmount,"origianl amount", theOriginalAmount)
    

      if (theOriginalAmount<=newTailAmount) {
        await exchange.cancelOrder(order.id, symbol)
        await ccxt.sleep (exchange.rateLimit*2)
        let __order = await exchange.createOrder (symbolBuy,'limit', 'sell', (amount-filled),__price, {'recvWindow': 60000000})
        await ccxt.sleep (exchange.rateLimit)
        __order = await exchange.createOrder (symbolBuy,'limit', 'buy', newTailAmount,_price, {'recvWindow': 60000000}) 
      }
      await ccxt.sleep (exchange.rateLimit)
      log.bright.green(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder closed: cancelled current order, sold to current price and sold the final opportinity")
    }
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder price for rollback order symbol", symbolBuy, "price", price_bought_to_sell, "vs original price", priceBuy)
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "rollebackSellOrder closed successfully", !result)

  }
  return result
}

async function rollbackBuyOrder (exchangeid, symbol, order, transaction_id) {
  var result = true
  try {
    var exchange = exchanges[exchangeid]
    log.bright(exchange.id.green, "rollebackBuyOrder started for", order.id)

    var price  = order.price
    var filled = order.filled
    var status = order.status
    var amount = order.amount
    var umse
    if (status==='open' && filled===0 ) {
      await exchange.cancelOrder(order.id, symbol)
      log.bright.magenta(exchange.iso8601 (Date.now ()),"order id",order.id, "cancelled")
      umse = database.updateOpportunity ("HEAD", 3, amount, transaction_id)
      result = false;
    } 
    else if (status==='open' && filled>0 ) {
      let orderbook = await exchange.fetchOrderBook (symbol)
      let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
      let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
      if (bid >= (price*(1+0.002))) {
        await exchange.cancelOrder(order.id, symbol)
        await ccxt.sleep (exchange.rateLimit*4*concurrentProcess)
        log.bright.magenta(exchange.iso8601 (Date.now ()),"order id",order.id, "cancelled")
        let orderSell = await exchange.createOrder (symbol,'limit', 'sell', filled,bid, {'recvWindow': 60000000})
        await ccxt.sleep (exchange.rateLimit*4*concurrentProcess)
        log.bright.magenta(exchange.iso8601 (Date.now ()),"order id",orderSell.id, "sold", "amount", filled)
        
        umse = database.updateOpportunity ("HEAD", 2, (filled*bid), transaction_id)
        result = false;
      }
    } else {
      log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,"rollback failed. Order status !== 'open'")
    }
    
  } catch (error) {
    log.bright.red (exchange.iso8601 (Date.now ()),exchange.id,"buy order rollback failure",error.message, symbol )
    result = true;
  }
  return result
}

//return true if order executed succesful false otherwise
async function checkFillOrder(exchange ,symbol,orderid,transaction_id, priceTail, symbolTail,priceBuy, symbolBuy ) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkFillOrder started for", symbol,orderid)
  var found = true
  var dateFill = new Date()
  var orders
  
  while (found) {
    try {
      orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
      await ccxt.sleep (exchange.rateLimit*concurrentProcess)
      found=false
      var order
    
      for (var j=0;j<orders.length;j++) {
        order = orders[j]
        //log.bright.magenta(exchange.iso8601 (Date.now ()),exchange.id.green, "order [",j,"] order(s) open symbol", order.info.symbol, "orderid", order.info.orderId)
        //var _symbol = symbol.replace("/", "")
        if (orderid===order.id){
          found = true
          if (dateFill.getTime()>(dateOrder.getTime() + (1000*60*10))) {
            if (order.side === 'buy')  {
                log.bright.magenta(exchange.iso8601 (Date.now ()),"start rollback if it is possibile for the following order id", order.id)
                found = await rollbackBuyOrder (exchange.id,symbol, order)
            }
            else {
              if (priceTail!==null) {
                found = await rollbackSellOrder (exchange.id,symbol, order, priceTail, symbolTail,priceBuy, symbolBuy)
              }
            //log.bright(exchange.id.green, "checkFillOrder order still pending for", symbol,orderid, "order(",orderid,")")
            }
            dateFill.setTime(new Date())
            dateOrder.setTime(new Date())
          } else {
            dateFill.setTime(new Date())
          }
        }
      }
      //log.bright.magenta(exchange.id.green, "still [",orders.length,"] order(s) open for the current asset",symbol)
      //await ccxt.sleep (exchange.rateLimit*concurrentProcess)
      //orders = await exchange.fetchOpenOrders (symbol,undefined,undefined, {'recvWindow': 60000000})
    }
    catch (e) {
      log.bright.red (exchange.iso8601 (Date.now ()),exchange.id,"error checkFillOrder",e, "Try to retrieving order list another time", symbol )
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
          // it has thrown the exception as expected
          log.bright.yellow(exchange.id,"error checkFillOrder",'[InvalidNonce Error] ' + e.message)
      }else if (e instanceof ccxt.OrderNotFound) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkFillOrder",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkFillOrder",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkFillOrder",'[InsufficientFunds Error] ' + e.message)
      } 
      found = true
    }
  }
  log.bright(exchange.id.green, "checkFillOrder completed for", symbol, "order(",orderid,") closed", found)
  
  return found;
}

//check limimts provided by exchange with the current opportunity
async function checkLimit(exchangeid,symbol, amount, price, cost) {
  var result = true;
  let marketLimits = markets[exchangeid][symbol].limits
  if (marketLimits === undefined || marketLimits["price"] === undefined || marketLimits["amount"] === undefined || marketLimits["cost"] === undefined) {
         log.red('market.limits.[price|amount|cost] property is not set. I don\'t care',exchangeid, symbol )
  } else{
      if (marketLimits.amount.min>amount || marketLimits.amount.max < amount) {
        log.red('market.limits.[amount] is above your order',exchangeid, symbol, amount )
        result = false;
      }
      if (marketLimits.price.min>price || marketLimits.price.max < price) {
        log.red('market.limits.[price] is above your order',exchangeid, symbol, price )
        result = false;
      }
      if (marketLimits.cost.min>cost || marketLimits.cost.max < cost) {
        log.red('market.limits.[cost] is above your order',exchangeid, symbol,  cost )
        result = false;
      }    
  }
  return result
}

async function checkLastPrice(exchangeid, symbol, price, side){
  var exchange = exchanges[exchangeid]
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkLastPrice started", exchangeid, symbol, price, side)
  //var priceBuy, priceSell
  
  var found = false
  while (!found) {
    try {
      var ticker = await exchange.fetchTicker(symbol);
      await ccxt.sleep (exchange.rateLimit*4)
      var priceLast = ticker['last']
      if (side==='buy') {
        if (priceLast <= price) found=true

      } else {
        if (priceLast >= price) found=true
      }
    } 
    catch (e){
      log.bright.red (exchange.id,"error checkLastPrice",e.message, "Try to fetch lat price another time", exchangeid )
      if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchange.id,"error checkLastPrice",'[DDoS Protection] ' + e.message)
      } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchange.id,"error checkLastPrice",'[Request Timeout] ' + e.message)
      } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchange.id,"error checkLastPrice",'[Authentication Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchange.id,"error checkLastPrice",'[Exchange Not Available Error] ' + e.message)
      } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchange.id,"error checkLastPrice",'[Exchange Error] ' + e.message)
      } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchange.id,"error checkLastPrice",'[Network Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidNonce) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkLastPrice",'[InvalidNonce Error] ' + e.message)
      } else if (e instanceof ccxt.OrderNotFound) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkLastPrice",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkLastPrice",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkLastPrice",'[InsufficientFunds Error] ' + e.message)
      }

    }
  }
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkLastPrice completed", symbol, price, side)
}

//true for bid price -- false for ask
async function checkOrderbook(exchangeid, symbol) {
  var exchange = exchanges[exchangeid]
  log.bright(exchange.id.green, "checkOrderbook started", exchangeid)
  if (!ARBITRAGE_ORDERBOOK_FILTER) return
  var result = true;
  
  let orderbook = await exchange.fetchOrderBook (symbol)
  // let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
  // let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
  // let spread = (bid && ask) ? ask - bid : undefined
  // let spreadPerc = (ask/bid -1)*100
  // console.log (exchange.id, 'market price', { bid, ask, spread, spreadPerc })
  var totalAsks=0, totalBids=0;
  var maxTotalBidAmount = 0
  var maxTotalAskAmount = 0
  var maxBidAmount = 0
  var maxAskAmount = 0

 // for (var i =0;i<orderbook.bids.length; i++ ) {
  for (var i =0;i<(SALESMAN_OB_LEVEL+1); i++ ) {
    
    var priceBid =  orderbook.bids[i][0]
    var amountBid =  orderbook.bids[i][1]
    var partialTotalBid = priceBid*amountBid
    if (i===0) { 
      maxBidAmount = partialTotalBid
      maxTotalBidAmount = maxBidAmount
    }
    if (maxBidAmount < partialTotalBid) {
      maxBidAmount = partialTotalBid;
      maxTotalBidAmount=maxTotalBidAmount+maxBidAmount
    }
    totalBids = totalBids + (priceBid*amountBid)
    if (DEBUG) {
      log (exchange.iso8601 (Date.now ()),exchange.id.green,"orderbook BID price", priceBid, "amount", amountBid, "total", totalBids )
      log.green(exchange.iso8601 (Date.now ()),exchange.id.green,"bid wall","price", priceBid,"amount", amountBid,"total", partialTotalBid   )
    }
  }
 
  for (var j =0;j<(ARBITRAGE_OB_LEVEL+1); j++ ) {
  //for (var j =0;j<orderbook.asks.length; j++ ) {
    var priceAsk =  orderbook.asks[j][0]
    var amountAsk =  orderbook.asks[j][1]
    var partialTotalAsk = priceAsk*amountAsk
    if (j===0) {
      maxAskAmount = partialTotalAsk
      maxTotalAskAmount = maxAskAmount
    }
    if (maxAskAmount < partialTotalAsk) {
      maxAskAmount = partialTotalAsk;
      maxTotalAskAmount = maxTotalAskAmount + maxAskAmount
    }
    totalAsks = totalAsks + (priceAsk*amountAsk)
    if (DEBUG) {
      log.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,"ask wall","price", priceAsk,"amount", amountAsk,"total", partialTotalAsk)
      log (exchange.iso8601 (Date.now ()),exchange.id.green,"orderbook ASK price", priceAsk, "amount", amountAsk, "total", totalAsks )
    }
  }
  var threshold = 0 //as CDC --- DEFINITO A CazzoDeCane
  log.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,"max bid amount",maxBidAmount.toString().green, "max total bid amount",maxTotalBidAmount.toString().green, "symbol", symbol )
  log.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,"max ask amount",maxAskAmount.toString().magenta, "max total ask amount",maxTotalAskAmount.toString().magenta, "symbol", symbol)
  log.bright(exchange.id.green, "checkOrderbook totals bids", totalBids, "asks", totalAsks, "spread", totalAsks- totalBids, "result", (totalAsks- totalBids<0), "symbol", symbol )
  var trednUp = (totalBids - totalAsks >threshold)?true:false
  var pressionUp = (maxTotalBidAmount - maxTotalAskAmount > 0)?true:false
  //return (totalAsks - totalBids<threshold)?true:false
  return [trednUp, pressionUp]

}

async function fetchTickers() {
  log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers started")
  const exchange = exchanges[ARBITRAGE_EXCHANGE];
  //const numParallelProcess = ARBITRAGE_EXCHANGE_WALLET_DIVIDER
  // TODO: skip the iteration if there is an open order pending. 
  try {
    for (var i=0;i<coinPairsMaster.length;i++) {
      
      var symbol = coinPairsMaster[i]
      var symbolMasterBase  = symbol.slice(0,symbol.indexOf("/"))

      for (var j=0;j<coinPairs.length;j++) {
        amountFilled=0
        let symbolPair = coinPairs[j]
        try {
          if (symbolPair.startsWith(symbolMasterBase+"/")) {
            log.bright.magenta(ARBITRAGE_EXCHANGE.green, "fetchTickers coinPairsMaster", coinPairsMaster[i], "coinPairs", coinPairs[j])
            var transaction_id = "CRIME_IEA_" + new Date().getTime()
            
            var coinPairQuote = symbolPair.slice(symbolPair.indexOf("/")+1) 
            var symbolMasterSell = coinPairQuote + "/" + coinMaster

            
            var textCSV = ""
            
            //log (exchange.id, 'market price', { bidPair, askPair, spreadPair })
            if (VOLUME_FILTER) {
              var usdVolumeHead = await calculateUSDTVolume(ARBITRAGE_EXCHANGE, symbol)
              var usdVolumePair = await calculateUSDTVolume(ARBITRAGE_EXCHANGE, symbolPair)
              var usdVolumeTail = await calculateUSDTVolume(ARBITRAGE_EXCHANGE, symbolMasterSell)
              if (usdVolumeHead < VOLUME_THRESHOLD  ||
                  usdVolumePair < VOLUME_THRESHOLD  ||
                  usdVolumeTail < VOLUME_THRESHOLD) {
                log.bright.red(ARBITRAGE_EXCHANGE.green, "skip the following assets",symbol, symbolPair, symbolMasterSell )
                log.bright.red(ARBITRAGE_EXCHANGE.green, "volumes below the threshold[",VOLUME_THRESHOLD,"] ",usdVolumeHead, usdVolumePair, usdVolumeTail )
                continue;
              }
            }
            await fetchTIs(ARBITRAGE_EXCHANGE,[symbol,symbolPair,symbolMasterSell] )

            var o = await checkMACD(ARBITRAGE_EXCHANGE,symbol)
            //log ("MACD", o)
            o=await checkKD(ARBITRAGE_EXCHANGE,symbol)
            // log ("KD", o)
            if (TI_FILTER){
              var tiHeadResult = await checkTIs(ARBITRAGE_EXCHANGE, "buy",  10,  symbol )
              var tiPairResult = await checkTIs(ARBITRAGE_EXCHANGE, "sell", 10,  symbolPair )
              var tiTailResult = await checkTIs(ARBITRAGE_EXCHANGE, "sell", 10,  symbolMasterSell)
              log.bright(ARBITRAGE_EXCHANGE.green, "tiHeadResult ",tiHeadResult,"tiPairResult", tiPairResult, "tiTailResult", tiTailResult )
              //if (!tiHeadResult || !tiPairResult || !tiTailResult) {
              //if (!(tiHeadResult || tiPairResult || tiTailResult)) {
              if ((!tiHeadResult || !tiPairResult || !tiTailResult) && 
                  (!tiPairResult || !tiTailResult) &&
                  (!tiHeadResult || !tiTailResult) &&
                  (!tiHeadResult || !tiPairResult)) {
                log.bright.red(ARBITRAGE_EXCHANGE.green, "skip the following assets",symbol, symbolPair, symbolMasterSell )
                log.bright.red(ARBITRAGE_EXCHANGE.green, "ti below the threshold and not alingend to trend: tiHeadResult ",tiHeadResult,"tiPairResult", tiPairResult, "tiTailResult", tiTailResult)

                continue;
              }
            }
            
            if (RSI_FILTER) {
              //head
              var kpiRSI = await checkRSI(exchange.id,symbol,5 )
              log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchTickers", "HEAD".green, "check kpi RSI",kpiRSI, "kpiRSI[0]", kpiRSI[0],"kpiRSI[1]", kpiRSI[1])
              if (kpiRSI[1]<=RSI_OVERBOUGHT-30) { //RSI_OVERSOLD = 40; RSI_OVERBOUGHT = 80
              //if (kpiRSI[1]<=RSI_OVERBOUGHT+10 && kpiRSI[1]>=RSI_OVERSOLD-10) { //RSI_OVERSOLD = 40; RSI_OVERBOUGHT = 80
                if (kpiRSI>RSI_OVERBOUGHT-10) {
                  side='ask'
                  log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "ti RSI aligned to the downtrend",kpiRSI[1])
                } else {
                  log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "skip the following assets",symbol )
                  log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "ti RSI above the threshold ",kpiRSI[1])
                  continue;
                }
                
              }
              //pair
              kpiRSI = await checkRSI(exchange.id,symbolPair,5 )
              log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchTickers", "MID".magenta, "check kpi RSI",kpiRSI, "kpiRSI[0]", kpiRSI[0],"kpiRSI[1]", kpiRSI[1])
              if (kpiRSI[1]>=RSI_OVERSOLD +25 ) { //RSI_OVERSOLD = 40; RSI_OVERBOUGHT = 80
              //if (kpiRSI[1]<=RSI_OVERBOUGHT+10 && kpiRSI[1]>=RSI_OVERSOLD-10) { //RSI_OVERSOLD = 40; RSI_OVERBOUGHT = 80
                log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "skip the following assets",symbolPair )
                log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "ti RSI above the threshold ",kpiRSI[1])
                continue;
              }
              //tail
              kpiRSI = await checkRSI(exchange.id,symbolMasterSell,5 )
              log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchTickers", "TAIL".magenta, "check kpi RSI",kpiRSI, "kpiRSI[0]", kpiRSI[0],"kpiRSI[1]", kpiRSI[1])
              if (kpiRSI[1]>=RSI_OVERSOLD +25 ) { //RSI_OVERSOLD = 40; RSI_OVERBOUGHT = 80
              //if (kpiRSI[1]<=RSI_OVERBOUGHT+10 && kpiRSI[1]>=RSI_OVERSOLD-10) { //RSI_OVERSOLD = 40; RSI_OVERBOUGHT = 80
                log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "skip the following assets",symbolMasterSell )
                log.bright.red(exchange.iso8601(Date.now ()),exchange.id.green, "ti RSI above the threshold ",kpiRSI[1])
                continue;
              }
            }

            if (ADX_FILTER) {
              var tiHeadResult = await checkStrengthTrend(ARBITRAGE_EXCHANGE, "buy",  10,  symbol )
              var tiPairResult = await checkStrengthTrend(ARBITRAGE_EXCHANGE, "sell", 10,  symbolPair )
              var tiTailResult = await checkStrengthTrend(ARBITRAGE_EXCHANGE, "sell", 10,  symbolMasterSell)
              log.bright(ARBITRAGE_EXCHANGE.green, "tiHeadResult ",tiHeadResult,"tiPairResult", tiPairResult, "tiTailResult", tiTailResult )
              //if (!tiHeadResult || !tiPairResult || !tiTailResult) {
              //if (!(tiHeadResult || tiPairResult || tiTailResult)) {
              if ((!tiHeadResult || !tiPairResult || !tiTailResult) && 
                  (!tiPairResult || !tiTailResult) &&
                  (!tiHeadResult || !tiTailResult) &&
                  (!tiHeadResult || !tiPairResult)) {
                log.bright.red(ARBITRAGE_EXCHANGE.green, "skip the following assets",symbol, symbolPair, symbolMasterSell )
                log.bright.red(ARBITRAGE_EXCHANGE.green, "ADX TI below the threshold and not alingend to trend: tiHeadResult ",tiHeadResult,"tiPairResult", tiPairResult, "tiTailResult", tiTailResult)
                continue;
              }

            }

            var selectOpp = await database.selectOpportunities (crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN) 
            var orderPending = selectOpp.rows_length;
            await fetchBalances(ARBITRAGE_EXCHANGE)

            var wallet = fetchBalance(ARBITRAGE_EXCHANGE_COIN, ARBITRAGE_EXCHANGE)
            quantity = (wallet * wallet_percentage)/100
            log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers wallet",wallet, "quantity", quantity, "wallet_percentage", wallet_percentage, "concurrentProcess", concurrentProcess)
            
            if ((concurrentProcess - orderPending) <=0) {
              log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers quantity not available, order pending reach maximun limit",orderPending)
              await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
              continue;
            }


            quantity = quantity / (concurrentProcess - orderPending)
            
            quantity = functions.priceToPrecision(exchange.id, markets,symbol, quantity)

            log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers quantity coins available",quantity)

            var sidePair = 'sell' //as default
            
            var obResult = false;
            if (ARBITRAGE_ORDERBOOK_FILTER) {
              var obTrendH = await checkOrderbook(exchange.id, symbol)
              var obTrendM = await checkOrderbook(exchange.id, symbolPair)
              var obTrendT = await checkOrderbook(exchange.id, symbolMasterSell)
              if (((obTrendH[0] && obTrendH[1]) && //[true, true]
                  (!obTrendM[0] && !obTrendM[1]) && //[false, false]
                  (!obTrendT[0] && !obTrendT[1])) || //[false, false]
                  ((!obTrendH[0] && obTrendH[1]) && //[false, true]
                  (obTrendM[0] && !obTrendM[1]) &&//[true, false]
                  (obTrendT[0] && !obTrendT[1])) || //[true, false]
                  ((obTrendH[0] && !obTrendH[1]) && //[true, false]
                  (!obTrendM[0] && !obTrendM[1]) &&  //[false, false]
                  (!obTrendT[0] && !obTrendT[1]))) {
                sidePair = 'sell'
                obResult = true
              } else if ((!obTrendH[0] && !obTrendH[1]) &&
                  (obTrendM[0] && obTrendM[1]) &&
                  (obTrendT[0] && obTrendT[1])) {
                sidePair = 'buy'
                var temp =symbolMasterSell
                symbolMasterSell=symbol
                symbol=temp
              }
              if (!obResult) {
                log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers orderbool analysis failure","symbol", symbol.green, obTrendH, "symbol", symbolPair.green,obTrendM, "symbol", symbolMasterSell.green, obTrendT, " not aligned to [true,true], [false,false], [false,false]")
                await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
                continue;

              }
            }

            let orderbookMasterSell = await exchange.fetchTicker (symbolMasterSell)
            let bidMasterSell = orderbookMasterSell['bid']
            let askMasterSell = orderbookMasterSell['ask']
            let lastMasterSell = orderbookMasterSell['last']
            //let spreadMasterSell = (bidMasterSell && askMasterSell) ? askMasterSell - bidMasterSell : undefined
            let spreadMasterSell = (askMasterSell/bidMasterSell-1)*100

            let orderbookPair = await exchange.fetchTicker (symbolPair)
            let bidPair = orderbookPair['bid']
            let askPair = orderbookPair['ask']
            let lastPair = orderbookPair['last']
            //let spreadPair = (bidPair && askPair) ? askPair - bidPair : undefined
            let spreadPair = (askPair/bidPair-1)*100

            let orderbookMasterBuy = await exchange.fetchTicker (symbol)
            let bidMasterBuy =  ['bid']
            let askMasterBuy = orderbookMasterBuy['ask']
            let lastMasterBuy = orderbookMasterBuy['last']
            //let spreadMasterBuy = (bidMasterBuy && askMasterBuy) ? askMasterBuy - bidMasterBuy : undefined
            let spreadMasterBuy = (askMasterBuy/bidMasterBuy-1)*100
            
            if (DEBUG) {
              log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers orderbookMasterBuy", orderbookMasterBuy)
              log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers orderbookPair", orderbookPair)
              log.bright(ARBITRAGE_EXCHANGE.green, "fetchTickers spreadMasterSell", orderbookMasterSell)
            }

            if (SPREAD_FILTER) {
              if (spreadMasterSell > SPREAD_THRESHOLD && spreadPair > SPREAD_THRESHOLD && spreadMasterBuy > SPREAD_THRESHOLD) {
                log.bright.red(ARBITRAGE_EXCHANGE.green, "skip the following assets",symbol, symbolPair, symbolMasterSell )
                log.bright.red(ARBITRAGE_EXCHANGE.green, "spread below the threshold",SPREAD_THRESHOLD,"spreadMasterSell", spreadMasterSell,"spreadPair",spreadPair, "spreadMasterBuy", spreadMasterBuy)
            
                await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
                // textCSV = new Date().toISOString()+"," +symbol+"," + symbolPair+"," +symbolMasterSell+"," +priceMasterBuy+"," +pricePair+"," +priceMasterSell+"," +cashOutMasterBuy+"," +cashInPair+"," +cashInMasterSell+"," +(profit.toString())+"," + result
                // fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                //                if (err) log.red( err.message);}); 
                continue;
              }
            }

            
            switch (ARBITRAGE_CRITERIA)  {
              case 'bid_ask':

                break;
              case 'ask_bid':
                bidMasterBuy = askMasterBuy
                askPair = bidPair
                askMasterSell = bidMasterSell
                break;
              case 'last':
                bidMasterBuy = lastMasterBuy
                askPair = lastPair
                askMasterSell = lastMasterSell
                break;  
              default: //bid_ask as default
            }
            
            var priceMasterBuy = bidMasterBuy * (1 + SLIPPAGE_ALLOWED)
            var pricePair = askPair * (1 - SLIPPAGE_ALLOWED)
            var priceMasterSell = askMasterSell * (1 - SLIPPAGE_ALLOWED)
            
            var amount = (quantity / priceMasterBuy)
            amount = amount - (amount * tradingFee_maker)
            amount = functions.amountToPrecision(exchange.id,markets, symbol, amount )
            //TODO read: https://support.binance.com/hc/en-us/articles/115000594711-Trading-Rule
            if (LIMIT_FILTER) {
              var resultLH = await checkLimit(ARBITRAGE_EXCHANGE,symbol, amount, priceMasterBuy, quantity)
              var resultLM = await checkLimit(ARBITRAGE_EXCHANGE,symbolPair, amount,pricePair, (amount*pricePair) )
              var resultLT = await checkLimit(ARBITRAGE_EXCHANGE,symbolMasterSell, (amount*pricePair), priceMasterSell, (amount*pricePair*priceMasterSell))
              if (!(resultLH && resultLM && resultLT)) {
                log.bright.red(ARBITRAGE_EXCHANGE.green, "skip the following assets",symbol, symbolPair, symbolMasterSell )
                log.bright.red(ARBITRAGE_EXCHANGE.green, "limits below the threshold declared by excahnge","head",resultLH, "mid", resultLM, "tail", resultLT )
                await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
                continue;
              }
            }
            var cashOutMasterBuy  = functions.priceToPrecision(exchange.id,markets, symbol, (amount * priceMasterBuy))
            var cashInPair        = functions.priceToPrecision(exchange.id,markets, symbolPair, ((amount * pricePair) - (amount * pricePair * tradingFee_maker)))
            var cashInMasterSell  = functions.priceToPrecision(exchange.id,markets, symbolMasterSell, ((cashInPair * priceMasterSell) -  (cashInPair*priceMasterSell * tradingFee_maker)))

            var profit ="0%"
            //go to trade if there is an opportunity with profit            
            profit = cashInMasterSell/quantity
            profit =((profit - 1) * 100).toFixed(3)
            profit = profit + "%"
            var result = false
            if (cashInMasterSell>(quantity * (1+ 0.002))) {
              result = true
             // log.green(exchange.id.yellow, "symbol 1st (head)", symbol, "symbol 2nd (pair)", symbolPair, "symbol 3rd (tail)", symbolMasterSell)
             // log(exchange.id.yellow, "price 1st (head)", priceMasterBuy.toString().green, "price 2nd (pair)", pricePair.toString().magenta, "price 3rd (tail)", priceMasterSell.toString().magenta );
             // log(exchange.id.yellow, "amount bought 1st & 2nd (head & pair)", amount.toString().green, "cash out (raw)",(amount * priceMasterBuy), "cash out (head) ", cashOutMasterBuy.toString().magenta, "cash in (pair)", cashInPair.toString().magenta, "cash in (tail)", cashInMasterSell.toString().magenta );
             //  log(exchange.id.yellow, "profit", profit.toString().green)
              if (!STUB) {
                var params = {
                    'test': true,  // test if it's valid, but don't actually place it
                }

                var multiple_ex_id,multiple_ex_info //evaluated during the multiple wallet
                if (ARBITRAGE_MULTIPLE_WALLET) {
                  var amountTails  = amount 
                  amountTails = amountTails * pricePair
                  amountTails = amountTails - (amountTails * tradingFee_maker)
                  amountTails  = functions.amountToPrecision(exchange.id,markets, symbolMasterSell, amountTails )
                  let _marketSellMasterOrder = await exchange.createOrder (symbolMasterSell,'limit', 'sell', amount,priceMasterSell )
                  //await ccxt.sleep (exchange.rateLimit*concurrentProcess)
                  multiple_ex_id = _marketSellMasterOrder.id
                  multiple_ex_info = JSON.stringify(_marketSellMasterOrder.info)
                  log.magenta(exchange.id, "marketSellOrder","symbol",symbolMasterSell, "id", multiple_ex_id, "info",multiple_ex_info)
                }
                var insertOppHistory
                var ex_id, ex_info, ex_error;
                //buy head
                try {
                  let marketBuyOrder = await exchange.createOrder (symbol,'limit', 'buy', amount,priceMasterBuy)
                  //await ccxt.sleep (exchange.rateLimit*concurrentProcess)
                  dateOrder = new Date()
                  ex_id = marketBuyOrder.id
                  ex_info = JSON.stringify(marketBuyOrder.info)
                  log.green(exchange.id, "marketBuyOrder","symbol",symbol,"id", ex_id, "info",ex_info )
                  var insertOpp = database.insertOpportunity (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbol, symbolPair,symbolMasterSell, quantity,profit,"HEAD" )
                  insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbol, quantity,"HEAD", ex_id, ex_info, ex_error )
                  
                }
                catch (error) {
                  log.red(exchange.id.green, "marketBuyOrder error", error.message)
                  ex_error=error.message
                  insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbol, quantity,"HEAD", ex_id, ex_info, ex_error )
                  await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
                  continue
                }
                await ccxt.sleep (exchange.rateLimit*concurrentProcess)
                //log("insert opp", insertOpp)
                log.green(exchange.id.yellow, "symbol 1st (head)", symbol, "symbol 2nd (pair)", symbolPair, "symbol 3rd (tail)", symbolMasterSell)
                log(exchange.id.yellow, "price 1st (head)", priceMasterBuy.toString().green, "price 2nd (pair)", pricePair.toString().magenta, "price 3rd (tail)", priceMasterSell.toString().magenta );
                log(exchange.id.yellow, "amount bought 1st & 2nd (head & pair)", amount.toString().green, "cash out (raw)",(amount * priceMasterBuy), "cash out (head) ", cashOutMasterBuy.toString().magenta, "cash in (pair)", cashInPair.toString().magenta, "cash in (tail)", cashInMasterSell.toString().magenta );
                log(exchange.id.yellow, "profit", profit.toString().green)
                
                result = await checkFillOrder(exchange,symbol,ex_id, transaction_id, priceMasterBuy, undefined)
                if (result) continue;
                //sell pair
                try {
                  amount = amount - (amount * tradingFee_maker)
                  amount  = functions.amountToPrecision(exchange.id,markets, symbolPair,amount)
                  var ticker = await exchange.fetchTicker (symbolPair)
                  var criteria = (sidePair === 'sell')?'bid':'ask'
                  var price = ticker[criteria]
                  if (price>pricePair) pricePair=price 
                  let marketSellPairOrder = await exchange.createOrder (symbolPair,'limit', sidePair, amount,pricePair)
                  dateOrder = new Date()  
                  ex_id = marketSellPairOrder.id
                  ex_info = JSON.stringify(marketSellPairOrder.info)
                  log.magenta(exchange.id, "Order - ", sidePair,"symbol",symbolPair, "id", ex_id, "info",ex_info )
                  var updateOppPair = database.updateOpportunity ("MID", 1, amount, transaction_id)
                  insertOppHistory  = database.insertOpportunityHistory (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbolPair, amount,"MID", ex_id, ex_info, ex_error )
                  await ccxt.sleep (exchange.rateLimit*concurrentProcess)
                } 
                catch (error) {
                  log.red(exchange.id, "marketSellPairOrder error", error.message)
                  ex_error=error.message
                  var umse =  database.updateOpportunity ("MID", 3, amount, transaction_id)
                  insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbolPair, amount,"MID", ex_id, ex_info, ex_error )
                  await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
                  continue;
                }
                result = await checkFillOrder(exchange, symbolPair,ex_id, transaction_id, priceMasterSell,symbolMasterSell,priceMasterBuy, symbol )
                if (result) continue;
                //sell tail
                if (!ARBITRAGE_MULTIPLE_WALLET) {
                  try {
                    if (amountFilled>0 ) amount=amountFilled
                    amount = amount * pricePair
                    //amount = amount - (amount * tradingFee_maker)
                    amount  = functions.amountToPrecision(exchange.id,markets, symbolMasterSell, amount )
                    
                    var tickerTail = await exchange.fetchTicker (symbolMasterSell)
                    var priceTail = tickerTail['bid']
                    if (priceTail>priceMasterSell) priceMasterSell=priceTail

                    let marketSellMasterOrder = await exchange.createOrder (symbolMasterSell,'limit', 'sell', amount,priceMasterSell)
                    dateOrder = new Date() 
                    await ccxt.sleep (exchange.rateLimit*concurrentProcess)
                    ex_id = marketSellMasterOrder.id
                    ex_info = JSON.stringify(marketSellMasterOrder.info)
                    var ums = await database.updateOpportunity ("TAIL", 2, amount, transaction_id)
                    insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbolMasterSell, amount,"TAIL", ex_id, ex_info, ex_error )
                    log.magenta(exchange.id, "marketSellOrder","symbol",symbolMasterSell, "id", ex_id, "info",ex_info )

                  }
                  catch (error) {
                    log.red(exchange.id.green, "marketSellOrder error", error.message)
                    ex_error=error.message
                    var umse = await database.updateOpportunity ("TAIL", 3, amount, transaction_id)
                    insertOppHistory = database.insertOpportunityHistory (transaction_id,crime_account, ARBITRAGE_EXCHANGE, ARBITRAGE_EXCHANGE_COIN, symbolPair, amount,"TAIL", ex_id, ex_info, ex_error )
                    continue;
                  }
                  result = await checkFillOrder(exchange, symbolMasterSell,ex_id, transaction_id, undefined, undefined)
                }
                else {
                  dateOrder = new Date()
                  result = await checkFillOrder(exchange, symbolMasterSell,multiple_ex_id,transaction_id, undefined, undefined)
                }
                //if (!result) continue; //not necessary
              } else {
                var startDatetime = new Date().toISOString()
                await checkLastPrice(exchange.id, symbol, priceMasterBuy, 'buy')
                var textStubCSV = startDatetime+"," +symbol+"," + amount+"," +priceMasterBuy+ "," +new Date().toISOString()
                fs.appendFile(fileStubCSV,"\n"+textStubCSV, (err) => {  
                             if (err) log.red( err.message);}); 
                await checkLastPrice(exchange.id, symbolPair, pricePair, 'sell')
                textStubCSV = startDatetime+"," +symbolPair+"," + amount+"," +pricePair+"," + ","+new Date().toISOString()
                fs.appendFile(fileStubCSV,"\n"+textStubCSV, (err) => {  
                             if (err) log.red( err.message);}); 
                await checkLastPrice(exchange.id, symbolMasterSell, priceMasterSell, 'sell')
                textStubCSV = startDatetime+"," +symbolMasterSell+"," + amount+"," +priceMasterSell+","  +","+new Date().toISOString()
                fs.appendFile(fileStubCSV,"\n"+textStubCSV, (err) => {  
                             if (err) log.red( err.message);}); 

              }
            }
            textCSV = new Date().toISOString()+"," +symbol+"," + symbolPair+"," +symbolMasterSell+"," +priceMasterBuy+"," +pricePair+"," +priceMasterSell+"," +cashOutMasterBuy+"," +cashInPair+"," +cashInMasterSell+"," +(profit.toString())+"," + (!result)
            fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                           if (err) log.red( err.message);}); 
            await ccxt.sleep (exchange.rateLimit*3*concurrentProcess)
            await checkKPIs(true)
            
            //await ccxt.sleep (exchange.rateLimit*60)
          }
        }
        catch (e) {
          log.red (ARBITRAGE_EXCHANGE.green,"error fetchTickers",e)
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
          }  else if (e instanceof ccxt.OrderNotFound) {
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
    }
  }
  catch (error) {
    log.red("fetchTickers Error", error.message)
  }
}


//MAIN ACA (crime) Engine
(async function main() {
    
   log.bright.green("SQV .::CRIME - cryptocurrency arbitrage single exchange::. - Version",version)
   log.bright("Intra Exchange",ARBITRAGE_EXCHANGE.green)
   log.bright("MULTIPLE WALLET",ARBITRAGE_MULTIPLE_WALLET.toString().green)
   log.bright("PRIMARY COIN", ARBITRAGE_EXCHANGE_COIN.green)
   log.bright("SECONDARY COINs (coin pair used for the multiple wallet)", ARBITRAGE_EXCHANGE_MULTIPLE_COINS.green)
   log.bright("WALLET PERCENTAGE", wallet_percentage.toString().green)
   log.bright("STUB", STUB.toString().green)
   log.bright("STUB WALLET COIN", sqvCoin.toString().green)
   log.bright("STUB WALLET AMOUNT", sqvAmount.toString().green)
   log.bright("LIMIT FILTER", LIMIT_FILTER.toString().green)
   log.bright("VOLUME FILTER", VOLUME_FILTER.toString().green)
   log.bright("VOLUME THRESHOLD", VOLUME_THRESHOLD.toString().green)
   log.bright("SPREAD FILTER", SPREAD_FILTER.toString().green)
   log.bright("SPREAD THRESHOLD", SPREAD_THRESHOLD.toString().green)
   log.bright("TI FILTER", TI_FILTER.toString().green)
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
   log.bright("MACD FILTER", MACD_FILTER.toString().green)
   log.bright("OBV FILTER", OBV_FILTER.toString().green)
   log.bright("KD FILTER",KD_FILTER.toString().green)
   log.bright("KD OVERSOLD", KD_OVERSOLD.toString().green)
   log.bright("KD OVERBOUGHT", KD_OVERBOUGHT.toString().green)

   log.bright("OHLCV PERIOD", ARBITRAGE_OHLCV_PERIOD.toString().green)
   log.bright("ORDERBOOK LEVEL", ARBITRAGE_OB_LEVEL.toString().green)
   log.bright("ORDERBOOK FILTER", ARBITRAGE_ORDERBOOK_FILTER.toString().green)
   log.bright("STOPLOSS", ARBITRAGE_STOPLOSS.toString().green)
   log.bright("STOPLOSS ENABLED", STOPLOSS_ENABLED.toString().green)
   log.bright("ARBITRAGE CRITERIA", ARBITRAGE_CRITERIA.toString().green)

   

   
    // initFile()
    let total = 0
    let missing = 0
    let implemented = 0
    var accounts  = require ('./credentials-1.json')
    let exchange
    const ids = ccxt.exchanges.filter (id => id in accounts)
    exchanges = ccxt.indexBy (await Promise.all (ids.map (async id => {
        // instantiate the exchange
        let exchange
        let nonce = 1
        
        if (id==='therock') {
            exchange = new therocksqv (ccxt.extend ( { enableRateLimit: true }, accounts[id]))
            
        } else {
            exchange = new ccxt[id] (ccxt.extend ( { enableRateLimit:true },{'recvWindow': 60000000}, accounts[id] 
        ))
       //exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
       exchange.timeout = 60000 //thanks kraken for this.
    }
    return exchange
    })), 'id')
    crime_account = exchanges[ARBITRAGE_EXCHANGE].account_crime
    initFile(ARBITRAGE_EXCHANGE)
    var mainError = false
    if (bootEnv===true) {
      mainError = false 

      try {
        log.bright("Arbitrage CRIME ACCOUNT", crime_account.green)
        //Retrieving balnce from exchanges & markets
        if (!sqvWallets[ARBITRAGE_EXCHANGE]) sqvWallets[ARBITRAGE_EXCHANGE] = NULL_CRITERIA;
        await fetchBalances(ARBITRAGE_EXCHANGE);
        master_wallet = fetchBalance(ARBITRAGE_EXCHANGE_COIN, ARBITRAGE_EXCHANGE)
        if (typeof master_wallet === 'undefined' || isNaN(master_wallet) ) {
            log.red ("no wallet enough for arbitrage",master_wallet )
            process.exit(1);
        }
        //....now
        date1 = new Date();
        
        
        if (master_wallet<=0) {
          log.red ("no wallet enough for arbitrage",master_wallet)
          process.exit(1);
        
        }
        if (!exchanges[ARBITRAGE_EXCHANGE]) exchanges[ARBITRAGE_EXCHANGE] = {}
        exchange = exchanges[ARBITRAGE_EXCHANGE];
        log.magenta("Exchange", ARBITRAGE_EXCHANGE, "loadmarket");
        const _markets = await exchange.loadMarkets()
        //log.magenta("Exchange", ARBITRAGE_EXCHANGE, "loadmarket", _markets);
        await ccxt.sleep (exchange.rateLimit*concurrentProcess)
        
        if (!markets[ARBITRAGE_EXCHANGE]) markets[ARBITRAGE_EXCHANGE] = {}
        markets[ARBITRAGE_EXCHANGE]=_markets //for retrieving limits please see here: const market = markets[exchange.id][symbol].limits
        let tradingFeeBuyer = exchange.fees.trading.taker
        tradingFee_taker  = exchange.fees.trading.taker
        tradingFee_maker  = exchange.fees.trading.maker

        log ("trading fee taker", tradingFee_taker.toString().green)
        log ("trading fee maker", tradingFee_maker.toString().green)
        //link coin pair to exchange  
        exchanges_markets[ARBITRAGE_EXCHANGE] = exchange.symbols.toString();
        log (exchanges[ARBITRAGE_EXCHANGE].id.green, 'loaded', exchange.symbols.length.toString ().bright.green, 'symbols')
        const symbols = exchange.symbols

        //CHECK CAPABILITES
        let result = {};
        let total = 0
        let missing = 0
        let implemented = 0
        capabilities.forEach (key => {

            total += 1
            let capability = exchange.has[key].toString ()
            if (!exchanges[ARBITRAGE_EXCHANGE].has[key]) {
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
        await ccxt.sleep (exchanges[ARBITRAGE_EXCHANGE].rateLimit*concurrentProcess)
        for (var index=0; index<symbols.length;index++){
          if (symbols[index].endsWith(coinMaster)) {
            coinPairsMaster.push(symbols[index])
          }
        }
        
        for (var indexM=0; indexM<symbols.length;indexM++){
          var bCoinPair, qCoinPair 
          let symbol = symbols[indexM]
          bCoinPair = symbol.slice(0,symbol.indexOf("/")) +"/" + coinMaster
          qCoinPair = symbol.slice(symbol.indexOf("/")+1) +"/" + coinMaster
          if (symbols.includes(bCoinPair) && symbols.includes(qCoinPair)) {
            coinPairs.push(symbol)
          }
        }

        await fetchKPIs(true)
        if (DEBUG){
          log.magenta("coinPairsMaster", coinPairsMaster)
          log.magenta("coinPairs", coinPairs) 
          log.green("coin_prices_quote_volume", coin_prices_quote_volume)
          log.green("coin_prices_base_volume", coin_prices_base_volume)  
        }
      } catch (e) {
          log.red (ARBITRAGE_EXCHANGE.green,"error main",e)
          if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
            log.bright.yellow (exchange.id,"error main",'[DDoS Protection] ' + e.message)
          } else if (e instanceof ccxt.RequestTimeout) {
            log.bright.yellow (exchange.id,"error main",'[Request Timeout] ' + e.message)
          } else if (e instanceof ccxt.AuthenticationError) {
            log.bright.yellow (exchange.id,"error main",'[Authentication Error] ' + e.message)
          } else if (e instanceof ccxt.ExchangeNotAvailable) {
            log.bright.yellow (exchange.id,"error main",'[Exchange Not Available Error] ' + e.message)
          } else if (e instanceof ccxt.ExchangeError) {
            log.bright.yellow (exchange.id,"error main",'[Exchange Error] ' + e.message)
          } else if (e instanceof ccxt.NetworkError) {
            log.bright.yellow (exchange.id,"error main",'[Network Error] ' + e.message)
          } else if (e instanceof ccxt.InvalidNonce) {
            // it has thrown the exception as expected
            log.bright.yellow(exchange.id,"error main",'[InvalidNonce Error] ' + e.message)
          } else if (e instanceof ccxt.OrderNotFound) {
            // it has thrown the exception as expected
            log.bright.yellow(exchange.id,"error main",'[OrderNotFound Error] ' + e.message)
          } else if (e instanceof ccxt.InvalidOrder) {
            // it has thrown the exception as expected
            log.bright.yellow(exchange.id,"error main",'[InvalidOrder Error] ' + e.message)
          } else if (e instanceof ccxt.InsufficientFunds) {
            // it has thrown the exception as expected
            log.bright.yellow(exchange.id,"error main",'[InsufficientFunds Error] ' + e.message)
          }

          mainError = true 
      }
    }
    
    
    if (!mainError) {
      bootEnv = false;
      try {
        //fetch KPI every 15 mins -- maybe the best is every 5 mins or just 1 min.
        await checkKPIs(true);
        await fetchTickers()
        //await checkOrderbook("binance","ETH/BTC")
      } catch (e) {
        log.red (ARBITRAGE_EXCHANGE.green,"error main",e.message)
        if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
          log.bright.yellow (exchange.id,"error main",'[DDoS Protection] ' + e.message)
        } else if (e instanceof ccxt.RequestTimeout) {
          log.bright.yellow (exchange.id,"error main",'[Request Timeout] ' + e.message)
        } else if (e instanceof ccxt.AuthenticationError) {
          log.bright.yellow (exchange.id,"error main",'[Authentication Error] ' + e.message)
        } else if (e instanceof ccxt.ExchangeNotAvailable) {
          log.bright.yellow (exchange.id,"error main",'[Exchange Not Available Error] ' + e.message)
        } else if (e instanceof ccxt.ExchangeError) {
          log.bright.yellow (exchange.id,"error main",'[Exchange Error] ' + e.message)
        } else if (e instanceof ccxt.NetworkError) {
          log.bright.yellow (exchange.id,"error main",'[Network Error] ' + e.message)
        } else if (e instanceof ccxt.InvalidNonce) {
          // it has thrown the exception as expected
          log.bright.yellow(exchange.id,"error main",'[InvalidNonce Error] ' + e.message)
        } else if (e instanceof ccxt.OrderNotFound) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error main",'[OrderNotFound Error] ' + e.message)
      } else if (e instanceof ccxt.InvalidOrder) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error main",'[InvalidOrder Error] ' + e.message)
      } else if (e instanceof ccxt.InsufficientFunds) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error main",'[InsufficientFunds Error] ' + e.message)
      }
      }
    }
    setTimeout(main,10000); 
  }
)()
