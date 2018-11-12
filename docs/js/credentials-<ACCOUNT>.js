let exchanges = []



let binance = new ccxt.binance  ({
        "apiKey": "....",
        "secret": "...",
        "enableRateLimit": true,
 })

exchanges["binance"]=binance

