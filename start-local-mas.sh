#!/bin/bash

set -e

# Source the .env file to load environment variables
if [ -f .env ]; then
  source .env
else
  echo "Error: .env file not found. Please create a .env file with the required environment variables."
  exit 1
fi

MAS_CONF=$PWD/conf
cd $MAS_HOME

export TCHAP_IDENTITY_SERVER_URL="http://localhost::${IDENTITY_MOCK_PORT}"
cargo run -- server -c $MAS_CONF/config.local.dev.yaml