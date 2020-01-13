#/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
cd "$(dirname "$0")"/deps
echo `pwd`
curl -s https://downloads.filestash.app/upload/libresize_`uname -s`-`uname -m`.a > libresize.a
curl -s https://downloads.filestash.app/upload/libtranscode_`uname -s`-`uname -m`.a > libtranscode.a
