//go:generate go run internal/cmd/genreadfile/main.go
//go:generate stringer -type=FormatKind
//go:generate mv formatkind_string.go formatkind_string_gen.go

// Package jwx contains tools that deal with the various JWx (JOSE)
// technologies such as JWT, JWS, JWE, etc in Go.
//
//    JWS (https://tools.ietf.org/html/rfc7515)
//    JWE (https://tools.ietf.org/html/rfc7516)
//    JWK (https://tools.ietf.org/html/rfc7517)
//    JWA (https://tools.ietf.org/html/rfc7518)
//    JWT (https://tools.ietf.org/html/rfc7519)
//
// The primary focus of this library tool set is to implement the extremely
// flexible OAuth2 / OpenID Connect protocols. There are many other libraries
// out there that deal with all or parts of these JWx technologies:
//
//    https://github.com/dgrijalva/jwt-go
//    https://github.com/square/go-jose
//    https://github.com/coreos/oidc
//    https://golang.org/x/oauth2
//
// This library exists because there was a need for a toolset that encompasses
// the whole set of JWx technologies in a highly customizable manner, in one package.
//
// You can find more high level documentation at Github (https://github.com/lestrrat-go/jwx)
package jwx

import (
	"github.com/lestrrat-go/jwx/internal/json"
)

// DecoderSettings gives you a access to configure the "encoding/json".Decoder
// used to decode JSON objects within the jwx framework.
func DecoderSettings(options ...JSONOption) {
	// XXX We're using this format instead of just passing a single boolean
	// in case a new option is to be added some time later
	var useNumber bool
	for _, option := range options {
		//nolint:forcetypeassert
		switch option.Ident() {
		case identUseNumber{}:
			useNumber = option.Value().(bool)
		}
	}

	json.DecoderSettings(useNumber)
}
