 'use strict';
 var database=require('./db-aca.js');
 var express = require('express');
 var cors = require('cors')
 var mail = require('./sendmail.js')
 var app = express();
 app.use(cors())

 var bodyParser = require('body-parser');
 app.use(bodyParser.json()); // support json encoded bodies
 app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies






const PORT = 3005

//terminate process by transaction id and error_description
app.put('/process/terminate/:transaction_id/:error_description', async (req, res, next) => {
  try {
   
    var error_description = req.body.error_description   
    var trans_id = req.body.transaction_id
    
    
    console.log("complete process", database.database.sql_terminate_process, trans_id,error_description)
    
     database.db.run(database.database.sql_terminate_process, [error_description, trans_id], function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(err.message)
    res.status(500);
  }
});

//complete process by transaction id 
app.put('/process/complete/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    
    
    console.log("complete process", database.database.sql_complete_process, trans_id)
    
     database.db.run(database.database.sql_complete_process, trans_id, function(err, rows, fields){
        if (err) {
          res.status(500);
          return console.log(err.message);
        }
        //console.log(rows);
        res.json({ "transaction_id" : trans_id });
        console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(err)
    res.status(500);
  }
});



//update Process - side: sell from  
app.put('/process/sellfrom/:amount/:transaction_id', async (req, res, next) => {
  try {
   
    var amount     = req.body.amount
    var trans_id   = req.body.transaction_id
    var ex_id      = req.body.ex_id
    var ex_info    = req.body.ex_info
    var ex_error   = req.body.ex_error
    var status     = req.body.status
    var ex_error   = req.body.ex_error

    var coin     = req.body.coin
    
    var price     = req.body.price
    var address   = ''
    var market    = req.body.market
    
    console.log("sell from", database.sql_sell_from_process, trans_id, amount, status)
    
     database.db.run(database.sql_sell_from_process, [amount,status,trans_id ], function(err, rows, fields){
      if (err) {
        res.status(500);
        return console.log(err.message);
      }
      console.log(`PROCERSSES Row(s) updated: ${this.changes}`); //
      if (this.changes) {
        //transaction_id,ex_id, side, status, ex_info, ex_error
        database.db.run(database.sql_insert_exchange_output, [trans_id, ex_id,"SELL_FROM", status, ex_info, ex_error, coin,amount,price, address, market], function(err, rows, fields){
          if (err) {
            res.status(500);
            return console.log(err.message);
          }
          console.log(`HISTORY Row(s) added:  ${this.lastID}`); //
        })
      }
    }); 
    res.json({ "transaction_id" : trans_id });
    res.status(200);
  } catch (err) {
    console.error(err.message)
    res.status(500);
  }
});


//update Process - side: withdrwal to  
app.put('/process/withdrwalto/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    var ex_id     = req.body.ex_id
    var ex_info   = req.body.ex_info
    var ex_error  = req.body.ex_error
    var status     = req.body.status
    var amount     = req.body.amount

    var coin     = req.body.coin
    var price     = ''
    var address   = req.body.address
    var market    = req.body.market
    
    console.log("withdrwal to", database.sql_withdrwal_to_process, trans_id)
    
     database.db.run(database.sql_withdrwal_to_process, [status, amount, trans_id], function(err, rows, fields){
      if (err) {
        res.status(500);
        return console.log(err.message);
      }
      console.log(`PROCERSSES Row(s) updated: ${this.changes}`); //
      if (this.changes) {
        //transaction_id,ex_id, side, status, ex_info, ex_error
        database.db.run(database.sql_insert_exchange_output, [trans_id, ex_id,"WITHDRAWAL_TO", status, ex_info, ex_error,coin,amount,price,address,market], function(err, rows, fields){
          if (err) {
            res.status(500);
            return console.log(err.message);
          }
          console.log(`HISTORY Row(s) added:  ${this.lastID}`); //
        })
      }
    }); 
    res.json({ "transaction_id" : trans_id });
    res.status(200);
  } catch (err) {
    console.error(err.message)
    res.status(500);
  }
});


//update Process - side: buy to  
app.put('/process/buyto/:amount/:transaction_id', async (req, res, next) => {
  try {
   
    var amount = req.body.amount
    var trans_id = req.body.transaction_id
    var ex_id     = req.body.ex_id
    var ex_info   = req.body.ex_info
    var ex_error  = req.body.ex_error
    var status     = req.body.status

    var coin     = req.body.coin
    
    var price     = req.body.price
    var address   = ''
    var market    = req.body.market

    
    
    console.log("buy to", database.sql_buy_to_process, trans_id,status,  amount)
    
     database.db.run(database.sql_buy_to_process, [amount,status, trans_id], function(err, rows, fields){
        if (err) {
          res.status(500);
          return console.log(err.message);
        }
        console.log(`PROCERSSES Row(s) updated: ${this.changes}`); //
        if (this.changes) {
          //transaction_id,ex_id, side, status, ex_info, ex_error
          database.db.run(database.sql_insert_exchange_output, [trans_id, ex_id,"BUY_TO", status, ex_info, ex_error, coin, amount,price, address, market], function(err, rows, fields){
            if (err) {
              res.status(500);
              return console.log(err.message);
            }
            console.log(`HISTORY Row(s) added:  ${this.lastID}`); //
          })
        }
    }); 
    res.json({ "transaction_id" : trans_id });
    res.status(200);
  } catch (err) {
    console.error(err.message)
    res.status(500);
  }
});


//update Process - side: sell to  
app.put('/process/sellto/:amount/:transaction_id', async (req, res, next) => {
  try {
   
    var amount = req.body.amount
    var trans_id = req.body.transaction_id
    var ex_id     = req.body.ex_id
    var ex_info   = req.body.ex_info
    var ex_error  = req.body.ex_error
    var status     = req.body.status
    var coin     = req.body.coin
    var price     = req.body.price
    var address   = ''
    var market    = req.body.market
    
    
    console.log("sell to", database.sql_sell_to_process, status, trans_id, amount)
    
     database.db.run(database.sql_sell_to_process, [amount, amount,status, trans_id], function(err, rows, fields){
      if (err) {
        res.status(500);
        return console.log(err.message);
      }
      console.log(`PROCERSSES Row(s) updated: ${this.changes}`); //
      if (this.changes) {
        //transaction_id,ex_id, side, status, ex_info, ex_error
        database.db.run(database.sql_insert_exchange_output, [trans_id, ex_id,"SELL_TO", status, ex_info, ex_error,coin,amount,price,address,market], function(err, rows, fields){
          if (err) {
            res.status(500);
            return console.log(err.message);
          }
          console.log(`HISTORY Row(s) added:  ${this.lastID}`); //
        })
      }
    }); 
    res.json({ "transaction_id" : trans_id });
    res.status(200);
  } catch (err) {
    console.error(err.message)
    res.status(500);
  }
});

//update Process - side: withdrawl from  
app.put('/process/withdrwalfrom/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    var ex_id     = req.body.ex_id
    var ex_info   = req.body.ex_info
    var ex_error  = req.body.ex_error
    var status     = req.body.status
    var amount     = req.body.amount
    var coin     = req.body.coin
    var amount = req.body.amount
    var price     = ''
    var address   = req.body.address
    var market    = req.body.market
    
    
    console.log("withdrwal from", database.sql_withdrwal_from_process, trans_id)
    
    database.db.run(database.sql_withdrwal_from_process, [status,amount,trans_id], function(err, rows, fields){
      if (err) {
        res.status(500);
        return console.log(err.message);
      }
      console.log(`PROCERSSES Row(s) updated: ${this.changes}`); //
      if (this.changes) {
        //transaction_id,ex_id, side, status, ex_info, ex_error
        database.db.run(database.sql_insert_exchange_output, [trans_id, ex_id,"WITHDRAWAL_FROM", status, ex_info, ex_error,coin,amount,price,address,market], function(err, rows, fields){
          if (err) {
            res.status(500);
            return console.log(err.message);
          }
          console.log(`HISTORY Row(s) added:  ${this.lastID}`); //
        })
      }
    }); 
    res.json({ "transaction_id" : trans_id });
    res.status(200);
  } catch (err) {
    console.error(err.message)
    res.status(500);
  }
});

//update Process - side: buy from  
app.put('/process/buyfrom/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id  = req.body.transaction_id
    var ex_id     = req.body.ex_id
    var ex_info   = req.body.ex_info
    var ex_error  = req.body.ex_error
    var status     = req.body.status
    var amount = req.body.amount
    var coin     = req.body.coin
    
    var price     = req.body.price
    var address   = ''
    var market    = req.body.market
    
    
    console.log("buy from ex_id", ex_id )
    console.log("buy from", database.sql_buy_from_process, trans_id,status )
    
    database.db.run(database.sql_buy_from_process, [amount, status, trans_id], function(err, rows, fields){
      if (err) {
        res.status(500);
        return console.log(err.message);
      }
      console.log(`PROCERSSES Row(s) updated: ${this.changes}`); //
      if (this.changes) {
        //transaction_id,ex_id, side, status, ex_info, ex_error
        database.db.run(database.sql_insert_exchange_output, [trans_id, ex_id,"BUY_FROM", status, ex_info, ex_error, coin, amount,price, address, market], function(err, rows, fields){
          if (err) {
            res.status(500);
            return console.log(err.message);
          }
          console.log(`HISTORY Row(s) added:  ${this.lastID}`); //
        })
      }
    }); 
    res.json({ "transaction_id" : trans_id });
    res.status(200);
  } catch (err) {
    console.log(err.message)
    res.status(500);
  }
});


//process by transation id
app.get('/data/process/:transaction_id', async (req, res, next) => {
  try {
    var trans_id = req.params.transaction_id
    console.log("database.sql_select_by_transactionId transaction_id", database.sql_select_by_transactionId, trans_id)
    
     database.db.all(database.sql_select_by_transactionId, trans_id, function(err, rows, fields){
        console.log(rows);

        res.json({ "data" : rows });
        rows.forEach((row) => {
            console.log(row.id + ': ' + row.transaction_id)
        });
        res.status(200);
                
     });
  } catch (err) {
    res.status(500);
    console.error(err.message);
    
  }
});


//check if a process is already started by exchange id and coinpair
app.get('/data/process/check/:exchange_id/:coinPairFrom', async (req, res, next) => {
  try {
    var exchangeid = req.params.exchange_id
    var coinpair = req.params.coinPairFrom
    console.log("database.sql_select_by_exchangeid_coinpair", exchangeid, coinpair)
    
     database.db.all(database.sql_select_by_exchangeid_coinpair, [exchangeid, coinpair], function(err, rows, fields){
        console.log("check process",rows);

        res.json({ "data" : rows });
        rows.forEach((row) => {
            console.log(row.id + ': ' + row.info)
        });
        res.status(200);
                
     });
  } catch (err) {
    res.status(500);
    console.error(err.message)
    return
    //next(err);
  }
});

app.get('/data/processes/:limit', async (req, res, next) => {
  try {
    var limit = req.params.limit
    
    console.log("database.sql_select_all_100 ", limit)
    
     database.db.all(database.sql_select_all_limit, limit, function(err, rows, fields){
        console.log("limit",rows);
        res.json({ "data" : rows });
     });
     res.status(200);
  } catch (err) {
    res.status(500);
    console.error(err.message);
  }
});

app.get('/data/process', async (req, res, next) => {
  try {
    console.log("process/tobestarted --> sql_select_process_tobedone")
     database.db.all(database.sql_select_process_tobedone, function(err, rows, fields){
      console.log("rows");
      console.log(rows.length);
        
        res.json({ "data" : rows });
     });
     res.status(200);
  } catch (err) {
    res.status(500);
    console.error(err.message);
  }
});

//sendMail  
app.post('/mail/report', async (req, res, next) => {
  try {
    
    var trans_id = req.body.transaction_id
    var params1 = req.body.params
    var side = req.body.side
    console.log("trans_id",trans_id, "params", params1, "side", side);
    database.db.all(database.sql_select_by_transactionId, trans_id, function(err, rows, fields){
      //console.log("err",err, trans_id);
     let paramsPair, params
      rows.forEach((row) => {
        var result = " successfully"
        if (row.status === 3) {
          result = " with some failure."

        } else if (row.status === 1)  {
          result = " ...no, still in progress"

        }
        // console.log("result",result, trans_id);
        paramsPair = {
          
                result : result,
                coin : row.coinPairFrom,
                market1 : row.exchangeFrom,
                market1price : row.market1price,
                market2 : row.exchangeTo,
                market2price : row.market2price,
                spread : row.spreadFrom+"%",
                initialcash : row.initialCash,
                finalcash : row.finalCash,
                pair: {
                  coin : row.coinPairTo,
                  market1 : row.pairmarket1 ,
                  market2 :row.pairmarket2,
                  market2price : row.pairmarket2price,
                  spread : row.spreadTo+"%"
                }
            
        }
        // console.log("paramsPair",paramsPair, trans_id);
        params = {
          
                result : result,
                coin : row.coinPairFrom,
                market1 : row.exchangeFrom,
                market1price : row.market1price,
                market2 : row.exchangeTo,
                market2price : row.market2price,
                spread : row.spreadFrom+"%",
                initialcash : row.initialCash,
                finalcash : row.finalCash
        }
        //console.log("params",params, trans_id, side);
        console.log("params",params, trans_id, side);
        var p = params;
        if (row.journey==="roundtrip") {
          p =paramsPair;
        }
        console.log("p",p, trans_id, side);
        mail.sendMail(trans_id,side,p)

      });
    })

    res.json({ "data" : "mail sent" });
    res.status(200);
  } catch (err) {
      console.error(err.message);
      res.status(500);
  }
});

//start process  
app.post('/process/start', async (req, res, next) => {
  try {
    

    var trans_id = req.body.transaction_id
    var exchange_from = req.body.exchangeFrom
    var exchange_to = req.body.exchangeTo
    var coin_pair_from = req.body.coinPairFrom
    var coin_pair_to = req.body.coinPairTo
    var cash_out_from = req.body.cashOutFrom
    var spread_from = req.body.spreadFrom
    var spread_to = req.body.spreadTo
    var market1price = req.body.market1price
    var market2price = req.body.market2price
    var pairmarket1 = req.body.pairmarket1
    var pairmarket2 = req.body.pairmarket2
    var pairmarket1price = req.body.pairmarket1price
    var pairmarket2price = req.body.pairmarket2price
    var engine = req.body.engine
    var journey = req.body.journey

    console.log("start Process", trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from, spread_from, spread_to,market1price, market2price, pairmarket1, pairmarket2, pairmarket1price, pairmarket2price, engine, journey )
    
     database.db.all(database.sql_start_process, [trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from,market1price, market2price, pairmarket1, pairmarket2, pairmarket1price, pairmarket2price, spread_from, spread_to, cash_out_from, engine, journey], function(err, rows, fields){
        console.log("start process", rows);
        res.header ('Access-Control-Allow-Origin', '*')
        res.header ('Access-Control-Allow-Credentials', true)
        res.header ('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
        res.header ('Access-Control-Allow-Headers', 'Content-Type')
        res.json({ "transaction_id" : trans_id });
     }); 
     res.status(200);
  } catch (err) {
    console.error(err.message);
    res.status(500);
        
  }
});

// let params = {
  
//         result : "result",
//         coin : "coin",
//         market1 : "market1",
//         market1price : "market1price",
//         market2 : "market2",
//         market2price : "market2price",
//         address : "address",
//         spread : "spread",
//         initialcash : "initailcasj",
//         finalcash : "finalcash"
    
// }
// let paramsPair = {
  
//         result : "result",
//         coin : "coin",
//         market1 : "market1",
//         market1price : "market1price",
//         market2 : "market2",
//         market2price : "market2price",
//         address : "address",
//         spread : "spread",
//         initialcash : "initailcasj",
//         finalcash : "finalcash",
//         spread : "spread",
//         pair: {
//           coin : "paircoin",
//           market1 : "pairmarket1" ,
//           market2 : "pairmarket2",
//           market2price : "pairmarket2price",
//           address : "pairaddress",
//           pair : "spreadpair"
//         }
    
// }
// mail.sendMail("tx_12121", "roundtrip", paramsPair)
app.listen(PORT);

console.log("Submit GET or POST to http://localhost:"+PORT+"/data");
