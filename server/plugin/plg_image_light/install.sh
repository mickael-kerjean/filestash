#/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
cd "$(dirname "$0")"/deps
echo `pwd`
curl https://download.filestash.app/upload/libresize-linux-x86-64 > libresize.a
curl https://download.filestash.app/upload/libtranscode-linux-x86-64.a > libtranscode.a
