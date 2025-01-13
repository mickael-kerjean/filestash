all:
	make build
	make install
	make clean

build:
	emcc -O2 -c loader_symbol.c
	emcc --no-entry loader_symbol.o -o loader_symbol.wasm

install:
	zip -r application_dev.zip .
	mv application_dev.zip ../../../dist/data/state/plugins/

clean:
	rm *.o *.wasm
