all:
	make build
	make install

install:
	zip -r application_office.zip .
	mv application_office.zip ../../../dist/data/state/plugins/

build:
	clang --target=wasm32 -nostdlib -O3 -Wl,--no-entry -Wl,--export=middleware -o middleware.wasm middleware.c
	make deps

deps:
	[ -d lib/lowa ] || mkdir -p lib/lowa
	curl https://cdn.zetaoffice.net/zetaoffice_latest/soffice.js > lib/lowa/soffice.js
	curl https://cdn.zetaoffice.net/zetaoffice_latest/soffice.wasm > lib/lowa/soffice.wasm.br
	curl https://cdn.zetaoffice.net/zetaoffice_latest/soffice.data.js.metadata > lib/lowa/soffice.data.js.metadata
	curl https://cdn.zetaoffice.net/zetaoffice_latest/soffice.data > lib/lowa/soffice.data.br
	curl https://zetaoffice.net/demos/standalone/assets/vendor/zetajs/zeta.js > lib/lowa/zeta.js
