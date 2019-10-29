#!/bin/s
# # This script handle the creation of the static library used by the plugin to
# # perform image resizing jobs. You can run it like this:
# docker run -ti --name debian_build_dep -v /home/:/home/ debian:9 bash
# apt-get -y update && apt-get -y install git
# git clone https://github.com/mickael-kerjean/filestash
# cd filestash/server/plugin/plg_image_light/deps/
# ./create_libresize.sh
set -e
arch=$(dpkg --print-architecture)
if [ $arch != "amd64" ] && [ $arch != "armhf" ]; then
    echo "PLATFORM NOT SUPPORTED"
    exit 1
fi

################################################
# Tooling
apt install -y curl make gcc g++ xz-utils pkg-config python3-pip autoconf libtool unzip python-setuptools cmake git
#pip3 install --user meson ninja
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

################################################
# Stage 3: Gather and assemble all the bits and pieces together
libpath=$(
    if [ $arch = "amd64" ]; then
        echo "x86_64-linux-gnu";
    elif [ $arch = "armhf" ]; then
        echo "arm-linux-gnueabihf"        
    fi
)
#ar x /tmp/libresize.a
ar x /usr/local/lib/libvips.a

ar x /usr/lib/$libpath/libz.a
ar x /usr/lib/$libpath/libbz2.a
ar x /usr/lib/$libpath/libjpeg.a
ar x /usr/lib/$libpath/libgif.a
ar x /usr/lib/$libpath/libdl.a
ar x /usr/lib/$libpath/libicui18n.a
ar x /usr/lib/$libpath/libgsf-1.a
ar x /usr/lib/$libpath/libicuuc.a
ar x /usr/lib/$libpath/libicudata.a
ar x /usr/lib/$libpath/liblzma.a
ar x /usr/lib/$libpath/libfreetype.a
ar x /usr/lib/$libpath/libfftw3.a
ar x /usr/lib/$libpath/libfontconfig.a
ar x /usr/lib/$libpath/libXext.a
ar x /usr/lib/$libpath/libSM.a
ar x /usr/lib/$libpath/libX11.a
ar x /usr/lib/$libpath/liborc-0.4.a
ar x /usr/lib/$libpath/libltdl.a
ar x /usr/lib/$libpath/librt.a
ar x /usr/lib/$libpath/libharfbuzz.a
ar x /usr/lib/$libpath/libexpat.a
ar x /usr/lib/$libpath/libgio-2.0.a
ar x /usr/lib/$libpath/libpng16.a
ar x /usr/lib/$libpath/libpixman-1.a
ar x /usr/lib/$libpath/libxcb.a
ar x /usr/lib/$libpath/libjbig.a
ar x /usr/lib/$libpath/libexif.a
ar x /usr/lib/$libpath/libpcre.a
ar x /usr/lib/$libpath/libtiff.a
ar x /usr/lib/$libpath/libpangoft2-1.0.a
ar x /usr/lib/$libpath/libpoppler.a

ar rcs libresize.a *.o
rm *.o *.ao

#scp libresize.a mickael@hal.kerjean.me:/home/app/pages/data/projects/filestash/downloads/upload/libresize-`uname -s`-`uname -m`.a

################################################
# Stage 4: Gather all the related headers
#cd /usr/include/
#tar zcf /tmp/libresize-headers.tar.gz .
#scp /tmp/libresize-headers.tar.gz mickael@hal.kerjean.me:/home/app/pages/data/projects/filestash/downloads/upload/libresize-`uname -s`-`uname -m`.tar.gz
