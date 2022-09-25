#!/bin/bash

#function for installing specific package
packageInstall () {
  echo "================"
  echo "Installing $1..."
  if [[ ! -z $YUM_CMD ]]; then
    sudo yum install $1
  elif [[ ! -z $APT_CMD ]]; then
    sudo apt -y install $1
  elif [[ ! -z $APT_GET_CMD ]]; then
    sudo apt-get -y install $1
  elif [[ ! -z $DNF_CMD ]]; then
    sudo dnf install $1
  elif [[ ! -z $PKG_CMD ]]; then
    sudo pkg install $1
  elif [[ ! -z $BREW_CMD ]]; then
    brew install $1
  else
    echo "Error: cannot install $1 - unknown package manager!"
  fi
}

#check available commands
YUM_CMD=$(which yum)
APT_CMD=$(which apt)
APT_GET_CMD=$(which apt-get)
DNF_CMD=$(which dnf)
PKG_CMD=$(which pkg)
BREW_CMD=$(which brew)
NPM_CMD=$(which npm)
MQTT_CMD=$(which mosquitto)
YARN_CMD=$(which yarn)
NODE_CMD=$(which node)


#update files from git
echo "Synchronizing source code git..."
git pull

#macOS - install yarn, telegraf and mosquitto
if [[ ! -z $BREW_CMD ]]; then
  echo "Installing yarn..."
#yarn also installs stable node
  brew install yarn
  echo "Installing telegraf..."
  brew install telegraf
  echo "Installing mosquitto..."
  brew install mosquitto
  if [ ! -d "node_modules" ]; then
    yarn install
  fi
  exit
fi

#install npm tool
if [[ -z $NPM_CMD ]]; then
  packageInstall "npm"
else
  echo "npm installed, skipping installation"
fi

#install mosquitto tool
if [[ -z $MQTT_CMD ]]; then
  packageInstall "mosquitto"
else
  echo "mosquitto installed, skipping installation"
fi

#check node version - if too old, clear path
if [ ! -z $NODE_CMD ]; then
  NODE_VER=$(node --version | cut -d. -f1 | sed 's/[^0-9]*//g')
  echo "major node version: $NODE_VER"
  if [ $NODE_VER -lt 12 ]; then
    NODE_CMD=""
    echo "node needs to be upgraded"
  fi
fi

#check yarn version - if too old (e.g. 0.32+git), clear path
if [ ! -z $YARN_CMD ]; then
  YARN_VER=$(yarn --version)
  echo "yarn version: $YARN_VER"
  if [[ $YARN_VER == *"git"* ]]; then
    YARN_CMD=""
    echo "yearn needs to be upgraded"
  fi
fi

#install yarn
if [[ -z $YARN_CMD ]]; then
  echo "Installing yarn tool..."
  sudo npm install -g yarn
else
  echo "yarn installed, skipping installation"
fi

#install the latest stable node.js
if [[ -z $NODE_CMD ]]; then
  echo "Installing node tool..."
  sudo npm install -g n
  sudo n stable
else
  echo "node installed, skipping installation"
fi

if [ ! -d "node_modules" ]; then
  yarn install
fi
