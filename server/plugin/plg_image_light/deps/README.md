plg_image_light rely on a few libraries for:
- image transcoding: libtranscode.a: a library build on top of of libraw
- image resizing: libresize.a: a library built on top of libvips

To create the libraries to be used by Filestash:
./create_libtranscode.sh
./create_libresize.sh

To test the libraries are working fine:
```
# libtranscode:
gcc -Wall -c src/libtranscode_test.c
gcc -o main_transcode.bin libtranscode_test.o -lm -lpthread -L. -l:libtranscode.a

# libresize:
gcc -Wall -c src/libresize_test.c `pkg-config --cflags glib-2.0`
gcc -o main_resize.bin libresize_test.o -lm -lgmodule-2.0 -lgobject-2.0 -lglib-2.0 -L. -l:libresize.a
```
