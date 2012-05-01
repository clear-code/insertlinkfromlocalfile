#!/bin/sh

appname=insertlinkfromlocalfile

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname -v
rm ./makexpi.sh
