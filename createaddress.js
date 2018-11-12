"use strict";
var baseCoins = [ "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];





/*  ------------------------------------------------------------------------ */

const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice
require('./settings.js')();

let result = {};
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
            'cancelOrder',
            'fetchOrder',
            'fetchOrders',
            'fetchOpenOrders',
            'fetchClosedOrders',
            'fetchMyTrades',
            'fetchCurrencies',
            'fetchDepositAddress',
            'withdraw',

        ];



;(async function test () {
    let total = 0
    let missing = 0
    let implemented = 0
    
    var accounts  = require ('./credentials-1.json')
    let exchange
    const ids = ccxt.exchanges.filter (id => id in accounts)
    var exchanges = ccxt.indexBy (await Promise.all (ids.map (async id => {
        // instantiate the exchange
        let exchange
        
        if (id==='therock') {
            exchange = new therocksqv (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id]))
        } else {
            exchange = new ccxt[id] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id]) )

        }
        return exchange
    })), 'id')
    //ids[ids.length] = "therock";
    //exchanges["therock"]  = new therocksqv (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts["therock"]))
    for (let i = 0; i < ids.length; i++) {
        exchange = exchanges[ids[i]]
        
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

        log.cyan (ids[i]) 
        //if (exchanges[ids[i]].has["createDepositAddress"]) {
            if (ids[i]==="cryptopia") {
            //wite exchange 'header'
            var minimum = ""
            for(var index = 0; index < baseCoins.length;index++){
                var currency = baseCoins[index]
                var exhange = exchanges[ids[i]]
                exhange.proxy =exchange.has['CORS']?'http://localhost:8080/':undefined
                try {
                    var params = {
                        nonce: Date.now().toString()
                    }
                    

                    var addresses = await exhange.fetchDepositAddress(currency, params)
                    // addresses = await exhange.createDepositAddress(currency, params)
                    log.green("exchange",ids[i].toString().magenta, "currency", currency, "address created", addresses)
                    
                   
                    
                   // await ccxt.sleep(exchange.rateLimit)
                } catch (error) {
                    log.red(error.message)
                    log.red("exchange",ids[i].toString().magenta, "currency", currency, "address not available")
                }
                
            }
        }/* else  {
            try {
                if (ids[i]==='cryptopia') {


                }



            }
            catch (error) {
                log.red(error.message)

            }
        } */
    }
        log (result)
        log (implemented.toString ().green, 'implemented and', missing.toString ().red, 'missing methods of', total.toString ().yellow, 'methods it total')
    }   
) ()

