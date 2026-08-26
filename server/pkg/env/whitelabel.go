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

type licenseOption struct {
	license string
	product string
}

func LicensedAs(license string, opts ...func(*licenseOption)) {
	cfg := licenseOption{
		license: license,
		product: APPNAME,
	}
	for _, opt := range opts {
		opt(&cfg)
	}
	LICENSE = cfg.license
	APPNAME = cfg.product
}

func WithBrand(name string) func(*licenseOption) {
	return func(o *licenseOption) { o.product = name }
}
