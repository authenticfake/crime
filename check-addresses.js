"use strict";
const fs = require('fs');
let file = './withdraw.addresses.json'; //json node enabled
let fileWeb = './docs/js/withdraw.addresses.json'; //json web enalbed
let fileCSV = './withdraw.addresses.csv'; //json web enalbed
var baseCoins = [ "ADA", "BTG","DASH","EOS", "ETC", "ICX", "LSK", "IOTA", "NEO", "OMG", "QTUM", "SC", "TRX", "USDT", "XEM", "XLM", "XMR", "XRB", "XVG", "ZEC", "DOGE", "LTC", "BTC", "ETH", "XRP", "BCH"];

var therocksqv = require ('./therocksqv.js')
var withdrawAddresses  = require('./sqv.addresses.json');

if (process.argv.length <= 2) {
    console.log("Usage: " + __filename + " ACCOUNT_NAME (i.e.:'SQV')");
    process.exit(-1);
}
 
var account = process.argv[2].toLowerCase();;


switch (account) {
  case 'sqv': { console.log("Account", account); withdrawAddresses = require('./sqv.addresses.json'); break}
  case 'franco': { console.log("Account", account); withdrawAddresses = require('./franco.addresses.json'); break}
  default: {console.log("no addresses file found for", account); process.exit(-1);}
  // etc...
}



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
let writeStream
function initFile() {
    try {
         fs.unlinkSync(file)
         fs.unlinkSync(fileWeb)
        fs.unlinkSync(fileCSV)
    } catch (error) {
        log("error during delete file");
    }
    
    fs.appendFile(file, '{"addresses": {')
    fs.appendFile(fileWeb, 'withdraw_addresses= \'[{"addresses": {')
    fs.appendFile(fileCSV, "exchange, currency, address, tag, min, max")
   
}

function closeFile() {
     // fs.close(fd, function() {
     //             console.log('wrote the file successfully');
     // });
     //writeStream.end(); 
}

function writeHeader(exchangeId, addressFound){
    if (!addressFound) {
        var textATInit = ' "'+exchangeId+'" :[{'
        fs.appendFile(file,textATInit, (err) => {  
            if (err) throw err;
            console.log('The withdraw addresses JSON were updated!');
        });
        fs.appendFile(fileWeb,textATInit, (err) => {  
            if (err) throw err;
            console.log('The withdraw addresses JS were updated!');
        });
    }
    

}
;(async function test () {
    initFile()
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
            exchange = new therocksqv (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id], {
                nonce: function () { return this.milliseconds () }
        }))
        } else {
            exchange = new ccxt[id] (ccxt.extend ( { ENABLE_RATE_LIMIT }, accounts[id], {
                nonce: function () { return this.milliseconds () }
        }))

        }
        await exchange.loadMarkets()
        //exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
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

        var textAT, textCSV
        log (ids[i]) 
        
        if (exchanges[ids[i]].has["fetchDepositAddress"]) {
            //wite exchange 'header'
            var minimum = ""
            var boAddressFound = false;
            for(var index = 0; index < baseCoins.length;index++){
                var currency = baseCoins[index]
                var exhange = exchanges[ids[i]]
                var add, tag, max, min

                //exhange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
                try {
                    var params = {
                        nonce: Date.now().toString()
                    }

                    var addresses = await exhange.fetchDepositAddress(currency, params)
                    add = addresses.address
                    tag = addresses.tag
                    log.yellow(ids[i].toString().magenta,"fetchDepositAddress addresses", add, "tag", tag)
                    minimum = ""
                }catch (error){
                    addresses = undefined
                    add = undefined
                    tag = undefined

                    log.red(error.message)

                    log.yellow(ids[i].toString().magenta,"address undefined...try to find the address for json file")
                    var exchangeDetails = withdrawAddresses.addresses[ids[i]]
                    log.magenta("exchangeDetails", exchangeDetails)
                    var addressInlineFound = false;
                    if (exchangeDetails !== undefined && exchangeDetails[0] !==undefined && exchangeDetails[0][currency +"_address"] !== undefined) {
                        add = exchangeDetails[0][currency +"_address"]
                        tag = exchangeDetails[0][currency +"_tag"]
                        min = exchangeDetails[0][currency +"_min"]
                        max = exchangeDetails[0][currency +"_max"]
                        log.yellow(ids[i].toString().magenta,"withdrawAddresses addresses", add, "tag", tag)
                        addressInlineFound= true
                    }
                    
                    if (!addressInlineFound && exchanges[ids[i]].has["createDepositAddress"]) {
                        log.yellow(ids[i].toString().magenta, "addresses undefined...try to generate address for",currency)
                        try  { 
                            params = {
                                nonce: Date.now().toString()
                            }                           
                            var address  = await exhange.createDepositAddress(currency, params)
                            add = address.address
                            tag = address.info.tag
                            log.yellow(ids[i].toString().magenta,"createDepositAddress addresses", add, "tag", tag)
                            
                        } catch (error) {
                            log.red("exchange",ids[i].toString().magenta,"doesn't support createDepositAddress")
                            log.red(error)
                            log.red(error.message)
                        }
                    }


                }
                try{
                    if (add === 'undefined' || typeof add === 'undefined' || add ==='')  {
                       log.yellow(ids[i].toString().magenta,"addresses undefined...skip for",currency)
                       if (index=== baseCoins.length-1 && boAddressFound) {
                           textAT +="}]"
                           if (i === ids.length -1 ) {
                               textAT+="}}"
                           } else {
                               textAT +=","
                           }
                           fs.appendFile(fileCSV,textCSV, (err) => {  
                               if (err) throw err;
                               console.log('The withdraw addresses CSV were updated!');
                           });
                           fs.appendFile(file,textAT, (err) => {  
                               if (err) throw err;
                               console.log('The withdraw addresses JSON were updated!');
                           });
                           fs.appendFile(fileWeb,textAT, (err) => {  
                               if (err) throw err;
                               console.log('The withdraw addresses JS were updated!');
                           }); 
                       } 
                       continue
                       
                    } else {
                        
                        writeHeader(ids[i], boAddressFound)
                        boAddressFound=true;
                        log.green("exchange",ids[i].toString().magenta, "currency", currency, "address", add,"tag", tag)
                        if (ids[i]==="hitbtc2" ) {
                            var limit = addresses.currency.limits.withdraw
                            var min   = addresses.currency.limits.withdraw.min
                            var max   = addresses.currency.limits.withdraw.max
                            log.magenta(limit, min, max) ;

                            textAT = ' "'+currency+'_address":'+'"'+add+'", "'+currency+'_tag"'+':"'+tag+'", "'+currency+'_min"'+':"'+min+'", "'+currency+'_max"'+':"'+max+'"'
                            textCSV  = "\n"+ids[i]+","+currency+","+add+","+tag+","+min+","+"undefined";
                        } else {
                            
                            try {
                                var minimum = withdrawAddresses.addresses[ids[i]][0][currency +"_min"]
                                if (minimum === 'undefined' || typeof minimum === 'undefined' ||  minimum === 'TBD') {
                                    minimum =""
                                }
                            } catch (error) {

                            }
                            log.magenta("minimum", minimum) ;
                            textAT = ' "'+currency+'_address":'+'"'+add+'", "'+currency+'_tag"'+':"'+tag+'", "'+currency+'_min"'+':"'+minimum+'", "'+currency+'_max"'+':"undefined"'
                            textCSV  = "\n"+ids[i]+","+currency+","+add+","+tag+","+minimum+","+"undefined";
   
                        }
                        if (index=== baseCoins.length-1 && boAddressFound) {
                            textAT +="}]"
                            if (i === ids.length -1 ) {
                                textAT+="}}"
                            } else {
                                textAT +=","
                            }
                        } else {
                            textAT +=","

                        }
                        if (boAddressFound) {
                            fs.appendFile(fileCSV,textCSV, (err) => {  
                                if (err) throw err;
                                console.log('The withdraw addresses CSV were updated!');
                            });
                            fs.appendFile(file,textAT, (err) => {  
                                if (err) throw err;
                                console.log('The withdraw addresses JSON were updated!');
                            });
                            fs.appendFile(fileWeb,textAT, (err) => {  
                                if (err) throw err;
                                console.log('The withdraw addresses JS were updated!');
                            }); 
                        }
                    } 
                   // await ccxt.sleep(exchange.rateLimit)
                    
                } catch (error) {
                    log.yellow("catch", ids[i].toString().magenta, error.message)
                    
                }
                
            }
        } else  {
            try {
                log.magenta("ids[i]", ids[i]);
                var exchangeDetails = withdrawAddresses.addresses[ids[i]]
                var exData = '"'+[ids[i]]+'":'  + JSON.stringify(exchangeDetails) + ","
                textCSV = ids[i]+","
                //log("exchangeDetails", exchangeDetails);
                //log("exchangeDetails[0]", exchangeDetails[0]);
                for(var index = 0; index < baseCoins.length;index++){
                    log("exchangeDetails[0][baseCoins[index] +_address]", exchangeDetails[0][baseCoins[index] +"_address"]);
                   if (exchangeDetails[0][baseCoins[index] +"_address"] !== undefined) {
                    var ad = exchangeDetails[0][baseCoins[index] +"_address"]
                    var tag = exchangeDetails[0][baseCoins[index] +"_tag"]
                    var min = exchangeDetails[0][baseCoins[index] +"_min"]
                    var max = exchangeDetails[0][baseCoins[index] +"_max"]
                    textCSV  = "\n"+ids[i]+","+baseCoins[index]+","+ad+","+tag+","+min+","+max;
                    fs.appendFile(fileCSV,textCSV, (err) => {  
                                                 if (err) throw err;
                                                 console.log('The withdraw addresses CSV were updated!');
                                             });
                   

                   }
                    
                }
               
                fs.appendFile(file,exData, (err) => {  
                    if (err) throw err;
                    console.log('The withdraw addresses JS were updated!');
                });
                
                fs.appendFile(fileWeb,exData, (err) => {  
                    if (err) throw err;
                    console.log('The withdraw addresses JSON were updated!');
                });



            }
            catch (error) {
                log.red(error.message)

            }
        } 
        closeFile()
        log (result)
        log (implemented.toString ().green, 'implemented and', missing.toString ().red, 'missing methods of', total.toString ().yellow, 'methods it total')
    }
    //just for json web enabled
    fs.appendFile(fileWeb,"]'", (err) => {  
                            if (err) throw err;
                            console.log('The withdraw addresses were updated!');
                        });


    

}) ()