'use strict';

async function history(coin1, coin2, ex_id) {
   //alert('History graphs coming soon ['+ex_id+'] ['+coin1+'] ['+ccxt.version+']', coin1, coin2);
    var cBase = coin1.slice(0, coin1.indexOf('-'));
    var cQute = coin1.slice(coin1.indexOf('-')+1);
    const index = 4 // [ timestamp, open, high, low, close, volume ]
    
    var exchange = exchanges[ex_id.toString()];
    //var exchange = ex_id;
    //exchange.proxy = exchange.has['CORS']?'http://localhost:8080/':undefined
    try {
        //while (true) {
        const ohlcv = await exchange.fetchOHLCV (cBase/cQute, '30m')
        const lastPrice = ohlcv[ohlcv.length - 1][index] // closing price
        const series = ohlcv.map (x => x[index])         // closing price
        const bitcoinRate = 'x = $' + lastPrice
        const chart_ = asciichart.plot (series, { height: 15})
        console.chart("\n" + chart_, bitcoinRate, "\n");
      //  }
    } catch(error){
        console.log(error)
        console.chart("ECHANGE "+ ex_id + " doesn't support OHLCV for: "+ coin1);
    }
    // document.getElementById('svgchart').innerHTML = "";

    // d3.json("https://min-api.cryptocompare.com/data/histominute?fsym="+cBase+"tsym="+cQute+"&limit=30&aggregate=1&e=yobit", function(error, data) {
    // d3.select('.header-image').classed("svg-container", true) //container class to make it responsive
    //  .attr("preserveAspectRatio", "xMinYMin meet")
    // .attr("viewBox", "0 0 480 250")
    //   //class to make it responsive
    //  .classed("svg-content-responsive", true).call(chart(d3, data));
    //  })

    // if (coin2 !=null) {
    //     var cBase2 = coin1.slice(0, coin2.indexOf('-'));
    //     var cQute2 = coin1.slice(coin2.indexOf('-')+1);
    //     d3.json("https://min-api.cryptocompare.com/data/histominute?fsym="+cBase2+"tsym="+cQute2+"&limit=30&aggregate=1&e=yobit", function(error, data) {
    //     d3.select('.header-image').classed("svg-container", true) //container class to make it responsive
    //     .attr("preserveAspectRatio", "xMinYMin meet")
    //     .attr("viewBox", "0 0 480 250")
    //     //class to make it responsive
    //     .classed("svg-content-responsive", true).call(chart(d3, data));
    //     })
    // }
}


alert("Needs to be run locally.");

let checkedMarkets = {
        showAll: true,
         binance: true,
         bitfinex: true,
         poloniex: true,
         hitbtc2: true,
         gdax: true,
         exmo: true,
         therock: true,
         yobit: true

    },
    checkedCoins = {
        showAll: true,
        // TIC: false,
        // PLC: false
    };

let addOne = true;

function addRemoveAll(coinsOrMarkets) {

    if (coinsOrMarkets === 'markets') {

        for (let market in checkedMarkets) {
            checkedMarkets[market] = !checkedMarkets.showAll;
            console.log(checkedMarkets[market]);
            addOne = false;
            addRemoveMarket(market);
            addOne = true;

        }
        useData();
    }

    if (coinsOrMarkets === 'coins') {

        for (let coin in checkedCoins) {
            checkedCoins[coin] = !checkedCoins.showAll;
            console.log(checkedCoins[coin]);
            addOne = false;
            addRemoveCoin(coin)
            addOne = true;

        }
        useData();
    }

}


function addRemoveCoin(coin) {
    if (addOne) checkedCoins[coin] = !checkedCoins[coin];

    if (checkedCoins[coin]) {
        $('#check-' + coin).addClass('fa-check-square-o');
        $('#check-' + coin).removeClass('fa-square-o');
    }
    else {
        $('#check-' + coin).removeClass('fa-check-square-o');
        $('#check-' + coin).addClass('fa-square-o');
    }

    if (addOne) useData();
}

function addRemoveMarket(market) {
    console.log("Trying to add/remove market")
    if (addOne){ console.log("If add one"); checkedMarkets[market] = !checkedMarkets[market] };

    if (checkedMarkets[market]) {
        console.log("If add one");
        $('#check-' + market).addClass('fa-check-square-o');
        $('#check-' + market).removeClass('fa-square-o');
    }
    else {
        $('#check-' + market).removeClass('fa-check-square-o');
        $('#check-' + market).addClass('fa-square-o')
    }

    if (addOne) useData();
}

function remove(item, highOrLow) {
    let li = $(item).closest('li');
    let coin = li.attr("data-coin");
    let market = li.attr("data-market1");
    if (!Array.isArray(checkedCoins[coin])) checkedCoins[coin]= [];
    checkedCoins[coin].push(market);
    console.log("Removing item...", checkedCoins[coin]);
    useData();
}

function searchMarketsOrCoins(marketOrCoin, input) {
    input = input.toUpperCase();
    let listItems = $('#' + marketOrCoin + '-list > li');

    if (input === "") {
        listItems.show();
    } else {
        listItems.each(function () {
            let text = $(this).text().toUpperCase();
            (text.indexOf(input) >= 0) ? $(this).show() : $(this).hide();
        });
    }


}

let useData;
let transactionData;


$(window).load(function () {
    new WOW().init();

    $('.loader').hide();
    $('#header').show();


    let socket = io();

    let numberOfLoads = 0; //Number of final results loads
    let numberOfMLoads = 0; //Number of Market loadss
    socket.on('wallets', function (data) { //Function for when we get market data
        wallets = data[1];
     });
    socket.on('coinsAndMarkets', function (data) { //Function for when we get market data
        if (numberOfMLoads === 0) {  //Only  need to run this function once (Currently)
            let list = $('#market-list').empty(), coinList = $('#coin-list').empty();

            let marketSource = $("#market-list-template").html(); //Source
            let marketTemplate = Handlebars.compile(marketSource); // ^ and template for coin and market lists

            let coinSource = $("#coin-list-template").html(); //Source
            let coinTemplate = Handlebars.compile(coinSource); // ^ and template for coin and market lists

            let coinDataLen = data[1].length;
            for (let i = 0; i < coinDataLen; i++) { //Loop through coins
                let context = {coin: data[1][i]};
                let coin = context.coin;
                if (data[0][i]) {
                    context.market = data[0][i][0];
                    let market = context.market;
                    list.append(marketTemplate(context));
                    if (checkedMarkets[market] === false || checkedMarkets[market] === undefined) {
                        checkedMarkets[market] = false;
                        $('#check-' + market).removeClass('fa-check-square-o');
                        $('#check-' + market).addClass('fa-square-o')
                    }
                }

                coinList.append(coinTemplate(context));
                if (checkedCoins[coin] === undefined) checkedCoins[coin] = true;
                else {
                    $('#check-' + coin).removeClass('fa-check-square-o');
                    $('#check-' + coin).addClass('fa-square-o');
                }
            }
            numberOfMLoads++;
        }
    });

    let highest = $('#highest'); //Highest UL
    let highSource = $("#high-template").html(); //Template source
    let highTemplate = Handlebars.compile(highSource); //Template

    let bestSource = $("#best-template").html();
    let bestTemplate = Handlebars.compile(bestSource);

    var data, transactionData;

    $('#coin-search').keyup(function () {
        let value = $(this).val();
        console.log(value);
        searchMarketsOrCoins("coin", value)
    });
    $('#market-search').keyup(function () {
        let value = $(this).val();
        searchMarketsOrCoins("market", value)
    });

    $('.loadNumberInput').change(function () {
        useData();
    });
    function allowedData(lowMarket, highMarket, coinName) {
        if(checkedMarkets[lowMarket] && checkedMarkets[highMarket] && checkedCoins[coinName]){
            if(Array.isArray(checkedCoins[coinName])) {
                if(!checkedCoins[coinName].includes(lowMarket) && !checkedCoins[coinName].includes(highMarket)) {
                    return true;
                }
                else return false;

            }
            else{
                return true;
            }
        }
        else {
            return false;
        }
    }

    useData = function () {
        let topN = $('.loadNumberInput').val();
        if (!topN) topN = 5;
        let highestN = 1;
        let initN = 1;
        let dataLen = data.length;
        highest.empty();  //Remove any previous data (LI) from UL
        for (let i = dataLen - initN; i >= dataLen - topN; i--) { //Loop through top 10
            let market1 = data[i].market1.name, market2 = data[i].market2.name, pairIndex, coinName = data[i].coin;
            let amount = data[i].amount;
            let pair_amount;
            const aQuote = data[i].coin.slice(data[i].coin.indexOf('-')+1)
            const journey = data[i].journey
            let coin_wallet
            try {
                coin_wallet = wallets[market1][aQuote] 
            } 
            catch (error) {
                continue;
            }
            // console.log("check coinName", checkedCoins[coinName]);
            if (allowedData(market2, market1, coinName)) {
                for (let j = data.length - 1; j >= 0; j--) {
                    
                    pair_amount = data[j].amount;
                    //equal ...to opposite market
                    let checkJourney = (data[j].market1.name === market2  && data[j].market2.name === market1) 
                    //see: settings.js file 
                    if (journey==='oneway') //2nd kind of arbitrage
                        checkJourney = true;
                    
                    if (checkJourney
                        && data[i].coin !== data[j].coin //and isnt the same n as pair
                        && data[i].coin.slice(data[i].coin.indexOf('-')+1) === data[j].coin.slice(data[j].coin.indexOf('-')+1)
                        //&& data[i].coin.slice(data[i].coin.indexOf('-')+1) === data[j].coin.slice(0,data[j].coin.indexOf('-'))
                        //&& data[j].coin.slice(data[j].coin.indexOf('-')+1) === data[i].coin.slice(0,data[i].coin.indexOf('-'))
                        && checkedCoins[data[j].coin] //and isnt remove
                        && checkedCoins[data[j].coin][0] !== market1
                        && wallets[market1][aQuote] >0 //wallet avaliable
                        && checkedCoins[data[j].coin][0] !== market2) // and isnt disabled
                    {
                        pairIndex = j;
                        break;
                    }
                }
                if (pairIndex > -1) { //TODO  FIX pairs, not showing uo correctly
                    let context = { //All required data
                        coin: data[i].coin,
                        amount: data[i].amount,
                        coinBase: (data[i].coin).slice(0, data[i].coin.indexOf("-")),
                        diff: ((data[i].spread - 1) * 100).toFixed(3),
                        //market2price: (data[i].market2.last * 1000).toPrecision(3),
                        market2price: data[i].market2.last,
                        market2: market2,
                        //market1price: (data[i].market1.last * 1000).toPrecision(3),
                        market1price: data[i].market1.last,
                        market1: market1,
                        pair: {
                            amount:pair_amount,
                            coin: data[pairIndex].coin,
                            diff: ((data[pairIndex].spread - 1) * 100).toFixed(3),
                            //market2price: (data[pairIndex].market2.last * 1000).toPrecision(3),
                            market2price: data[pairIndex].market2.last ,
                            market2: data[pairIndex].market2.name,
                            //market1price: (data[pairIndex].market1.last * 1000).toPrecision(3),
                            market1price: data[pairIndex].market1.last ,
                            market1: data[pairIndex].market1.name,
                        },
                        totalDiff: (((data[i].spread - 1) * 100) + ((data[pairIndex].spread - 1) * 100)).toFixed(2)
                    };

                    if (i === data.length - highestN) { //Add only the highest
                        $('.best-pair').empty();
                        let bestHTML = bestTemplate(context);
                        $('.best-pair').append(bestHTML);
                    }


                    let html = highTemplate(context);
                    highest.append(html);
                    console.log("Appending...")
                }
                else if (data.length - topN > 0) {
                    topN++;
                    highestN++;
                }
            }

            else if (data.length - topN > 0) {
                topN++;
                highestN++;
            }
        }
    };

    let waitForMoreData;

    socket.on('results', function (results) {
        clearTimeout(waitForMoreData); //Every time we recieive new data clear the previous timeout so we don't loop through the data too many times unnecessarily...
        numberOfLoads++;
        if (numberOfLoads === 1) { //...unless we haven't loaded the data yet, then just run useData() immediately.
            $('.socket-loader').hide(); // Hide the preloader.gif
            $('#highest, #lowest').show(); //Show The UL
            data = results;
            useData();
        }

        else {
            waitForMoreData = setTimeout(function () {
                data = results;
                useData();
            }, 1000); //Wait a second before we run the function in case we get newer data within less than a second
        }
    });
    
});




