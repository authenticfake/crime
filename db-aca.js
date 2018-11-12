 'use strict';
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./db/aca.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the SQlite database. See ./db/aca.db');
});
//QUERY FOR INTRA EXCHANGE ARBITRAGE
let sql_insert_opportunity= "INSERT INTO OPPORTUNITIES (transaction_id, account,exchange,coin, symbolHead,symbolMid,symbolTail,initial_amount,profit,status,side, start_date)"
sql_insert_opportunity += " VALUES (?,?,?,?,?,?,?,?,?,0,?,datetime('now'))"
let sql_update_opportunity= "UPDATE OPPORTUNITIES SET side=?, status =?, final_amount=?, update_date=datetime('now') WHERE transaction_id=?"
let sql_select_opportunities= "SELECT COUNT(*) as rows_length FROM OPPORTUNITIES where status <>2 AND status <>3 AND account=? AND exchange=? AND coin=?"
//INSERT OPPORTUNITIES HISTORY
var sql_insert_opportunities_history = "INSERT INTO OPPORTUNITIES_HISTORY (transaction_id, account, exchange, coin, symbol, amount, side, ex_id, ex_info, ex_error, start_date)"
sql_insert_opportunities_history += " VALUES(?,?,?,?,?,?,?,?,?,?, datetime('now'))"


//QUERY FOR CROSS EXCHANGEs ARBITRAGE
//side --> 0=BUY_FROM, 1=WITHDRAWL_FROM, 2=SELL_TO, 3=BUY_TO, 4=WITHDRAWL_TO, 5=SELL_FROM
//status --> 0=STAR, 1=PROCESSING, 2=COMPLETE, 3=ERROR 
//START_DATE text,    //YYYY-MM-DD HH:MM:SS.SSS ISO8601
//END_DATE text       //YYYY-MM-DD HH:MM:SS.SSS ISO8601
let sql_select_by_transactionId = "SELECT * FROM PROCESSES WHERE transaction_id = ? LIMIT 1";
let sql_select_process_tobedone = "SELECT *, max(PROCESSES.start_date)  FROM PROCESSES WHERE PROCESSES.status <> 2 AND PROCESSES.status <> 3"
var sql_select_all_limit = "SELECT * FROM PROCESSES LIMIT ?";
var sql_start_process1 = "INSERT INTO PROCESSES (transaction_id,exchangeFrom, exchangeTo,coinPairFrom,coinPairTo,cashOutFrom,side,status,start_date, market1price, market2price, pairmarket1, pairmarket2, pairmarket1price, pairmarket2price, spreadFrom, spreadTo, initialCash, engine,journey)"
var sql_start_process2 = " VALUES (?,?,?,?,?,?,0,0,datetime('now'),?,?,?,?,?,?,?,?, ?,?,?)"
var sql_start_process = sql_start_process1+sql_start_process2;
var sql_select_by_exchangeid_coinpair = "SELECT * FROM PROCESSES WHERE exchangeFrom = ? AND coinPairFrom =? AND (status = 0 OR status =1)";
//BUY_FROM
var sql_buy_from_process = "UPDATE PROCESSES SET side='BUY_FROM',cashOutFrom =?, status=?, end_date=datetime('now') WHERE transaction_id=? AND status =0"
//WITHDRAWL_FROM
var sql_withdrwal_from_process = "UPDATE PROCESSES SET side='WITHDRAWAL_FROM', status=?, cashInFrom=?,end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='BUY_FROM'"
//SELL_TO
var sql_sell_to_process = "UPDATE PROCESSES SET side='SELL_TO',finalCash =?, cashInTo =?, status=?, end_date=datetime('now') WHERE transaction_id=? AND status =1 AND side='WITHDRAWAL_FROM'"
//BUY_TO
var sql_buy_to_process = "UPDATE PROCESSES SET side='BUY_TO', cashOutTo =?,status=?, end_date=datetime('now') WHERE transaction_id=? AND (status =1 OR status =2) AND side='SELL_TO'"
//WITHDRAWL_TO
var sql_withdrwal_to_process = "UPDATE PROCESSES SET side='WITHDRAWAL_TO', status=?, cashInTo=?, end_date=datetime('now') WHERE transaction_id=? AND (status =1 OR status =2) AND side='BUY_TO'"
//SELL_FROM --> END OF ROUND TRIP OPPORTUNITY
var sql_sell_from_process = "UPDATE PROCESSES SET side='SELL_FROM',finalCash =?,status=?, end_date=datetime('now') WHERE transaction_id=? AND (status =1 OR status =2) AND side='WITHDRAWAL_TO'"
//COMPLETE
var sql_complete_process = "UPDATE PROCESSES SET status=2, end_date=datetime('now') WHERE transaction_id=? AND (status =1 OR status=0) "
//TERMINATE
var sql_terminate_process = "UPDATE PROCESSES SET status=3,error_description=?, end_date=datetime('now') WHERE transaction_id=? AND  (status =1 OR status=0)"
//INSERT TRASACTION OUTPUT RETRIEVeD FRoM eXCHANGE
var sql_insert_exchange_output = "INSERT INTO HISTORY (transaction_id,ex_id,side,status,ex_info, ex_error,transaction_date, coin, amount,price, address, market) VALUES(?,?,?,?,?,?, datetime('now'),?,?,?,?,?)"


let side =[ "BUY_FROM", "WITHDRAWAL_FROM","SELL_TO" , "BUY_TO", "WITHDRAWAL_TO","SELL_FROM" ]



db.serialize(() => {
  //&market2price=" +market2price +" pairmarket1=" +pairmarket1 +" pairmarket2=" +pairmarket2 +" pairmarket1price1=" +pairmarket1price1 +" pairmarket2price=" +pairmarket1price1
 //db.run('DROP TABLE IF EXISTS PROCESSES;')
 //db.run('DROP TABLE IF EXISTS HISTORY;')
 db.run(`CREATE TABLE IF NOT EXISTS PROCESSES  (
    id integer PRIMARY KEY AUTOINCREMENT,
    transaction_id integer ,
    journey text,
    engine text,
    exchangeFrom text NOT NULL,
    exchangeTo text NOT NULL,
    coinPairFrom text NOT NULL,
    coinPairTo text NOT NULL,
    side text, 
    status integer NOT NULL,
    initialCash  REAL,
    cashInFrom  REAL,
    cashOutFrom REAL,
    cashInTo  REAL,
    cashOutTo REAL,
    finalCash REAL,
    spreadFrom REAL,
    spreadTo REAL,
    error_description text, 
    start_date text,    
    end_date text,
    market1price REAL,
    market2price REAL,
    pairmarket1 TEXT,
    pairmarket2 TEXT,
    pairmarket1price REAL,
    pairmarket2price REAL
)`);

 db.run(`CREATE TABLE IF NOT EXISTS HISTORY  (
   transaction_id integer PRIMARY KEY,
   coin TEXT,
   amount REAL,
   price REAL,
   address TEXT,
   market TEXT,
   ex_id text,
   side text,
   status text,
   ex_info text,
   ex_error text, 
   transaction_date text
   )`); 

  db.run(`CREATE TABLE IF NOT EXISTS OPPORTUNITIES  (
   transaction_id integer,
   account TEXT,
   exchange TEXT,
   coin TEXT,
   symbolHead TEXT,
   symbolMid TEXT,
   symbolTail TEXT,
   initial_amount REAL,
   final_amount REAL,
   profit TEXT,
   status integer,
   side text,
   start_date text,
   update_date text
   )`);

   //db.run(`CREATE INDEX idx_opportunities_name  ON OPPORTUNITIES (account, exchange,coin );`);

   db.run(`CREATE TABLE IF NOT EXISTS OPPORTUNITIES_HISTORY  (
   transaction_id integer,
   account TEXT,
   exchange TEXT,
   coin TEXT,
   symbol TEXT,
   amount REAL,
   side text,
   ex_id text,
   ex_info text,
   ex_error text,
   start_date text
   )`);  
});
//   db.run(`INSERT INTO PROCESSES  (
//     transaction_id ,
//     exchangeFrom ,
//     exchangeTo ,
//     coinPairFrom ,
//     coinPairTo ,
//     status,
//     start_date , 
//     end_date ) 
//     VALUES (
//         "test_0000",
//         "therock",
//         "yobit",
//         "BTC-ETH",
//         "LTC-ETH",
//         "0",
//         datetime('now', 'localtime'),
//         datetime('now')

//     )`);

// });
// db.run(`INSERT INTO PROCESSES  (
//     transaction_id ,
//     exchangeFrom ,
//     exchangeTo ,
//     coinPairFrom ,
//     coinPairTo ,
//     status,
//     start_date , 
//     end_date ) 
//     VALUES (
//         "test_0001",
//         "yobit",
//         "theroct",
//         "BTC-ETH",
//         "LTC-ETH",
//         "1",
//         datetime('now', 'localtime'),
//         datetime('now')

//     )`);

//insert Opportunity
//INTRA EXCHANGE METHOD
                               
async function insertOpportunity(transaction_id, account,exchange,coin, symbolHead,symbolMid,symbolTail,initial_amount,profit,side ){
     return  new Promise (async (resolve, reject) => {  
     //INSERT OPPORTUNITY ITEM
     try {
        // db.serialize(() => {
              db.run(sql_insert_opportunity, [transaction_id, account,exchange,coin, symbolHead,symbolMid,symbolTail,initial_amount,profit,side], function(err, rows, fields){
           
             if (err) {
               console.error(err.message);
               resolve()
               //return
             } else {
                 //console.log(row.id + "\t" + row.cashOut);
                 console.log("insertOpportunity", transaction_id);
                 resolve(transaction_id)
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

async function insertOpportunityHistory(transaction_id, account,exchange,coin, symbol,amount,side,ex_id, ex_info, ex_error ){
    return  new Promise (async (resolve, reject) => {  
    try {
        // db.serialize(() => {
              db.run(sql_insert_opportunities_history, [transaction_id, account,exchange,coin, symbol,amount,side,ex_id, ex_info, ex_error], function(err, rows, fields){
           
             if (err) {
               console.error(err.message);
               resolve()
               //return
             } else {
                 //console.log(row.id + "\t" + row.cashOut);
                 console.log("insertOpportunityHistory", transaction_id);
                 resolve(transaction_id)
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

//update Opportunity
//INTRA EXCHANGE METHOD 
async function updateOpportunity(side, status, final_amount, transaction_id){
     return  new Promise (async (resolve, reject) => {  
     try {
      console.log("updateOpportunity", side, status, final_amount, transaction_id)
        // db.serialize(() => {
              db.run(sql_update_opportunity, [side, status, final_amount, transaction_id], function(err, rows, fields){
           
             if (err) {
               console.error(err.message);
               resolve()
               //return
             } else {
                 //console.log(row.id + "\t" + row.cashOut);
                 console.log("updateOpportunity", transaction_id);
                 console.log(`Row(s) updated: ${this.changes}`);
                 resolve(transaction_id)

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

//selectOpportunities by account, exchange and coin
//INTRA EXCHANGE METHOD
async function selectOpportunities(account, exchange, coin) {
    return  new Promise (async (resolve, reject) => {  
    try {

        db.serialize(() => {
            db.all(sql_select_opportunities, [account, exchange, coin], function(err, rows, fields){
            if (err) {
              console.error(err.message);
              reject(error.message); 
            }
            //console.log("selectOpportunities", rows);
            //console.log("selectOpportunities length", rows.length);
            resolve(rows[0]);
          });
        });
    } 
    catch (err) {
      console.error(err.message);
      reject(err.message)
    }
    })
}

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


//update Process - side:sell from  
async function  updateProcessBySellFrom(transactionID,amount, status) {
    return  new Promise (async (resolve, reject) => {
    try {
        db.run( sql_sell_from_process, [amount, status, transactionID], function(err, rows, fields){
          
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

//update Process - side:withdrwal to  
async function updateProcessByWithdrwalTo(transactionID, status, amount) {
    return  new Promise (async (resolve, reject) => {
    try {
            db.run( sql_withdrwal_to_process, [status, amount, transactionID], function(err, rows, fields){
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

//update Process - side:buy to  
async function updateProcessByBuyTo(transactionID,cashOutTo, status) {
    return  new Promise (async (resolve, reject) => {
    try {
       // db.serialize(() => {
            db.run( sql_buy_to_process, [cashOutTo,status, transactionID], function(err, rows, fields){
          
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

//update Process - side:sell to  
async function updateProcessBySellTo(transactionID, amount, status) {
    return  new Promise (async (resolve, reject) => {
    try {

        //db.serialize(() => {
            db.run( sql_sell_to_process, [amount, amount,status,transactionID], function(err, rows, fields){
          
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

//update Process - side: withdrawl from  
function updateProcessByWithdrwalFrom(transactionID, status, amount) {
    return  new Promise (async (resolve, reject) => {
    try {

        db.serialize(() => {
            db.run( sql_withdrwal_from_process, [status, amount, transactionID], function(err, rows, fields){
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

//update Process - side: buy from  
function updateProcessByBuyFrom(transactionID, amount, status) {
    return new Promise (async (resolve, reject) => {  
    try {
        //db.serialize(() => {
            db.all(sql_buy_from_process, [amount, status, transactionID], function(err, rows, fields){

            
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

//select process to be stared now 
async function processToBeStarted() {
    try {
        console.log("processToBeStarted")
        //db.serialize(() => {
            db.run(sql_select_process_tobedone, function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              return
            }
            //console.log(row.id + "\t" + row.cashOut);
            console.log(rows);
            return rows;
          });
        //});

     } catch (err) {
    console.log (err);
     }

}

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
        console.error (err.message);
        reject(err.message)
     }
    })
}
//select process to be stared now 
async function processToBeStarted() {
  return  new Promise (async (resolve, reject) => {  
    try {
        console.log("processToBeStarted")
        //db.serialize(() => {
            db.all(sql_select_process_tobedone, function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              resolve();
            }
            //console.log(row.id + "\t" + row.cashOut);
            //console.log(rows);
            return resolve(rows);
          });
        //});


        

     } catch (err) {
    console.error (err);
    reject(err.message)
     }
})
}

//start process 
function startProcess(trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from, spread_from, spread_to ,market1price, market2price, pairmarket1, pairmarket2, pairmarket1price, pairmarket2price, engine,journey) {
    return  new Promise (async (resolve, reject) => {  
    try {
       // db.serialize(() => {
             db.run(sql_start_process, [trans_id,exchange_from,exchange_to,coin_pair_from, coin_pair_to, cash_out_from,market1price, market2price, pairmarket1, pairmarket2, pairmarket1price, pairmarket2price, spread_from, spread_to, cash_out_from, engine,journey], function(err, rows, fields){
          
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

//INSERT EXCHANGE OUTPUT  
function insertExcangeOutput(transaction_id,ex_id, side, status, ex_info, ex_error, coin,amount,price,address,market) {
    return  new Promise (async (resolve, reject) => {  
    try {
       // db.serialize(() => {
                                       
             db.run(sql_insert_exchange_output, [transaction_id,ex_id, side, status, ex_info, ex_error,coin,amount,price,address,market], function(err, rows, fields){
          
            if (err) {
              console.error(err.message);
              resolve()
              //return
            } else {
                //console.log(row.id + "\t" + row.cashOut);
                console.log("insertExchangeOutput", transaction_id);
                resolve(transaction_id)
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
var trans_id = "test_33__5"
var sp =  await startProcess(trans_id,"yobit", "therock","BTC-ETH", "BCH-ETH","0.333", "1.8", "13.55", "manual", "roundtrip");
console.log("sp-->", sp)
var ptbs = await processToBeStarted();
console.log("ptbs-->", ptbs)
var limitNumber = await selectLimit(100);
console.log("selectLimit --> ", limitNumber);
var bf = await updateProcessByBuyFrom(trans_id, 1)
console.log("bf", bf)
var wf = await updateProcessByWithdrwalFrom(trans_id, 1);
console.log("wf", wf)
var st = await updateProcessBySellTo(trans_id,"2.8",2);
console.log("st", st)
var bt = await updateProcessByBuyTo(trans_id,"2.8",1);
console.log("bt", bt)

var wt = await updateProcessByWithdrwalTo(trans_id,1);
console.log("wt", wt)
var sf = await updateProcessBySellFrom(trans_id, "3.8",2);
console.log("sf", sf)


}

//test();
//export database ref
exports.db=db
//export database statements ref
exports.sql_select_by_transactionId =  sql_select_by_transactionId;
exports.sql_select_process_tobedone = sql_select_process_tobedone;
exports.sql_select_all_limit = sql_select_all_limit
exports.sql_start_process =sql_start_process;
exports.sql_select_by_exchangeid_coinpair =sql_select_by_exchangeid_coinpair;
exports.sql_buy_from_process =sql_buy_from_process;
exports.sql_withdrwal_from_process =sql_withdrwal_from_process;
exports.sql_sell_to_process =sql_sell_to_process;
exports.sql_buy_to_process =sql_buy_to_process;
exports.sql_withdrwal_to_process =sql_withdrwal_to_process;
exports.sql_sell_from_process =sql_sell_from_process;
exports.sql_complete_process =sql_complete_process;
exports.sql_terminate_process =sql_terminate_process;
exports.sql_insert_exchange_output=sql_insert_exchange_output
//export database methods ref
exports.dynamicQuery=dynamicQuery
exports.closeDatabase=closeDatabase
exports.terminateProcess=terminateProcess
exports.completeProcess=completeProcess
exports.updateProcessBySellFrom=updateProcessBySellFrom
exports.updateProcessByWithdrwalTo=updateProcessByWithdrwalTo
exports.updateProcessByBuyTo=updateProcessByBuyTo
exports.updateProcessBySellTo=updateProcessBySellTo
exports.updateProcessByWithdrwalFrom=updateProcessByWithdrwalFrom
exports.updateProcessByBuyFrom=updateProcessByBuyFrom
exports.processByTransactionID=processByTransactionID
exports.checkProcessByExchangeAndCoin=checkProcessByExchangeAndCoin
exports.selectLimit=selectLimit
exports.startProcess=startProcess
exports.insertExcangeOutput=insertExcangeOutput
exports.processToBeStarted = processToBeStarted
//INTRA EXCHANGE export function
exports.insertOpportunity=insertOpportunity
exports.selectOpportunities=selectOpportunities
exports.updateOpportunity=updateOpportunity
exports.insertOpportunityHistory=insertOpportunityHistory