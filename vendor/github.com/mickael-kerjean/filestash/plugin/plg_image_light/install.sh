#/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
cd "$(dirname "$0")"/deps
echo `pwd`
curl -s https://downloads.filestash.app/upload/libresize-linux-x86-64.a > libresize.a
curl -Ls https://downloads.filestash.app/upload/libresize-linux-headers.tar.gz | tar zxf - -C /usr/local/include/

curl -s https://downloads.filestash.app/upload/libtranscode-linux-x86-64.a > libtranscode.a
curl -Ls https://downloads.filestash.app/upload/libtranscode-linux-headers.tar.gz | tar zxf - -C /usr/local/include/
