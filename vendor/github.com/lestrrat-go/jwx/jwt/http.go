package jwt

import (
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/pkg/errors"
)

// ParseHeader parses a JWT stored in a http.Header.
//
// For the header "Authorization", it will strip the prefix "Bearer " and will
// treat the remaining value as a JWT.
func ParseHeader(hdr http.Header, name string, options ...ParseOption) (Token, error) {
	key := http.CanonicalHeaderKey(name)
	v := strings.TrimSpace(hdr.Get(key))
	if v == "" {
		return nil, errors.Errorf(`empty header (%s)`, key)
	}

	if key == "Authorization" {
		// Authorization header is an exception. We strip the "Bearer " from
		// the prefix
		v = strings.TrimSpace(strings.TrimPrefix(v, "Bearer"))
	}

	return ParseString(v, options...)
}

// ParseForm parses a JWT stored in a url.Value.
func ParseForm(values url.Values, name string, options ...ParseOption) (Token, error) {
	v := strings.TrimSpace(values.Get(name))
	if v == "" {
		return nil, errors.Errorf(`empty value (%s)`, name)
	}

	return ParseString(v, options...)
}

// ParseRequest searches a http.Request object for a JWT token.
//
// Specifying WithHeaderKey() will tell it to search under a specific
// header key. Specifying WithFormKey() will tell it to search under
// a specific form field.
//
// By default, "Authorization" header will be searched.
//
// If WithHeaderKey() is used, you must explicitly re-enable searching for "Authorization" header.
//
//   # searches for "Authorization"
//   jwt.ParseRequest(req)
//
//   # searches for "x-my-token" ONLY.
//   jwt.ParseRequest(req, http.WithHeaderKey("x-my-token"))
//
//   # searches for "Authorization" AND "x-my-token"
//   jwt.ParseRequest(req, http.WithHeaderKey("Authorization"), http.WithHeaderKey("x-my-token"))
func ParseRequest(req *http.Request, options ...ParseOption) (Token, error) {
	var hdrkeys []string
	var formkeys []string
	var parseOptions []ParseOption
	for _, option := range options {
		switch option.Ident() {
		case identHeaderKey{}:
			hdrkeys = append(hdrkeys, option.Value().(string))
		case identFormKey{}:
			formkeys = append(formkeys, option.Value().(string))
		default:
			parseOptions = append(parseOptions, option)
		}
	}
	if len(hdrkeys) == 0 {
		hdrkeys = append(hdrkeys, "Authorization")
	}

	for _, hdrkey := range hdrkeys {
		if tok, err := ParseHeader(req.Header, hdrkey, parseOptions...); err == nil {
			return tok, nil
		}
	}

	if cl := req.ContentLength; cl > 0 {
		if err := req.ParseForm(); err != nil {
			return nil, errors.Wrap(err, `failed to parse form`)
		}
	}

	for _, formkey := range formkeys {
		if tok, err := ParseForm(req.Form, formkey, parseOptions...); err == nil {
			return tok, nil
		}
	}

	// Everything below is a preulde to error reporting.
	var triedHdrs strings.Builder
	for i, hdrkey := range hdrkeys {
		if i > 0 {
			triedHdrs.WriteString(", ")
		}
		triedHdrs.WriteString(strconv.Quote(hdrkey))
	}

	var triedForms strings.Builder
	for i, formkey := range formkeys {
		if i > 0 {
			triedForms.WriteString(", ")
		}
		triedForms.WriteString(strconv.Quote(formkey))
	}

	var b strings.Builder
	b.WriteString(`failed to find token in any location of the request (tried: [header keys: `)
	if triedHdrs.Len() == 0 {
		b.WriteString(`"Authorization"`)
	} else {
		b.WriteString(triedHdrs.String())
	}
	b.WriteByte(']')
	if triedForms.Len() > 0 {
		b.WriteString(", form keys: [")
		b.WriteString(triedForms.String())
		b.WriteByte(']')
	}
	b.WriteByte(')')

	return nil, errors.New(b.String())
}
