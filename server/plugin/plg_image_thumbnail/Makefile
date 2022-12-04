PLATFORM=linux
ARCH=amd64

all:
	@make jpeg
	@make png
	@make raw

image_jpeg.o:
	gcc -Wall -c src/image_jpeg.c -o src/image_jpeg.o

image_png.o:
	gcc -Wall -c src/image_png.c -o src/image_png.o

image_raw.o:
	gcc -Wall -c src/image_raw.c -o src/image_raw.o

jpeg: image_jpeg.o
	gcc -static src/main_jpeg_to_jpeg.c src/image_jpeg.o -o dist/jpeg_$(PLATFORM)_$(ARCH).bin -l:libjpeg.a
	sha256sum ./dist/jpeg_$(PLATFORM)_$(ARCH).bin | awk '{ printf $$1 }' > dist/jpeg_$(PLATFORM)_$(ARCH).bin.sha256

png: image_png.o
	gcc -static -Wall src/main_png_to_webp.c src/image_png.o -o dist/png_$(PLATFORM)_$(ARCH).bin -l:libpng.a -l:libz.a -l:libwebp.a -lpthread -lm
	sha256sum ./dist/png_$(PLATFORM)_$(ARCH).bin | awk '{ printf $$1 }' > dist/png_$(PLATFORM)_$(ARCH).bin.sha256

raw: image_raw.o image_jpeg.o
	gcc -Wall -c src/main_raw_to_jpeg.c -o src/main_raw_to_jpeg.o
    # libraw was configured like this: ./configure --disable-openmp --disable-lcms
	g++ -static src/main_raw_to_jpeg.o src/image_raw.o src/image_jpeg.o -o dist/raw_$(PLATFORM)_$(ARCH).bin -l:libraw.a -l:libjpeg.a -l:libz.a -l:libstdc++.a -lm
	sha256sum ./dist/raw_$(PLATFORM)_$(ARCH).bin | awk '{ printf $$1 }' > dist/raw_$(PLATFORM)_$(ARCH).bin.sha256

clean:
	rm src/*.o dist/*_$(PLATFORM)_$(ARCH).bin* || true

test:
	@gcc -Wall src/test.c -o test.bin -ljpeg -lpng -lz -lwebp -lpthread -lm -lraw
	@./test.bin /home/mickael/Downloads/
	@rm test.bin
