#!/bin/bash

# create a new project folder, copy src/config.js into it, and update config.emailName

if [[ $# -lt 1 ]]; then
  echo "You must supply a directory name."
  exit 1
fi

DIR=$1

if [[ $# -ge 2 ]]; then
  CAMPAIGN=$2
else
  CAMPAIGN=$DIR
fi

mkdir $DIR
sed "s/CAMPAIGN/$CAMPAIGN/" src/config.js > "${DIR}"/config.js

