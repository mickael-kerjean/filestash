//go:generate go run internal/cmd/gentoken/main.go

// Package jwt implements JSON Web Tokens as described in https://tools.ietf.org/html/rfc7519
package jwt

import (
	"bytes"
	"context"
	"io"
	"io/ioutil"
	"strings"
	"sync/atomic"
	"time"

	"github.com/lestrrat-go/jwx"
	"github.com/lestrrat-go/jwx/internal/json"
	"github.com/lestrrat-go/jwx/jwe"

	"github.com/lestrrat-go/jwx/jwa"
	"github.com/lestrrat-go/jwx/jwk"
	"github.com/lestrrat-go/jwx/jws"
	"github.com/pkg/errors"
)

const _jwt = `jwt`

// Settings controls global settings that are specific to JWTs.
func Settings(options ...GlobalOption) {
	var flattenAudienceBool bool

	//nolint:forcetypeassert
	for _, option := range options {
		switch option.Ident() {
		case identFlattenAudience{}:
			flattenAudienceBool = option.Value().(bool)
		}
	}

	v := atomic.LoadUint32(&json.FlattenAudience)
	if (v == 1) != flattenAudienceBool {
		var newVal uint32
		if flattenAudienceBool {
			newVal = 1
		}
		atomic.CompareAndSwapUint32(&json.FlattenAudience, v, newVal)
	}
}

var registry = json.NewRegistry()

// ParseString calls Parse against a string
func ParseString(s string, options ...ParseOption) (Token, error) {
	return parseBytes([]byte(s), options...)
}

// Parse parses the JWT token payload and creates a new `jwt.Token` object.
// The token must be encoded in either JSON format or compact format.
//
// This function can work with encrypted and/or signed tokens. Any combination
// of JWS and JWE may be applied to the token, but this function will only
// attempt to verify/decrypt up to 2 levels (i.e. JWS only, JWE only, JWS then
// JWE, or JWE then JWS)
//
// If the token is signed and you want to verify the payload matches the signature,
// you must pass the jwt.WithVerify(alg, key) or jwt.WithKeySet(jwk.Set) option.
// If you do not specify these parameters, no verification will be performed.
//
// If you also want to assert the validity of the JWT itself (i.e. expiration
// and such), use the `Validate()` function on the returned token, or pass the
// `WithValidate(true)` option. Validate options can also be passed to
// `Parse`
//
// This function takes both ParseOption and ValidateOption types:
// ParseOptions control the parsing behavior, and ValidateOptions are
// passed to `Validate()` when `jwt.WithValidate` is specified.
func Parse(s []byte, options ...ParseOption) (Token, error) {
	return parseBytes(s, options...)
}

// ParseReader calls Parse against an io.Reader
func ParseReader(src io.Reader, options ...ParseOption) (Token, error) {
	// We're going to need the raw bytes regardless. Read it.
	data, err := ioutil.ReadAll(src)
	if err != nil {
		return nil, errors.Wrap(err, `failed to read from token data source`)
	}
	return parseBytes(data, options...)
}

type parseCtx struct {
	decryptParams DecryptParameters
	verifyParams  VerifyParameters
	keySet        jwk.Set
	token         Token
	validateOpts  []ValidateOption
	localReg      *json.Registry
	pedantic      bool
	useDefault    bool
	validate      bool
}

func parseBytes(data []byte, options ...ParseOption) (Token, error) {
	var ctx parseCtx
	for _, o := range options {
		if v, ok := o.(ValidateOption); ok {
			ctx.validateOpts = append(ctx.validateOpts, v)
			continue
		}

		//nolint:forcetypeassert
		switch o.Ident() {
		case identVerify{}:
			ctx.verifyParams = o.Value().(VerifyParameters)
		case identDecrypt{}:
			ctx.decryptParams = o.Value().(DecryptParameters)
		case identKeySet{}:
			ks, ok := o.Value().(jwk.Set)
			if !ok {
				return nil, errors.Errorf(`invalid JWK set passed via WithKeySet() option (%T)`, o.Value())
			}
			ctx.keySet = ks
		case identToken{}:
			token, ok := o.Value().(Token)
			if !ok {
				return nil, errors.Errorf(`invalid token passed via WithToken() option (%T)`, o.Value())
			}
			ctx.token = token
		case identPedantic{}:
			ctx.pedantic = o.Value().(bool)
		case identDefault{}:
			ctx.useDefault = o.Value().(bool)
		case identValidate{}:
			ctx.validate = o.Value().(bool)
		case identTypedClaim{}:
			pair := o.Value().(typedClaimPair)
			if ctx.localReg == nil {
				ctx.localReg = json.NewRegistry()
			}
			ctx.localReg.Register(pair.Name, pair.Value)
		}
	}

	data = bytes.TrimSpace(data)

	// TODO: This must be moved elsewhere
	// If with matching kid is true, then look for the corresponding key in the
	// given key set, by matching the "kid" key
	if ks := ctx.keySet; ks != nil {
		alg, key, err := lookupMatchingKey(data, ks, ctx.useDefault)
		if err != nil {
			return nil, errors.Wrap(err, `failed to find matching key for verification`)
		}
		ctx.verifyParams = &verifyParams{alg: alg, key: key}
	}
	return parse(&ctx, data)
}

// verify parameter exists to make sure that we don't accidentally skip
// over verification just because alg == ""  or key == nil or something.
func parse(ctx *parseCtx, data []byte) (Token, error) {
	payload := data
	const maxDecodeLevels = 2

	// If cty = `JWT`, we expect this to be a nested structure
	var expectNested bool

OUTER:
	for i := 0; i < maxDecodeLevels; i++ {
		switch kind := jwx.GuessFormat(payload); kind {
		case jwx.JWT:
			if ctx.pedantic {
				if expectNested {
					return nil, errors.Errorf(`expected nested encrypted/signed payload, got raw JWT`)
				}
			}
			break OUTER
		case jwx.UnknownFormat:
			// "Unknown" may include invalid JWTs, for example, those who lack "aud"
			// claim. We could be pedantic and reject these
			if ctx.pedantic {
				return nil, errors.Errorf(`invalid JWT`)
			}
			break OUTER
		case jwx.JWS:
			// For backwards compatibility, we must allow parsing the JWT
			// without verifying its contents
			if vp := ctx.verifyParams; vp != nil {
				// If verify is true, the data MUST be a valid jws message
				var m *jws.Message
				var verifyOpts []jws.VerifyOption
				if ctx.pedantic {
					m = jws.NewMessage()
					verifyOpts = []jws.VerifyOption{jws.WithMessage(m)}
				}
				v, err := jws.Verify(payload, vp.Algorithm(), vp.Key(), verifyOpts...)
				if err != nil {
					return nil, errors.Wrap(err, `failed to verify jws signature`)
				}

				if !ctx.pedantic {
					payload = v
					continue
				}
				// This payload could be a JWT+JWS, in which case typ: JWT should be there
				// If its JWT+(JWE or JWS or...)+JWS, then cty should be JWT
				for _, sig := range m.Signatures() {
					hdrs := sig.ProtectedHeaders()
					if strings.ToLower(hdrs.Type()) == _jwt {
						payload = v
						break OUTER
					}

					if strings.ToLower(hdrs.ContentType()) == _jwt {
						expectNested = true
						payload = v
						continue OUTER
					}
				}

				// Hmmm, it was a JWS and we got... nothing?
				return nil, errors.Errorf(`expected "typ" or "cty" fields, neither could be found`)
			}

			// No verification.
			m, err := jws.Parse(data)
			if err != nil {
				return nil, errors.Wrap(err, `invalid jws message`)
			}
			payload = m.Payload()
		case jwx.JWE:
			dp := ctx.decryptParams
			if dp == nil {
				return nil, errors.Errorf(`jwt.Parse: cannot proceed with JWE encrypted payload without decryption parameters`)
			}

			var m *jwe.Message
			var decryptOpts []jwe.DecryptOption
			if ctx.pedantic {
				m = jwe.NewMessage()
				decryptOpts = []jwe.DecryptOption{jwe.WithMessage(m)}
			}

			v, err := jwe.Decrypt(data, dp.Algorithm(), dp.Key(), decryptOpts...)
			if err != nil {
				return nil, errors.Wrap(err, `failed to decrypt payload`)
			}

			if !ctx.pedantic {
				payload = v
				continue
			}

			if strings.ToLower(m.ProtectedHeaders().Type()) == _jwt {
				payload = v
				break OUTER
			}

			if strings.ToLower(m.ProtectedHeaders().ContentType()) == _jwt {
				expectNested = true
				payload = v
				continue OUTER
			}
		default:
			return nil, errors.Errorf(`unsupported format (layer: #%d)`, i+1)
		}
		expectNested = false
	}

	if ctx.token == nil {
		ctx.token = New()
	}

	if ctx.localReg != nil {
		dcToken, ok := ctx.token.(TokenWithDecodeCtx)
		if !ok {
			return nil, errors.Errorf(`typed claim was requested, but the token (%T) does not support DecodeCtx`, ctx.token)
		}
		dc := json.NewDecodeCtx(ctx.localReg)
		dcToken.SetDecodeCtx(dc)
		defer func() { dcToken.SetDecodeCtx(nil) }()
	}

	if err := json.Unmarshal(payload, ctx.token); err != nil {
		return nil, errors.Wrap(err, `failed to parse token`)
	}

	if ctx.validate {
		if err := Validate(ctx.token, ctx.validateOpts...); err != nil {
			return nil, err
		}
	}
	return ctx.token, nil
}

func lookupMatchingKey(data []byte, keyset jwk.Set, useDefault bool) (jwa.SignatureAlgorithm, interface{}, error) {
	msg, err := jws.Parse(data)
	if err != nil {
		return "", nil, errors.Wrap(err, `failed to parse token data`)
	}

	headers := msg.Signatures()[0].ProtectedHeaders()
	kid := headers.KeyID()
	if kid == "" {
		if !useDefault {
			return "", nil, errors.New(`failed to find matching key: no key ID specified in token`)
		} else if useDefault && keyset.Len() > 1 {
			return "", nil, errors.New(`failed to find matching key: no key ID specified in token but multiple in key set`)
		}
	}

	var key jwk.Key
	var ok bool
	if kid == "" {
		key, ok = keyset.Get(0)
		if !ok {
			return "", nil, errors.New(`empty keyset`)
		}
	} else {
		key, ok = keyset.LookupKeyID(kid)
		if !ok {
			return "", nil, errors.Errorf(`failed to find matching key for key ID %#v in key set`, kid)
		}
	}

	var rawKey interface{}
	if err := key.Raw(&rawKey); err != nil {
		return "", nil, errors.Wrapf(err, `failed to construct raw key from keyset (key ID=%#v)`, kid)
	}

	var alg jwa.SignatureAlgorithm
	if err := alg.Accept(key.Algorithm()); err != nil {
		return "", nil, errors.Wrapf(err, `invalid signature algorithm %s`, key.Algorithm())
	}

	return alg, rawKey, nil
}

// Sign is a convenience function to create a signed JWT token serialized in
// compact form.
//
// It accepts either a raw key (e.g. rsa.PrivateKey, ecdsa.PrivateKey, etc)
// or a jwk.Key, and the name of the algorithm that should be used to sign
// the token.
//
// If the key is a jwk.Key and the key contains a key ID (`kid` field),
// then it is added to the protected header generated by the signature
//
// The algorithm specified in the `alg` parameter must be able to support
// the type of key you provided, otherwise an error is returned.
//
// The protected header will also automatically have the `typ` field set
// to the literal value `JWT`, unless you provide a custom value for it
// by jwt.WithHeaders option.
func Sign(t Token, alg jwa.SignatureAlgorithm, key interface{}, options ...SignOption) ([]byte, error) {
	return NewSerializer().Sign(alg, key, options...).Serialize(t)
}

// Equal compares two JWT tokens. Do not use `reflect.Equal` or the like
// to compare tokens as they will also compare extra detail such as
// sync.Mutex objects used to control concurrent access.
//
// The comparison for values is currently done using a simple equality ("=="),
// except for time.Time, which uses time.Equal after dropping the monotonic
// clock and truncating the values to 1 second accuracy.
//
// if both t1 and t2 are nil, returns true
func Equal(t1, t2 Token) bool {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if t1 == nil && t2 == nil {
		return true
	}

	// we already checked for t1 == t2 == nil, so safe to do this
	if t1 == nil || t2 == nil {
		return false
	}

	m1, err := t1.AsMap(ctx)
	if err != nil {
		return false
	}

	for iter := t2.Iterate(ctx); iter.Next(ctx); {
		pair := iter.Pair()

		v1 := m1[pair.Key.(string)]
		v2 := pair.Value
		switch tmp := v1.(type) {
		case time.Time:
			tmp2, ok := v2.(time.Time)
			if !ok {
				return false
			}
			tmp = tmp.Round(0).Truncate(time.Second)
			tmp2 = tmp2.Round(0).Truncate(time.Second)
			if !tmp.Equal(tmp2) {
				return false
			}
		default:
			if v1 != v2 {
				return false
			}
		}
		delete(m1, pair.Key.(string))
	}

	return len(m1) == 0
}

func (t *stdToken) Clone() (Token, error) {
	dst := New()

	ctx := context.Background()
	for iter := t.Iterate(ctx); iter.Next(ctx); {
		pair := iter.Pair()
		if err := dst.Set(pair.Key.(string), pair.Value); err != nil {
			return nil, errors.Wrapf(err, `failed to set %s`, pair.Key.(string))
		}
	}
	return dst, nil
}

// RegisterCustomField allows users to specify that a private field
// be decoded as an instance of the specified type. This option has
// a global effect.
//
// For example, suppose you have a custom field `x-birthday`, which
// you want to represent as a string formatted in RFC3339 in JSON,
// but want it back as `time.Time`.
//
// In that case you would register a custom field as follows
//
//   jwt.RegisterCustomField(`x-birthday`, timeT)
//
// Then `token.Get("x-birthday")` will still return an `interface{}`,
// but you can convert its type to `time.Time`
//
//   bdayif, _ := token.Get(`x-birthday`)
//   bday := bdayif.(time.Time)
//
func RegisterCustomField(name string, object interface{}) {
	registry.Register(name, object)
}
