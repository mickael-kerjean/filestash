#/bin/bash
set -e

SCRIPTPATH="$( cd "$(dirname "$0")" ; pwd -P )"
cd "$(dirname "$0")"/deps

# AMD64 dependencies
curl -s https://downloads.filestash.app/upload/libresize_Linux-x86_64.a > libresize_linux_amd64.a &
curl -s https://downloads.filestash.app/upload/libtranscode_Linux-x86_64.a > libtranscode_linux_amd64.a &

# ARM dependencies
curl -s https://downloads.filestash.app/upload/libresize_Linux-armv7l.a > libresize_linux_arm.a &
curl -s https://downloads.filestash.app/upload/libtranscode_Linux-armv7l.a > libtranscode_linux_arm.a &

wait
