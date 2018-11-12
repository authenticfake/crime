const ccxt = require ('ccxt')
require ('./therocksqv.js')
var accounts  = require ('./credentials-1.json')
const ids = ccxt.exchanges.filter (id => id in accounts)

let marketNames = [];
const algo_namespace="crime-cdc2"
//CONSTANTs
//CDC2 CONSTANTS
//RSI, BB, ADX = TRUE;TI=FALSE
const TDC_EXCHANGE="binance"
const TDC_COIN ="BTC"
const TDC_PROFIT=0.004  //0.001 trading fee (buy + sell) 0.0005
const TDC_STOPLOSS=0.004
const TDC_STOPLOSS_TIMEWINDOWS=1 //mins
const TDC_STOPLOSS_COUNTER=20
const TDC_WALLET_QUANTITY_PERCENTAGE=50
const TDC_WALLET_ENABLED=false
const TDC_WALLET_DIVIDER=1
const TDC_OHLCV_PERIOD='5m'
const TDC_FIBONACCI_OHLCV_PERIOD='1d'
const TDC_COIN_FEE_AUTOCHARGE=false
const TDC_COIN_FEE='BNB'
const TDC_COIN_FEE_CHARGE=1.5
const TDC_COIN_FEE_THRESHOLD=0.5
const TDC_OB_LEVEL=16

const TDC_TREND_DIRECTIONL='upper' //lower, negative | upper, positive
const TDC_PRICE_CHANGED='neutral' //lower (-%), upper(+%), neutral(-,+ %)

const STOPLOSS_TIMEWINDOWS=240 //mins
const COIN_PAIR ="ETH/BTC"
const STOPLOSS_ENABLED=true
const ORDERBOOK_FILTER = true;
const ORDERBOOK_WALL_THRESHOLD = 20;

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
const SPREAD_HIGH_LOW_THRESHOLD=10
const SPREAD_HIGH_LOW_LEVEL=2 //level based on decili scale (1, 2,..., 10)
const SPREAD_HL_FILTER=true
//Technical Indicator
const TI_FILTER = false;
//Averages see: //https://github.com/rubenafo/trendyways/wiki
const MA_FILTER = true;
const MA_PERIOD = 7;
const EMA_FILTER = true;
const WMA_FILTER = true;
//Indicator see: //https://github.com/rubenafo/trendyways/wiki
const MOM_FILTER=true;
const ROC_FILTER=true;
const ATR_FILTER=true;
//Support And Resistances see: //https://github.com/rubenafo/trendyways/wiki
const FloorPivots_FILTER=true;
const TomDemark_FILTER=true;
const WOODIES_FILTER=true
const FIBONACCI_FILTER=true
const CAMARILLA_FILTER=true
//MACD - //see: https://github.com/anandanand84/technicalindicators
const MACD_FILTER = false; 
//OBV 
//see: https://github.com/anandanand84/technicalindicators
const OBV_FILTER = true
//Stocasthic Oscillator
//see: https://github.com/anandanand84/technicalindicators
const KD_FILTER = false;
const KD_OVERSOLD = 20
const KD_OVERBOUGHT = 80
// see: https://tradingsim.com/blog/adx/
// see: https://www.ig.com/it/adx-come-individuare-trend
//see: https://github.com/anandanand84/technicalindicators
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
    this.LIMIT_FILTER = LIMIT_FILTER
    this.TI_FILTER=TI_FILTER
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
    this.STOPLOSS_ENABLED=STOPLOSS_ENABLED
    this.ORDERBOOK_FILTER=ORDERBOOK_FILTER
    this.ORDERBOOK_WALL_THRESHOLD=ORDERBOOK_WALL_THRESHOLD
    
    this.VOLUME_FILTER = VOLUME_FILTER
    this.VOLUME_THRESHOLD=VOLUME_THRESHOLD
    this.SLIPPAGE_ALLOWED = SLIPPAGE_ALLOWED
    this.SPREAD_FILTER=SPREAD_FILTER
    this.SPREAD_THRESHOLD=SPREAD_THRESHOLD

    this.MACD_FILTER=MACD_FILTER
    this.OBV_FILTER=OBV_FILTER
    this.KD_FILTER=KD_FILTER
    this.KD_OVERBOUGHT=KD_OVERBOUGHT
    this.KD_OVERSOLD=KD_OVERSOLD
   
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
    this.ORDERBOOK_FILTER=ORDERBOOK_FILTER
    
    //TDC
    this.TDC_EXCHANGE=TDC_EXCHANGE
    this.TDC_COIN=TDC_COIN
    this.TDC_PROFIT=TDC_PROFIT
    this.TDC_STOPLOSS=TDC_STOPLOSS
    this.TDC_STOPLOSS_COUNTER=TDC_STOPLOSS_COUNTER
    this.TDC_WALLET_QUANTITY_PERCENTAGE=TDC_WALLET_QUANTITY_PERCENTAGE
    this.TDC_WALLET_ENABLED=TDC_WALLET_ENABLED
    this.TDC_WALLET_DIVIDER=TDC_WALLET_DIVIDER
    this.TDC_OHLCV_PERIOD=TDC_OHLCV_PERIOD
    this.TDC_COIN_FEE_AUTOCHARGE=TDC_COIN_FEE_AUTOCHARGE
    this.TDC_COIN_FEE=TDC_COIN_FEE
    this.TDC_COIN_FEE_THRESHOLD=TDC_COIN_FEE_THRESHOLD
    this.TDC_COIN_FEE_CHARGE=TDC_COIN_FEE_CHARGE
    this.TDC_OB_LEVEL=TDC_OB_LEVEL
    this.TDC_FIBONACCI_OHLCV_PERIOD=TDC_FIBONACCI_OHLCV_PERIOD
    
    this.TDC_TREND_DIRECTIONL=TDC_TREND_DIRECTIONL
    this.TDC_PRICE_CHANGED=TDC_PRICE_CHANGED
    this.STOPLOSS_TIMEWINDOWS=STOPLOSS_TIMEWINDOWS
};
