all:
	mkdir -p ./dist/data/{config,public,cache}
	NODE_ENV=production npm run build
	go build -o ./dist/nuage ./server/main.go
	cp config.json ./dist/data/config/

clear:
	@rm -rf ./dist
