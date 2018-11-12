[![License: unlicensed](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

# Crime (read:  CRIpto MErde) a cryptocurrency  STUFF  - a node.js scripts to help find trading opportunities. 
Over 1000 currencies and 100 markets.

To use, go to https://github.com/authenticfake/crime , for development install nodejs ^V8.00 and run `npm install --python=python2.7`  `npm rebuild --python=python2.7`  

## Disclaimer: 
Use the software at your own risk. You are responsible for your own money. Past performance is not necessarily indicative of future results.

The author and all affiliates assume no responsibility for your trading results.

## Crime **STUFF** 

* Arbitrage Cross Exchange 
* Arbitrage Intra Exchange
* Scalping multiple wallet (aka salesman :) see: crime-salesman.js and settings-crime-salesman.js)
* Scaiping aka (aka cdc2 - see crime.cdc2.js and settings-crime-cdc2.js)
* Scalping based on square wave (see: crime-square-wave.js and settings-crime-square-wave.js)
* Pump & Dump (see:  )

**...** 

## Stuff

#### Arbitrage Cross Exchanges

To run the program

```shell
#enable cors on localhost
node cors-aca.js 
#enable opportunities storage
node rs-aca.js
#start  arbitrage engine
npm start
```

Go to ```localhost:3000``` to see a minimal display of the raw data

#### Arbitrage Intra Exchanges

To run the program

```shell 
node crime-arbitrage.js
```

you can find the setting on settings-arbitrage.js



#### Scalping multiple wallet (aka salesman :) )

To run the program

```shell 
node crime-salesman.js
```

you can find the setting on settings-salesman.js

#### Scalping  (aka cdc )

To run the program

```shell 
node crime-cdc2.js
```

you can find the setting on settings-cdc2.js

#### Pump & Dump 

To run the program

```shell 
node crime-pump.js 
```

you can find the setting on settings.js

Stuff

### For more details go to the [wiki](https://github.com/authenticfake/crime/wiki) 




## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Required: Node.js **^ V8.0.0** this program uses ES7 features such as async/await and requires a newer version of node.

### Installing

In a terminal write the following:

CD into the correct folder.

```shell
cd crime
```

Install the required npm modules

```shell
npm install --python=python2.7
npm rebuild --python=python2.7  
```

## Adding and removing exchange account - [wiki](https://github.com/authenticfake/crime/wiki/How-to-add-a-Account)

Accounts configuration are defined in the files credentials-<ACCOUNT>.json one for each account.

```
{
    "cryptopia":    { "apiKey": "--", "secret": "--", "timeout":20000, account="<ACCOUNT>" },
    "hitbtc2":      { "apiKey": "--", "secret": "", account="<ACCOUNT>" },
    "bitfinex":     { "apiKey": "--", "secret": "",account="<ACCOUNT>" },
    "binance":     	{ "apiKey": "--", "secret": "...", account="<ACCOUNT>" } 
}
```

Just for the arbitrage cross exchange also is necessary to configure secret key api key in the following path 

```
./docs/js/credentials-<ACCOUNT>.js 
```

For applying the correct account configuration launch 

```
 a.franco$ ./crimeaccount.sh <ACCOUNT>
```



## Adding and removing markets - [wiki](https://github.com/authenticfake/crime/wiki/How-to-add-a-market)

Currently you will have to add a market object with the correct APIs settings, situated in the in the `credentials-1.json` (`credentials-${account}.json`…) file.

You can temporarily stop loading a market from the frontend, or remove the market by deleting the APIs credential in `credentials-1.json`

For more information see the [wiki](https://github.com/authenticfake/crime/wiki) 

## Techinal Indicator available

RSI
MFI
CCI
ADX
BB
MACD
OBV
KDII
bullish as CandleStick Pattern

## Tools

* node cli.js - a command line interface for interaction with all exchanges configured on crime
* node check-addresses.js <ACCOUNT> - check and verify the availability for all addresses provided by exchanges. It suggests to run it before running crime.
* crimeaccount.sh <ACCOUNT> - configure crime with APIs associated to the account. It runs check-addresses for verifying the availability for the addresses provided by exchanges 
* [Github Pages](https://authenticfake.github.io/crime/) - hosts everythnigs you need.

## Contributing 

Feel free to suggest edits / pull requests or email me at authenticfake@hotmail.com



## Contributors

Special thanks to

[CCXT](https://github.com/ccxt/ccxt) team for great and huge work

[technicalindicators](https://github.com/anandanand84/technicalindicators) team for great and huge work



## Authors

* **authenticfake** - *Initial work* 

A real special thanks to 

GioGio

Skeggia

MrBBQ

MrBusinessMan

Pocho

## License

See the [LICENSE.txt](LICENSE.txt) file for details

## Donating

BTC: 1KsvrY5sSD15ocdcVS5E6N5SCfYM2Fpq4J
LTC: LUBmyPqD5YbsgwRDwvS4drkeWcrQWQaFhs
ETH: 0x646fdd589e9b3b6d520483082e7e71e4ef6522e6
XRP: rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun TAG:36361