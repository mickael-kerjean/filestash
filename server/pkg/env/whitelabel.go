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

func PROGRAM_LICENSE(license string) {
	LICENSE = license
}

func PROGRAM_NAME(name string) {
	APPNAME = name
}
