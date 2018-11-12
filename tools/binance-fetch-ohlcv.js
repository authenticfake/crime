"use strict";

const ccxt       = require ('ccxt')
const asciichart = require ('asciichart')
const asTable    = require ('as-table')
const log        = require ('ololog').configure ({ locate: false })

require ('ansicolor').nice

//-----------------------------------------------------------------------------

;(async function main () {

    const index = 4 // [ timestamp, open, high, low, close, volume ]


    const ohlcv = await new ccxt.binance ().fetchOHLCV ('ETH/BTC', '1m')
	var date = new Date();

    const lastPrice = ohlcv[ohlcv.length - 1][index] // closing price
    const series = ohlcv.slice (-80).map (x => x[index])         // closing price
    for (var i=0;i<ohlcv.length;i++) {
    	date.setTime(ohlcv[i][0])
    	log("series",date, ohlcv[i][1], ohlcv[i][2], ohlcv[i][3], ohlcv[i][4])


    }
    const bitcoinRate = ('₿ = $' + lastPrice).green
    const chart = asciichart.plot (series, { height: 15, padding: '            ' })
    log.yellow ("\n" + chart, bitcoinRate, "\n")
    const tickers = await new ccxt.binance ().fetchTickers ('ETH/BTC')
     log.yellow ("\n", tickers, "\n")

    process.exit ()

}) ()