all:
	find . -type f -name '*.html' | xargs brotli -f -k
	find . -type f -name '*.html' | xargs gzip -f -k
	find . -type f -name '*.js' | xargs brotli -f -k
	find . -type f -name '*.js' | xargs gzip -f -k --best
	find . -type f -name '*.css' | xargs brotli -f -k
	find . -type f -name '*.css' | xargs gzip -f -k

clean:
	find . -name '*.gz' -exec rm {} \;
	find . -name '*.br' -exec rm {} \;

serve:
	go run server.go
