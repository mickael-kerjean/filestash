all:
	@make jpeg
	@make png

jpeg:
	gcc -Wall src/jpeg_to_jpeg.c -o dist/jpeg.bin -l:libjpeg.a

png:
	gcc -Wall src/png_to_webp.c -o dist/png.bin -l:libpng.a -l:libz.a -l:libwebp.a -lpthread -lm
