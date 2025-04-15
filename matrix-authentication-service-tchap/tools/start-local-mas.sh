#!/bin/bash

set -e
cd $MAS_HOME
cargo run -- server -c conf/config.local.dev.yaml