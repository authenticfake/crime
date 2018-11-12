const ccxt = require ('ccxt')
require ('./therocksqv.js')
var accounts  = require ('./credentials-1.json')
const ids = ccxt.exchanges.filter (id => id in accounts)

let marketNames = [];
const algo_namespace="crime-square-wave"
//CONSTANTs
//CDC2 CONSTANTS
//RSI, BB, ADX = TRUE;TI=FALSE
const EXCHANGE="binance"
const COIN ="BTC"
const COIN_PAIR ="ETH/BTC"

const PROFIT=0.004  //0.001 trading fee (buy + sell) 0.0005
const STOPLOSS_ENABLED=true
const STOPLOSS=0.004
const STOPLOSS_COUNTER=20
const STOPLOSS_TIMEWINDOWS=240 //mins

const WALLET_QUANTITY_PERCENTAGE=50
const WALLET_DIVIDER=1
const OHLCV_PERIOD='5m'
const FIBONACCI_OHLCV_PERIOD='1d'
const COIN_FEE_AUTOCHARGE=false
const COIN_FEE='BNB'
const COIN_FEE_CHARGE=1.5
const COIN_FEE_THRESHOLD=0.5

const TREND_DIRECTIONL='upper' //lower, negative | upper, positive
const PRICE_CHANGED='neutral' //lower (-%), upper(+%), neutral(-,+ %)

const ORDERBOOK_FILTER = true;
const ORDERBOOK_WALL_THRESHOLD = 20;
const OB_LEVEL=16


const ENABLE_RATE_LIMIT = true
const ARBITRAGE_CRITERIA = 'last' 	//ARBITRAGE_CRITERIA (buy, sell)::=bid_ask|last|ask_bid
const DEBUG = false;
//FILTER -- SKIP everythings is amout, cost and price are below the limit provided
const LIMIT_FILTER = true;
const VOLUME_FILTER = false;
// VOLUME IN $(USD) See: https://coinmarketcap.com/exchanges/volume/24-hour/ based on exchanged configured on crime
const VOLUME_THRESHOLD = 200278;//i.e.:x100 amout as default.

const SPREAD_FILTER = true;
const SPREAD_THRESHOLD = 0.15;
//Averages see: //https://github.com/rubenafo/trendyways/wiki
const MA_FILTER = false;
const MA_PERIOD = 7;
const EMA_FILTER = false;
const WMA_FILTER = false;
//Indicator see: //https://github.com/rubenafo/trendyways/wiki
const MOM_FILTER=false;
const ROC_FILTER=false;
const ATR_FILTER=false;
//Support And Resistances see: //https://github.com/rubenafo/trendyways/wiki
const FloorPivots_FILTER=false;
const TomDemark_FILTER=false;
const WOODIES_FILTER=false
const FIBONACCI_FILTER=false
const CAMARILLA_FILTER=false
//MACD - //see: https://github.com/anandanand84/technicalindicators
const MACD_FILTER = false; 
//OBV 
//see: https://github.com/anandanand84/technicalindicators
const OBV_FILTER = false
//Stocasthic Oscillator
//see: https://github.com/anandanand84/technicalindicators
const KD_FILTER = false;
const KD_OVERSOLD = 20
const KD_OVERBOUGHT = 80
// see: https://tradingsim.com/blog/adx/
// see: https://www.ig.com/it/adx-come-individuare-trend
//see: https://github.com/anandanand84/technicalindicators
const ADX_FILTER = false;
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
//BB
//see: https://www.opzionibinarie60.com/strategia-del-retest-sulle-bande-di-bollinger-a-120-secondi/
const BB_FILTER = false  //true for ARBITRAGE and CDC2, CDC3. false for salesman
//see: http://webinary24.com/binary-trading-strategy-triple-rsi/
//see: https://www.e-investimenti.com/trading-online/20212-trading-un-mercato-laterale-trading-senza-trend/
const RSI_FILTER = false;
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
const SLIPPAGE_ALLOWED =0.0005 // I don't like this kind of engagmenet for the order (buy + SLIPPAGE_ALLOWE, sell - SLIPPAGE_ALLOWE)
const STUB = true;
//just for stub i.e. the idea is to analyze opportunities with a wallet equals to 1001 USD i.e.: for BTC as altcoin the wallet amout is 0.10; ETH = 1.15
//coin:ZEC amount:2.54 coin:neo amount:7.89
let sqvAmount =0.6, sqvCoin="BTC"
const version = 0.3
const FETCH_TYPE = "tickers"; 	//FETCH_TYPE::="ticker"|"tickers"
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
    this.ENABLE_RATE_LIMIT = ENABLE_RATE_LIMIT
    this.ARBITRAGE_CRITERIA =ARBITRAGE_CRITERIA;
    this.DEBUG = DEBUG
    this.STUB = STUB
    this.sqvAmount=sqvAmount
    this.sqvCoin=sqvCoin
    this.version = version
    this.proxies=proxies
    this.maxRetries=maxRetries
    this.currentProxy=currentProxy
    this.EXCHANGE=EXCHANGE
    this.COIN=COIN
    this.PROFIT=PROFIT
    this.STOPLOSS=STOPLOSS
    this.STOPLOSS_COUNTER=STOPLOSS_COUNTER
    this.STOPLOSS_ENABLED=STOPLOSS_ENABLED
    this.STOPLOSS_TIMEWINDOWS=STOPLOSS_TIMEWINDOWS
    this.ORDERBOOK_FILTER=ORDERBOOK_FILTER
    this.ORDERBOOK_WALL_THRESHOLD=ORDERBOOK_WALL_THRESHOLD

    this.LIMIT_FILTER = LIMIT_FILTER
    this.VOLUME_FILTER = VOLUME_FILTER
    this.VOLUME_THRESHOLD=VOLUME_THRESHOLD
    
    this.COIN_PAIR =COIN_PAIR
    //https://github.com/rubenafo/trendyways/wiki
    this.MA_FILTER = MA_FILTER;
    this.MA_PERIOD = MA_PERIOD
    this.EMA_FILTER = EMA_FILTER;
    this.WMA_FILTER = WMA_FILTER;
    //Indicator
    this.MOM_FILTER=MOM_FILTER;
    this.ROC_FILTER=ROC_FILTER;
    this.ATR_FILTER=ATR_FILTER;
    //Support And Resistances
    this.FloorPivots_FILTER=FloorPivots_FILTER;
    this.TomDemark_FILTER=TomDemark_FILTER;
    this.WOODIES_FILTER=WOODIES_FILTER;
    this.FIBONACCI_FILTER=FIBONACCI_FILTER;
    this.CAMARILLA_FILTER=CAMARILLA_FILTER;

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
    
    this.SLIPPAGE_ALLOWED = SLIPPAGE_ALLOWED
    this.SPREAD_FILTER=SPREAD_FILTER
    this.SPREAD_THRESHOLD=SPREAD_THRESHOLD

    this.MACD_FILTER=MACD_FILTER
    this.OBV_FILTER=OBV_FILTER
    this.KD_FILTER=KD_FILTER
    this.KD_OVERBOUGHT=KD_OVERBOUGHT
    this.KD_OVERSOLD=KD_OVERSOLD
    
    this.WALLET_QUANTITY_PERCENTAGE=WALLET_QUANTITY_PERCENTAGE
    this.WALLET_DIVIDER=WALLET_DIVIDER
    this.OHLCV_PERIOD=OHLCV_PERIOD
    this.COIN_FEE_AUTOCHARGE=COIN_FEE_AUTOCHARGE
    this.COIN_FEE=COIN_FEE
    this.COIN_FEE_THRESHOLD=COIN_FEE_THRESHOLD
    this.COIN_FEE_CHARGE=COIN_FEE_CHARGE
    this.OB_LEVEL=OB_LEVEL
    this.FIBONACCI_OHLCV_PERIOD=FIBONACCI_OHLCV_PERIOD
    
    this.TREND_DIRECTIONL=TREND_DIRECTIONL
    this.PRICE_CHANGED=PRICE_CHANGED
    

};
