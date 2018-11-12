'use strict';

const START_PROCESS = "startProcess";
const VIEW_PROCESS  = "viewProcess"
const SEND_REPORT   = "sendReport"

function httpSync(url, method, data)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( method, url, false ); // false for synchronous request
    xmlHttp.send( data );
    return xmlHttp.responseText;
}
let socket = io();

const proxy="http://localhost:8080/"

//END POINT TO ACA STORAGE FOR MANAGINING THE LIFE CYCLE OF OPPORTUNITY
//DEPRECATED since 0.6 (90%)
const start_process_ep        = "http://localhost:3005/process/start/"
const view_process_ep         = "http://localhost:3005/data/process/"
const buy_from_ep             = "http://localhost:3005/process/buyfrom/"
const withdrwal_from_ep       = "http://localhost:3005/process/withdrwalfrom/"
const sell_to_ep              = "http://localhost:3005/process/sellto/"
const buy_to_ep               = "http://localhost:3005/process/buyto/"
const withdrawal_to_ep        = "http://localhost:3005/process/withdrwalto/"
const sell_from_ep            = "http://localhost:3005/process/sellfrom/"
const send_report_ep          = "http://localhost:3005/mail/report"
var tradersFee, withdrawAddresses
    
let wallets 
//CURRENT TRNASACTION ID for the OPPURINITY TAKEN
//status --> 0=STAR, 1=PROCESSING, 2=COMPLETE, 3=ERROR
//side --> BUY_FROM, WITHDRWAL_FROM, SELL_TO, BUY_TO, WITHDRAWAL_TO, SELL_FROM
let sides = ['BUY_FROM', 'WITHDRAWAL_FROM','SELL_TO', 'BUY_TO', 'WITHDRAWAL_TO', 'SELL_FROM']
var current_transaction_id, current_side, current_status, current_amount
//TOTAL PROFIT
let bestSource_manual = $("#best-template-manual").html();
let bestTemplate_manual = Handlebars.compile(bestSource_manual);

//LIST OF TASKs TO DO
let highest_manual = $('#highest-manual'); //Highest UL
// Generic Row
// let highSource_manual = $("#high-template-manual").html(); //Template source
// let highTemplate_manual = Handlebars.compile(highSource_manual); //Template

let highSource_buy_from = $("#high-template-buy-from").html(); //Template BUY --> source
let highTemplate_buy_from = Handlebars.compile(highSource_buy_from); //Template

let highSource_sell_to = $("#high-template-sell-to").html(); //Template SELL TO  --> source
let highTemplate_sell_to = Handlebars.compile(highSource_sell_to); //Template

let highSource_sell_to_oneway = $("#high-template-sell-to-oneway").html(); //Template SELL TO (ONEWAY)  --> source
let highTemplate_sell_to_oneway = Handlebars.compile(highSource_sell_to_oneway); //Template

let highSource_withdrawal_to = $("#high-template-withdrawal-to").html(); //Template BUY --> source
let highTemplate_withdrawal_to = Handlebars.compile(highSource_withdrawal_to); //Template
//SESSION VRIABLE GLOBAL
let marketOne, marketTwo, marketPairOne, marketPairTwo
let coinBase, coinQuote, coinPairBase, coinPairQuote

function httpAsync(url, method, callback,contenttype, data, action, extraData) {
    try {
        
        var xmlHttp = new XMLHttpRequest();
        //xmlHttp.withCredentials = true;
        //url = "https://cors-anywhere.herokuapp.com/"+ url
        
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(action,data,extraData, xmlHttp.status, xmlHttp.responseText );
            if (xmlHttp.readyState == 4 && xmlHttp.status == 0) {
                alert("start transaction failed: Unknown Error Occured. Server response not received.");
    }
        }
        xmlHttp.open(method, url, true); // true for asynchronous
        //xmlHttp.setRequestHeader("Access-Control-Allow-Origin", "*");
        //xmlHttp.setRequestHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); 
        xmlHttp.setRequestHeader("Content-Type",contenttype);
        xmlHttp.setRequestHeader("cache-control", "no-cache");
        xmlHttp.send(data);
    } catch (error) {
        alert("start transaction failed: "+error.message )

    }
   
}

let contextHighest;
let journey


function engineResponse(action, data,extraData, status, message) {
    let error = false
    switch (action) {
        case START_PROCESS: {
            if (status ===200) {
                window.open ('manual.html','_self','resizable,location,menubar,toolbar,scrollbars,status')
            
            }
             break;
        }
        case VIEW_PROCESS: {
            if (status ===200) {
                 $('.socket-loader').hide();
                 var obj = JSON.parse(message);
                 //alert(obj["data"][0].transaction_id);
                 if (obj["data"][0].transaction_id==null) {
                    
                    //the opportunity summary
                    $('.error-manual-pair').empty();
                    let context_error = {error: "transaction id is null. please contact: UMA"};

                    let error = $('#error-template').html(); //Highest UL
                    let error_html = Handlebars.compile(error); //Template

                    let error_template = error_html(context_error)
                    $('.error-manual-pair').append(error_template);
                 } else {
                     const transaction_id = obj["data"][0].transaction_id
                     current_transaction_id = transaction_id
                     const exchangeFrom = obj["data"][0].exchangeFrom
                     marketOne = exchangeFrom
                     const exchangeTo = obj["data"][0].exchangeTo
                     marketTwo = exchangeTo
                     var coinPairFrom = obj["data"][0].coinPairFrom
                     coinPairFrom = coinPairFrom.replace("-", "/")
                     coinBase = coinPairFrom.slice(0, coinPairFrom.indexOf("/"))
                     coinQuote = coinPairFrom.slice(coinPairFrom.indexOf("/")+1)
                     var coinPairTo = obj["data"][0].coinPairTo
                     coinPairTo = coinPairTo.replace("-", "/")
                     coinPairBase = coinPairTo.slice(0, coinPairTo.indexOf("/"))
                     coinPairQuote = coinPairTo.slice(coinPairTo.indexOf("/")+1)
                     const cashOutFrom = obj["data"][0].cashOutFrom
                     const cashOutTo = obj["data"][0].cashOutTo
                     const cashInTo = obj["data"][0].cashInTo
                     const cashInFrom = obj["data"][0].cashInFrom
                     const initialCash = obj["data"][0].initialCash
                     const spreadFrom =obj["data"][0].spreadFrom
                     const spreadTo = obj["data"][0].spreadTo
                     const market2price =obj["data"][0].market2price
                     const market1price =obj["data"][0].market1price
                     const pairmarket1 = obj["data"][0].pairmarket1
                     marketPairOne = pairmarket1
                     const pairmarket2 = obj["data"][0].pairmarket2
                     marketPairTwo = pairmarket2
                     const pairmarket1price = obj["data"][0].pairmarket1price
                     const pairmarket2price = obj["data"][0].pairmarket2price
                     journey = obj["data"][0].journey
                     var amount,amountIn, amountOut, amountPairInFrom, amountPairInTo, amountPairOut,amountPairOutSell, amountWFrom, amountWTo

                     
                    // amount              = ( typeof initialCash !== 'undefined' && initialCash> 0) ?  initialCash/market1price : null
                    // //amountPairInTo      = ( typeof cashInTo !== 'undefined' && cashInTo> 0)       ?  cashInTo/pairmarket1price : null
                    // amountIn            = ( typeof cashInFrom !== 'undefined' && cashInFrom> 0)   ?  cashInFrom/market2price : null
                    // //amountPairInFrom    = ( typeof cashInFrom !== 'undefined' && cashInFrom> 0)   ?  cashInFrom/pairmarket1price : null
                    // amountPairOut       = ( typeof cashOutTo !== 'undefined' && cashOutTo> 0)     ?  cashOutTo/pairmarket1price : null
                    // amountPairOutSell   = ( typeof cashInTo !== 'undefined' && cashInTo> 0)     ?  cashInTo/pairmarket2price : null
                    
                     current_status = obj["data"][0].status
                     current_side = obj["data"][0].side

                                                                
                                                                
                    //highest opportunity
                     contextHighest = { //All required data
                             coin: coinPairFrom,
                             //diff: ((spreadFrom - 1) * 100).toFixed(3),
                             diff: spreadFrom,
                             market2price: market2price,
                             market2: exchangeTo,
                             market1price: market1price,
                             market1: exchangeFrom,
                             amount: initialCash,
                             amountWFrom: cashOutFrom,
                             amountWTo: cashOutTo,
                             amountIn: cashInFrom,
                             amountPairInTo: cashInTo,
                             amountPairOut: cashOutTo,
                             amountPairInSell: cashInTo,

                             pair: {
                                 coin: coinPairTo,
                                 diff: spreadTo,
                                 market2price: pairmarket2price,
                                 market2: pairmarket2,
                                 market1price: pairmarket1price ,
                                 market1: pairmarket1,
                             },
                             totalDiff: spreadTo + spreadFrom
                     };
                     var withdraw_address, withdraw_address_pair
                     try {
                        withdraw_address       = withdrawAddresses[0].addresses[exchangeTo][0][coinBase +"_address"]
                        withdraw_address_pair  = withdrawAddresses[0].addresses[pairmarket2][0][coinPairBase +"_address"]
                     }catch (error) {
                        console.log("no addresses found for the following coinbase: ",coinBase,coinPairBase, exchangeFrom, exchangeTo)
                     }
                     


                     $('.best-manual-pair').empty();
                     let bestHTML = bestTemplate_manual(contextHighest);
                     $('.best-manual-pair').append(bestHTML);
                     if (journey==="oneway") {
                        //Remove any previous data (LI) from UL
                        highest_manual.empty();  
                        //BUY MARKET1 -- WITHDRAWAL TO MARKET 2
                        let html = highTemplate_buy_from(contextHighest);
                        highest_manual.append(html);
                        //SELL TO MARKET2 -- BUY PAIR.COIN TO PAIR.MARKET
                        html = highTemplate_sell_to_oneway(contextHighest);
                        highest_manual.append(html);
                       
                        if (withdraw_address !== 'undefined' && typeof withdraw_address !== 'undefined' && withdraw_address!==null && withdraw_address!=="")  {
                            document.getElementById('address-field').value = withdraw_address
                            document.getElementById('address-field').readOnly = true;

                        }
                        

                        
                     } else {
                        //Remove any previous data (LI) from UL
                        highest_manual.empty();  
                        //BUY MARKET1 -- WITHDRAWAL TO MARKET 2
                        let html = highTemplate_buy_from(contextHighest);
                        highest_manual.append(html);
                        //SELL TO MARKET2 -- BUY PAIR.COIN TO PAIR.MARKET
                        html = highTemplate_sell_to(contextHighest);
                        highest_manual.append(html);
                        //WITHDRAWAL TO PAIR.MARKET2 -- SELL PAIR.COIN TO PAIR.MARKET 2
                        html = highTemplate_withdrawal_to(contextHighest);
                        highest_manual.append(html);
                        if (withdraw_address !== 'undefined' && typeof withdraw_address !== 'undefined' && withdraw_address!==null && withdraw_address!=="")  {
                            document.getElementById('address-field').value = withdraw_address
                            document.getElementById('address-field').readOnly = true;

                        }
                        if (withdraw_address_pair !== 'undefined' && typeof withdraw_address_pair !== 'undefined' && withdraw_address_pair!==null && withdraw_address_pair!=="")  {
                            document.getElementById('address-field-to').value = withdraw_address_pair
                            document.getElementById('address-field-to').readOnly = true;

                        }
                     }

                     
                 }
            } 
            break;
        }
        case sides[0] : {

            if (status ===200) {
                current_side = 'BUY_FROM'
                current_status =1
                current_amount = extraData;
                if (current_status===3)
                    sendMail();
            } else{
                if (current_status===3)
                sendMail();
            }
            break;
        }
        case sides[1] : {
            current_side = 'WITHDRAWAL_FROM'
            current_amount = extraData;
            if (current_status===3)
                sendMail();
            break;
        }
        case sides[2] : {
            current_side = 'SELL_TO'
            current_amount = extraData;
            if (journey==="oneway")
                sendMail();
            break;
        }
        case sides[3] : {
            current_side = 'BUY_TO'
            current_amount = extraData;
            if (current_status===3)
                sendMail();
            break;
        }
        case sides[4] : {
            current_side = 'WITHDRAWAL_TO'
            current_amount = extraData;
            if (current_status===3)
                sendMail();
            
            break;
        }
        case sides[5] : {
            current_side = 'SELL_FROM'
            current_amount = extraData;
            current_status =2
            sendMail();
                
            break;
        }
        default: {

        }
    }
}

async function sendMail () {
    var postData= "transaction_id="+current_transaction_id+"&side="+journey
    httpAsync(send_report_ep, "POST", engineResponse ,"application/x-www-form-urlencoded", postData, SEND_REPORT);
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


//check side based on the currect status and side for the opportunity taken.
function checkSideAndStaus (side) {

    let sideIndex = sides.indexOf(side)
    let previousSide = sides[sideIndex-1]
    let previousStatus =1
    if (sideIndex ==0) {
        previousSide =0;
        previousStatus=0;

    }
    if (current_side !=previousSide || current_status!=previousStatus ) {
        alert ("Operation non allowed. Plase check the current status ["+current_status+"]  and current/previous side ["+current_side+"/" +previousSide+"] for transaction id ["+current_transaction_id+"]")
        return false;
    } 
    return true;
}


async function buyAltCoin (coin,market, amount,price, side) {
    amount =  (typeof current_amount !== 'undefined' || current_amount>0 )?current_amount: amount;
    //calculate amount based on budget(===amount)
    var boResult = checkSideAndStaus(side);
    if (!boResult) {
        return;
    }
    var dialog = document.getElementById('modal-buy');
    document.getElementById("modal-text-buy").innerHTML ="Are you sure to buy " + coin +" on " + market + " for " + amount 
    dialog.open()// = true;
    dialog.addEventListener('iron-overlay-closed', async function buyListener() {
        if (!this.closingReason.confirmed) return
        socket.emit('buyAltCoin',coin,market, amount,price, side, current_transaction_id)
        dialog.removeEventListener('iron-overlay-closed',  buyListener)
    })    
}

async function withdrawal (coin,market1, amount, market2, side) {
    alert("amount: " + amount + " current amount: " + current_amount)
    amount = (typeof current_amount !== 'undefined' && current_amount> 0)?current_amount:amount
    var boResult = checkSideAndStaus(side);
    if (!boResult) {
        return;
    }
    var dialog = document.getElementById('modal-withdrawal');
    document.getElementById("modal-text-withdrawal").innerHTML ="Are you sure about the withdrawal from " + market1 +" to " + market2 + " for " + amount 
    dialog.open()// = true;
    dialog.addEventListener('iron-overlay-closed', async function withdrawalListener() {
        console.log("withdrawal", side)
        if (!this.closingReason.confirmed) return
        socket.emit('withdrawal',coin,market1, amount,market2, side, current_transaction_id)      
        dialog.removeEventListener('iron-overlay-closed',  withdrawalListener)
    });
}

async function sellAltCoin (coin,market, amount,price, side) {
    alert("amount: " + amount + " currenct amount: " + current_amount)
    amount = (typeof current_amount !== 'undefined' && current_amount> 0)?current_amount:amount
    var boResult = checkSideAndStaus(side);
    if (!boResult) {
        return;
    }
    
    var dialog = document.getElementById('modal-sell');
    document.getElementById("modal-text-sell").innerHTML ="Are you sure about the sell " + coin +" to " + market + " for " + amount + " price (" + price + ")"
    dialog.open()// = true;
    dialog.addEventListener('iron-overlay-closed', async function sellListener() {
        console.log("sell", side)
        if (!this.closingReason.confirmed) return
        socket.emit('sellAltCoin',coin,market, amount,price, side, current_transaction_id)
        dialog.removeEventListener('iron-overlay-closed',  sellListener)
    })
}

async function startTransaction(amount, coin,market1,paircoin,market2,diff,pairdiff,market1price, market2price, pairmarket1, pairmarket2, pairmarket1price, pairmarket2price, journey) {
    console.log("start transaction", amount,coin,market1,paircoin,market2,diff,pairdiff,market1price)
    var cBase = coin.slice(0, coin.indexOf('-'));
    var cQute = coin.slice(coin.indexOf('-')+1);
    try {
            //let amount = wallets[market1][cQute]
            //let amount = 10
            var timestamp = new Date().getTime();//getUTCMilliseconds();
            //socket.emit('startTransaction',coin,market1, amount,price, side, current_transaction_id)  
            var postData= "transaction_id=ACA_" +timestamp +"&exchangeFrom="+market1+"&exchangeTo="+market2+"&coinPairFrom="+coin+"&coinPairTo="+paircoin+"&cashOutFrom="+amount+"&spreadFrom="+diff+"&spreadTo="+pairdiff
            postData +="&engine=manual"+"&journey=" +journey +"&market1price=" +market1price +"&market2price=" +market2price +"&pairmarket1=" +pairmarket1 +"&pairmarket2=" +pairmarket2 +"&pairmarket1price=" +pairmarket1price +"&pairmarket2price=" +pairmarket2price
            httpAsync(start_process_ep, "POST", engineResponse ,"application/x-www-form-urlencoded", postData, START_PROCESS);

        } catch (error) {
                console.log("Error retrieving balance ",  error); //Throws error
                alert("start transaction failed: "+error.message )  
        }    
}

function loadTradersFee() {
    tradersFee = JSON.parse(data);
    withdrawAddresses = JSON.parse(withdraw_addresses);


}

if  (window.location.href.match('manual.html') != null) {
    $(window).load(function () {
        loadTradersFee();
        socket.on("order_notification", function (data) {
            alert("notification" + data[0]+ data[1]+data[2]+ data[3]+data[4])
            engineResponse(data[0], data[1],data[2], data[3],data[4]) 

        })

        socket.on('wallets', function (data) { //Function for when we get market data
            
            let list = $('#wallet-list').empty(), coinList = $('#coin-list').empty();
            wallets = data[1];

            let walletSource = $("#wallet-list-template").html(); //Source
            let walletTemplate = Handlebars.compile(walletSource); // ^ and template for coin and market lists

            let coinSource = $("#coin-list-template").html(); //Source
            let coinTemplate = Handlebars.compile(coinSource); // ^ and template for coin and market lists
            let context = {};

            let marketDataLen = data[0].length;
            context.market = marketOne;
            context.coinBaseValue = data[1][marketOne][coinBase]
            context.coinBase = coinBase
            context.coinQuoteValue = data[1][marketOne][coinQuote]
            context.coinQuote = coinQuote
            context.coinPairBase = coinPairBase
            context.coinPairBaseValue = data[1][marketOne][coinPairBase]
            list.append(walletTemplate(context));

            
            context.market = marketTwo;
            context.coinBaseValue = data[1][marketTwo][coinBase]
            context.coinBase = coinBase
            context.coinQuoteValue = data[1][marketTwo][coinQuote]
            context.coinQuote = coinQuote
            context.coinPairBase = coinPairBase
            context.coinPairBaseValue = data[1][marketTwo][coinPairBase]
            list.append(walletTemplate(context));

            let coin_context = {coin: coinBase+"-"+coinQuote};
            coinList.append(coinTemplate(coin_context));
            
            coin_context = {coin: coinPairQuote+"-"+coinPairQuote};
            coinList.append(coinTemplate(coin_context));            
        });

    new WOW().init();

    $('.loader').hide();
    $('#header').show();

    httpAsync(view_process_ep, "GET", engineResponse ,"application/x-www-form-urlencoded", null, VIEW_PROCESS); 
   
}) 
}