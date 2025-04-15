#!/bin/bash

set -e
MAS_CONF=$PWD/conf
cd $MAS_HOME
cargo run -- server -c $MAS_CONF/config.local.dev.yaml