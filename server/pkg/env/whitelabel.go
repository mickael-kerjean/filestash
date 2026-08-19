package env

func IsWhiteLabel() bool {
	return APPNAME != "Filestash"
}

func WhiteLabelText(a, b string) string {
	if IsWhiteLabel() {
		return b
	}
	return a
}
