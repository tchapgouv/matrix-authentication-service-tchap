#!/bin/bash

set -e
export MAS_TCHAP_HOME=$PWD

cd $MAS_HOME

# Build conf from conf.template.yaml
$MAS_TCHAP_HOME/tools/build_conf.sh

cargo run -- server -c $MAS_TCHAP_HOME/tmp/config.local.dev.yaml