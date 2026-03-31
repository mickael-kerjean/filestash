all:
	make setup
	make build
	make install

setup:
	[ -d lib/vendor ] || mkdir -p lib/vendor
	curl -L https://raw.githubusercontent.com/VolodymyrBaydalka/docxjs/refs/heads/master/dist/docx-preview.js > lib/vendor/docx-preview.js
	curl -L https://unpkg.com/jszip/dist/jszip.min.js > lib/vendor/jszip.min.js

build:
	zip -r application_docx.zip .

install:
	mv application_docx.zip ../../../dist/data/state/plugins/
