#!/bin/sh
# This script is run like this:
# docker run --name debian -ti -v /home/:/home/ debian bash
# cd /path/to/this/script
# ./create_libtranscode.sh
set -e

################################################
# Tooling
apt update
apt install -y curl make gcc g++ xz-utils pkg-config python3-pip autoconf libtool unzip python-setuptools cmake git
pip3 install --user meson ninja
export PATH=~/.local/bin:$PATH

################################################
# Stage 1: Get libraw and its dependencies
apt install -y libraw-dev

################################################
# Stage 2: Create our own library as a static build
gcc -Wall -c src/libtranscode.c

################################################
# Stage 3: Gather and assemble all the bits and pieces together
ar x /usr/lib/x86_64-linux-gnu/libraw.a
ar x /usr/lib/x86_64-linux-gnu/libjpeg.a

ar rcs libtranscode.a *.o
rm *.o
