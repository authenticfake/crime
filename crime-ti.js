/**
 * (•_•)
 * <)   )╯ 
 * /    \
 */
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice

var RSI = require('technicalindicators').RSI;
var MFI = require('technicalindicators').MFI;
var CCI = require('technicalindicators').CCI;
var ADX = require('technicalindicators').ADX;
var BB  = require('technicalindicators').BollingerBands
var MACD = require('technicalindicators').MACD;
var OBV = require('technicalindicators').OBV;
var KDII = require('technicalindicators').Stochastic;
var bullish = require('technicalindicators').bullish;
var _bullish 
var ohlcv 
const indexOpen     = 1 // [ timestamp, open, high, low, close, volume ]
const indexHigh     = 2 // [ timestamp, open, high, low, close, volume ]
const indexLow      = 3 // [ timestamp, open, high, low, close, volume ]
const indexClose    = 4 // [ timestamp, open, high, low, close, volume ]
const indexVolume   = 5 // [ timestamp, open, high, low, close, volume ]


require ('./trendyways.js')();


var exchangeData = {}
var coin_momentum = {}, coin_ma = {}, coin_ema={}, coin_wma={},coin_roc={}
var coin_atr={},coin_floorPivots={}, coin_tomDemarksPoints={}, coin_woodiesPoints={}
var coin_fibonacci_up={},coin_fibonacci_down={}, coin_camarilla={}, coin_rsi ={}
var coin_mfi ={},coin_cci ={}
var coin_adx= {}, coin_bb = {},coin_macd={}, coin_obv={}, coin_kd={}


//check Technical Indicator : woodiesPoints
//true for positive growing trend - false otherwise
async function checkFibonacci (exchangeId, asset, length) {
  if (!FIBONACCI_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkFibonacci started", exchangeId, asset)
  var arr = coin_fibonacci_up[asset][exchangeId]
  var currentValueUp =arr[arr.length-1]
  arr = coin_fibonacci_down[asset][exchangeId]
  var currentValueDown =arr[arr.length-1]
  
  
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [currentValueUp,currentValueDown])
  }

  return [currentValueUp, currentValueDown, coin_fibonacci_up, arr, coin_fibonacci_down[asset][exchangeId]]
}
//check Technical Indicator : woodiesPoints
//true for positive growing trend - false otherwise
async function checkWoodiesPoints (exchangeId, asset, length) {
  if (!WOODIES_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkWoodiesPoints started", exchangeId, asset)
  var arr = coin_woodiesPoints[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var boIncrease = true
  if ((currentValue - arr[arr.length-length])<0) boIncrease=false
  result = boIncrease
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [result,currentValue])
  }

  return [result,currentValue, arr]
}

//check Technical Indicator : tomDemarksPoints
//true for positive growing trend - false otherwise
async function checkTomDemarksPoints (exchangeId, asset, length) {
  if (!TomDemark_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkTomDemarksPoints started", exchangeId, asset)
  var arr = coin_tomDemarksPoints[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var boIncrease = true
  if ((currentValue - arr[arr.length-length])<0) boIncrease=false
  result = boIncrease
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [result,currentValue])
  }

  return [result,currentValue, arr]
}
//check Technical Indicator : FP
//true for positive growing trend - false otherwise
async function checkFloorPivots (exchangeId, asset, length) {
  if (!FloorPivots_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkFloorPivots started", exchangeId, asset)
  var arr = coin_floorPivots[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var boIncrease = true
  if ((currentValue - arr[arr.length-length])<0) boIncrease=false
  result = boIncrease
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [result,currentValue])
  }

  return [result,currentValue, arr]
}

//check Technical Indicator : ATR
//true for positive growing trend - false otherwise
async function checkATR (exchangeId, asset, length) {
  if (!ATR_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkATR started", exchangeId, asset)
  var arr = coin_atr[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var boIncrease = true
  if ((currentValue - arr[arr.length-length])<0) boIncrease=false
  result = boIncrease
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [result,currentValue])
  }

  return [result,currentValue, arr]
}

//check Technical Indicator : WMA
//true for positive growing trend - false otherwise
async function checkWMA (exchangeId, asset, length) {
  if (!WMA_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkWMA started", exchangeId, asset)
  var arr = coin_wma[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var boIncrease = true
  if ((currentValue - arr[arr.length-length])<0) boIncrease=false
  result = boIncrease
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [result,currentValue])
  }

  return [result,currentValue, arr]
}

//check Technical Indicator : EMA
//true for positive growing trend - false otherwise
async function checkEMA (exchangeId, asset, length) {
  if (!EMA_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkEMA started", exchangeId, asset)
  var arr = coin_ema[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var boIncrease = true
  if ((currentValue - arr[arr.length-length])<0) boIncrease=false
  result = boIncrease
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "output", [result,currentValue])
  }

  return [result,currentValue, arr]
}

//check Technical Indicator : MA
//true for positive growing trend - false otherwise
//https://www.tradingonline.me/forex-trading/analisi-tecnica/indicatori/media-mobile
//https://www.forzaforex.it/strategia-adx/
async function checkMA (exchangeId, asset, length) {
  if (!MA_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkMA started", exchangeId, asset)
  var arr = coin_ma[asset][exchangeId]
  var currentValue =arr[arr.length-1]
  var previousValue =arr[arr.length-2]
  
  var result = undefined
  //one based and no zero based
  length =length+1;
  
  
  var candlesticks  = fetchOHLCV().slice(-2)
  var close, open, low, high
  var p_close, p_open, p_low, p_high
  const previousCS    = candlesticks[0]
  const currentCS     = candlesticks[1]


  close = currentCS[indexClose]
  open  = currentCS[indexOpen]
  low   = currentCS[indexLow]
  high  = currentCS[indexHigh]

  p_close = previousCS[indexClose]
  p_open  = previousCS[indexOpen]
  p_low   = previousCS[indexLow]
  p_high  = previousCS[indexHigh]

  if (previousValue.ma > p_high && (low <= currentValue.ma && high >= currentValue.ma)) {
    result = true  //UPTREND
  } else if (previousValue.ma < p_low && (currentValue.ma >= low && high >= currentValue.ma)) {
    result = false //DOWNTREND
  }
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkMA output", [result,currentValue])
  }
  return [result,currentValue, arr]
}
//check Technical Indicator : MOMENTUM
//true for positive growing trend - false otherwise
async function checkMOM (exchangeId, asset, length) {
  if (!MOM_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkMOM started", exchangeId, asset)
  var mom = coin_momentum[asset][exchangeId]
  var currentMOM =mom[mom.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var incRsi = true
  if ((currentMOM - mom[mom.length-length])<0) incRsi=false
  result = incRsi
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkMOM output", [result,currentMOM])
  }

  return [result,currentMOM, mom]
}

//check Technical Indicator : ADX
//true for positive growing trend - false otherwise
async function checkADX (exchangeId, asset, length) {
  if (!ADX_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkADX started", exchangeId, asset)
  var adx = coin_adx[asset][exchangeId]
  var currentAdx =adx[adx.length-1]
  //log.yellow("adx[adx.length-1]", adx[adx.length-1])
  if (adx[adx.length-1] === undefined) {
    return
  }
  var result = undefined 
  
  if (DEBUG){
    log.bright(exchangeId.green,asset, "currentAdx", currentAdx.adx, "PDI",currentAdx.pdi, "MDI", currentAdx.mdi)
  }
  var _adx= currentAdx.adx
  
  if (_adx<=ADX_LEVEL_7 && _adx>=ADX_LEVEL_4-5) { // TREND (G)
    result = false
    var pdi = currentAdx.pdi
    var mdi = currentAdx.mdi
    if (pdi > mdi + 3) result = true
    //result = true
  } 
  var incAdx = true
  if ((currentAdx - adx[adx.length-length])<0) incAdx=false
  return [result, currentAdx, incAdx, adx]
}

//check Technical Indicator : RSI
//true for positive growing trend - false otherwise
async function checkRSI (exchangeId, asset, length) {
  if (!RSI_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkRSI started", exchangeId, asset)
  var rsi = coin_rsi[asset][exchangeId]
  var currentRsi =rsi[rsi.length-1]
  
  var result = false
  //one based and no zero based
  length =length+1;
  var incRsi = true
  if ((currentRsi - rsi[rsi.length-length])<0) incRsi=false
  result = incRsi
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkRSI output", [result,currentRsi])
  }

  return [result,currentRsi, rsi]
}

//check Technical Indicator : MFI
// true for positive growing trend - false otherwise
async function checkMFI (exchangeId, asset, length) {
  if (!MFI_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkMFI started", exchangeId, asset)
  var mfi = coin_mfi[asset][exchangeId]
  var currentMfi =mfi[mfi.length-1]
  var result = false
  
  
  //one based and no zero based
  length =length+1;
  var incMfi =true
  if ((currentMfi - mfi[mfi.length-length])<0) incMfi=false
  

  result = incMfi// && incMfi && incCci
  if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkMFI output", [result, currentMfi])
  }

  return [result, currentMfi, mfi]
}

//check Technical Indicator : CCI
// true for positive growing trend - false otherwise
async function checkCCI (exchangeId, asset, length) {
  if (!CCI_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkCCI started", exchangeId, asset)
  var cci = coin_cci[asset][exchangeId]
  var currentCci =cci[cci.length-1]
  var result = false
  //one based and no zero based
  length =length+1;
  var incCci = true
  if ((currentCci - cci[cci.length-length])<0) incCci=false 
  
  result = incCci// && incMfi && incCci
  if (DEBUG){
    log.bright(exchangeId.green,asset, "checkCCI output", [result, currentCci]) 
  }

  return [result, currentCci, cci]
}

//check Technical Indicator : BB
//true for positive trend - false otherwise
//see: https://www.opzionibinarie60.com/strategia-del-retest-sulle-bande-di-bollinger-a-120-secondi/
async function checkBB (exchangeId, asset, length) {
  if (!BB_FILTER) return [undefined, undefined, undefined]
  log.bright(exchangeId.green, "checkBB started", exchangeId, asset)
  var bb = coin_bb[asset][exchangeId]
  
  var currentBB =bb[bb.length-1]
  var previousBB =bb[bb.length-2]
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
    log.bright(exchangeId.green,asset, "checkBB output", [!incBBLower, !incBBMiddle, !incBBUpper, currentBB]) 
  }

  return [incBBLower, incBBMiddle, incBBUpper, currentBB, previousBB, bb]
}

//check Technical Indicator : RSI, MFI and CCI
// true for positive growing trend - false otherwise
async function trendTIs (exchangeId, asset, length) {
  log.bright(exchangeId.green, "trendTIs started", exchangeId, asset)
  //one based and no zero based
  length =length+1;
  var incRsi = true
  var incMfi =true
  var incCci = true
  if (!TI_FILTER && !ob_filter) return
  if (RSI_FILTER){
    var rsi = coin_rsi[asset][exchangeId]
    var currentRsi =rsi[rsi.length-1]
    if ((currentRsi - rsi[rsi.length-length])<0) incRsi=false
  }
  if (MFI_FILTER){
    var mfi = coin_mfi[asset][exchangeId]
    var currentMfi =mfi[mfi.length-1]
    if ((currentMfi - mfi[mfi.length-length])<0) incMfi=false
  }
  
  if (CCI_FILTER){
    var cci = coin_cci[asset][exchangeId]
    var currentCci =cci[cci.length-1]
    if ((currentCci - cci[cci.length-length])<0) incCci=false 
  }
  var result = false
  
  if (DEBUG){
    log.bright(exchangeId.green,asset, "trendTIs currentRsi", currentRsi)
    log.bright(exchangeId.green,asset, "trendTIs currentMfi", currentMfi)
    log.bright(exchangeId.green,asset, "trendTIs currentCci", currentCci) 
    log.bright(exchangeId.green,asset, "trendTIs incRsi", incRsi)
    log.bright(exchangeId.green,asset, "trendTIs incMfi", incMfi)
    log.bright(exchangeId.green,asset, "trendTIs incCci", incCci) 
  }
  result = !incRsi// && incMfi && incCci
  return result
}

//check Technical Indicator : RSI, MFI, CCI, BB and ADX
async function checkTIs (exchangeId, asset) {
  log.bright(exchangeId.green, "checkTIs started", exchangeId, asset)
  if (!TI_FILTER) return
  var rsi = coin_rsi[asset][exchangeId]
  var mfi = coin_mfi[asset][exchangeId]
  var cci = coin_cci[asset][exchangeId]
  var currentRsi =rsi[rsi.length-1]
  var currentMfi =mfi[mfi.length-1]
  var currentCci =cci[cci.length-1]
  
  var result = false
  
  //if (DEBUG){
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkTIs currentRsi", currentRsi)
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkTIs currentMfi", currentMfi)
    log.bright(exchanges[exchangeId].iso8601 (Date.now ()),exchangeId.green,asset, "checkTIs currentCci", currentCci)
    
 // }
  //check RSI, MFI and CCI momentum trend
  if ((currentRsi >= RSI_OVERSOLD && currentRsi <= RSI_OVERBOUGHT-12) && 
       (currentMfi >= MFI_OVERSOLD && currentMfi <= MFI_OVERBOUGHT-12) && 
       (currentCci >= (CCI_OVERSOLD -20) && currentCci <= CCI_OVERBOUGHT-50)){
    result = true
  }
  return result
}

function checkExchageData(exchange ,asset,fs,fileCSV ) {
	var data = exchangeData[asset][exchange.id]
	var currentTime, currentOpen, currentHigh, currentLow, currentClose, currentClose
	var time, open, high, low, close, volume
  var timePerc, openPerc, highPerc, lowPerc, closePerc, volumePerc
  var _timePerc, _openPerc, _highPerc, _lowPerc, _closePerc, _volumePerc
  var __timePerc, __openPerc, __highPerc, __lowPerc, __closePerc, __volumePerc
	currentTime = exchange.iso8601 (data[0][0])
	currentOpen =  data[0][1]
	currentHigh =  data[0][2]
	currentLow  =  data[0][3]
	currentClose =  data[0][4]
	currentVolume =  data[0][5]
	//log (asset.green, 'fetched', currentTime.toString().yellow,"current open", currentOpen.toString().green, "current high", currentHigh.toString().magenta,"current low", currentLow.toString().cyan, "current close",currentClose.toString().red, "current volume", currentVolume)
	log ("--")
  var level =data.length-3;
	for (var ndx = data.length-1 ; ndx >level; ndx-- ) {
    	var _time, _open, _high, _low, _close, _volume
      var __time, __open, __high, __low, __close, __volume
    	var _ndx = ndx-1
      var __ndx = ndx-2

    	log (asset.green, 'fetched', exchange.iso8601 (data[ndx][0]).yellow,"open", data[ndx][1].toString().green, "high", data[ndx][2].toString().magenta,"low", data[ndx][3].toString().cyan, "close",data[ndx][4].toString().red, "volume", data[ndx][5])
    	log (asset.green, 'fetched', exchange.iso8601 (data[_ndx][0]).yellow,"open", data[_ndx][1].toString().green, "high", data[_ndx][2].toString().magenta,"low", data[_ndx][3].toString().cyan, "close",data[_ndx][4].toString().red, "volume", data[_ndx][5])
    	log (asset.green, 'fetched', exchange.iso8601 (data[__ndx][0]).yellow,"open", data[__ndx][1].toString().green, "high", data[__ndx][2].toString().magenta,"low", data[__ndx][3].toString().cyan, "close",data[__ndx][4].toString().red, "volume", data[__ndx][5])
      
    	if (_ndx<level){
    		continue;

    	}
      if (__ndx<level){
        continue;

      }
    	_time = exchange.iso8601 (data[_ndx][0])
    	_open =  data[_ndx][1]
    	_high =  data[_ndx][2]
    	_low  =  data[_ndx][3]
    	_close =  data[_ndx][4]
    	_volume =  data[_ndx][5]

      __time = exchange.iso8601 (data[__ndx][0])
      __open =  data[__ndx][1]
      __high =  data[__ndx][2]
      __low  =  data[__ndx][3]
      __close =  data[__ndx][4]
      __volume =  data[__ndx][5]


    	time = exchange.iso8601 (data[ndx][0])
    	open =  data[ndx][1]
    	high =  data[ndx][2]
    	low  =  data[ndx][3]
    	close =  data[ndx][4]
    	volume =  data[ndx][5]

    	openPerc = (((open/_open)-1)*100).toFixed(3) + "%"
    	highPerc = (((high/_high)-1)*100).toFixed(3) + "%"
    	lowPerc = (((low/_low)-1)*100).toFixed(3) + "%"
    	closePerc = (((close/_close)-1)*100).toFixed(3) + "%"
    	volumePerc = (((volume/_volume)-1)*100).toFixed(3) + "%"

    	_openPerc = (((open/currentOpen)-1)*100).toFixed(3) + "%"
    	_highPerc = (((high/currentHigh)-1)*100).toFixed(3) + "%"
    	_lowPerc = (((low/currentLow)-1)*100).toFixed(3) + "%"
    	_closePerc = (((close/currentClose)-1)*100).toFixed(3) + "%"
    	_volumePerc = (((volume/currentVolume)-1)*100).toFixed(3) + "%"


      __openPerc = (((_open/__open)-1)*100).toFixed(3) + "%"
      __highPerc = (((_high/__high)-1)*100).toFixed(3) + "%"
      __lowPerc = (((_low/__low)-1)*100).toFixed(3) + "%"
      __closePerc = (((_close/__close)-1)*100).toFixed(3) + "%"
      __volumePerc = (((_volume/__volume)-1)*100).toFixed(3) + "%"

    	// openPerc = openPerc
    	// highPerc = highPerc
    	// lowPerc = lowPerc
    	// closePerc = closePerc
    	// volumePerc =volumePerc
    	// .toFixed(3)
      //log.bright (asset.green, 'fetched 1w', exchange.iso8601 (data[ndx][0]).yellow,"open", _openPerc.toString().green, "high", _highPerc.toString().magenta,"low", _lowPerc.toString().cyan, "close",_closePerc.toString().red, "volume", _volumePerc)
    	log.bright (asset.green, 'fetched 1d', exchange.iso8601 (data[_ndx][0]).yellow,"open", openPerc.toString().green, "high", highPerc.toString().magenta,"low", lowPerc.toString().cyan, "close",closePerc.toString().red, "volume", volumePerc)
		  log.bright (asset.green, 'fetched 2d', exchange.iso8601 (data[__ndx][0]).yellow,"open", __openPerc.toString().green, "high", __highPerc.toString().magenta,"low", __lowPerc.toString().cyan, "close",__closePerc.toString().red, "volume", __volumePerc)
      
    	log (" ")
      var startDatetime = exchange.iso8601 (data[_ndx][0])
      var textCSV = time+"," +asset+"," + open+"," +high+"," +low+"," +close+"," +volume
      fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                       if (err) log.red( err.message);}); 

      setTimeout(function2, 500);
      
      textCSV = _time+"," +asset+"," + _open+"," +_high+"," +_low+"," +_close+"," +_volume
      fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                       if (err) log.red( err.message);});
      setTimeout(function2, 500);
      textCSV = __time+"," +asset+"," + __open+"," +__high+"," +__low+"," +__close+"," +__volume
      fs.appendFile(fileCSV,"\n"+textCSV, (err) => {  
                       if (err) log.red( err.message);});

    }
    function function2() {
      // all the stuff you want to happen after that pause
      console.log('Blah blah blah blah extra-blah');
    }
}
    
function createTW(series, label) {
  var arrayTW =[]
  for (var i = 0;i<series.length; i++) {
    var text
    switch (label) {
      case 'o':
        text = { o :series[i]} 
        break;
      case 'h':
        text = { h :series[i]} 
        break;
      case 'l':
        text = { l :series[i]} 
        break;
      case 'c':
        text = { c :series[i]} 
        break;
      case 'v':
        text = { v :series[i]} 
        break;

    }
    //log("createTW text", text)
    arrayTW.push(text)
  }
  return arrayTW
}

function createHLCVTW(seriesH,  seriesL, seriesC,seriesV) {
  var arrayTW =[]
  for (var i = 0;i<series.length; i++) {
    var text
    text = { h :seriesH[i], l:seriesL[i], c: seriesC[i], v: seriesV[i]} 
    //log("createHLCVTW text", text)
    arrayTW.push(text)
  }
  return arrayTW
}
function createHLCTW(seriesH,  seriesL, seriesC) {
  var arrayTW =[]
  for (var i = 0;i<seriesH.length; i++) {
    var text
    text = { h :seriesH[i], l:seriesL[i], c: seriesC[i]} 
    //log("createHLCTW text", text)
    arrayTW.push(text)
  }
  return arrayTW
}
function createHLTW(seriesH,  seriesL) {
  var arrayTW =[]
  for (var i = 0;i<seriesH.length; i++) {
    var text
    text = { h :seriesH[i], l:seriesL[i]} 
    //log("createHLTW text", text)
    arrayTW.push(text)
  }
  return arrayTW
}

function createHLOCTW(seriesH,  seriesL, seriesO,seriesC) {
  var arrayTW =[]
  for (var i = 0;i<seriesH.length; i++) {
    var text
    text = { h :seriesH[i], l:seriesL[i], o:seriesO[i], c: seriesC[i]} 
    //log("text", text)
    arrayTW.push(text)
  }
  return arrayTW
}

async function fetchTIs (exchange, asset, ohlcv_period) {
  log.bright(exchange.id.green, "fetchTIs started for", asset, "symbols", "timewindow", ohlcv_period)
  
  //coins[i] ="ARK/ETH"
  if (!exchangeData[asset]) exchangeData[asset] = {};
    ohlcv 		= await exchange.fetchOHLCV (asset, ohlcv_period)
    exchangeData[asset][exchange.id]=ohlcv
    
    const lastPrice 	  = ohlcv[ohlcv.length - 1][indexClose] // closing price
    const seriesHigh    = ohlcv.slice (-80).map (x => x[indexHigh])         // high price
    const seriesLow     = ohlcv.slice (-80).map (x => x[indexLow])          // low price
    const seriesOpen    = ohlcv.slice (-80).map (x => x[indexOpen])         // popening price
    const seriesClose 	= ohlcv.slice (-80).map (x => x[indexClose])          // closing price
    const seriesVolume  = ohlcv.slice (-80).map (x => x[indexVolume])       // volume price


    const seriesHighPrefix    = createTW(seriesHigh, 'h')
    const seriesClosePrefix   = createTW(seriesClose, 'c')
    // const seriesLowPrefix     = createTW(seriesLow, 'l')
    // const seriesOpenPrefix    = createTW(seriesOpen, 'o')
    // const seriesVolumePrefix  = createTW(seriesVolume, 'v')


    const seriesHLC   = createHLCTW(seriesHigh,seriesLow,seriesClose)
    const seriesHLOC  = createHLCTW(seriesHigh,seriesLow,seriesOpen, seriesClose)
    const seriesHL    = createHLTW(seriesHigh,seriesLow)

    
    
    if (MOM_FILTER) {
      var mom = ti_momentum(seriesClosePrefix, 8); // window size = 8
      if (!coin_momentum[asset]) coin_momentum[asset] = {};
        coin_momentum[asset][exchange.id] = mom
        if (DEBUG) {
          log.green("result MOM", mom[mom.length-1])
        }      
    }
    
    if (ROC_FILTER) {
      var roc = ti_roc(seriesClosePrefix, 8); // window size = 8
      if (DEBUG) {
        log.green("result ROC", roc[roc.length-1])
      }
      
      if (!coin_roc[asset]) coin_roc[asset] = {};
        coin_roc[asset][exchange.id] = roc
    }
    

    
    if (ATR_FILTER) {
      var atrValues = ti_atr(seriesHLC);
      if (DEBUG) {
        log.green("result ATR", atrValues[atrValues.length-1])
      }
      if (!coin_atr[asset]) coin_atr[asset] = {};
        coin_atr[asset][exchange.id] = atrValues
    }
    
    

    if (MA_FILTER) {
      var maList = ti_ma (seriesClosePrefix, MA_PERIOD); 
      if (!coin_ma[asset]) coin_ma[asset] = {};
        coin_ma[asset][exchange.id] = maList   
        if (DEBUG) {
          log.green("result MA", maList.slice(-1), MA_PERIOD, ["c"]);
        }
    }
    

    if (EMA_FILTER){
      var emaList = ti_ema (seriesClosePrefix, 9, ["c"]);
      if (DEBUG) {
        log.green("result EMA", emaList.slice(-1), 9);
      }
      if (!coin_ema[asset]) coin_ema[asset] = {};
        coin_ema[asset][exchange.id] = emaList
    }
    
  
    if (WMA_FILTER) {
      var wmaList = ti_wma (seriesClosePrefix, 4, ["c"]);
      if (!coin_wma[asset]) coin_wma[asset] = {};
        coin_wma[asset][exchange.id] = wmaList
        if (DEBUG) {
          log.green("result WMA",wmaList.slice(-1), 4);
        }
    }
    
    
    if (FloorPivots_FILTER) {
      var floorValues = floorPivots (seriesHLC); 
      if (DEBUG) {
        log.green("result Floor Pivots",floorValues.slice(-1));
      }
      if (!coin_floorPivots[asset]) coin_floorPivots[asset] = {};
        coin_floorPivots[asset][exchange.id] = floorValues
    }
    
  
    if (TomDemark_FILTER) {
      var tomValues = tomDemarksPoints (seriesHLOC);
      if (DEBUG) {
         log.green("result Tom Demark Points",tomValues.slice(-1));
      }
      if (!coin_tomDemarksPoints[asset]) coin_tomDemarksPoints[asset] = {};
        coin_tomDemarksPoints[asset][exchange.id] = tomValues
    }
    

    if (WOODIES_FILTER) {
      var woodiesValues = woodiesPoints (seriesHLC);
      if (DEBUG) {
        log.green("result Woodies",woodiesValues.slice(-1));
      }
      if (!coin_woodiesPoints[asset]) coin_woodiesPoints[asset] = {};
        coin_woodiesPoints[asset][exchange.id] = woodiesValues
    }

    
    if (FIBONACCI_FILTER) {
      var fibonacci_period  = TDC_FIBONACCI_OHLCV_PERIOD
      const _ohlcv          = await exchange.fetchOHLCV (asset, TDC_FIBONACCI_OHLCV_PERIOD)
      const _seriesHigh     = _ohlcv.slice (-80).map (x => x[indexHigh])         // high price
      const _seriesLow      = _ohlcv.slice (-80).map (x => x[indexLow])          // low price
      var _serieHL          = createHLTW(_seriesHigh,_seriesLow)
      var resists = fibonacciRetrs (_serieHL, 'UPTREND');
      if (DEBUG) {
        log.green("result Fibonacci UPTREND",resists.slice(-2));
      }  
      if (!coin_fibonacci_up[asset]) coin_fibonacci_up[asset] = {};
        coin_fibonacci_up[asset][exchange.id] = resists 
      
      var supports = fibonacciRetrs (_serieHL, 'DOWNTREND');
      if (DEBUG) {
        log.green("result Fibonacci DOWNTREND",supports.slice(-2)); 
      } 
      if (!coin_fibonacci_down[asset]) coin_fibonacci_down[asset] = {};
        coin_fibonacci_down[asset][exchange.id] = supports 
      
    }
    
    if (CAMARILLA_FILTER) {
      var camarilla_values = camarillaPoints (seriesHLC);
      if (DEBUG) {
        log.green("result camarilla Points",camarilla_values.slice(-1));
      }
      if (!coin_camarilla[asset]) coin_camarilla[asset] = {};
        coin_camarilla[asset][exchange.id] = camarilla_values   
    }
    
    //period set to 5 or 8 and not to 14 - http://webinary24.com/binary-trading-strategy-triple-rsi/
    if (RSI_FILTER) { //see: https://github.com/anandanand84/technicalindicators
      var inputRSI = {
        values : seriesClose,
        period : 8  
      }
      var rsi = RSI.calculate(inputRSI)
      if (!coin_rsi[asset]) coin_rsi[asset] = {};
      coin_rsi[asset][exchange.id] = rsi
      if (DEBUG) {
        log(exchange.id.yellow, "asset", asset.toString().green, "rsi[rsi.length-1]:", rsi[rsi.length-1],"rsi[0]:", rsi[0] );
      }
    }
    
    if (MFI_FILTER) {//see: https://github.com/anandanand84/technicalindicators
      var inputMFI = {
        high :   seriesHigh,
        low  :   seriesLow,
        close : seriesClose,
        volume : seriesVolume,
        period : 14
      }
      var mfi = MFI.calculate(inputMFI)
      if (!coin_mfi[asset]) coin_mfi[asset] = {};
      coin_mfi[asset][exchange.id] = mfi
    }
    
    if (CCI_FILTER) { //see: https://github.com/anandanand84/technicalindicators
      var inputCII = {
        open : seriesOpen,
        high :   seriesHigh,
        low  :   seriesLow,
        close : seriesClose,
        period : 20
      }
      var cci = CCI.calculate(inputCII)
      if (!coin_cci[asset]) coin_cci[asset] = {};
      coin_cci[asset][exchange.id] = cci

    }
    
    if (ADX_FILTER) {
      //see: https://github.com/anandanand84/technicalindicators
      var inputADX = {
        high :   seriesHigh,
        low  :   seriesLow,
        close : seriesClose,
        period : 20 //like a binary trading
      }
      var adx = ADX.calculate(inputADX)
      if (!coin_adx[asset]) coin_adx[asset] = {};
      coin_adx[asset][exchange.id] = adx
      if (DEBUG) {
        log(exchange.id.yellow, "asset", asset.toString().green, "adx[adx.length-1]:", adx[adx.length-1],"adx[0]:", adx[0]);
      }
      
    }
    
    if (BB_FILTER) {
      //see: https://github.com/rubenafo/trendyways/wiki/Support-And-Resistances
      var bbands = ti_bollinger (seriesClosePrefix, 20, 2); // n = 5, k = 2    
      

      //see: https://github.com/anandanand84/technicalindicators
      var inputBB = {
        values : seriesClose,
        period : 20, //20 periodi e 2.000 di deviazione - https://www.migliorbrokerforex.net/2328/strategia-opzioni-binarie-60-secondi-segnali-sicuri-per-guadagnare.html
        stdDev : 2 //20 periodi e 2.000 di deviazione
      }
      var bb = BB.calculate(inputBB)
      if (!coin_bb[asset]) coin_bb[asset] = {};
      coin_bb[asset][exchange.id] = bb
      if (DEBUG) {
        log.green("result BB --- trendway", bbands[bbands.length-1])
        log(exchange.id.yellow, "asset", asset.toString().green, "bb[bb.length-1]:", bb[bb.length-1], "bb[0]:", bb[0]);
      }

    }
    if (MACD_FILTER) {
      var inputMACD = {
        values            : seriesClose,
        fastPeriod        : 5,
        slowPeriod        : 8,
        signalPeriod      : 3 ,
        SimpleMAOscillator: true,
        SimpleMASignal    : true
      }

      var macd = MACD.calculate(inputMACD);
      if (!coin_macd[asset]) coin_macd[asset] = {};
      coin_macd[asset][exchange.id] = macd
      if (DEBUG) {
       log(exchange.id.yellow, "asset", asset.toString().green, "macd:", macd[macd.length-1], "coin_macd", coin_macd[asset][exchange.id]);
      }

    }
    if (OBV_FILTER) {
      let inputOBV = {
        close : seriesClose,
        volume : seriesVolume
      }

      var obv = OBV.calculate(inputOBV)
      if (!coin_obv[asset]) coin_obv[asset] = {};
      coin_obv[asset][exchange.id] =obv
      if (DEBUG) {
        log(exchange.id.yellow, "asset", asset.toString().green, "obv:", obv[obv.length-1], "coin_obv", coin_obv[asset][exchange.id]);
      }

    }
    if (KD_FILTER) {
      let inputKD = {
        high: seriesHigh,
        low: seriesLow,
        close: seriesClose,
        period: 1,
        signalPeriod: 3
      };
      var kd = KDII.calculate(inputKD)
      //log("kd",  kd)
      
      if (!coin_kd[asset]) coin_kd[asset] = {};
      coin_kd[asset][exchange.id] = kd
      if (DEBUG) {
        log(exchange.id.yellow, "asset", asset.toString().green, "kd:", kd[kd.length-1], "coin_kd", coin_kd[asset][exchange.id]);
      }

    }
    let inputBullish = {
      open: seriesOpen.slice(-2),
      high: seriesHigh.slice(-2),
      close: seriesClose.slice(-2),
      low: seriesLow.slice(-2),
      
    };
    _bullish  = bullish(inputBullish)
    
    //log(exchange.id.yellow, "asset", asset.toString().green, "bullish:", _bullish);
        
  await ccxt.sleep (exchange.rateLimit)
}
//check Technical Indicator : MACD
//true for positive growing trend - false ; undefined to skip the opportunity
//@see:https://stockcharts.com/docs/doku.php?id=scans:indicators#moving_average_convergence-divergence_macd
//@see:https://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:moving_average_convergence_divergence_macd
async function checkMACD (exchangeId, asset, length) {
  if (!MACD_FILTER) return [undefined, undefined, undefined]
  log.bright.magenta(exchangeId.green, "checkMACD started", exchangeId, asset )
  var macd = coin_macd[asset][exchangeId]

  var currentMacd =macd[macd.length-1]
  var previousMacd =macd[macd.length-2]
  
  var result = undefined 
  log.bright(exchangeId.green,asset, "currentMacd", currentMacd.MACD, "signal",currentMacd.signal, "histogram", currentMacd.histogram)
  log.bright(exchangeId.green,asset, "previousMacd", previousMacd.MACD, "signal",previousMacd.signal, "histogram", previousMacd.histogram)
  if (DEBUG){
    log.bright(exchangeId.green,asset, "currentMacd", currentMacd.MACD, "signal",currentMacd.signal, "histogram", currentMacd.histogram)
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
// KD_OVERSOLD = 20 KD_OVERBOUGHT = 80
async function checkKD (exchangeId, asset, length) {
  if (!KD_FILTER) return [undefined, undefined, undefined]
  log.bright.magenta(exchangeId.green, "checkKD started", exchangeId, asset)
  var kd = coin_kd[asset][exchangeId]
  var currentKD =kd[kd.length-1]
  if (currentKD===undefined) return undefined
  var result = undefined 
  log.bright(exchangeId.green,asset, "currentKD", currentKD, "K",currentKD.k, "D", currentKD.d)
  if (DEBUG){
    log.bright(exchangeId.green,asset, "currentKD", currentKD, "K",currentKD.k, "D", currentKD.d)
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
/** DEPRECTATED @deprecated*/
async function checkStrengthTrend (exchangeId, asset) {
  log.bright.magenta(exchangeId.green, "checkStrengthTrend started", exchangeId, asset)
  var adx = coin_adx[asset][exchangeId]
  var currentAdx =adx[adx.length-1]
  var result = false 
  
  if (DEBUG){
    log.bright(exchangeId.green,asset, "currentAdx", currentAdx.adx, "PDI",currentAdx.pdi, "MDI", currentAdx.mdi)
  }
  log.bright(exchangeId.green,asset, "currentAdx", currentAdx.adx, "PDI",currentAdx.pdi, "MDI", currentAdx.mdi)
  var _adx= currentAdx.adx
  //if (  _adx>=ADX_LEVEL_3+5) {
  //if ( _adx < (ADX_LEVEL_5 -10) && _adx>=ADX_LEVEL_3+5) { //TREND
  if (_adx<ADX_LEVEL_5) { // TRASVERSAL TREND (ZIG - ZAG) + TREND
    var pdi = currentAdx.pdi
    var mdi = currentAdx.mdi
    if (pdi > mdi  ) result = true
    //result = true
  }
  return result
}
function isBullish() {
  return _bullish
}
function fetchOHLCV() {
  return ohlcv;
}
module.exports = function () {
  this.coin_momentum =coin_momentum
  this.coin_ma = coin_ma
  this.coin_ema=coin_ema
  this.coin_wma=coin_wma
  this.coin_momentum=coin_momentum
  this.coin_roc=coin_roc
  this.coin_atr=coin_atr
  this.coin_floorPivots=coin_floorPivots
  this.coin_tomDemarksPoints=coin_tomDemarksPoints
  this.coin_woodiesPoints=coin_woodiesPoints
  this.coin_fibonacci_up=coin_fibonacci_up
  this.coin_fibonacci_down=coin_fibonacci_down
  this.coin_camarilla=coin_camarilla
	this.coin_rsi = coin_rsi; 
  this.coin_macd = coin_macd; 
  this.coin_obv = coin_obv; 
  this.coin_kd = coin_kd; 
	this.coin_mfi = coin_mfi;
	this.coin_cci = coin_cci;
	this.coin_adx= coin_adx;
	this.coin_bb = coin_bb;
	this.checkADX = checkADX;
	this.checkRSI = checkRSI;
	this.checkMFI = checkMFI;
	this.checkCCI = checkCCI;
	this.checkBB = checkBB;
  this.checkKD = checkKD;
  this.checkMACD = checkMACD;
  this.fetchOHLCV = fetchOHLCV;
  this.isBullish = isBullish

  this.checkFibonacci = checkFibonacci
  this.checkTomDemarksPoints = checkTomDemarksPoints
  this.checkWoodiesPoints = checkWoodiesPoints
  this.checkATR = checkATR
  this.checkFloorPivots = checkFloorPivots
  this.checkWMA = checkWMA
  this.checkEMA = checkEMA
  this.checkMA = checkMA
  this.checkMOM = checkMOM

	this.trendTIs = trendTIs;
	this.checkTIs = checkTIs;
	this.fetchTIs = fetchTIs;
	this.checkStrengthTrend = checkStrengthTrend;
  this.checkExchageData=checkExchageData
  this.exchangeData=exchangeData
  this._bullish=_bullish

};