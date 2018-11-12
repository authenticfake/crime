
/*  ------------------------------------------------------------------------ */
const Promise     = require("bluebird");
const ccxt        = require ('ccxt')
    , asTable     = require ('as-table') // .configure ({ print: require ('string.ify').noPretty })
    , log         = require ('ololog').noLocate
    , ansi        = require ('ansicolor').nice

var accounts    = require ('./credentials-1.json')

let coin_last= {},coin_prices_quote_volume={}, coin_prices_base_volume={},sqvWallets={}
var assets = []
var quantity=0
var master_wallet, base_wallet, quote_wallet
const NULL_CRITERIA="TBD"
let human_value = function (price) {
  return typeof price === 'undefined' ? 'N/A' : price
}

//calculate Volume from coin quote to USD(T)
async function calculateUSDTVolume(exchange, asset){
  //log.bright(exchange.id.green, "calculateUSDTVolume started", asset)
  var priceCQ;
  var quoteVolume = coin_prices_quote_volume[asset][exchange.id]
  var coinQuote = asset.slice(asset.indexOf("/")+1) 
  if (!coinQuote.startsWith("USD")) {

    if (coin_last[coinQuote+"/USD"] !==  undefined) {
      priceCQ = coin_last[coinQuote+"/USD"][exchange.id]
      //log.magenta("calculateUSDTVolume".yellow, exchange.id.green, "USD priceCQ", priceCQ)
    } else if (coin_last[coinQuote+"/USDT"] !==  undefined){
      priceCQ = coin_last[coinQuote+"/USDT"][exchange.id]
    } else {
      priceCQ =0
    }
  } else {
    priceCQ=1;//already in USD
  }

  const quoteVolumeUSD = quoteVolume * priceCQ
  log.bright (exchange.id.green, "calculateUSDTVolume",quoteVolumeUSD,"quoteVolume",quoteVolume, "priceCQ", priceCQ  )
  return quoteVolumeUSD;
}
/** 
 * discard all coin pairs with decimal not equals to zero more than 2 
 */
function checkCoinPairByNumberOfDecimal (exchange, assets, numberOfDecimalNoZero) {
  //log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkCoinPairByNumberOfDecimal", "coinpair", coinpair, "price", price, "number of digit", numberOfDecimalNoZero)
  var coinpairs = []
  for (var index=0;index<assets.length;index++) {
    var coinpair = assets[index][0]
    var price = coin_last[coinpair][exchange.id]
    const market = exchange.markets[coinpair]
    const precision = market.precision ? market.precision.price : 8
    //log.green.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkCoinPairByNumberOfDecimal", "coinpair", coinpair, "price", price, "precision", precision)
    price = exchange.priceToPrecision(coinpair,price)
    price = price * (Math.pow(10, precision))
    price =  Math.round(price)
    price = price.toString()
    //log.magenta.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkCoinPairByNumberOfDecimal", "coinpair", coinpair, "price", price, "precision", precision)
    
    if (price.length<=numberOfDecimalNoZero) {
      coinpairs.push([coinpair,assets[index][1] ])
    } 
  }
  return coinpairs
  
}

// Retrieve Volumes for all master and pair coins
async function fetchVolumes(exchange, coin_pair, symbol, markets, price_changed, numberOfDecimalNoZero ) {   //GET Volume DATA
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchVolumes started", "VOLUME_FILTER", VOLUME_FILTER)
  //if (!VOLUME_FILTER) return
      assets = []
      if (price_changed === undefined) price_changed = 'neutral'
      try {
        if ( !exchange.has["fetchTickers"]) {
          for (var x=0;x<markets.length; x++) {
            var asset = markets[x] 
            var quote_coin_pair = coin_pair.slice(coin_pair.indexOf("/")+1)
            if (asset.endsWith(symbol) || asset.endsWith(quote_coin_pair)) {  //var coinQuote = asset.slice(asset.indexOf("/")+1)
              var ticker = await exchange.fetchTicker(asset);
              await ccxt.sleep ()
              var percentage = ticker['percentage']
              //log("ticker", ticker, "asset", asset)
              if (!coin_prices_quote_volume[asset]) coin_prices_quote_volume[asset] = {};
              if (!coin_prices_base_volume[asset]) coin_prices_base_volume[asset] = {};
              if (!coin_last[asset]) coin_last[asset] = {};
              coin_last[asset][exchange.id] = ticker['last'];
              coin_prices_quote_volume[asset][exchange.id] = ticker['quoteVolume'];
              coin_prices_base_volume[asset][exchange.id] = ticker['baseVolume'];

              assets.push([asset,percentage ])
              // log("ticker", ticker, "asset", asset)
            }
            
          }
          
        } else {
          const tickers = await exchange.fetchTickers();
          
          Object.keys (tickers).map (exchangeId => {
              const ticker = tickers[exchangeId]
              const asset = ticker['symbol']
              var quote_coin_pair = coin_pair.slice(coin_pair.indexOf("/")+1)
              if (asset.endsWith(symbol)|| asset.endsWith(quote_coin_pair) ) {
                const percentage = ticker['percentage']
                if (!coin_prices_quote_volume[asset]) coin_prices_quote_volume[asset] = {};
                if (!coin_prices_base_volume[asset]) coin_prices_base_volume[asset] = {};
                if (!coin_last[asset]) coin_last[asset] = {};
                coin_last[asset][exchange.id] = ticker['last'];
                coin_prices_quote_volume[asset][exchange.id] = ticker['quoteVolume'];
                coin_prices_base_volume[asset][exchange.id] = ticker['baseVolume'];
                // (!assets[asset]) assets[asset] = {};
                if (price_changed==='positive') {
                  if ((percentage>0) && asset.endsWith(symbol) ) {
                    if (DEBUG)  log.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,"ticker percentage", percentage.toString().magenta,"asset", asset.green, "symbol", symbol.cyan)
                    //assets[asset]=percentage
                    assets.push([asset,percentage ])
                  }

                } else if (price_changed==='negative') {
                  if ((percentage<0) && asset.endsWith(symbol) ) {
                    if (DEBUG) log.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,"ticker percentage", percentage.toString().magenta,"asset", asset.green, "symbol", symbol.cyan)
                    assets.push([asset,percentage ])
                  }
                } else {
                  if (asset.endsWith(symbol) ) {
                    
                    assets.push([asset,percentage ])
                  }
                }
                // if (asset.endsWith(symbol) ) {
                //     assets.push([asset,percentage ])
                // }
                
              }
              
          })
          
        }
        await ccxt.sleep (120 * 1000) //2 mins
        if (numberOfDecimalNoZero !==undefined)  {
          assets = checkCoinPairByNumberOfDecimal(exchange, assets, numberOfDecimalNoZero)
        }
        if (DEBUG) {
          log.yellow(exchangeid.green,"coin_prices_quote_volume", coin_prices_quote_volume)
          log.yellow(exchangeid.green,"coin_prices_base_volume", coin_prices_base_volume)
          log.yellow(exchangeid.green,"coin_last", coin_last)
          log.yellow(exchangeid.green,"assets", assets)
        }


        
      } catch (e) {
        log.red(exchange.iso8601 (Date.now ()),exchange.id.green, "error",e)
        if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
            log.bright.yellow (exchange.id,"error ",'[DDoS Protection] ' + e.message)
        } else if (e instanceof ccxt.RequestTimeout) {
            log.bright.yellow (exchange.id,"error ",'[Request Timeout] ' + e.message)
        } else if (e instanceof ccxt.AuthenticationError) {
            log.bright.yellow (exchange.id,"error ",'[Authentication Error] ' + e.message)
        } else if (e instanceof ccxt.ExchangeNotAvailable) {
            log.bright.yellow (exchange.id,"error ",'[Exchange Not Available Error] ' + e.message)
        } else if (e instanceof ccxt.ExchangeError) {
            log.bright.yellow (exchange.id,"error ",'[Exchange Error] ' + e.message)
        } else if (e instanceof ccxt.NetworkError) {
            log.bright.yellow (exchange.id,"error ",'[Network Error] ' + e.message)
        } else if (e instanceof ccxt.InvalidNonce) {
            log.bright.yellow(exchange.id,"error ",'[InvalidNonce Error] ' + e.message)
        } 
      } 
      
    log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "fetchVolumes completed")
    return [coin_prices_quote_volume, coin_prices_base_volume, coin_last, assets]
}

// Retrieve Volumes for all master and pair coins
async function fetchAssets(exchange, symbols) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,"fetchVolumes started", "VOLUME_FILTER", VOLUME_FILTER)
  //if (!VOLUME_FILTER) return
    return new Promise (async (resolve, reject) => {
      assets = []
      try {
        for (var x=0;x<symbols.length; x++) {
          var asset = symbols[x] 
          var quote_coin_pair = coin_pair.slice(coin_pair.indexOf("/")+1)
          if (asset.endsWith(symbol) || asset.endsWith(quote_coin_pair)) {  //var coinQuote = asset.slice(asset.indexOf("/")+1)
            assets.push([asset,"" ])
          }
        }
      } catch (e) {
        log.red(exchange.iso8601 (Date.now ()),exchange.id.green, "error",e)
      } 
      resolve()
    })
}

//true when bid orders stress is greater than ask orders
async function checkOrderbook(exchange, symbol,amount) {
  
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkOrderbook started", exchange.id)
  if (!ORDERBOOK_FILTER) return
  var result = true;
  if (!orderbook_bid_walls[symbol]) orderbook_bid_walls[symbol] = {};
  if (!orderbook_ask_walls[symbol]) orderbook_ask_walls[symbol] = {};
  orderbook_bid_walls[symbol][exchange.id] = []
  orderbook_ask_walls[symbol][exchange.id] = [];
            
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
  var maxBidPrice = 0
  var maxAskPrice = 0
  var threshold = ORDERBOOK_WALL_THRESHOLD
  var _bid =  orderbook.bids[0][0]
  var _ask =  orderbook.asks[0][0]
  amount = amount/_ask
  for (var i =0;i<orderbook.bids.length; i++ ) {
 // for (var i =0;i<(4); i++ ) {
    var priceBid =  orderbook.bids[i][0]
    var amountBid =  orderbook.bids[i][1]
    var partialTotalBid = priceBid*amountBid
    if (i===0) { 
      maxBidAmount = partialTotalBid
      maxTotalBidAmount = maxBidAmount
    }
    if (amountBid > amount*threshold ) {
      orderbook_bid_walls[symbol][exchange.id].push([priceBid, amountBid])
    } 
    if (maxBidAmount < partialTotalBid) {
      maxBidAmount = partialTotalBid;
      maxTotalBidAmount=maxTotalBidAmount+maxBidAmount
      maxBidPrice = priceBid
    }
    totalBids = totalBids + (priceBid*amountBid)
    if (DEBUG) {
      log.bright.green(exchange.iso8601 (Date.now ()),exchange.id.green,"bid wall price", priceBid,"amount", amountBid,"total", partialTotalBid   )
    }
  }
  //for (var j =0;j<(4); j++ ) {
  for (var j =0;j<orderbook.asks.length; j++ ) {
    var priceAsk =  orderbook.asks[j][0]
    var amountAsk =  orderbook.asks[j][1]
    var partialTotalAsk = priceAsk*amountAsk
    
    if (j===0) {
      maxAskAmount = partialTotalAsk
      maxTotalAskAmount = maxAskAmount
    }
    if (amountAsk > amount*threshold ) {
      orderbook_ask_walls[symbol][exchange.id].push([priceAsk, amountAsk])
    }
    if (maxAskAmount < partialTotalAsk) {
      maxAskAmount = partialTotalAsk;
      maxTotalAskAmount = maxTotalAskAmount + maxAskAmount
      maxAskPrice = priceAsk
    }
    totalAsks = totalAsks + (priceAsk*amountAsk)
    if (DEBUG) {
      log.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,"checkOrderbook ask wall","price", priceAsk,"amount", amountAsk,"total", partialTotalAsk)
      log.bright (exchange.iso8601 (Date.now ()),exchange.id.green,"checkOrderbook ASK price", priceAsk, "amount", amountAsk, "total", totalAsks )
    }
  }
  //log.magenta(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow,"ask wall","maxAskPrice", maxAskPrice, "maxAskAmount", maxAskAmount, "totalAsks", totalAsks)
  
  var _threshold = 0 //as CDC 
  log.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,"checkOrderbook max bid amount",maxBidAmount.toString().green,"max ask amount",maxAskAmount.toString().magenta)
  log.yellow(exchange.iso8601 (Date.now ()),exchange.id.green,"checkOrderbook total bids",totalBids.toString().green,"total asks",totalAsks.toString().magenta)
  
  var trednUp = (totalBids - totalAsks >_threshold)?true:false
  var pressionUp = (maxBidAmount - maxAskAmount > _threshold)?true:false
  //return (totalAsks - totalBids<threshold)?true:false
  

  return [trednUp, pressionUp]

}

// Retrieve Wallet by coin and exchange
function fetchBalance(altcoin, exchId) {
    var result = undefined;
    try {
      log.bright(exchId.green, algo_namespace.yellow,"fetchBalance started", altcoin, sqvWallets[exchId][altcoin])
        result = sqvWallets[exchId][altcoin]
        if (typeof result === undefined || result === NULL_CRITERIA) {
            result = undefined
        }
        return result;
        
    } catch (error) {
        //empty wallet for the specific exchage and altcoin
        //log.red ('empty wallet for the specific exchage and altcoin', exchId,altcoin )
        return undefined;
    }

}

// Retrieve Wallet by coin and exchange
function fetchBalance(symbol, exchange) {
    var result = undefined;
    try {
      log.bright(exchange.id.green, "fetchBalance started", symbol, sqvWallets[exchange.id][symbol])
      if (!sqvWallets[exchange.id]) sqvWallets[exchange.id] = NULL_CRITERIA;
      result = sqvWallets[exchange.id][symbol]
      if (typeof result === 'undefined' || result === NULL_CRITERIA) {
          result = undefined
      }
      return result;
    } catch (error) {
        //empty wallet for the specific exchage and symbol
        log.red ('empty wallet for the specific exchage and symbol', exchange.id,symbol )
        return undefined;
    }

}
// Retrieve balances by Exchange for all coins
async function fetchBalances(exchange) {   //GET BALANCE DATA
    //return  new Promise (async (resolve, reject) => {
      log.bright(exchange.id.green, "fetchBalances","exchange", exchange.id)
  try {
      let balance
      if (exchange.id ==='binance') {
          let binance = new ccxt.binance  (accounts[exchange.id])
          balance = await binance.fetchBalance({'recvWindow': 60000000})
          //exchange.verbose = true
      } else {
          // output the balance from the exchange
          balance = await exchange.fetchBalance ()    
      }
      //HITBTC has two kind of wallet: Bank and Exchange wallet --> move to Exchange for trading
      if (exchange.id === "hitbtc2") {
          var balanceAccount = await exchange.fetchBalance ({ type: 'account' })
          var balanceFree =balanceAccount.free
          var baseCoins = Object.keys(balanceFree);
          for(var i = 0; i < baseCoins.length; i++) {
              var amount = balanceFree[baseCoins[i]];
              if (typeof amount !== 'undefined' &&  amount >0) {
                  exchange.private_post_account_transfer({'currency': baseCoins[i], 'amount': amount, 'type': 'bankToExchange'})
                  //log.bright (exchange.id.green,algo_namespace.yellow, "currency",baseCoins[i], 'balance', "amount", amount)
              }
          }
      } 
     
      if (!sqvWallets[exchange.id]) sqvWallets[exchange.id] = NULL_CRITERIA;
      if (STUB) {
          sqvWallets[exchange.id]=JSON.parse('{"' + sqvCoin + '":"' + sqvAmount +'"}')
      } else {
          //store the total balance by altcoin
          sqvWallets[exchange.id]=balance.free
      }
      if (DEBUG) {
        log.bright(exchange.id.green,"balance.free", balance.free,"balance.total", balance.total, "Wallets by exchange", sqvWallets[exchange.id])
      }
      
      await ccxt.sleep(exchange.rateLimit)
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
}

//check balance before starting trading
async function checkBalances(exchange,coin_fee_autocharge, coin_fee, symbol, wallet_percentage ) {
  log.bright(exchange.id.green, "checkBalances started", exchange.id,"coin_fee_autocharge", coin_fee_autocharge, "coin_fee",coin_fee,  "symbol",symbol, "wallet_percentage", wallet_percentage)
  var result = true;
  try {
    
    //check the quantity candidate for trading...
    await fetchBalances(exchange)
    
    if (coin_fee_autocharge!== undefined && coin_fee_autocharge) {
      var asset = coin_fee + "/" + symbol

      var coin_fee_wallet = fetchBalance(coin_fee, exchange.id)
      if (coin_fee_wallet < coin_fee_threshold) {
        let orderbook = await exchange.fetchOrderBook (asset)
        let bid = orderbook.bids.length ? orderbook.bids[0][0] : undefined
        let ask = orderbook.asks.length ? orderbook.asks[0][0] : undefined
        let order = await exchange.createOrder (asset,'market', 'buy', coin_fee_charge,ask, {'recvWindow': 60000000})
        await ccxt.sleep (exchange.rateLimit*4)
        await fetchBalances(exchange)
        log.bright.magenta(exchange.iso8601 (Date.now ()),"order buy id",order.id, "amount", coin_fee_threshold, "asset", symbol)
      }  
    } 
    
    master_wallet = fetchBalance(symbol, exchange)
    quote_wallet = master_wallet
    //log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkBalances wallet (",symbol,") available", master_wallet)
    quantity = (master_wallet * wallet_percentage)/100
    //log.bright(exchange.iso8601 (Date.now ()),exchange.id.green, "checkBalances percentage of wallet available",quantity)

    result = true;
  } 
  catch (e) {
    log.bright.red (exchange.id,"error checkBalances",e, "Try to fetch balances another time", exchange.id )
    if (e instanceof ccxt.DDoSProtection || e.message.includes ('ECONNRESET')) {
        log.bright.yellow (exchange.id,"error checkBalances",'[DDoS Protection] ' + e.message)
    } else if (e instanceof ccxt.RequestTimeout) {
        log.bright.yellow (exchange.id,"error checkBalances",'[Request Timeout] ' + e.message)
    } else if (e instanceof ccxt.AuthenticationError) {
        log.bright.yellow (exchange.id,"error checkBalances",'[Authentication Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeNotAvailable) {
        log.bright.yellow (exchange.id,"error checkBalances",'[Exchange Not Available Error] ' + e.message)
    } else if (e instanceof ccxt.ExchangeError) {
        log.bright.yellow (exchange.id,"error checkBalances",'[Exchange Error] ' + e.message)
    } else if (e instanceof ccxt.NetworkError) {
        log.bright.yellow (exchange.id,"error checkBalances",'[Network Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidNonce) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkBalnces",'[InvalidNonce Error] ' + e.message)
    } else if (e instanceof ccxt.OrderNotFound) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkBalnces",'[OrderNotFound Error] ' + e.message)
    } else if (e instanceof ccxt.InvalidOrder) {
        // it has thrown the exception as expected
        log.bright.yellow(exchange.id,"error checkBalnces",'[InvalidOrder Error] ' + e.message)
    } else if (e instanceof ccxt.InsufficientFunds) {
        // it has thrown the exception as expected
       log.bright.yellow(exchange.id,"error checkBalnces",'[InsufficientFunds Error] ' + e.message)
    }

    result = false
  }
  return [result, master_wallet, quantity]
}

async function checkLastPrice(exchange, symbol, priceBuy, priceSell){
  log.bright(exchange.id.green, "checkLastPrice started", symbol, priceBuy, priceSell)
  var found = false
  var foundBuy  = false
  var foundSell  = false
  while (!found) {
    try {
      var ticker = await exchange.fetchTicker(symbol);
      await ccxt.sleep (exchange.rateLimit)
      var priceLast = ticker['last']
      if (priceLast < priceBuy) foundBuy=true
      if (priceLast > priceSell) foundSell=true
      if (foundBuy && foundSell) found = true

    } 
    catch (e){
      log.bright.red (exchange.id,"error checkLastPrice",e.message, "Try to fetch lat price another time", exchangeid.id )
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
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "checkLastPrice completed", symbol, priceBuy, priceSell)
}
/** checkResistenceSupport */
async function checkResistenceSupport(exchange, priceAsk, priceBid, priceLast, fibonacci ,trend) {
  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,"checkResistenceSupport started", priceAsk, priceBid, priceLast, fibonacci)
  
  var resitences = fibonacci[0]
  var supports   = fibonacci[1]
  var r3= fibonacci[0][3]
  var r2= fibonacci[0][2]
  
  var rResult=false,sResult=false, priceSell, priceBuy
  priceBuy= priceAsk
  priceSell = priceBuy * (1 + profit)

  //check target sell price
  if (priceSell<r3) {
    rResult=true
  } else if (priceSell<r2) {
    rResult=true
  }

  log.bright(exchange.iso8601 (Date.now ()),exchange.id.green,algo_namespace.yellow, "r2", r2, "r3", r3,"priceBuy",priceBuy, "priceSell",priceSell)

  for (var s=0; s<supports.length; s++) {
    log.bright(Date.now (),exchange.id.green,algo_namespace.yellow, "supports", supports[s], "priceAsk",priceAsk, "priceBid",priceBid, "priceLast", priceBid)
    if (priceLast>=supports[s] && priceBid >=supports[s]) {
      sResult=true;
    }
  }
  return [rResult, sResult,priceBuy, priceSell ]
}

module.exports = function () {
  //this.checkResistenceSupport=checkResistenceSupport
  this.checkLastPrice=checkLastPrice
  this.checkBalances=checkBalances
  this.fetchBalances=fetchBalances
  this.fetchBalance=fetchBalance
  this.fetchVolumes=fetchVolumes
  this.checkOrderbook=checkOrderbook
  this.calculateUSDTVolume=calculateUSDTVolume

}