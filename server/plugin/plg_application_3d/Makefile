all:
	make install

install:
	zip -r application_3d.zip .
	mv application_3d.zip ../../../dist/data/state/plugins/application_3d.zip

deps_mesh:
	[ -d vendor ] || mkdir vendor
	curl https://gist.githubusercontent.com/mickael-kerjean/9a517f95112410fcacaad8563c1ba314/raw/ab483b38aebb7048832aad7b342f9161dd928e49/gistfile1.txt > vendor/MeshLoader.js
