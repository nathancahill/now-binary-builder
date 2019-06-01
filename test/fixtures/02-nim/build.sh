#!/bin/bash
yum install -y tar git xz gcc openssl-devel
curl -o ./nim.tar.xz https://nim-lang.org/download/nim-0.19.6.tar.xz
tar -xf ./nim.tar.xz

cd ./nim-0.19.6
. ./build.sh
./bin/nim c koch
./koch tools

export PATH="$(realpath ./bin):$PATH"

cd ../app
nimble install -y

cd ..
mkdir dist
cp app/server dist/server
