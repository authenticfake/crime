"use strict";
const log       = require ('ololog').configure ({ locate: false })
let details
function calculateFee (exchangeId, markets, symbol, type, side, amount, price, takerOrMaker = 'taker', params = {}) {
        
        let market = markets[exchangeId][symbol];
        // //log.magenta(exchangeId, "calculateFee", "market",market)
        // let pricePrecision = market.precision.price
        let key = 'quote';
        let rate = market[takerOrMaker];
        let cost = parseFloat (costToPrecision (exchangeId,symbol, amount * rate));
        if (side === 'sell') {
            cost *= price;
        } else {
            key = 'base';
        }
        return {
            'type': takerOrMaker,
            'currency': market[key],
            'rate': rate,
            'cost': parseFloat (feeToPrecision (exchangeId,symbol, cost)),
        };
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

//log to file
function logToFile(exchangeid, symbol, algo_namespace){
    var timestamp = new Date().getTime();
    var _symbol = symbol.replace('/','')
    var fileCSV = './data/'+algo_namespace+'.'+exchangeid +'.'+ _symbol +'.'+  new Date().getFullYear() +'.'+ (new Date().getMonth() +1)+'.'+new Date().getDate()+'.log'; //opportunities enalbed
    // try {
    //     fs.unlinkSync(fileCSV,(err) => {  
    //             if (err) log.red( err.message);
    //             log.magenta('CSV created for writing the opportunity found during the arbitrage!!!');
    //         });  
    // } catch (error) {
    //     log("error during delete file");
    // }
    

    var obj = {
       table: []
    }
    
    obj.table.push(details);
    

    
    var json = JSON.stringify(obj);
    var fs = require('fs');
    if (!fs.existsSync(fileCSV)) {
        log("log created") 
        details = {}
    }
    //log("lgged") 
    fs.appendFile(fileCSV, json, 'utf8', callback);

}
function addToLog (exchange,  extra, tobeinitialazed) {
    if (tobeinitialazed){
        details = {}
    }
    details = exchange.extend (extra, details)
    //logToFile(exchange.id, symbol, algo)
    //log.yellow("details",details, "extra", extra)
}
function callback() {
    //log.yellow("write")
}


/**calculate the correct profit for given price 
 * currentPrice   0.00000087
 * currenctProfit 0.004
 * return a new profit just only if the new price > currentPrice 
 */

function fetchProfit(currentPrice, currentProfit, precision) {
   //log("fetchProfit",currentPrice, currentProfit, precision );
   var newProfit    = currentProfit
   var digitProfit  = currentProfit.toString().slice(currentProfit.toString().indexOf(".")+1)
   var numberOfDeciaml = digitProfit.length
   var newPrice     = (currentPrice *(1+newProfit))
   newPrice = parseFloat (newPrice).toFixed (precision)
   var cP = (newPrice/currentPrice-1)*100
   while (newPrice<=currentPrice && cP<currentProfit) {
        newProfit = ((newProfit * Math.pow(10, numberOfDeciaml))) +0.5
        newProfit = newProfit / (Math.pow(10, numberOfDeciaml))
        newPrice = (currentPrice * (1+newProfit))
        newPrice = parseFloat (newPrice).toFixed (precision)
        cP = (newPrice/currentPrice-1)*100
        //log("cP", cP, "newProfit", newProfit, "newPrice", newPrice, "currentPrice", currentPrice)
        
    }
    return newProfit
}
//apply precision to price 
function priceToPrecision (exchange, markets, symbol, price) {
    var precision = 8
    try {
        if (typeof markets[exchange] !== 'undefined' && typeof markets[exchange][symbol] !== 'undefined' && typeof markets[exchange][symbol].precision.price !== 'undefined') {
            precision = markets[exchange][symbol].precision.price
            
        }   

    }catch (error) {
        log.red(exchange,symbol, amount, "error", error.message)

    }
    
    return parseFloat (price).toFixed (precision)
}
//apply precision to cost 
function costToPrecision (exchange,markets, symbol, cost) {
    var precision = 8
    try {
        if (typeof markets[exchange] !== 'undefined' && typeof markets[exchange][symbol] !== 'undefined' && typeof markets[exchange][symbol].precision.price !== 'undefined') {
            precision = markets[exchange][symbol].precision.price
        }
    }catch (error) {
        log.red(exchange,symbol, amount, "error", error.message)

    }
    return parseFloat (cost).toFixed (precision)
}
//apply precision to fee ...see above ;)
function feeToPrecision (exchangeId, markets, symbol, fee) {
    var precision = 8
    try {
        if (typeof markets[exchange] !== 'undefined' && typeof markets[exchange][symbol] !== 'undefined' && typeof markets[exchange][symbol].precision.price !== 'undefined') {
            precision = markets[exchange][symbol].precision.price
        }

    }catch (error) {
        log.red(exchange,symbol, amount, "error", error.message)

    }
    return parseFloat (fee).toFixed (precision)
}

const truncate_regExpCache = []
    , truncate_to_string = (num, precision = 0) => {
        num = toFixed (num)
        if (precision > 0) {
            const re = truncate_regExpCache[precision] || (truncate_regExpCache[precision] = new RegExp("([-]*\\d+\\.\\d{" + precision + "})(\\d)"))
            const [,result] = num.toString ().match (re) || [null, num]
            return result.toString ()
        }
        return parseInt (num).toString ()
    }
    , truncate = (num, precision = 0) => parseFloat (truncate_to_string (num, precision))

const precisionFromString = (string) => {
    const split = string.replace (/0+$/g, '').split ('.')
    return (split.length > 1) ? (split[1].length) : 0
}
//apply precision to amount 
function amountToPrecision (exchange,markets, symbol, amount) {
    try {
        var precision = 8 //as default
        if (typeof markets[exchange] !== 'undefined' && typeof markets[exchange][symbol] !== 'undefined' && typeof markets[exchange][symbol].precision.amount !== 'undefined') {
            precision = markets[exchange][symbol].precision.amount
        }
        var result = truncate (amount, precision)
        return result
    }
    catch (error ) {
        log.red(exchange,symbol, amount, "error", error.message)

    }
    
}

function amountToString (exchange,markets,symbol, amount) {
    var precision = 8 //as default
    if (typeof markets[exchange] !== 'undefined' && typeof markets[exchange][symbol] !== 'undefined' && typeof markets[exchange][symbol].precision.amount !== 'undefined') {
        precision = markets[exchange][symbol].precision.amount
    }

    return truncate_to_string (amount, precision)
}
module.exports = {
    logToFile,
    addToLog,
    amountToString,
    amountToPrecision,
    precisionFromString,
    truncate_to_string,
    truncate,
    feeToPrecision,
    costToPrecision,
    priceToPrecision,
    calculateFee,
    toFixed,
    fetchProfit,
}