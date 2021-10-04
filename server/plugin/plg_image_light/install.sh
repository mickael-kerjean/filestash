#/bin/bash
set -e

echo "= INSTALL LIBS"
SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
cd "$(dirname "$0")"/deps

# AMD64
curl -sk https://downloads.filestash.app/upload/libresize_Linux-x86_64.a > libresize_linux_amd64.a &
curl -sk https://downloads.filestash.app/upload/libtranscode_Linux-x86_64.a > libtranscode_linux_amd64.a &

# ARM
curl -sk https://downloads.filestash.app/upload/libresize_Linux-armv7l.a > libresize_linux_arm.a &
curl -sk https://downloads.filestash.app/upload/libtranscode_Linux-armv7l.a > libtranscode_linux_arm.a &

wait
