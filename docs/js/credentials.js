let exchanges = []


let yobit = new ccxt.yobit  ({
        "apiKey": "",
        "secret": "",
        "enableRateLimit": true,
 })
let cryptopia = new ccxt.cryptopia  ({
        "apiKey": "",
        "secret": "",
        "enableRateLimit": true,
 })
let therock = new therocksqv  ({
         "apiKey": "",
         "secret": "",
         "enableRateLimit": true,
  })

let binance = new ccxt.binance  ({
        "apiKey": "",
        "secret": "",
        "enableRateLimit": true,
 })
let bitfinex = new ccxt.bitfinex  ({
        "apiKey": "",
        "secret": "",
        "enableRateLimit": true,
 })
let hitbtc2 = new ccxt.hitbtc2  ({
        "apiKey": "",
        "secret": "",
        "enableRateLimit": true,
 })
let poloniex = new ccxt.poloniex  ({
        "apiKey": "",
        "secret": "",
        "enableRateLimit": true,
 })
let gdax = new ccxt.gdax  ({
        "apiKey": "",
        "secret": ""
        "enableRateLimit": true,
        "password" : "",
        "passphrase" : ""
 })
let exmo = new ccxt.exmo  ({
        "apiKey": "K-",
        "secret": "S-",
        "enableRateLimit": true,
        
 })
exchanges["cryptopia"]=cryptopia
exchanges["yobit"]=yobit
exchanges["therock"]=therock
exchanges["binance"]=binance
exchanges["bitfinex"]=bitfinex
exchanges["hitbtc2"]=hitbtc2
exchanges["poloniex"]=poloniex
exchanges["gdax"]=gdax
exchanges["exmo"]=exmo

