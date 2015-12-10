#!/bin/sh

appname=insertlinkfromlocalfile

cp makexpi/makexpi.sh ./
./makexpi.sh -n $appname -v
rm ./makexpi.sh
