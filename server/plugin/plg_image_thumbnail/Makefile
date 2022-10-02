all:
	@make jpeg
	@make png

jpeg:
	gcc -Wall src/jpeg_to_jpeg.c -o dist/jpeg_`uname -s`_`uname -m`.bin -l:libjpeg.a

png:
	gcc -Wall src/png_to_webp.c -o dist/png_`uname -s`_`uname -m`.bin -l:libpng.a -l:libz.a -l:libwebp.a -lpthread -lm
