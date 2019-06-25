#!/bin/sh
# This script is run like this:
# docker run --name debian -ti -v /home/:/home/ debian bash
# cd /path/to/this/script
# ./create_libresize.sh
set -e

################################################
# Tooling
apt update
apt install -y curl make gcc g++ xz-utils pkg-config python3-pip autoconf libtool unzip python-setuptools cmake git
pip3 install --user meson ninja
export PATH=~/.local/bin:$PATH

################################################
# Stage 1: Get libvips and its dependencies + recompile for less headaches
INITIAL_PATH=`pwd`
mkdir -p /tmp/filestash/libresize/tmp
cd /tmp/filestash/libresize
apt install -y libvips-dev
cd tmp
curl -L -X GET https://github.com/libvips/libvips/releases/download/v8.7.0/vips-8.7.0.tar.gz > libvips.tar.gz
tar -zxf libvips.tar.gz
cd vips-8.7.0/
./configure --enable-static --without-magick --without-lcms  --without-OpenEXR --without-nifti --without-pdfium --without-rsvg --without-matio --without-libwebp --without-cfitsio --without-zlib --without-poppler --without-pangoft2 --enable-introspection=no --without-openslide
make -j 8
make install
cd $INITIAL_PATH

################################################
# Stage 2: Create our own library as a static build
gcc -Wall -c src/libresize.c `pkg-config --cflags glib-2.0`
ar rcs libresize.a libresize.o
rm *.o

################################################
# Stage 3: Gather and assemble all the bits and pieces together
#ar x /tmp/libresize.a
ar x /usr/local/lib/libvips.a

ar x /usr/lib/x86_64-linux-gnu/libz.a
ar x /usr/lib/x86_64-linux-gnu/libbz2.a
ar x /usr/lib/x86_64-linux-gnu/libjpeg.a
ar x /usr/lib/x86_64-linux-gnu/libgif.a
ar x /usr/lib/x86_64-linux-gnu/libdl.a
ar x /usr/lib/x86_64-linux-gnu/libicui18n.a
ar x /usr/lib/x86_64-linux-gnu/libgsf-1.a
ar x /usr/lib/x86_64-linux-gnu/libicuuc.a
ar x /usr/lib/x86_64-linux-gnu/libicudata.a
ar x /usr/lib/x86_64-linux-gnu/liblzma.a
ar x /usr/lib/x86_64-linux-gnu/libfreetype.a
ar x /usr/lib/x86_64-linux-gnu/libfftw3.a
ar x /usr/lib/x86_64-linux-gnu/libfontconfig.a
ar x /usr/lib/x86_64-linux-gnu/libXext.a
ar x /usr/lib/x86_64-linux-gnu/libSM.a
ar x /usr/lib/x86_64-linux-gnu/libX11.a
ar x /usr/lib/x86_64-linux-gnu/liborc-0.4.a
ar x /usr/lib/x86_64-linux-gnu/libltdl.a
ar x /usr/lib/x86_64-linux-gnu/librt.a
ar x /usr/lib/x86_64-linux-gnu/libharfbuzz.a
ar x /usr/lib/x86_64-linux-gnu/libexpat.a
ar x /usr/lib/x86_64-linux-gnu/libgio-2.0.a
ar x /usr/lib/x86_64-linux-gnu/libpng16.a
ar x /usr/lib/x86_64-linux-gnu/libpixman-1.a
ar x /usr/lib/x86_64-linux-gnu/libxcb.a
ar x /usr/lib/x86_64-linux-gnu/libjbig.a
ar x /usr/lib/x86_64-linux-gnu/libexif.a
ar x /usr/lib/x86_64-linux-gnu/libpcre.a
ar x /usr/lib/x86_64-linux-gnu/libtiff.a
ar x /usr/lib/x86_64-linux-gnu/libpangoft2-1.0.a
ar x /usr/lib/x86_64-linux-gnu/libpoppler.a

ar rcs libresize.a *.o
rm *.o *.ao

################################################
# Stage 4: Gather all the related headers
#cd /usr/include/
#tar zcf /tmp/libresize-headers.tar.gz .
#scp /tmp/libresize-headers.tar.gz mickael@hal.kerjean.me:/home/app/pages/data/projects/filestash/downloads/upload/libresize-linux-headers.tar.gz
