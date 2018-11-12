'use strict'

var wallets 			//= require('./main.js').sqvWallets;
var main 				= require('./main.js');
const ccxt 				= require('ccxt')
const fs 				= require('fs')
const ansi   			= require ('ansicolor')
var database			= require('./db-aca.js');  //sqllite3.x
var tradersFee  		= require('./trading.fee.json');
var withdrawAddresses  	= require('./withdraw.addresses.json');
//const log       		= require ('ololog').configure ({ locate: true})
const log = require ('ololog').configure ({
    'render+' (text, { consoleMethod = '' }) { // adds this method after `render`. 
        fs.appendFile ('logs/crime-order.'+new Date().getFullYear() +(new Date().getMonth()+1)+'.log', '\n' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '') + " " + ansi.strip (text), function (err) {}) // strip ANSI styling codes from output
        return text
    }
})
//opportunities stored by transaction_id
var opportunities = []

const target_profit = 0.02
function setWallets(_wallets) {
	//log.yellow("wallets", wallets)
	wallets = _wallets
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

async function findOpportunity (transaction_id) {
	return new Promise (async (resolve, reject) => {
    let rows_;
    database.db.all(database.sql_select_by_transactionId, transaction_id, function(err, rows, fields){
    	log("findOpportunity", findOpportunity, "rows", rows)
    	if (!opportunities[transaction_id]) opportunities[transaction_id] = "";

	  	opportunities[transaction_id] = rows
    	resolve(rows)
    })
    return resolve(rows_)
    })
}

//create order on Exchange - side: buy
async function buyAltCoin (coin,exchange, amount,price, side, transaction_id) {
	log("[buy] create order on", exchange.id ,coin,"quantity", amount,"price", price,"side", side)
    //calculate amount based on budget(===amount) the amount as parameters is the quantity of altcoin
    //splitting the quantity (now a amount) for the price I have the real amount
    amount = amount / price;
    log("[buy] amount",amount );
    
    price  =  main.priceToPrecision(exchange.id,main.markets, coin, price)
    log("[buy] price precisioned",price );
    
    var ex_id=""
    var ex_info=""
    var ex_error = ""
    var status = 1;
    var coinQuote = coin.slice(coin.indexOf("/")+1)
    log(exchange.id, "[buy] coin quote", coinQuote )
    var walletBalance   = main.fetchBalance(coinQuote,exchange.id.toString())
    //walletBalance = 2000
   	log(exchange.id, "[buy] wallet balance", walletBalance )
   	var amountByWallet  = walletBalance / price
   	log("[buy] wallet amount avalability",amountByWallet);

   	try {//CHECK 
        if (amountByWallet<amount) {
            amount = amountByWallet
        }
        var tradingfee = exchange.fees.trading.taker
        if (typeof tradingfee === 'undefined') {
        	tradingfee = tradersFee.fee[exchange.id][0]["tradingfee_buy"]; 
        }
        log("[buy] tradingfee",tradingfee);
        //calculate fee for submit the withdraw with correct amount
        amount = amount -(amount*tradingfee)
        amount = main.amountToPrecision(exchange.id,main.markets, coin, amount)
        //amount = Number.parseFloat(amount).toFixed (amountPrecision)
        
        log("[buy] amount candidated for the order",amount);
        log("[buy] STUB",main.STUB);

        if (!main.STUB) {
        	//let marketBuyOrder = await exchange.createMarketBuyOrder (coin, amount)
        	let marketBuyOrder = await exchange.createOrder (coin,'limit', 'buy', amount,price)
        	await ccxt.sleep (exchange.rateLimit)
        	ex_id = marketBuyOrder.id
        	ex_info = JSON.stringify(marketBuyOrder.info)
        } 
        
        log("[buy] create order for", coin, "done.","response exchange id",ex_id, "response exchange info",ex_info )
        
        
    } catch (e) {
        status = 3;
        ex_error =e.message
        log.red (exchange.id, 'error during create order (buy)', e.message)
        log.red("[buy]",exchange.id, 'error during create order', e.message)
        return 
    }
    var address=""
    //database - store opportunity order on database
    log("[buy]",exchange.id, 'store opportunity on db')
   	storeOpportunity (transaction_id, status, amount, side, ex_id, ex_info, ex_error, coin, price,address,exchange.id) 
    log("[buy]",exchange.id, 'store opportunity on db...done.')
    const message = [side,"", amount,200,""]
    main.sendNotification("order_notification", message)
    log("[buy]",exchange.id, 'order completed, sent notification')
}


//create order: withdrawal
async function withdrawal (coin,exchangeA, amount, exchangeB, side, transaction_id) {
	log("[withdrawal] create order on",exchangeA.id, coin,"quantity", amount, "to exchange",exchangeB.id,"side", side, transaction_id);

    var status = 1;
    var coinBase = coin.slice(0, coin.indexOf("/"));
    var walletBalance   = main.fetchBalance(coinBase,exchangeA.id.toString())
    log("[withdrawal]", exchangeA.id, "coin base",coinBase, "wallet balance", walletBalance)
    var address =withdrawAddresses.addresses[exchangeB.id][0][coinBase +"_address"]
    log("[withdrawal] address", address)          
  	var ex_id=""
  	var ex_info=""
  	var ex_error=""
  	//exchangeA.proxy =exchangeA.has['CORS']?undefined:'http://localhost:8080/'
  	//log(exchange.id, "[withdrawal] wallet balance", walletBalance )
  	
  	if (walletBalance<amount) {
     	amount = walletBalance;
  	}
  	//TODO: MANAGE EXCEPTION on CLASS DEDICATED
  	if (exchangeA.id.toString() === "hitbtc2") {
  		log("[withdrawal]", exchangeA.id,"transfer amout from account to main waller");
    	var transferResult = await exchangeA.private_post_account_transfer({'currency': coinBase, 'amount': amount, 'type': 'exchangeToBank'})
  	}
  	var withdrawlBuyer = 0;
  	try {
      	withdrawlBuyer = exchangeA.fees.funding.withdraw[coinBase];
      	var withdraw_tag = withdrawAddresses.addresses[exchangeA.id][0][coinBase +"_tag"]
      	if (typeof withdraw_tag === 'undefined' ||  withdraw_tag==='undefined' || withdraw_tag==='') withdraw_tag =undefined
      	if (typeof withdrawlBuyer === 'undefined')  {
          	if (exchangeA.id.toString()==='yobit') { //check withdraw issue across exchanges
            	withdrawlBuyer = exchangeA.fees.funding.withdraw
          	} else if (exchangeA.id.toString()==='poloniex')  { //the correct thing to do is to invoke the fetchFees api, but it doesn't work on poloniex.
              	//withdrawlBuyer = await exchangeToBuy.fetchFees().withdraw[coinBase]
              	withdrawlBuyer = tradersFee.fee[exchangeA.id.toString()][0][coinBase+"_withdrawal"];
          	} else {
              	withdrawlBuyer = tradersFee.fee[exchangeA.id.toString()][0][coinBase+"_withdrawal"];
          	}

      	}
      	log("[withdrawal] withdrawl fee", withdrawlBuyer)
      	log("[withdrawal] withdrawl tag", withdraw_tag)
  	} catch (error) {
      	log.red("Error during withdrafee calculation. Close the opportunity.")
      	log.red("[withdrawal] Error during withdrafee calculation. Close the opportunity.",error.message)
      return;

 	}
  
  	if (withdrawlBuyer.toString().indexOf("%") !== -1 ) { //Check if withdraw is a % or not. see therock for the withdraw on XRP.
    	withdrawlBuyer = amount*(withdrawlBuyer.toString().slice(0, withdrawlBuyer.toString().indexOf("%"))/100)
  	}

  	amount =  amount - withdrawlBuyer;
  	//amount =  amount.toFixed (amountPrecision)
  	//amount =  Number.parseFloat(amount).toFixed(amountPrecision)
  	amount =  main.amountToPrecision(exchangeA.id,main.markets, coin, amount)
  	
  	log("[withdrawal] amount candidted to order", amount)

   	try {
   		if (!main.STUB) {
   			let withdraw = await exchangeA.withdraw (coinBase, amount, address,withdraw_tag)
   			ex_id = withdraw.id
   			ex_info = JSON.stringify(withdraw.info)
   			if (ex_info.status ==='error') {
   			    status = 3
   			    ex_error=ex_info
   			}
   			await ccxt.sleep (exchangeA.rateLimit)		
   		}
      
      log("[withdrawal] create order for", coin, "done.", "ex_info", ex_info,"ex_id",ex_id )
      
   	} catch (e) {
    	status = 3
    	ex_error =e.message
    	log.red (exchangeA.id, 'error', 'withdrawal', e.message)
    	log.red("[withdrawal]",exchangeA.id, 'error during create order', e.message)

    	return;
   	}
   	log("[withdrawal]",exchangeA.id, 'store opportunity on db')
   	//database - store opportunity order on database
   	storeOpportunity (transaction_id, status, amount, side, ex_id, ex_info, ex_error, coin,withdrawlBuyer ,address,exchangeA.id) 
   	log("[withdrawal]",exchangeA.id, 'store opportunity on db...done.')
   	const message = [side,"", amount,200,""]
   	main.sendNotification("order_notification", message)
   	log("[withdrawal]",exchangeA.id, 'order completed, sent notification')
   	
}


async function sellAltCoin (coin,exchange, amount,price, side, transaction_id) {
	//retreive opportunities
		 	
	log("[sell] create order on ",exchange.id ,coin,"quantity", amount,"price",price, "side", side, "transaction_id",transaction_id);
    var opportunity = opportunities[transaction_id] 
	//var opportunity = await findOpportunity(transaction_id)
    log("[sell] get opportunity stored", opportunity)
    var status = 2;
    var ex_id=""
    var ex_info=""
    var ex_error=""
    
    //exchange.proxy =exchange.has['CORS']?undefined:'http://localhost:8080/'
    // await exchange.loadMarkets();
    // await ccxt.sleep (exchange.rateLimit)
    
    // const marketCoin = exchange.getMarket(coin)
    // const pricePrecision = marketCoin.precision ? marketCoin.precision.price : 8
    // const amountPrecision = marketCoin.precision ? marketCoin.precision.amount : 8
    // price = parseFloat(price).toFixed (pricePrecision)
    price = main.costToPrecision(exchange.id,main.markets, coin, price)
    
    var coinBase = coin.slice(0, coin.toString().indexOf('/'))
    var walletBalance   = main.fetchBalance(coinBase,exchange.id.toString())
    //walletBalance=20000000 //DEBUG
    log("[sell] wallet balance",walletBalance);
    try {
        if (walletBalance < amount) {
            amount = walletBalance
        }
        amount = main.amountToPrecision(exchange.id,main.markets, coin, amount)
        log("[sell] amount w/ precision candidated for selling coin",amount);
        log("[sell] opportunity length",opportunity.length);
        
        var initialCash = opportunity[0].initialCash
        var finalCash = opportunity[0].finalCash  // in case it was set during FROM--> TO SIDE (ONEWAY)
        var cashOut = amount * price
        log("[sell] initialCash",initialCash, "finalCash", finalCash);
        log("[sell] cashOut",cashOut, );

        if (side === 'SELL_FROM')  {
        	log(side.toString().magenta, "[sell] adjust price -- finalCash ", finalCash, "cashOut",cashOut, "price", price );
        	if (cashOut<=finalCash) {
        		log("[sell] adjust price -- cashOut  minor than cashOut", finalCash - cashOut);
        		cashOut = finalCash * (1+target_profit);
        		log("[sell] adjust price -- new cashOut",cashOut );
        		price = cashOut/amount
        		price = main.priceToPrecision(exchange.id,main.markets, coin, price)
        		log("[sell] adjust price -- new price", price );
        	}

        } else {
        	log(side.toString().magenta, "[sell] adjust price -- initialCash ", initialCash, "cashOut",cashOut, "price", price  );
        	if (cashOut<=initialCash) {
        		log("[sell] adjust price -- cashOut  minor than cashOut",  initialCash - cashOut);
        		cashOut = initialCash * (1+target_profit);
        		log("[sell] adjust price -- new cashOut", cashOut );
        		price = cashOut/amount
        		price = main.priceToPrecision(exchange.id,main.markets, coin, price)
        		log("[sell] adjust price -- new price", price );
        	}
        }
        if (!main.STUB) {
        	let marketSellOrder = await exchange.createOrder (coin,'limit', 'sell', amount,price)
        	ex_id = marketSellOrder.id
        	ex_info = JSON.stringify(marketSellOrder.info)	
        }
        
        log("[sell] Order for:",coin,"done.","ex_info",ex_info,"ex_id",ex_id)
        //calculate the correct amount received
        var tradingfee = exchange.fees.trading.maker
        if (typeof tradingfee === 'undefined') {
        	tradingfee = tradersFee.fee[exchange.id][0]["tradingfee_sell"]; 
        }
        amount = main.amountToPrecision(exchange.id,main.markets, coin, amount)
        amount = amount*price
        log("[sell] tradingfee dario",tradingfee,"amount",  amount, "price", price)
        
        amount = amount - (amount * tradingfee)
        
        //GAIN on selling coinbase -- amount is amount of cash --> cashIn
        amount = main.priceToPrecision(exchange.id,main.markets, coin, amount)
        //amount = parseFloat(amount).toFixed (amountPrecision);
        log("[sell] final amount w/ fee dario ",amount)
    } catch (e) {
        ex_error =e.message
        status=3
        log.red (exchange.id, 'error', 'market sell', e.message)
        log.red("[sell]",exchange.id, 'error during create order', e.message)

        return;
    }
    var address=""
    //database - store opportunity order on database
    log("[sell]",exchange.id, 'store opportunity on db')
    storeOpportunity (transaction_id, status, amount, side,ex_id, ex_info, ex_error, coin, price,address,exchange.id)  	
    log("[sell]",exchange.id, 'store opportunity on db...done.')
    const message = [side,"", amount,200,""]
    main.sendNotification("order_notification", message)
    log("[sell]",exchange.id, 'order completed, sent notification')
}
 
async function storeOpportunity (transaction_id, status, amount,side, ex_id, ex_info, ex_error, coin, price,address,exchangeId) {
	let parameters 
	let sql_statement, sql_side
	if (side==='WITHDRAWAL_TO') {
		sql_statement = database.sql_withdrwal_to_process
		sql_side = 'WITHDRAWAL_TO' 
		parameters =[status,amount,transaction_id]
	} else if(side==='WITHDRAWAL_FROM') {
		sql_statement = database.sql_withdrwal_from_process
		sql_side = 'WITHDRAWAL_FROM'
		parameters =[status,amount,transaction_id]
	} else if (side==='SELL_TO') {
		sql_statement = database.sql_sell_to_process
		sql_side = 'SELL_TO'
		parameters =[amount, amount,status, transaction_id]
    } else if (side==='SELL_FROM') {
		sql_statement = database.sql_sell_from_process
		sql_side = 'SELL_FROM'
		parameters =[amount,status, transaction_id]
    } else if (side==='BUY_TO') {
		sql_statement = database.sql_buy_to_process
		sql_side = 'BUY_TO'
		parameters = [amount,status, transaction_id]
    } else if (side==='BUY_FROM'){
		sql_statement = database.sql_buy_from_process
		sql_side = 'BUY_FROM'
		parameters = [amount,status, transaction_id]
    } else {
    	return //what happened
    }
    try {
    	log("[", side,"] sql", sql_statement, parameters)
    	database.db.run(sql_statement, parameters, function(err, rows, fields){
    	  if (err) {
    	    log.red(err.message);
    	  }
    	  log("[", side,"] PROCERSSES Row(s) updated:", `${this.changes}`); //
    	  if (this.changes) {
    	    //transaction_id,ex_id, side, status, ex_info, ex_error
    	    database.db.run(database.sql_insert_exchange_output, [transaction_id, ex_id,sql_side, status, ex_info, ex_error,coin,amount,price,address,exchangeId], function(err, rows, fields){
    	      if (err) {
    	        log.red(err.message);
    	      }
    	      log("[", side,"] HISTORY Row(s) added:", `${this.lastID}`); //
    	    })
    	  }
	   	if (side === "WITHDRAWAL_FROM" || side === "WITHDRAWAL_TO") {
	   	 	findOpportunity(transaction_id)
	   	} 
    	});
    	
        
    } catch (e) {
        log.red (exchangeId, 'error', 'market [',side,']', e.message)
        log.red("[", side,"]",exchange.id, 'error during store order on db', e.message)
    }
}

exports.sellAltCoin = sellAltCoin
exports.withdrawal = withdrawal
exports.buyAltCoin = buyAltCoin