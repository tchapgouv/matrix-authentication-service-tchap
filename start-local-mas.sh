#!/bin/bash

set -e
MAS_CONF=$PWD/conf
cd $MAS_HOME

export TCHAP_IDENTITY_SERVER_URL="http://localhost:8083"
cargo run -- server -c $MAS_CONF/config.local.dev.yaml