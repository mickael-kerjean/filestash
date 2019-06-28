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
INITIAL_PATH=`pwd`
apt install -y libraw-dev
cd /tmp/
# libgomp and libstdc++
apt-get install -y libgcc-6-dev
# libjpeg
apt-get install -y libjpeg-dev
# liblcms2
curl -L -O https://downloads.sourceforge.net/project/lcms/lcms/2.9/lcms2-2.9.tar.gz
tar zxf lcms2-2.9.tar.gz
cd lcms2-2.9
./configure --enable-static --without-zlib --without-threads
make -j 8
make install

cd $INITIAL_PATH
################################################
# Stage 2: Create our own library as a static build
gcc -Wall -c src/libtranscode.c

################################################
# Stage 3: Gather and assemble all the bits and pieces together
ar x /usr/lib/x86_64-linux-gnu/libraw.a
ar x /usr/lib/x86_64-linux-gnu/libjpeg.a
ar x /usr/lib/gcc/x86_64-linux-gnu/6/libstdc++.a
ar x /usr/local/lib/liblcms2.a
ar x /usr/lib/gcc/x86_64-linux-gnu/6/libgomp.a
ar x /usr/lib/x86_64-linux-gnu/libpthread.a

ar rcs libtranscode.a *.o
rm *.o
#scp libtranscode.a mickael@hal.kerjean.me:/home/app/pages/data/projects/filestash/downloads/upload/libtranscode-linux-x86-64.a

################################################
# Stage 4: Gather all the related headers
#cd /usr/include/
#tar zcf /tmp/libtranscode-headers.tar.gz .
#scp /tmp/libtranscode-headers.tar.gz mickael@hal.kerjean.me:/home/app/pages/data/projects/filestash/downloads/upload/libtranscode-linux-headers.tar.gz
