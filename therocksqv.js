'use strict';

// ---------------------------------------------------------------------------

const therock = require ('./node_modules/ccxt/js/therock.js');
const ccxt = require ('ccxt')

// ---------------------------------------------------------------------------


module.exports = class therocksqv extends ccxt.therock {
    describe () {
        return this.deepExtend (super.describe (), {
        	'id': 'therock',
        	'name': 'TheRockTrading',
        	'countries': 'MT',
        	'rateLimit': 1000,
        	'version': 'v1',
            'has': {
                'CORS': false,
                'fetchTickers': true,
                'withdraw': true,
                'fetchDepositAddress':true,
            },
            'markets': {
                            'BTC/EUR': { 'id': 'BTCEUR', 'symbol': 'BTC/EUR', 'base': 'BTC', 'quote': 'EUR', 'precision': { 'amount': 4, 'price': 4 },  'limits': { 'amount': { 'min': 0.0005, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                            'LTC/EUR': { 'id': 'LTCEUR', 'symbol': 'LTC/EUR', 'base': 'LTC', 'quote': 'EUR', 'precision': { 'amount': 2, 'price': 2 },  'limits': { 'amount': { 'min': 0.01, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                            'LTC/BTC': { 'id': 'LTCBTC', 'symbol': 'LTC/BTC', 'base': 'LTC', 'quote': 'BTC', 'precision': { 'amount': 8, 'price': 8 },  'limits': { 'amount': { 'min': 0.01, 'max': undefined }, 'price': { 'min': 0.00000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                            'BTC/XRP': { 'id': 'BTCXRP', 'symbol': 'BTC/XRP', 'base': 'BTC', 'quote': 'XRP', 'precision': { 'amount': 4, 'price': 4 },  'limits': { 'amount': { 'min': 0.0005, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                            'EUR/XRP': { 'id': 'EURXRP', 'symbol': 'EUR/XRP', 'base': 'EUR', 'quote': 'XRP', 'precision': { 'amount': 2, 'price': 2 },  'limits': { 'amount': { 'min': 0.01, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                            'PPC/EUR': { 'id': 'PPCEUR', 'symbol': 'PPC/EUR', 'base': 'PPC', 'quote': 'EUR', 'precision': { 'amount': 2, 'price': 2 },  'limits': { 'amount': { 'min': 0.05, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                            'PPC/BTC': { 'id': 'PPCBTC', 'symbol': 'PPC/BTC', 'base': 'PPC', 'quote': 'BTC', 'precision': { 'amount': 8, 'price': 8 },  'limits': { 'amount': { 'min': 0.05, 'max': undefined }, 'price': { 'min': 0.00000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'ETH/EUR': { 'id': 'ETHEUR', 'symbol': 'ETH/EUR', 'base': 'ETH', 'quote': 'EUR', 'precision': { 'amount': 3, 'price': 3 },  'limits': { 'amount': { 'min': 0.005, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'ETH/BTC': { 'id': 'ETHBTC', 'symbol': 'ETH/BTC', 'base': 'ETH', 'quote': 'BTC', 'precision': { 'amount': 8, 'price': 8 },  'limits': { 'amount': { 'min': 0.005, 'max': undefined }, 'price': { 'min': 0.00000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'ZEC/BTC': { 'id': 'ZECBTC', 'symbol': 'ZEC/BTC', 'base': 'ZEC', 'quote': 'BTC', 'precision': { 'amount': 8, 'price': 8 },  'limits': { 'amount': { 'min': 0.005, 'max': undefined }, 'price': { 'min': 0.00000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'ZEC/EUR': { 'id': 'ZECEUR', 'symbol': 'ZEC/EUR', 'base': 'ZEC', 'quote': 'EUR', 'precision': { 'amount': 3, 'price': 3 },  'limits': { 'amount': { 'min': 0.005, 'max': undefined }, 'price': { 'min': 0.01, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'BCH/BTC': { 'id': 'BCHBTC', 'symbol': 'BCH/BTC', 'base': 'BCH', 'quote': 'BTC', 'precision': { 'amount': 8, 'price': 8 },  'limits': { 'amount': { 'min': 0.005, 'max': undefined }, 'price': { 'min': 0.00000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'EUR/EURN': { 'id': 'EUREURN', 'symbol': 'EUR/EURN', 'base': 'EUR', 'quote': 'EURN', 'precision': { 'amount': 2, 'price': 2 },  'limits': { 'amount': { 'min': 0.01, 'max': undefined }, 'price': { 'min': 0.001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'BTC/EURN': { 'id': 'BTCEURN', 'symbol': 'BTC/EURN', 'base': 'BTC', 'quote': 'EURN', 'precision': { 'amount': 4, 'price': 4 },  'limits': { 'amount': { 'min': 0.0005, 'max': undefined }, 'price': { 'min': 0.001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'ETH/EURN': { 'id': 'ETHEURN', 'symbol': 'ETH/EURN', 'base': 'ETH', 'quote': 'EURN', 'precision': { 'amount': 3, 'price': 3 },  'limits': { 'amount': { 'min': 0.005, 'max': undefined }, 'price': { 'min': 0.001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'NOKU/EURN': { 'id': 'NOKUEURN', 'symbol': 'NOKU/EURN', 'base': 'PPC', 'quote': 'EURN', 'precision': { 'amount': 3, 'price': 3 },  'limits': { 'amount': { 'min': 1, 'max': undefined }, 'price': { 'min': 0.001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'NOKU/BTC': { 'id': 'NOKUBTC', 'symbol': 'NOKU/BTC', 'base': 'NOKU', 'quote': 'BTC', 'precision': { 'amount': 8, 'price': 8 },  'limits': { 'amount': { 'min': 1, 'max': undefined }, 'price': { 'min': 0.00000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                           'NOKU/ETH': { 'id': 'NOKUETH', 'symbol': 'NOKU/ETH', 'base': 'NOKU', 'quote': 'ETH', 'precision': { 'amount': 6, 'price': 6 },  'limits': { 'amount': { 'min': 1, 'max': undefined }, 'price': { 'min': 0.000001, 'max': undefined }, 'cost': { 'min': undefined, 'max': undefined }}},
                        },
            'api': {
            	'public': {
            	    'get': [
            	        'funds/{id}/orderbook',
            	        'funds/{id}/ticker',
            	        'funds/{id}/trades',
            	        'funds/tickers',
            	    ],
            	},            	
            	'private': {
                    'get': [
                    	'currencies/{id}/addresses',
                    	'balances',
                    	'balances/{id}',
                    	'discounts',
                    	'discounts/{id}',
                    	'funds',
                    	'funds/{id}',
                    	'funds/{id}/trades',
                    	'funds/{fund_id}/orders',
                    	'funds/{fund_id}/orders/{id}',
                    	'funds/{fund_id}/position_balances',
                    	'funds/{fund_id}/positions',
                    	'funds/{fund_id}/positions/{id}',
                    	'transactions',
                    	'transactions/{id}',
                    	'withdraw_limits/{id}',
                    	'withdraw_limits',
                    ],
                    'post': [
                        'atms/withdraw',
                        'funds/{fund_id}/orders',
                    ],
                    'delete': [
                        'funds/{fund_id}/orders/{id}',
                        'funds/{fund_id}/orders/remove_all',
                    ],
            	}
                
            },


        })
        }
        

async withdraw (currency, amount, address, tag = undefined, params = {}) {
        await super.loadMarkets ();
        let currencyId = currency;
        let request = {
            'currency': currencyId,
            'amount': amount,
            'destination_address': address,
        'withdraw_priority': 'high'
        };
        if (tag)
            request['destination_tag'] = tag;
        let result = await this.privatePostAtmsWithdraw (this.extend (request, params));
        return {
            'info': result,
            'id': result['transaction_id'],
        };
}
async fetchDepositAddress (currencyId, params = {}) {
        let request = {
                'unused': 'true',
                'direction': 'deposit',
                
            };
        let response = await this.privateGetCurrenciesIdAddresses(this.extend ({
        'id': currencyId,
        }, params));
        let currency = currencyId;
        let address = response['addresses'][0]['address']; //this.safeString (response, 'addresses.address');
        let status = address ? 'ok' : 'none';
        return {
            'currency': currency,
            'address': address,
            'status': status,
            'info': response,

        };
}
}