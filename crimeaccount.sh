#!/bin/sh
CRIME_HOME=$PWD
echo "Welcome to CRIME .:: ARBITRAGE CRYPTOCURRENCY ::."
echo "ACCOUNT SETTING TOOL:"
echo "Ver: 0.9"
echo "working Dir $CRIME_HOME"
if [ $# -lt 1 ]
then
  echo "Usage: crimeaccount <account_name>"
  exit 1
fi

account=$1

if [ ! -f $CRIME_HOME/credentials-$account.json ]; then
    echo "File '$CRIME_HOME/credentials-$account.json' not found!"
    exit
fi
if [ ! -f $CRIME_HOME/$account.addresses.json ]; then
    echo "File '$CRIME_HOME/credentials-$account.json' not found!"
    exit
fi
if [ ! -f $CRIME_HOME/docs/js/credentials-$account.js ]; then
    echo "File '$CRIME_HOME/docs/js/credentials-$account.js' not found!"
    exit
fi
echo "Create credentials (node.js) file for $account."
cp $CRIME_HOME/credentials-$account.json $CRIME_HOME/credentials-1.json
echo "done"
echo "Create credentials (JS) file for $account."
cp $CRIME_HOME/docs/js/credentials-$account.js $CRIME_HOME/docs/js/credentials.js
echo "done"
echo "Create addresses file (node.js, JS and CSV) file for $account."
node check-addresses.js $account
echo "done"
echo "Good Luck!...Have a lot of fun"
echo "I made it wih love. Donate XRP: rLEsXccBGNR3UPuPu2hUXPjziKC3qKSBun Destination Tag 36361"

