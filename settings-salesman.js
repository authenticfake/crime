const ccxt = require ('ccxt')
require ('./therocksqv.js')
var accounts  = require ('./credentials-1.json')
const ids = ccxt.exchanges.filter (id => id in accounts)

let marketNames = [];
const algo_namespace="salesman"
//CONSTANTs
//SALESMAN CONSTANTS
const SALESMAN_EXCHANGE="binance"
const SALESMAN_COINPAIR ="ETH/USDT"
const SALESMAN_PROFIT=0.003  //price = priceLast *  (1 - SALESMAN_PROFIT);
const SALESMAN_STOPLOSS=0.005
const SALESMAN_STOPLOSS_COUNTER=20
const SALESMAN_WALLET_QUANTITY_PERCENTAGE=100
const SALESMAN_WALLET_ENABLED=false
const SALESMAN_WALLET_DIVIDER=1
const SALESMAN_OHLCV_PERIOD='5m'
const SALESMAN_COIN_FEE='BNB'
const SALESMAN_COIN_FEE_CHARGE=0.5
const SALESMAN_COIN_FEE_AUTOCHARGE=true
const SALESMAN_COIN_FEE_THRESHOLD=0.2
const SALESMAN_STOPLOSS_TIMEWINDOWS=1 //mins


//GLOBAL
const STOPLOSS_ENABLED=false
const ENABLE_RATE_LIMIT = true
const DEBUG = false;
//FILTER -- SKIP everythings is amout, cost and price are below the limit provided
const OB_LEVEL=16
const ORDERBOOK_FILTER = true;
const ORDERBOOK_WALL_THRESHOLD = 20;
const LIMIT_FILTER = true;
const VOLUME_FILTER = true;
const SPREAD_FILTER = true;
const SPREAD_THRESHOLD = 0.15;
const SPREAD_HIGH_LOW_THRESHOLD=10
const SPREAD_HIGH_LOW_LEVEL=2 //level based on decili scale (1, 2,..., 10)
const SPREAD_HL_FILTER=true
//Technical Indicator
const TI_FILTER = false;
// see: https://tradingsim.com/blog/adx/
// see: https://www.ig.com/it/adx-come-individuare-trend
const ADX_FILTER = true;
//BARELY BREATHING
const ADX_LEVEL_1 = 0
//WEAK TREADING
const ADX_LEVEL_2 = 10
//POTENTIALLY STARTING TO TREND
const ADX_LEVEL_3 = 20
//HEATING UP
const ADX_LEVEL_4 = 30
//WATCH OUT
const ADX_LEVEL_5 = 50
//ONFIRE
const ADX_LEVEL_6 = 75
//ONFIRE
const ADX_LEVEL_7 = 100
//MACD
const MACD_FILTER = true;
//OBV
const OBV_FILTER = true
//Stocasthic Oscillator
const KD_FILTER = true;
const KD_OVERSOLD = 20
const KD_OVERBOUGHT = 80
//BB
//see: https://www.opzionibinarie60.com/strategia-del-retest-sulle-bande-di-bollinger-a-120-secondi/
const BB_FILTER = false  //true for ARBITRAGE and CDC2, CDC3. false for salesman
//see: http://webinary24.com/binary-trading-strategy-triple-rsi/
//see: https://www.e-investimenti.com/trading-online/20212-trading-un-mercato-laterale-trading-senza-trend/
const RSI_FILTER = true;
const RSI_OVERSOLD = 40 //30 as default
const RSI_OVERBOUGHT = 80 //70 as default
//MFI Technical Indicator
const MFI_FILTER = false;
const MFI_OVERSOLD = 40
const MFI_OVERBOUGHT = 80
//CCI Technical Indicator
const CCI_FILTER = false;
const CCI_OVERSOLD = -100
const CCI_OVERBOUGHT = 200
// CROSS and INTRA EXCHANGE ARBITRAGE
// VOLUME IN $(USD) See: https://coinmarketcap.com/exchanges/volume/24-hour/ based on exchanged configured on crime
const VOLUME_THRESHOLD = 190278;//i.e.:x100 amout as default.
const SLIPPAGE_ALLOWED =0.0005 // I don't like this kind of engagmenet for the order (buy + SLIPPAGE_ALLOWE, sell - SLIPPAGE_ALLOWE)
const STUB = true;
//just for stub i.e. the idea is to analyze opportunities with a wallet equals to 1001 USD i.e.: for BTC as altcoin the wallet amout is 0.10; ETH = 1.15
//coin:ZEC amount:2.54 coin:neo amount:7.89
let sqvAmount =0.6, sqvCoin="USDT"
const version = 180
const FETCH_TYPE = "tickers"; 			//FETCH_TYPE::="ticker"|"tickers"
let proxies = [
    '', // no proxy by default
    'http://localhost:8080/',
    //'https://cors-anywhere.herokuapp.com/',

]
let maxRetries   = proxies.length
let currentProxy = 0

for (let i = 0; i < ids.length; i++) {
       marketNames.push([[ids[i]], ['']])
}
    
module.exports = function () {
    this.marketNames = marketNames;
    this.algo_namespace=algo_namespace
    this.ENABLE_RATE_LIMIT = ENABLE_RATE_LIMIT
    this.DEBUG = DEBUG
    this.FETCH_TYPE = FETCH_TYPE
    this.LIMIT_FILTER = LIMIT_FILTER
    this.TI_FILTER=TI_FILTER
    this.RSI_FILTER=RSI_FILTER
    this.RSI_OVERSOLD = RSI_OVERSOLD
    this.RSI_OVERBOUGHT=RSI_OVERBOUGHT
    this.MFI_FILTER=MFI_FILTER
    this.MFI_OVERSOLD = MFI_OVERSOLD
    this.MFI_OVERBOUGHT=MFI_OVERBOUGHT
    this.CCI_FILTER=CCI_FILTER
    this.CCI_OVERSOLD = CCI_OVERSOLD
    this.CCI_OVERBOUGHT=CCI_OVERBOUGHT
    this.ADX_FILTER=ADX_FILTER
    this.ADX_LEVEL_1=ADX_LEVEL_1
    this.ADX_LEVEL_2=ADX_LEVEL_2
    this.ADX_LEVEL_3=ADX_LEVEL_3
    this.ADX_LEVEL_4=ADX_LEVEL_4
    this.ADX_LEVEL_5=ADX_LEVEL_5
    this.ADX_LEVEL_6=ADX_LEVEL_6
    this.ADX_LEVEL_7=ADX_LEVEL_7
    this.BB_FILTER=BB_FILTER
    this.MACD_FILTER=MACD_FILTER
    this.OBV_FILTER=OBV_FILTER
    this.KD_FILTER=KD_FILTER
    this.KD_OVERBOUGHT=KD_OVERBOUGHT
    this.KD_OVERSOLD=KD_OVERSOLD
    

    this.STOPLOSS_ENABLED=STOPLOSS_ENABLED
    this.VOLUME_FILTER = VOLUME_FILTER
    this.VOLUME_THRESHOLD=VOLUME_THRESHOLD
    this.SLIPPAGE_ALLOWED = SLIPPAGE_ALLOWED
    this.SPREAD_FILTER=SPREAD_FILTER
    this.SPREAD_THRESHOLD=SPREAD_THRESHOLD
    
    this.ORDERBOOK_FILTER=ORDERBOOK_FILTER
    this.ORDERBOOK_WALL_THRESHOLD=ORDERBOOK_WALL_THRESHOLD
    this.OB_LEVEL=OB_LEVEL
    
    this.STUB = STUB
    this.sqvAmount=sqvAmount
    this.sqvCoin=sqvCoin
    this.version = version
    this.proxies=proxies
    this.maxRetries=maxRetries
    this.currentProxy=currentProxy
    this.SPREAD_HIGH_LOW_THRESHOLD=SPREAD_HIGH_LOW_THRESHOLD
    this.SPREAD_HL_FILTER=SPREAD_HL_FILTER
    this.SPREAD_HIGH_LOW_LEVEL=SPREAD_HIGH_LOW_LEVEL
    
    
    //SALESMAN ALGO bases on single coinpar
    this.SALESMAN_COINPAIR=SALESMAN_COINPAIR
    this.SALESMAN_EXCHANGE=SALESMAN_EXCHANGE
    this.SALESMAN_PROFIT=SALESMAN_PROFIT
    this.SALESMAN_WALLET_QUANTITY_PERCENTAGE=SALESMAN_WALLET_QUANTITY_PERCENTAGE
    this.SALESMAN_WALLET_DIVIDER=SALESMAN_WALLET_DIVIDER
    this.SALESMAN_OHLCV_PERIOD=SALESMAN_OHLCV_PERIOD
    this.SALESMAN_COIN_FEE=SALESMAN_COIN_FEE
    this.SALESMAN_COIN_FEE_THRESHOLD=SALESMAN_COIN_FEE_THRESHOLD
    this.SALESMAN_COIN_FEE_CHARGE=SALESMAN_COIN_FEE_CHARGE
    this.SALESMAN_COIN_FEE_AUTOCHARGE=SALESMAN_COIN_FEE_AUTOCHARGE
    this.SALESMAN_STOPLOSS=SALESMAN_STOPLOSS
    this.SALESMAN_STOPLOSS_COUNTER=SALESMAN_STOPLOSS_COUNTER
    this.SALESMAN_STOPLOSS_TIMEWINDOWS
    
};
