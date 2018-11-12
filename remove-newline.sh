#!/bin/sh

#sed ':a;N;$!ba;s/\n/ /g' $1
perl -p -i -e 's/\R/ /g;' $1
