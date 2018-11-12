const sqlite3 = require('sqlite3').verbose();

 var express = require('express');
 var app = express();

 var bodyParser = require('body-parser');
 app.use(bodyParser.json()); // support json encoded bodies
 app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//require("db-aca.js");

let db = new sqlite3.Database('./db/aca.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQlite database. See ./db/aca.db');
});

//side --> 0=BUY_FROM, 1=WITHDRAWL_FROM, 2=SELL_TO, 3=BUY_TO, 4=WITHDRAWL_TO, 5=SELL_FROM
//status --> 0=STAR, 1=PROCESSING, 2=COMPLETE, 3=ERROR 
//START_DATE text,    //YYYY-MM-DD HH:MM:SS.SSS ISO8601
//END_DATE text       //YYYY-MM-DD HH:MM:SS.SSS ISO8601


let side =[ "BUY_FROM", "WITHDRAWL_FROM","SELL_TO" , "BUY_TO", "WITHDRAWL_TO","SELL_FROM" ]
db.serialize(() => {
  
  //db.run('DROP TABLE IF EXISTS PROCESSES;')
  //db.run('DROP TABLE IF EXISTS HISTORY;')
  db.run(`CREATE TABLE IF NOT EXISTS PROCESSES  (
    id integer PRIMARY KEY AUTOINCREMENT,
    transaction_id integer ,
    exchangeFrom text NOT NULL,
    exchangeTo text NOT NULL,
    coinPairFrom text NOT NULL,
    coinPairTo text NOT NULL,
    side text, 
    status integer NOT NULL,
    cashInFrom  REAL,
    cashOutFrom REAL,
    cashInTo  REAL,
    cashOutTo REAL,
    spreadFrom REAL,
    spreadTo REAL,
    error_description text, 
    start_date text,    
    end_date text       
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS HISTORY  (
    transaction_id integer ,
    id text,
    info text,
    error text, 
    transaction_date text
    )`);
  db.run(`INSERT INTO PROCESSES  (
    transaction_id ,
    exchangeFrom ,
    exchangeTo ,
    coinPairFrom ,
    coinPairTo ,
    status,
    start_date , 
    end_date ) 
    VALUES (
        "test_0000",
        "therock",
        "yobit",
        "BTC-ETH",
        "LTC-ETH",
        "0",
        datetime('now', 'localtime'),
        datetime('now')

    )`);

});
db.run(`INSERT INTO PROCESSES  (
    transaction_id ,
    exchangeFrom ,
    exchangeTo ,
    coinPairFrom ,
    coinPairTo ,
    status,
    start_date , 
    end_date ) 
    VALUES (
        "test_0001",
        "yobit",
        "theroct",
        "BTC-ETH",
        "LTC-ETH",
        "1",
        datetime('now', 'localtime'),
        datetime('now')

    )`);




function dynamicQuery(sql ,params) {

    db.all(sql, params, (err, rows) => {
     if (err) {
       throw err;
     }
     rows.forEach((row) => {
       console.log("dynamic_query", row.name);
     });
   });
}


function closeDatabase() {

    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Close the database connection.');
    }); 
   
}



const PORT = 3005
var sql_select_by_transactionId = "SELECT * FROM PROCESSES WHERE transaction_id = ?";
var sql_select_all_limit = "SELECT * FROM PROCESSES LIMIT ?";
var sql_start_process1 = "INSERT INTO PROCESSES (transaction_id,exchangeFrom, exchangeTo,coinPairFrom,coinPairTo,cashOutFrom,side,status,start_date, spreadFrom, spreadTo)"
var sql_start_process2 = " VALUES (?, ?,?,?,?,?,0,0,datetime('now'),?,?)"
var sql_start_process = sql_start_process1+sql_start_process2;
var sql_select_by_exchangeid_coinpair = "SELECT * FROM PROCESSES WHERE exchangeFrom = ? AND coinPairFrom =? AND status = 0";
//BUY_FROM
var sql_buy_from_process = "UPDATE PROCESSES SET side='BUY_FROM', status=1, end_date=datetime('now') WHERE transaction_id=? AND status =0"
//WITHDRAWL_FROM
var sql_withdrwal_from_process = "UPDATE PROCESSES SET side='WITHDRWAL_FROM', end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='BUY_FROM'"
//SELL_TO
var sql_sell_to_process = "UPDATE PROCESSES SET side='SELL_TO', cashInTo =?, end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='WITHDRWAL_FROM'"
//BUY_TO
var sql_buy_to_process = "UPDATE PROCESSES SET side='BUY_TO', cashOutTo =?, end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='SELL_TO'"
//WITHDRAWL_TO
var sql_withdrwal_to_process = "UPDATE PROCESSES SET side='WITHDRWAL_TO', end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='BUY_TO'"
//SELL_TO
var sql_sell_from_process = "UPDATE PROCESSES SET side='SELL_FROM',cashInFrom =?,status=2, end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='WITHDRWAL_TO'"
//COMPLETE
var sql_complete_process = "UPDATE PROCESSES SET status=2, end_date=datetime('now') WHERE transaction_id=? AND (status =1 OR status=0) "
//TERMINATE
var sql_terminate_process = "UPDATE PROCESSES SET status=3,error_description=?, end_date=datetime('now') WHERE transaction_id=? AND  (status =1 OR status=0)"

//termanate process with error decription by transaction id 
function terminateProcess(transactionID, error_description) {
    return  new Promise (async (resolve, reject) => {
    try {
        
        
            db.each( sql_terminate_process, [error_description, transactionID], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID);
          });
        


        

     } catch (err) {
        console.error(err.message);
        reject(err.message)
     }
     });


}
//terminate process by transaction id and error_description
app.put('/process/terminate/:transaction_id/:error_description', async (req, res, next) => {
  try {
   
    var error_description = req.body.error_description   
    var trans_id = req.body.transaction_id
    
    
    console.log("complete process", sql_terminate_process, trans_id,error_description)
    
     db.run(sql_terminate_process, [error_description, trans_id], function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error.message)
    res.status(500);
  }
});
//complete process by transaction id 
async function completeProcess(transactionID) {
    return  new Promise (async (resolve, reject) => {
    try {
        
        
            db.each( sql_complete_process, [transactionID], function(err, rows, fields){
          
            if (err) {
               console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID);
          });
       


        

     } catch (err) {
        console.error(err.message);
        reject(err.message)
     }
    });

}
//complete process by transaction id 
app.put('/process/complete/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    
    
    console.log("complete process", sql_complete_process, trans_id)
    
     db.run(sql_complete_process, trans_id, function(err, rows, fields){
        //console.log(rows);
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error)
    res.status(500);
  }
});


//update Process - side:sell from  
async function updateProcessBySellFrom(transactionID,cashInFrom) {
    return  new Promise (async (resolve, reject) => {
    try {

        
            db.run( sql_sell_from_process, [cashInFrom, transactionID], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID);
          });
       


        

     } catch (err) {
    console.error(err.message);
              reject(err.message)
     }
      });

}
//update Process - side: withdrwal to  
app.put('/process/sellfrom/:cash_in_from/:transaction_id', async (req, res, next) => {
  try {
   
    var cashInFrom = req.body.cash_in_from
    var trans_id = req.body.transaction_id
    
    
    
    console.log("sell to", sql_sell_from_process, trans_id, cashInFrom)
    
     db.run(sql_sell_from_process, [cashInFrom,trans_id], function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error.message)
    res.status(500);
  }
});

//update Process - side:withdrwal to  
async function updateProcessByWithdrwalTo(transactionID) {
    return  new Promise (async (resolve, reject) => {
    try {
        
      
            db.run( sql_withdrwal_to_process, [transactionID], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID);
          });
       


        

     } catch (err) {
   console.error(err.message);
              reject(err.message)
     }
     });

}
//update Process - side: withdrwal to  
app.put('/process/withdrwalto/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    
    
    console.log("sell to", sql_withdrwal_to_process, trans_id)
    
     db.run(sql_withdrwal_to_process, trans_id, function(err, rows, fields){
      
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error.message)
    res.status(500);
  }
});

//update Process - side:buy to  
async function updateProcessByBuyTo(transactionID,cashOutTo) {
    return  new Promise (async (resolve, reject) => {
    try {

       // db.serialize(() => {
            db.run( sql_buy_to_process, [cashOutTo,transactionID], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID) ;
          });
        


        

     } catch (err) {
    console.error(err.message);
    reject(err.message)
     }
     });

}
//update Process - side: buy to  
app.put('/process/buyto/:cash_in_to/:transaction_id', async (req, res, next) => {
  try {
   
    var cashOutTo = req.body.cash_out_to
    var trans_id = req.body.transaction_id
    
    
    console.log("sell to", sql_buy_to_process, trans_id, cashOutTo)
    
     db.run(sql_buy_to_process, [cashOutTo,trans_id], function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error.message)
    res.status(500);
  }
});

//update Process - side:sell to  
async function updateProcessBySellTo(transactionID, cashInTo) {
    return  new Promise (async (resolve, reject) => {
    try {

        //db.serialize(() => {
            db.run( sql_sell_to_process, [cashInTo,transactionID], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID) ;
          });
      //  });


        

     } catch (err) {
    console.error(err.message);
    reject(err.message)

     }
     });

}
//update Process - side: sell to  
app.put('/process/sellto/:cash_in_to/:transaction_id', async (req, res, next) => {
  try {
   
    var cashInTo = req.body.cash_in_to
    var trans_id = req.body.transaction_id
    
    
    console.log("sell to", sql_sell_to_process, trans_id)
    
     db.run(sql_sell_to_process, [cashInTo,trans_id], function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error.message)
    res.status(500);
  }
});

//update Process - side: withdrawl from  
function updateProcessByWithdrwalFrom(transactionID) {
    return  new Promise (async (resolve, reject) => {
    try {

        db.serialize(() => {
            db.run( sql_withdrwal_from_process, transactionID, function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(err.message)
            }
            console.log(`Row(s) updated: ${this.changes}`);
            resolve(transactionID);
            //return rows;
          });
        });


        

     } catch (err) {
        console.error(err.message);
        reject(err.message)
     }
 })

}
//update Process - side: withdrawl from  
app.put('/process/withdrwalfrom/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    
    
    console.log("withdrwal from", sql_withdrwal_from_process, trans_id)
    
     db.run(sql_withdrwal_from_process, trans_id, function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.error(error.message)
    res.status(500);
  }
});

//update Process - side: buy from  
function updateProcessByBuyFrom(transactionID) {
    return  new Promise (async (resolve, reject) => {  
    try {

        //db.serialize(() => {
            db.all(sql_buy_from_process, transactionID, function(err, rows, fields){

            
            if (err) {
              console.error(err.message);
              reject(err.message);
            }
            console.log("updateProcessByBuyFrom", transactionID,rows )
            resolve(transactionID);
          });
       // });


        

     } catch (err) {
        console.error(err.message);
        reject(err.message)
     }
 })

}

//update Process - side: buy from  
app.put('/process/buyfrom/:transaction_id', async (req, res, next) => {
  try {
   
    var trans_id = req.body.transaction_id
    
    
    console.log("buy from", sql_buy_from_process, trans_id)
    
     db.run(sql_buy_from_process, trans_id, function(err, rows, fields){
        res.json({ "transaction_id" : trans_id });
         console.log(`Row(s) updated: ${this.changes}`);
     }); 
     res.status(200);
  } catch (err) {
    console.log(error.message)
    res.status(500);
  }
});

//process by transaction ID 
async function processByTransactionID(transactionID) {
    try {

        db.serialize(() => {
            db.each(sql_select_by_transactionId, transactionID, function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              return
            }
            //console.log(row.id + "\t" + row.cashOut);
            console.log(rows);
            return rows;
          });
        });


        

     } catch (err) {
    console.log (err);
     }

}
//process by transation id
app.get('/data/process/:transaction_id', async (req, res, next) => {
  try {
    var trans_id = req.params.transaction_id
    console.log("sql_select_by_transactionId transaction_id", trans_id)
    
     db.all(sql_select_by_transactionId, trans_id, function(err, rows, fields){
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
async function checkProcessByExchangeAndCoin(exchangeid, coinpair) {
    return  new Promise (async (resolve, reject) => {  
    try {

        db.serialize(() => {
            db.all(sql_select_by_exchangeid_coinpair, [exchangeid, coinpair], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              reject(error.message); 
            }
            console.log("checkProcessByExchangeAndCoin", rows);
            resolve(rows);
          });
        });


        

     } catch (err) {
    console.error(err.message);
    reject(err.message)
     }
})
}
//check if a process is already started by exchange id and coinpair
app.get('/data/process/check/:exchange_id/:coinPairFrom', async (req, res, next) => {
  try {
    var exchangeid = req.params.exchange_id
    var coinpair = req.params.coinPairFrom
    console.log("sql_select_by_exchangeid_coinpair", exchangeid, coinpair)
    
     db.all(sql_select_by_exchangeid_coinpair, [exchangeid, coinpair], function(err, rows, fields){
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
    
    console.log("sql_select_all_100 ", limit)
    
     db.all(sql_select_all_limit, limit, function(err, rows, fields){
        console.log("limit",rows);
        res.json({ "data" : rows });
     });
     res.status(200);
  } catch (err) {
    res.status(500);
    console.error(err.message);
  }
});



function selectLimit(limit) {
    return  new Promise (async (resolve, reject) => {  
        
    try {

        //db.serialize(() => {
            db.all(sql_select_all_limit, limit, function(err, rows, fields){
            if (err) {
                console.error(err.message);
                reject(err.message);
            } 
            else {
                console.log("selectLimit4", rows[0].transaction_id);
                resolve(rows);
               // return rows;

            }
            
          });

       // });


        

     } catch (err) {
        console.log (err.message);
        reject(err.message)

     }
    })

}




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
    
    console.log("start Process", trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from, spread_from, spread_to)
    
     db.all(sql_start_process, [trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to,cash_out_from, spread_from, spread_to ], function(err, rows, fields){
        console.log("start process", rows);
        res.json({ "transaction_id" : trans_id });
     }); 
     res.status(200);
  } catch (err) {
    console.error(err.message);
    res.status(500);
        
  }
});

//start process 
function startProcess(trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from, spread_to, spread_from) {
    return  new Promise (async (resolve, reject) => {  
    try {
       // db.serialize(() => {
             db.run(sql_start_process, [trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from, spread_to, spread_from], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              resolve()
              //return
            } else {
                //console.log(row.id + "\t" + row.cashOut);
                console.log("startProcess", trans_id);
                resolve(trans_id)
               //return( trans_id);
            }
            
          });
       // });
     } catch (err) {
        console.log (err.message);
        reject(err.message)
        
     }
     
 })
}


async function test () {
var sp =  await startProcess("test_333","yobit", "therock","BTC-ETH", "BCH-ETH","0.333", "1.8", "13.55");
console.log("sp-->", sp)
var limitNumber = await selectLimit(100);
console.log("selectLimit --> ", limitNumber);
var bf = await updateProcessByBuyFrom("test_333")
console.log("bf", bf)
var wf = await updateProcessByWithdrwalFrom("test_333");
console.log("wf", wf)
var st = await updateProcessBySellTo("test_333","2.8");
console.log("st", st)
var bt = await updateProcessByBuyTo("test_333","2.8");
console.log("bt", bt)

var wt = await updateProcessByWithdrwalTo("test_333");
console.log("wt", wt)
var sf = await updateProcessBySellFrom("test_333", "3.8");
console.log("sf", sf)

}

test();
app.listen(PORT);

 console.log("Submit GET or POST to http://localhost:"+PORT+"/data");

// var express = require('express');
// var restapi = express();

// restapi.get('/data', function(req, res){
//     db.get("SELECT value FROM counts", function(err, row){
//         res.json({ "count" : row.value });
//     });
// });

// restapi.post('/data', function(req, res){
//     db.run("UPDATE counts SET value = value + 1 WHERE key = ?", "counter", function(err, row){
//         if (err){
//             console.err(err);
//             res.status(500);
//         }
//         else {
//             res.status(202);
//         }
//         res.end();
//     });
// });

// var path = require('path');
// var dbPath = path.resolve(__dirname, 'mydb.db')
// var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database('db/demodb02');

// db.serialize(function() {
//     db.run("CREATE TABLE IF NOT EXISTS counts (key TEXT, value INTEGER)");
//     db.run("INSERT INTO counts (key, value) VALUES (?, ?)", "counter", 0);
// });



// var express = require('express');
// var restapi = express();

// restapi.get('/data', function(req, res){
//     db.get("SELECT value FROM counts", function(err, row){
//         res.json({ "count" : row.value });
//     });
// });

// restapi.post('/data', function(req, res){
//     db.run("UPDATE counts SET value = value + 1 WHERE key = ?", "counter", function(err, row){
//         if (err){
//             console.err(err);
//             res.status(500);
//         }
//         else {
//             res.status(202);
//         }
//         res.end();
//     });
// });


// restapi.listen(3005);

// console.log("Submit GET or POST to http://localhost:3000/data");
