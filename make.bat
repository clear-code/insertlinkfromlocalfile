set appname=insertlinkfromlocalfile

copy buildscript\makexpi.sh .\
bash makexpi.sh -n %appname% -v
del makexpi.sh
