package samlsp

import (
	"crypto/rsa"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4"

	"github.com/mickael-kerjean/saml"
)

const (
	defaultSessionMaxAge  = time.Hour
	claimNameSessionIndex = "SessionIndex"
)

// JWTSessionCodec implements SessionCoded to encode and decode Sessions from
// the corresponding JWT.
type JWTSessionCodec struct {
	SigningMethod jwt.SigningMethod
	Audience      string
	Issuer        string
	MaxAge        time.Duration
	Key           *rsa.PrivateKey
}

var _ SessionCodec = JWTSessionCodec{}

// New creates a Session from the SAML assertion.
//
// The returned Session is a JWTSessionClaims.
func (c JWTSessionCodec) New(assertion *saml.Assertion) (Session, error) {
	now := saml.TimeNow()
	claims := JWTSessionClaims{}
	claims.SAMLSession = true
	claims.Audience = c.Audience
	claims.Issuer = c.Issuer
	claims.IssuedAt = now.Unix()
	claims.ExpiresAt = now.Add(c.MaxAge).Unix()
	claims.NotBefore = now.Unix()

	if sub := assertion.Subject; sub != nil {
		if nameID := sub.NameID; nameID != nil {
			claims.Subject = nameID.Value
		}
	}

	claims.Attributes = map[string][]string{}

	for _, attributeStatement := range assertion.AttributeStatements {
		for _, attr := range attributeStatement.Attributes {
			claimName := attr.FriendlyName
			if claimName == "" {
				claimName = attr.Name
			}
			for _, value := range attr.Values {
				claims.Attributes[claimName] = append(claims.Attributes[claimName], value.Value)
			}
		}
	}

	// add SessionIndex to claims Attributes
	for _, authnStatement := range assertion.AuthnStatements {
		claims.Attributes[claimNameSessionIndex] = append(claims.Attributes[claimNameSessionIndex],
			authnStatement.SessionIndex)
	}

	return claims, nil
}

// Encode returns a serialized version of the Session.
//
// The provided session must be a JWTSessionClaims, otherwise this
// function will panic.
func (c JWTSessionCodec) Encode(s Session) (string, error) {
	claims := s.(JWTSessionClaims) // this will panic if you pass the wrong kind of session

	token := jwt.NewWithClaims(c.SigningMethod, claims)
	signedString, err := token.SignedString(c.Key)
	if err != nil {
		return "", err
	}

	return signedString, nil
}

// Decode parses the serialized session that may have been returned by Encode
// and returns a Session.
func (c JWTSessionCodec) Decode(signed string) (Session, error) {
	parser := jwt.Parser{
		ValidMethods: []string{c.SigningMethod.Alg()},
	}
	claims := JWTSessionClaims{}
	_, err := parser.ParseWithClaims(signed, &claims, func(*jwt.Token) (interface{}, error) {
		return c.Key.Public(), nil
	})
	// TODO(ross): check for errors due to bad time and return ErrNoSession
	if err != nil {
		return nil, err
	}
	if !claims.VerifyAudience(c.Audience, true) {
		return nil, fmt.Errorf("expected audience %q, got %q", c.Audience, claims.Audience)
	}
	if !claims.VerifyIssuer(c.Issuer, true) {
		return nil, fmt.Errorf("expected issuer %q, got %q", c.Issuer, claims.Issuer)
	}
	if claims.SAMLSession != true {
		return nil, errors.New("expected saml-session")
	}
	return claims, nil
}

// JWTSessionClaims represents the JWT claims in the encoded session
type JWTSessionClaims struct {
	jwt.StandardClaims
	Attributes  Attributes `json:"attr"`
	SAMLSession bool       `json:"saml-session"`
}

var _ Session = JWTSessionClaims{}

// GetAttributes implements SessionWithAttributes. It returns the SAMl attributes.
func (c JWTSessionClaims) GetAttributes() Attributes {
	return c.Attributes
}

// Attributes is a map of attributes provided in the SAML assertion
type Attributes map[string][]string

// Get returns the first attribute named `key` or an empty string if
// no such attributes is present.
func (a Attributes) Get(key string) string {
	if a == nil {
		return ""
	}
	v := a[key]
	if len(v) == 0 {
		return ""
	}
	return v[0]
}
