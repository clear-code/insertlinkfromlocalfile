set appname=insertlinkfromlocalfile

copy makexpi\makexpi.sh .\
bash makexpi.sh -n %appname% -v
del makexpi.sh
