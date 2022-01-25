package saml

import (
	"bytes"
	"compress/flate"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/xml"
	"errors"
	"fmt"
	"html/template"
	"io/ioutil"
	"net/http"
	"net/url"
	"regexp"
	"time"

	xrv "github.com/mattermost/xml-roundtrip-validator"

	"github.com/beevik/etree"
	dsig "github.com/russellhaering/goxmldsig"
	"github.com/russellhaering/goxmldsig/etreeutils"

	"github.com/crewjam/saml/xmlenc"
)

// NameIDFormat is the format of the id
type NameIDFormat string

// Element returns an XML element representation of n.
func (n NameIDFormat) Element() *etree.Element {
	el := etree.NewElement("")
	el.SetText(string(n))
	return el
}

// Name ID formats
const (
	UnspecifiedNameIDFormat  NameIDFormat = "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
	TransientNameIDFormat    NameIDFormat = "urn:oasis:names:tc:SAML:2.0:nameid-format:transient"
	EmailAddressNameIDFormat NameIDFormat = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
	PersistentNameIDFormat   NameIDFormat = "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent"
)

// SignatureVerifier verifies a signature
//
// Can be implemented in order to override ServiceProvider's default
// way of verifying signatures.
type SignatureVerifier interface {
	VerifySignature(validationContext *dsig.ValidationContext, el *etree.Element) error
}

// ServiceProvider implements SAML Service provider.
//
// In SAML, service providers delegate responsibility for identifying
// clients to an identity provider. If you are writing an application
// that uses passwords (or whatever) stored somewhere else, then you
// are service provider.
//
// See the example directory for an example of a web application using
// the service provider interface.
type ServiceProvider struct {
	// Entity ID is optional - if not specified then MetadataURL will be used
	EntityID string

	// Key is the RSA private key we use to sign requests.
	Key *rsa.PrivateKey

	// Certificate is the RSA public part of Key.
	Certificate   *x509.Certificate
	Intermediates []*x509.Certificate

	// MetadataURL is the full URL to the metadata endpoint on this host,
	// i.e. https://example.com/saml/metadata
	MetadataURL url.URL

	// AcsURL is the full URL to the SAML Assertion Customer Service endpoint
	// on this host, i.e. https://example.com/saml/acs
	AcsURL url.URL

	// SloURL is the full URL to the SAML Single Logout endpoint on this host.
	// i.e. https://example.com/saml/slo
	SloURL url.URL

	// IDPMetadata is the metadata from the identity provider.
	IDPMetadata *EntityDescriptor

	// AuthnNameIDFormat is the format used in the NameIDPolicy for
	// authentication requests
	AuthnNameIDFormat NameIDFormat

	// MetadataValidDuration is a duration used to calculate validUntil
	// attribute in the metadata endpoint
	MetadataValidDuration time.Duration

	// ForceAuthn allows you to force re-authentication of users even if the user
	// has a SSO session at the IdP.
	ForceAuthn *bool

	// AllowIdpInitiated
	AllowIDPInitiated bool

	// DefaultRedirectURI where untracked requests (as of IDPInitiated) are redirected to
	DefaultRedirectURI string

	// SignatureVerifier, if non-nil, allows you to implement an alternative way
	// to verify signatures.
	SignatureVerifier SignatureVerifier

	// SignatureMethod, if non-empty, authentication requests will be signed
	SignatureMethod string
}

// MaxIssueDelay is the longest allowed time between when a SAML assertion is
// issued by the IDP and the time it is received by ParseResponse. This is used
// to prevent old responses from being replayed (while allowing for some clock
// drift between the SP and IDP).
var MaxIssueDelay = time.Second * 90

// MaxClockSkew allows for leeway for clock skew between the IDP and SP when
// validating assertions. It defaults to 180 seconds (matches shibboleth).
var MaxClockSkew = time.Second * 180

// DefaultValidDuration is how long we assert that the SP metadata is valid.
const DefaultValidDuration = time.Hour * 24 * 2

// DefaultCacheDuration is how long we ask the IDP to cache the SP metadata.
const DefaultCacheDuration = time.Hour * 24 * 1

// Metadata returns the service provider metadata
func (sp *ServiceProvider) Metadata() *EntityDescriptor {
	validDuration := DefaultValidDuration
	if sp.MetadataValidDuration > 0 {
		validDuration = sp.MetadataValidDuration
	}

	authnRequestsSigned := len(sp.SignatureMethod) > 0
	wantAssertionsSigned := true
	validUntil := TimeNow().Add(validDuration)

	var keyDescriptors []KeyDescriptor
	if sp.Certificate != nil {
		certBytes := sp.Certificate.Raw
		for _, intermediate := range sp.Intermediates {
			certBytes = append(certBytes, intermediate.Raw...)
		}
		keyDescriptors = []KeyDescriptor{
			{
				Use: "encryption",
				KeyInfo: KeyInfo{
					X509Data: X509Data{
						X509Certificates: []X509Certificate{
							{Data: base64.StdEncoding.EncodeToString(certBytes)},
						},
					},
				},
				EncryptionMethods: []EncryptionMethod{
					{Algorithm: "http://www.w3.org/2001/04/xmlenc#aes128-cbc"},
					{Algorithm: "http://www.w3.org/2001/04/xmlenc#aes192-cbc"},
					{Algorithm: "http://www.w3.org/2001/04/xmlenc#aes256-cbc"},
					{Algorithm: "http://www.w3.org/2001/04/xmlenc#rsa-oaep-mgf1p"},
				},
			},
		}
		if len(sp.SignatureMethod) > 0 {
			keyDescriptors = append(keyDescriptors, KeyDescriptor{
				Use: "signing",
				KeyInfo: KeyInfo{
					X509Data: X509Data{
						X509Certificates: []X509Certificate{
							{Data: base64.StdEncoding.EncodeToString(certBytes)},
						},
					},
				},
			})
		}
	}

	return &EntityDescriptor{
		EntityID:   firstSet(sp.EntityID, sp.MetadataURL.String()),
		ValidUntil: validUntil,

		SPSSODescriptors: []SPSSODescriptor{
			{
				SSODescriptor: SSODescriptor{
					RoleDescriptor: RoleDescriptor{
						ProtocolSupportEnumeration: "urn:oasis:names:tc:SAML:2.0:protocol",
						KeyDescriptors:             keyDescriptors,
						ValidUntil:                 &validUntil,
					},
					SingleLogoutServices: []Endpoint{
						{
							Binding:          HTTPPostBinding,
							Location:         sp.SloURL.String(),
							ResponseLocation: sp.SloURL.String(),
						},
					},
				},
				AuthnRequestsSigned:  &authnRequestsSigned,
				WantAssertionsSigned: &wantAssertionsSigned,

				AssertionConsumerServices: []IndexedEndpoint{
					{
						Binding:  HTTPPostBinding,
						Location: sp.AcsURL.String(),
						Index:    1,
					},
					{
						Binding:  HTTPArtifactBinding,
						Location: sp.AcsURL.String(),
						Index:    2,
					},
				},
			},
		},
	}
}

// MakeRedirectAuthenticationRequest creates a SAML authentication request using
// the HTTP-Redirect binding. It returns a URL that we will redirect the user to
// in order to start the auth process.
func (sp *ServiceProvider) MakeRedirectAuthenticationRequest(relayState string) (*url.URL, error) {
	req, err := sp.MakeAuthenticationRequest(sp.GetSSOBindingLocation(HTTPRedirectBinding), HTTPRedirectBinding, HTTPPostBinding)
	if err != nil {
		return nil, err
	}
	return req.Redirect(relayState, sp)
}

// Redirect returns a URL suitable for using the redirect binding with the request
func (req *AuthnRequest) Redirect(relayState string, sp *ServiceProvider) (*url.URL, error) {
	w := &bytes.Buffer{}
	w1 := base64.NewEncoder(base64.StdEncoding, w)
	w2, _ := flate.NewWriter(w1, 9)
	doc := etree.NewDocument()
	doc.SetRoot(req.Element())
	if _, err := doc.WriteTo(w2); err != nil {
		panic(err)
	}
	w2.Close()
	w1.Close()

	rv, _ := url.Parse(req.Destination)
	// We can't depend on Query().set() as order matters for signing
	query := rv.RawQuery
	if len(query) > 0 {
		query += "&SAMLRequest=" + url.QueryEscape(string(w.Bytes()))
	} else {
		query += "SAMLRequest=" + url.QueryEscape(string(w.Bytes()))
	}

	if relayState != "" {
		query += "&RelayState=" + relayState
	}
	if len(sp.SignatureMethod) > 0 {
		query += "&SigAlg=" + url.QueryEscape(sp.SignatureMethod)
		signingContext, err := GetSigningContext(sp)

		if err != nil {
			return nil, err
		}

		sig, err := signingContext.SignString(query)
		if err != nil {
			return nil, err
		}
		query += "&Signature=" + url.QueryEscape(base64.StdEncoding.EncodeToString(sig))
	}

	rv.RawQuery = query

	return rv, nil
}

// GetSSOBindingLocation returns URL for the IDP's Single Sign On Service binding
// of the specified type (HTTPRedirectBinding or HTTPPostBinding)
func (sp *ServiceProvider) GetSSOBindingLocation(binding string) string {
	for _, idpSSODescriptor := range sp.IDPMetadata.IDPSSODescriptors {
		for _, singleSignOnService := range idpSSODescriptor.SingleSignOnServices {
			if singleSignOnService.Binding == binding {
				return singleSignOnService.Location
			}
		}
	}
	return ""
}

// GetArtifactBindingLocation returns URL for the IDP's Artifact binding of the
// specified type
func (sp *ServiceProvider) GetArtifactBindingLocation(binding string) string {
	for _, idpSSODescriptor := range sp.IDPMetadata.IDPSSODescriptors {
		for _, artifactResolutionService := range idpSSODescriptor.ArtifactResolutionServices {
			if artifactResolutionService.Binding == binding {
				return artifactResolutionService.Location
			}
		}
	}
	return ""
}

// GetSLOBindingLocation returns URL for the IDP's Single Log Out Service binding
// of the specified type (HTTPRedirectBinding or HTTPPostBinding)
func (sp *ServiceProvider) GetSLOBindingLocation(binding string) string {
	for _, idpSSODescriptor := range sp.IDPMetadata.IDPSSODescriptors {
		for _, singleLogoutService := range idpSSODescriptor.SingleLogoutServices {
			if singleLogoutService.Binding == binding {
				return singleLogoutService.Location
			}
		}
	}
	return ""
}

// getIDPSigningCerts returns the certificates which we can use to verify things
// signed by the IDP in PEM format, or nil if no such certificate is found.
func (sp *ServiceProvider) getIDPSigningCerts() ([]*x509.Certificate, error) {
	var certStrs []string

	// We need to include non-empty certs where the "use" attribute is
	// either set to "signing" or is missing
	for _, idpSSODescriptor := range sp.IDPMetadata.IDPSSODescriptors {
		for _, keyDescriptor := range idpSSODescriptor.KeyDescriptors {
			if len(keyDescriptor.KeyInfo.X509Data.X509Certificates) != 0 {
				switch keyDescriptor.Use {
				case "", "signing":
					for _, certificate := range keyDescriptor.KeyInfo.X509Data.X509Certificates {
						certStrs = append(certStrs, certificate.Data)
					}
				}
			}
		}
	}

	if len(certStrs) == 0 {
		return nil, errors.New("cannot find any signing certificate in the IDP SSO descriptor")
	}

	var certs []*x509.Certificate

	// cleanup whitespace
	regex := regexp.MustCompile(`\s+`)
	for _, certStr := range certStrs {
		certStr = regex.ReplaceAllString(certStr, "")
		certBytes, err := base64.StdEncoding.DecodeString(certStr)
		if err != nil {
			return nil, fmt.Errorf("cannot parse certificate: %s", err)
		}

		parsedCert, err := x509.ParseCertificate(certBytes)
		if err != nil {
			return nil, err
		}
		certs = append(certs, parsedCert)
	}

	return certs, nil
}

// MakeArtifactResolveRequest produces a new ArtifactResolve object to send to the idp's Artifact resolver
func (sp *ServiceProvider) MakeArtifactResolveRequest(artifactID string) (*ArtifactResolve, error) {
	req := ArtifactResolve{
		ID:           fmt.Sprintf("id-%x", randomBytes(20)),
		IssueInstant: TimeNow(),
		Version:      "2.0",
		Issuer: &Issuer{
			Format: "urn:oasis:names:tc:SAML:2.0:nameid-format:entity",
			Value:  firstSet(sp.EntityID, sp.MetadataURL.String()),
		},
		Artifact: artifactID,
	}

	if len(sp.SignatureMethod) > 0 {
		if err := sp.SignArtifactResolve(&req); err != nil {
			return nil, err
		}
	}

	return &req, nil
}

// MakeAuthenticationRequest produces a new AuthnRequest object to send to the idpURL
// that uses the specified binding (HTTPRedirectBinding or HTTPPostBinding)
func (sp *ServiceProvider) MakeAuthenticationRequest(idpURL string, binding string, resultBinding string) (*AuthnRequest, error) {

	allowCreate := true
	nameIDFormat := sp.nameIDFormat()
	req := AuthnRequest{
		AssertionConsumerServiceURL: sp.AcsURL.String(),
		Destination:                 idpURL,
		ProtocolBinding:             resultBinding, // default binding for the response
		ID:                          fmt.Sprintf("id-%x", randomBytes(20)),
		IssueInstant:                TimeNow(),
		Version:                     "2.0",
		Issuer: &Issuer{
			Format: "urn:oasis:names:tc:SAML:2.0:nameid-format:entity",
			Value:  firstSet(sp.EntityID, sp.MetadataURL.String()),
		},
		NameIDPolicy: &NameIDPolicy{
			AllowCreate: &allowCreate,
			// TODO(ross): figure out exactly policy we need
			// urn:mace:shibboleth:1.0:nameIdentifier
			// urn:oasis:names:tc:SAML:2.0:nameid-format:transient
			Format: &nameIDFormat,
		},
		ForceAuthn: sp.ForceAuthn,
	}
	// We don't need to sign the XML document if the IDP uses HTTP-Redirect binding
	if len(sp.SignatureMethod) > 0 && binding == HTTPPostBinding {
		if err := sp.SignAuthnRequest(&req); err != nil {
			return nil, err
		}
	}
	return &req, nil
}

// GetSigningContext returns a dsig.SigningContext initialized based on the Service Provider's configuration
func GetSigningContext(sp *ServiceProvider) (*dsig.SigningContext, error) {
	keyPair := tls.Certificate{
		Certificate: [][]byte{sp.Certificate.Raw},
		PrivateKey:  sp.Key,
		Leaf:        sp.Certificate,
	}
	// TODO: add intermediates for SP
	//for _, cert := range sp.Intermediates {
	//	keyPair.Certificate = append(keyPair.Certificate, cert.Raw)
	//}
	keyStore := dsig.TLSCertKeyStore(keyPair)

	if sp.SignatureMethod != dsig.RSASHA1SignatureMethod &&
		sp.SignatureMethod != dsig.RSASHA256SignatureMethod &&
		sp.SignatureMethod != dsig.RSASHA512SignatureMethod {
		return nil, fmt.Errorf("invalid signing method %s", sp.SignatureMethod)
	}
	signatureMethod := sp.SignatureMethod
	signingContext := dsig.NewDefaultSigningContext(keyStore)
	signingContext.Canonicalizer = dsig.MakeC14N10ExclusiveCanonicalizerWithPrefixList(canonicalizerPrefixList)
	if err := signingContext.SetSignatureMethod(signatureMethod); err != nil {
		return nil, err
	}

	return signingContext, nil
}

// SignArtifactResolve adds the `Signature` element to the `ArtifactResolve`.
func (sp *ServiceProvider) SignArtifactResolve(req *ArtifactResolve) error {
	signingContext, err := GetSigningContext(sp)
	if err != nil {
		return err
	}
	assertionEl := req.Element()

	signedRequestEl, err := signingContext.SignEnveloped(assertionEl)
	if err != nil {
		return err
	}

	sigEl := signedRequestEl.Child[len(signedRequestEl.Child)-1]
	req.Signature = sigEl.(*etree.Element)
	return nil
}

// SignAuthnRequest adds the `Signature` element to the `AuthnRequest`.
func (sp *ServiceProvider) SignAuthnRequest(req *AuthnRequest) error {

	signingContext, err := GetSigningContext(sp)
	if err != nil {
		return err
	}
	assertionEl := req.Element()

	signedRequestEl, err := signingContext.SignEnveloped(assertionEl)
	if err != nil {
		return err
	}

	sigEl := signedRequestEl.Child[len(signedRequestEl.Child)-1]
	req.Signature = sigEl.(*etree.Element)
	return nil
}

// MakePostAuthenticationRequest creates a SAML authentication request using
// the HTTP-POST binding. It returns HTML text representing an HTML form that
// can be sent presented to a browser to initiate the login process.
func (sp *ServiceProvider) MakePostAuthenticationRequest(relayState string) ([]byte, error) {
	req, err := sp.MakeAuthenticationRequest(sp.GetSSOBindingLocation(HTTPPostBinding), HTTPPostBinding, HTTPPostBinding)
	if err != nil {
		return nil, err
	}
	return req.Post(relayState), nil
}

// Post returns an HTML form suitable for using the HTTP-POST binding with the request
func (req *AuthnRequest) Post(relayState string) []byte {
	doc := etree.NewDocument()
	doc.SetRoot(req.Element())
	reqBuf, err := doc.WriteToBytes()
	if err != nil {
		panic(err)
	}
	encodedReqBuf := base64.StdEncoding.EncodeToString(reqBuf)

	tmpl := template.Must(template.New("saml-post-form").Parse(`` +
		`<form method="post" action="{{.URL}}" id="SAMLRequestForm">` +
		`<input type="hidden" name="SAMLRequest" value="{{.SAMLRequest}}" />` +
		`<input type="hidden" name="RelayState" value="{{.RelayState}}" />` +
		`<input id="SAMLSubmitButton" type="submit" value="Submit" />` +
		`</form>` +
		`<script>document.getElementById('SAMLSubmitButton').style.visibility="hidden";` +
		`document.getElementById('SAMLRequestForm').submit();</script>`))
	data := struct {
		URL         string
		SAMLRequest string
		RelayState  string
	}{
		URL:         req.Destination,
		SAMLRequest: encodedReqBuf,
		RelayState:  relayState,
	}

	rv := bytes.Buffer{}
	if err := tmpl.Execute(&rv, data); err != nil {
		panic(err)
	}

	return rv.Bytes()
}

// AssertionAttributes is a list of AssertionAttribute
type AssertionAttributes []AssertionAttribute

// Get returns the assertion attribute whose Name or FriendlyName
// matches name, or nil if no matching attribute is found.
func (aa AssertionAttributes) Get(name string) *AssertionAttribute {
	for _, attr := range aa {
		if attr.Name == name {
			return &attr
		}
		if attr.FriendlyName == name {
			return &attr
		}
	}
	return nil
}

// AssertionAttribute represents an attribute of the user extracted from
// a SAML Assertion.
type AssertionAttribute struct {
	FriendlyName string
	Name         string
	Value        string
}

// InvalidResponseError is the error produced by ParseResponse when it fails.
// The underlying error is in PrivateErr. Response is the response as it was
// known at the time validation failed. Now is the time that was used to validate
// time-dependent parts of the assertion.
type InvalidResponseError struct {
	PrivateErr error
	Response   string
	Now        time.Time
}

func (ivr *InvalidResponseError) Error() string {
	return fmt.Sprintf("Authentication failed")
}

// ErrBadStatus is returned when the assertion provided is valid but the
// status code is not "urn:oasis:names:tc:SAML:2.0:status:Success".
type ErrBadStatus struct {
	Status string
}

func (e ErrBadStatus) Error() string {
	return e.Status
}

func responseIsSigned(response *etree.Element) (bool, error) {
	signatureElement, err := findChild(response, "http://www.w3.org/2000/09/xmldsig#", "Signature")
	if err != nil {
		return false, err
	}
	return signatureElement != nil, nil
}

// validateDestination validates the Destination attribute.
// If the response is signed, the Destination is required to be present.
func (sp *ServiceProvider) validateDestination(response *etree.Element, responseDom *Response) error {
	signed, err := responseIsSigned(response)
	if err != nil {
		return err
	}

	// Compare if the response is signed OR the Destination is provided.
	// (Even if the response is not signed, if the Destination is set it must match.)
	if signed || responseDom.Destination != "" {
		if responseDom.Destination != sp.AcsURL.String() {
			return fmt.Errorf("`Destination` does not match AcsURL (expected %q, actual %q)", sp.AcsURL.String(), responseDom.Destination)
		}
	}

	return nil
}

// ParseResponse extracts the SAML IDP response received in req, resolves
// artifacts when necessary, validates it, and returns the verified assertion.
func (sp *ServiceProvider) ParseResponse(req *http.Request, possibleRequestIDs []string) (*Assertion, error) {
	now := TimeNow()

	var assertion *Assertion

	retErr := &InvalidResponseError{
		Now:      now,
		Response: req.PostForm.Get("SAMLResponse"),
	}

	if req.Form.Get("SAMLart") != "" {
		retErr.Response = req.Form.Get("SAMLart")

		req, err := sp.MakeArtifactResolveRequest(req.Form.Get("SAMLart"))
		if err != nil {
			retErr.PrivateErr = fmt.Errorf("Cannot generate artifact resolution request: %s", err)
			return nil, retErr
		}

		doc := etree.NewDocument()
		doc.SetRoot(req.SoapRequest())

		var requestBuffer bytes.Buffer
		doc.WriteTo(&requestBuffer)
		response, err := http.Post(sp.GetArtifactBindingLocation(SOAPBinding), "text/xml", &requestBuffer)
		if err != nil {
			retErr.PrivateErr = fmt.Errorf("Error during artifact resolution: %s", err)
			return nil, retErr
		}
		defer response.Body.Close()
		if response.StatusCode != 200 {
			retErr.PrivateErr = fmt.Errorf("Error during artifact resolution: HTTP status %d (%s)", response.StatusCode, response.Status)
			return nil, retErr
		}
		rawResponseBuf, err := ioutil.ReadAll(response.Body)
		if err != nil {
			retErr.PrivateErr = fmt.Errorf("Error during artifact resolution: %s", err)
			return nil, retErr
		}
		assertion, err = sp.ParseXMLArtifactResponse(rawResponseBuf, possibleRequestIDs, req.ID)
		if err != nil {
			return nil, err
		}
	} else {
		rawResponseBuf, err := base64.StdEncoding.DecodeString(req.PostForm.Get("SAMLResponse"))
		if err != nil {
			retErr.PrivateErr = fmt.Errorf("cannot parse base64: %s", err)
			return nil, retErr
		}
		retErr.Response = string(rawResponseBuf)
		assertion, err = sp.ParseXMLResponse(rawResponseBuf, possibleRequestIDs)
		if err != nil {
			return nil, err
		}
	}

	return assertion, nil

}

// ParseXMLArtifactResponse validates the SAML Artifact resolver response
// and returns the verified assertion.
//
// This function handles verifying the digital signature, and verifying
// that the specified conditions and properties are met.
//
// If the function fails it will return an InvalidResponseError whose
// properties are useful in describing which part of the parsing process
// failed. However, to discourage inadvertent disclosure the diagnostic
// information, the Error() method returns a static string.
func (sp *ServiceProvider) ParseXMLArtifactResponse(decodedResponseXML []byte, possibleRequestIDs []string, artifactRequestID string) (*Assertion, error) {
	now := TimeNow()
	//var err error
	retErr := &InvalidResponseError{
		Now:      now,
		Response: string(decodedResponseXML),
	}

	// ensure that the response XML is well formed before we parse it
	if err := xrv.Validate(bytes.NewReader(decodedResponseXML)); err != nil {
		retErr.PrivateErr = fmt.Errorf("invalid xml: %s", err)
		return nil, retErr
	}

	envelope := &struct {
		XMLName xml.Name `xml:"http://schemas.xmlsoap.org/soap/envelope/ Envelope"`
		Body    struct {
			ArtifactResponse ArtifactResponse
		} `xml:"http://schemas.xmlsoap.org/soap/envelope/ Body"`
	}{}
	if err := xml.Unmarshal(decodedResponseXML, &envelope); err != nil {
		retErr.PrivateErr = fmt.Errorf("cannot unmarshal response: %s", err)
		return nil, retErr
	}

	resp := envelope.Body.ArtifactResponse

	// Validate ArtifactResponse
	if resp.InResponseTo != artifactRequestID {
		retErr.PrivateErr = fmt.Errorf("`InResponseTo` does not match the artifact request ID (expected %v)", artifactRequestID)
		return nil, retErr
	}
	if resp.IssueInstant.Add(MaxIssueDelay).Before(now) {
		retErr.PrivateErr = fmt.Errorf("response IssueInstant expired at %s", resp.IssueInstant.Add(MaxIssueDelay))
		return nil, retErr
	}
	if resp.Issuer != nil && resp.Issuer.Value != sp.IDPMetadata.EntityID {
		retErr.PrivateErr = fmt.Errorf("response Issuer does not match the IDP metadata (expected %q)", sp.IDPMetadata.EntityID)
		return nil, retErr
	}
	if resp.Status.StatusCode.Value != StatusSuccess {
		retErr.PrivateErr = ErrBadStatus{Status: resp.Status.StatusCode.Value}
		return nil, retErr
	}

	doc := etree.NewDocument()
	if err := doc.ReadFromBytes(decodedResponseXML); err != nil {
		retErr.PrivateErr = err
		return nil, retErr
	}

	artifactEl := doc.FindElement("Envelope/Body/ArtifactResponse")
	if artifactEl == nil {
		retErr.PrivateErr = fmt.Errorf("missing ArtifactResponse")
		return nil, retErr
	}
	responseEl := doc.FindElement("Envelope/Body/ArtifactResponse/Response")
	if responseEl == nil {
		retErr.PrivateErr = fmt.Errorf("missing inner Response")
		return nil, retErr
	}

	haveSignature := false
	var err error
	if err = sp.validateArtifactSigned(artifactEl); err != nil && err.Error() != "either the Response or Assertion must be signed" {
		retErr.PrivateErr = err
		return nil, retErr
	}
	if err == nil {
		haveSignature = true
	}
	assertion, updatedResponse, err := sp.validateXMLResponse(&resp.Response, responseEl, possibleRequestIDs, now, !haveSignature)
	if err != nil {
		retErr.PrivateErr = err
		if updatedResponse != nil {
			retErr.Response = *updatedResponse
		}
		return nil, retErr
	}

	return assertion, nil
}

// ParseXMLResponse parses and validates the SAML IDP response and
// returns the verified assertion.
//
// This function handles decrypting the message, verifying the digital
// signature on the assertion, and verifying that the specified conditions
// and properties are met.
//
// If the function fails it will return an InvalidResponseError whose
// properties are useful in describing which part of the parsing process
// failed. However, to discourage inadvertent disclosure the diagnostic
// information, the Error() method returns a static string.
func (sp *ServiceProvider) ParseXMLResponse(decodedResponseXML []byte, possibleRequestIDs []string) (*Assertion, error) {
	now := TimeNow()
	var err error
	retErr := &InvalidResponseError{
		Now:      now,
		Response: string(decodedResponseXML),
	}

	// ensure that the response XML is well formed before we parse it
	if err := xrv.Validate(bytes.NewReader(decodedResponseXML)); err != nil {
		retErr.PrivateErr = fmt.Errorf("invalid xml: %s", err)
		return nil, retErr
	}

	// do some validation first before we decrypt
	resp := Response{}
	if err := xml.Unmarshal(decodedResponseXML, &resp); err != nil {
		retErr.PrivateErr = fmt.Errorf("cannot unmarshal response: %s", err)
		return nil, retErr
	}

	doc := etree.NewDocument()
	if err := doc.ReadFromBytes(decodedResponseXML); err != nil {
		retErr.PrivateErr = err
		return nil, retErr
	}

	assertion, updatedResponse, err := sp.validateXMLResponse(&resp, doc.Root(), possibleRequestIDs, now, true)
	if err != nil {
		retErr.PrivateErr = err
		if updatedResponse != nil {
			retErr.Response = *updatedResponse
		}
		return nil, retErr
	}

	return assertion, nil
}

// validateXMLResponse validates the SAML IDP response and returns
// the verified assertion.
//
// This function handles decrypting the message, verifying the digital
// signature on the assertion, and verifying that the specified conditions
// and properties are met.
func (sp *ServiceProvider) validateXMLResponse(resp *Response, responseEl *etree.Element, possibleRequestIDs []string, now time.Time, needSig bool) (*Assertion, *string, error) {
	var err error
	var updatedResponse *string
	if err := sp.validateDestination(responseEl, resp); err != nil {
		return nil, updatedResponse, err
	}

	requestIDvalid := false

	if sp.AllowIDPInitiated {
		requestIDvalid = true
	} else {
		for _, possibleRequestID := range possibleRequestIDs {
			if resp.InResponseTo == possibleRequestID {
				requestIDvalid = true
			}
		}
	}

	if !requestIDvalid {
		return nil, updatedResponse, fmt.Errorf("`InResponseTo` does not match any of the possible request IDs (expected %v)", possibleRequestIDs)
	}

	if resp.IssueInstant.Add(MaxIssueDelay).Before(now) {
		return nil, updatedResponse, fmt.Errorf("response IssueInstant expired at %s", resp.IssueInstant.Add(MaxIssueDelay))
	}
	if resp.Issuer != nil && resp.Issuer.Value != sp.IDPMetadata.EntityID {
		return nil, updatedResponse, fmt.Errorf("response Issuer does not match the IDP metadata (expected %q)", sp.IDPMetadata.EntityID)
	}
	if resp.Status.StatusCode.Value != StatusSuccess {
		return nil, updatedResponse, ErrBadStatus{Status: resp.Status.StatusCode.Value}
	}

	var assertion *Assertion
	if resp.EncryptedAssertion == nil {
		// TODO(ross): verify that the namespace is urn:oasis:names:tc:SAML:2.0:protocol
		if responseEl.Tag != "Response" {
			return nil, updatedResponse, fmt.Errorf("expected to find a response object, not %s", responseEl.Tag)
		}

		if err = sp.validateSigned(responseEl); err != nil && !(!needSig && err.Error() == "either the Response or Assertion must be signed") {
			return nil, updatedResponse, err
		}

		assertion = resp.Assertion
	}

	// decrypt the response
	if resp.EncryptedAssertion != nil {
		// encrypted assertions are part of the signature
		// before decrypting the response verify that
		responseSigned, err := responseIsSigned(responseEl)
		if err != nil {
			return nil, updatedResponse, err
		}
		if responseSigned {
			if err := sp.validateSigned(responseEl); err != nil {
				return nil, updatedResponse, err
			}
		}

		var key interface{} = sp.Key
		keyEl := responseEl.FindElement("//EncryptedAssertion/EncryptedKey")
		if keyEl != nil {
			key, err = xmlenc.Decrypt(sp.Key, keyEl)
			if err != nil {
				return nil, updatedResponse, fmt.Errorf("failed to decrypt key from response: %s", err)
			}
		}

		el := responseEl.FindElement("//EncryptedAssertion/EncryptedData")
		plaintextAssertion, err := xmlenc.Decrypt(key, el)
		if err != nil {
			return nil, updatedResponse, fmt.Errorf("failed to decrypt response: %s", err)
		}
		updatedResponse = new(string)
		*updatedResponse = string(plaintextAssertion)

		// TODO(ross): add test case for this
		if err := xrv.Validate(bytes.NewReader(plaintextAssertion)); err != nil {
			return nil, updatedResponse, fmt.Errorf("plaintext response contains invalid XML: %s", err)
		}

		doc := etree.NewDocument()
		if err := doc.ReadFromBytes(plaintextAssertion); err != nil {
			return nil, updatedResponse, fmt.Errorf("cannot parse plaintext response %v", err)
		}

		// the decrypted assertion may be signed too
		// otherwise, a signed response is sufficient
		if err := sp.validateSigned(doc.Root()); err != nil && !((responseSigned || !needSig) && err.Error() == "either the Response or Assertion must be signed") {
			return nil, updatedResponse, err
		}

		assertion = &Assertion{}
		// Note: plaintextAssertion is known to be safe to parse because
		// plaintextAssertion is unmodified from when xrv.Validate() was called above.
		if err := xml.Unmarshal(plaintextAssertion, assertion); err != nil {
			return nil, updatedResponse, err
		}
	}

	if err := sp.validateAssertion(assertion, possibleRequestIDs, now); err != nil {
		return nil, updatedResponse, fmt.Errorf("assertion invalid: %s", err)
	}

	return assertion, updatedResponse, nil
}

// validateAssertion checks that the conditions specified in assertion match
// the requirements to accept. If validation fails, it returns an error describing
// the failure. (The digital signature on the assertion is not checked -- this
// should be done before calling this function).
func (sp *ServiceProvider) validateAssertion(assertion *Assertion, possibleRequestIDs []string, now time.Time) error {
	if assertion.IssueInstant.Add(MaxIssueDelay).Before(now) {
		return fmt.Errorf("expired on %s", assertion.IssueInstant.Add(MaxIssueDelay))
	}
	if assertion.Issuer.Value != sp.IDPMetadata.EntityID {
		return fmt.Errorf("issuer is not %q", sp.IDPMetadata.EntityID)
	}
	for _, subjectConfirmation := range assertion.Subject.SubjectConfirmations {
		requestIDvalid := false

		// We *DO NOT* validate InResponseTo when AllowIDPInitiated is set. Here's why:
		//
		// The SAML specification does not provide clear guidance for handling InResponseTo for IDP-initiated
		// requests where there is no request to be in response to. The specification says:
		//
		//   InResponseTo [Optional]
		//       The ID of a SAML protocol message in response to which an attesting entity can present the
		//       assertion. For example, this attribute might be used to correlate the assertion to a SAML
		//       request that resulted in its presentation.
		//
		// The initial thought was that we should specify a single empty string in possibleRequestIDs for IDP-initiated
		// requests so that we would ensure that an InResponseTo was *not* provided in those cases where it wasn't
		// expected. Even that turns out to be frustrating for users. And in practice some IDPs (e.g. Rippling)
		// set a specific non-empty value for InResponseTo in IDP-initiated requests.
		//
		// Finally, it is unclear that there is significant security value in checking InResponseTo when we allow
		// IDP initiated assertions.
		if !sp.AllowIDPInitiated {
			for _, possibleRequestID := range possibleRequestIDs {
				if subjectConfirmation.SubjectConfirmationData.InResponseTo == possibleRequestID {
					requestIDvalid = true
					break
				}
			}
			if !requestIDvalid {
				return fmt.Errorf("assertion SubjectConfirmation one of the possible request IDs (%v)", possibleRequestIDs)
			}
		}
		if subjectConfirmation.SubjectConfirmationData.Recipient != sp.AcsURL.String() {
			return fmt.Errorf("assertion SubjectConfirmation Recipient is not %s", sp.AcsURL.String())
		}
		if subjectConfirmation.SubjectConfirmationData.NotOnOrAfter.Add(MaxClockSkew).Before(now) {
			return fmt.Errorf("assertion SubjectConfirmationData is expired")
		}
	}
	if assertion.Conditions.NotBefore.Add(-MaxClockSkew).After(now) {
		return fmt.Errorf("assertion Conditions is not yet valid")
	}
	if assertion.Conditions.NotOnOrAfter.Add(MaxClockSkew).Before(now) {
		return fmt.Errorf("assertion Conditions is expired")
	}

	audienceRestrictionsValid := len(assertion.Conditions.AudienceRestrictions) == 0
	audience := firstSet(sp.EntityID, sp.MetadataURL.String())
	for _, audienceRestriction := range assertion.Conditions.AudienceRestrictions {
		if audienceRestriction.Audience.Value == audience {
			audienceRestrictionsValid = true
		}
	}
	if !audienceRestrictionsValid {
		return fmt.Errorf("assertion Conditions AudienceRestriction does not contain %q", audience)
	}
	return nil
}

func findChild(parentEl *etree.Element, childNS string, childTag string) (*etree.Element, error) {
	for _, childEl := range parentEl.ChildElements() {
		if childEl.Tag != childTag {
			continue
		}

		ctx, err := etreeutils.NSBuildParentContext(childEl)
		if err != nil {
			return nil, err
		}
		ctx, err = ctx.SubContext(childEl)
		if err != nil {
			return nil, err
		}

		ns, err := ctx.LookupPrefix(childEl.Space)
		if err != nil {
			return nil, fmt.Errorf("[%s]:%s cannot find prefix %s: %v", childNS, childTag, childEl.Space, err)
		}
		if ns != childNS {
			continue
		}

		return childEl, nil
	}
	return nil, nil
}

// validateArtifactSigned returns a nil error iff each of the signatures on the ArtifactResponse, Response
// and Assertion elements are valid and there is at least one signature.
func (sp *ServiceProvider) validateArtifactSigned(artifactEl *etree.Element) error {
	haveSignature := false

	sigEl, err := findChild(artifactEl, "http://www.w3.org/2000/09/xmldsig#", "Signature")
	if err != nil {
		return err
	}
	if sigEl != nil {
		if err = sp.validateSignature(artifactEl); err != nil {
			return fmt.Errorf("cannot validate signature on Response: %v", err)
		}
		haveSignature = true
	}

	responseEl, err := findChild(artifactEl, "urn:oasis:names:tc:SAML:2.0:protocol", "Response")
	if err != nil {
		return err
	}
	if responseEl != nil {
		err = sp.validateSigned(responseEl)
		if err != nil && err.Error() != "either the Response or Assertion must be signed" {
			return err
		}
		if err == nil {
			haveSignature = true // guaranteed by validateSigned
		}
	}

	if !haveSignature {
		return errors.New("either the ArtifactResponse, Response or Assertion must be signed")
	}
	return nil
}

// validateSigned returns a nil error iff each of the signatures on the Response and Assertion elements
// are valid and there is at least one signature.
func (sp *ServiceProvider) validateSigned(responseEl *etree.Element) error {
	haveSignature := false

	// Some SAML responses have the signature on the Response object, and some on the Assertion
	// object, and some on both. We will require that at least one signature be present and that
	// all signatures be valid
	sigEl, err := findChild(responseEl, "http://www.w3.org/2000/09/xmldsig#", "Signature")
	if err != nil {
		return err
	}
	if sigEl != nil {
		if err = sp.validateSignature(responseEl); err != nil {
			return fmt.Errorf("cannot validate signature on Response: %v", err)
		}
		haveSignature = true
	}

	assertionEl, err := findChild(responseEl, "urn:oasis:names:tc:SAML:2.0:assertion", "Assertion")
	if err != nil {
		return err
	}
	if assertionEl != nil {
		sigEl, err := findChild(assertionEl, "http://www.w3.org/2000/09/xmldsig#", "Signature")
		if err != nil {
			return err
		}
		if sigEl != nil {
			if err = sp.validateSignature(assertionEl); err != nil {
				return fmt.Errorf("cannot validate signature on Response: %v", err)
			}
			haveSignature = true
		}
	}

	if !haveSignature {
		return errors.New("either the Response or Assertion must be signed")
	}
	return nil
}

// validateSignature returns nill iff the Signature embedded in the element is valid
func (sp *ServiceProvider) validateSignature(el *etree.Element) error {
	certs, err := sp.getIDPSigningCerts()
	if err != nil {
		return err
	}

	certificateStore := dsig.MemoryX509CertificateStore{
		Roots: certs,
	}

	validationContext := dsig.NewDefaultValidationContext(&certificateStore)
	validationContext.IdAttribute = "ID"
	if Clock != nil {
		validationContext.Clock = Clock
	}

	// Some SAML responses contain a RSAKeyValue element. One of two things is happening here:
	//
	// (1) We're getting something signed by a key we already know about -- the public key
	//     of the signing cert provided in the metadata.
	// (2) We're getting something signed by a key we *don't* know about, and which we have
	//     no ability to verify.
	//
	// The best course of action is to just remove the KeyInfo so that dsig falls back to
	// verifying against the public key provided in the metadata.
	if el.FindElement("./Signature/KeyInfo/X509Data/X509Certificate") == nil {
		if sigEl := el.FindElement("./Signature"); sigEl != nil {
			if keyInfo := sigEl.FindElement("KeyInfo"); keyInfo != nil {
				sigEl.RemoveChild(keyInfo)
			}
		}
	}

	ctx, err := etreeutils.NSBuildParentContext(el)
	if err != nil {
		return err
	}
	ctx, err = ctx.SubContext(el)
	if err != nil {
		return err
	}
	el, err = etreeutils.NSDetatch(ctx, el)
	if err != nil {
		return err
	}

	if sp.SignatureVerifier != nil {
		return sp.SignatureVerifier.VerifySignature(validationContext, el)
	}

	_, err = validationContext.Validate(el)
	return err
}

// SignLogoutRequest adds the `Signature` element to the `LogoutRequest`.
func (sp *ServiceProvider) SignLogoutRequest(req *LogoutRequest) error {
	keyPair := tls.Certificate{
		Certificate: [][]byte{sp.Certificate.Raw},
		PrivateKey:  sp.Key,
		Leaf:        sp.Certificate,
	}
	// TODO: add intermediates for SP
	//for _, cert := range sp.Intermediates {
	//	keyPair.Certificate = append(keyPair.Certificate, cert.Raw)
	//}
	keyStore := dsig.TLSCertKeyStore(keyPair)

	if sp.SignatureMethod != dsig.RSASHA1SignatureMethod &&
		sp.SignatureMethod != dsig.RSASHA256SignatureMethod &&
		sp.SignatureMethod != dsig.RSASHA512SignatureMethod {
		return fmt.Errorf("invalid signing method %s", sp.SignatureMethod)
	}
	signatureMethod := sp.SignatureMethod
	signingContext := dsig.NewDefaultSigningContext(keyStore)
	signingContext.Canonicalizer = dsig.MakeC14N10ExclusiveCanonicalizerWithPrefixList(canonicalizerPrefixList)
	if err := signingContext.SetSignatureMethod(signatureMethod); err != nil {
		return err
	}

	assertionEl := req.Element()

	signedRequestEl, err := signingContext.SignEnveloped(assertionEl)
	if err != nil {
		return err
	}

	sigEl := signedRequestEl.Child[len(signedRequestEl.Child)-1]
	req.Signature = sigEl.(*etree.Element)
	return nil
}

// MakeLogoutRequest produces a new LogoutRequest object for idpURL.
func (sp *ServiceProvider) MakeLogoutRequest(idpURL, nameID string) (*LogoutRequest, error) {

	req := LogoutRequest{
		ID:           fmt.Sprintf("id-%x", randomBytes(20)),
		IssueInstant: TimeNow(),
		Version:      "2.0",
		Destination:  idpURL,
		Issuer: &Issuer{
			Format: "urn:oasis:names:tc:SAML:2.0:nameid-format:entity",
			Value:  firstSet(sp.EntityID, sp.MetadataURL.String()),
		},
		NameID: &NameID{
			Format:          sp.nameIDFormat(),
			Value:           nameID,
			NameQualifier:   sp.IDPMetadata.EntityID,
			SPNameQualifier: sp.Metadata().EntityID,
		},
	}
	if len(sp.SignatureMethod) > 0 {
		if err := sp.SignLogoutRequest(&req); err != nil {
			return nil, err
		}
	}
	return &req, nil
}

// MakeRedirectLogoutRequest creates a SAML authentication request using
// the HTTP-Redirect binding. It returns a URL that we will redirect the user to
// in order to start the auth process.
func (sp *ServiceProvider) MakeRedirectLogoutRequest(nameID, relayState string) (*url.URL, error) {
	req, err := sp.MakeLogoutRequest(sp.GetSLOBindingLocation(HTTPRedirectBinding), nameID)
	if err != nil {
		return nil, err
	}
	return req.Redirect(relayState), nil
}

// Redirect returns a URL suitable for using the redirect binding with the request
func (req *LogoutRequest) Redirect(relayState string) *url.URL {
	w := &bytes.Buffer{}
	w1 := base64.NewEncoder(base64.StdEncoding, w)
	w2, _ := flate.NewWriter(w1, 9)
	doc := etree.NewDocument()
	doc.SetRoot(req.Element())
	if _, err := doc.WriteTo(w2); err != nil {
		panic(err)
	}
	w2.Close()
	w1.Close()

	rv, _ := url.Parse(req.Destination)

	query := rv.Query()
	query.Set("SAMLRequest", string(w.Bytes()))
	if relayState != "" {
		query.Set("RelayState", relayState)
	}
	rv.RawQuery = query.Encode()

	return rv
}

// MakePostLogoutRequest creates a SAML authentication request using
// the HTTP-POST binding. It returns HTML text representing an HTML form that
// can be sent presented to a browser to initiate the logout process.
func (sp *ServiceProvider) MakePostLogoutRequest(nameID, relayState string) ([]byte, error) {
	req, err := sp.MakeLogoutRequest(sp.GetSLOBindingLocation(HTTPPostBinding), nameID)
	if err != nil {
		return nil, err
	}
	return req.Post(relayState), nil
}

// Post returns an HTML form suitable for using the HTTP-POST binding with the request
func (req *LogoutRequest) Post(relayState string) []byte {
	doc := etree.NewDocument()
	doc.SetRoot(req.Element())
	reqBuf, err := doc.WriteToBytes()
	if err != nil {
		panic(err)
	}
	encodedReqBuf := base64.StdEncoding.EncodeToString(reqBuf)

	tmpl := template.Must(template.New("saml-post-form").Parse(`` +
		`<form method="post" action="{{.URL}}" id="SAMLRequestForm">` +
		`<input type="hidden" name="SAMLRequest" value="{{.SAMLRequest}}" />` +
		`<input type="hidden" name="RelayState" value="{{.RelayState}}" />` +
		`<input id="SAMLSubmitButton" type="submit" value="Submit" />` +
		`</form>` +
		`<script>document.getElementById('SAMLSubmitButton').style.visibility="hidden";` +
		`document.getElementById('SAMLRequestForm').submit();</script>`))
	data := struct {
		URL         string
		SAMLRequest string
		RelayState  string
	}{
		URL:         req.Destination,
		SAMLRequest: encodedReqBuf,
		RelayState:  relayState,
	}

	rv := bytes.Buffer{}
	if err := tmpl.Execute(&rv, data); err != nil {
		panic(err)
	}

	return rv.Bytes()
}

// MakeLogoutResponse produces a new LogoutResponse object for idpURL and logoutRequestID.
func (sp *ServiceProvider) MakeLogoutResponse(idpURL, logoutRequestID string) (*LogoutResponse, error) {
	response := LogoutResponse{
		ID:           fmt.Sprintf("id-%x", randomBytes(20)),
		InResponseTo: logoutRequestID,
		Version:      "2.0",
		IssueInstant: TimeNow(),
		Destination:  idpURL,
		Issuer: &Issuer{
			Format: "urn:oasis:names:tc:SAML:2.0:nameid-format:entity",
			Value:  firstSet(sp.EntityID, sp.MetadataURL.String()),
		},
		Status: Status{
			StatusCode: StatusCode{
				Value: StatusSuccess,
			},
		},
	}

	if len(sp.SignatureMethod) > 0 {
		if err := sp.SignLogoutResponse(&response); err != nil {
			return nil, err
		}
	}
	return &response, nil
}

// MakeRedirectLogoutResponse creates a SAML LogoutResponse using
// the HTTP-Redirect binding. It returns a URL that we will redirect the user to
// for LogoutResponse.
func (sp *ServiceProvider) MakeRedirectLogoutResponse(logoutRequestID, relayState string) (*url.URL, error) {
	resp, err := sp.MakeLogoutResponse(sp.GetSLOBindingLocation(HTTPRedirectBinding), logoutRequestID)
	if err != nil {
		return nil, err
	}
	return resp.Redirect(relayState), nil
}

// Redirect returns a URL suitable for using the redirect binding with the LogoutResponse.
func (resp *LogoutResponse) Redirect(relayState string) *url.URL {
	w := &bytes.Buffer{}
	w1 := base64.NewEncoder(base64.StdEncoding, w)
	w2, _ := flate.NewWriter(w1, 9)
	doc := etree.NewDocument()
	doc.SetRoot(resp.Element())
	if _, err := doc.WriteTo(w2); err != nil {
		panic(err)
	}
	w2.Close()
	w1.Close()

	rv, _ := url.Parse(resp.Destination)

	query := rv.Query()
	query.Set("SAMLResponse", string(w.Bytes()))
	if relayState != "" {
		query.Set("RelayState", relayState)
	}
	rv.RawQuery = query.Encode()

	return rv
}

// MakePostLogoutResponse creates a SAML LogoutResponse using
// the HTTP-POST binding. It returns HTML text representing an HTML form that
// can be sent presented to a browser for LogoutResponse.
func (sp *ServiceProvider) MakePostLogoutResponse(logoutRequestID, relayState string) ([]byte, error) {
	resp, err := sp.MakeLogoutResponse(sp.GetSLOBindingLocation(HTTPPostBinding), logoutRequestID)
	if err != nil {
		return nil, err
	}
	return resp.Post(relayState), nil
}

// Post returns an HTML form suitable for using the HTTP-POST binding with the LogoutResponse.
func (resp *LogoutResponse) Post(relayState string) []byte {
	doc := etree.NewDocument()
	doc.SetRoot(resp.Element())
	reqBuf, err := doc.WriteToBytes()
	if err != nil {
		panic(err)
	}
	encodedReqBuf := base64.StdEncoding.EncodeToString(reqBuf)

	tmpl := template.Must(template.New("saml-post-form").Parse(`` +
		`<form method="post" action="{{.URL}}" id="SAMLResponseForm">` +
		`<input type="hidden" name="SAMLResponse" value="{{.SAMLResponse}}" />` +
		`<input type="hidden" name="RelayState" value="{{.RelayState}}" />` +
		`<input id="SAMLSubmitButton" type="submit" value="Submit" />` +
		`</form>` +
		`<script>document.getElementById('SAMLSubmitButton').style.visibility="hidden";` +
		`document.getElementById('SAMLResponseForm').submit();</script>`))
	data := struct {
		URL          string
		SAMLResponse string
		RelayState   string
	}{
		URL:          resp.Destination,
		SAMLResponse: encodedReqBuf,
		RelayState:   relayState,
	}

	rv := bytes.Buffer{}
	if err := tmpl.Execute(&rv, data); err != nil {
		panic(err)
	}

	return rv.Bytes()
}

// SignLogoutResponse adds the `Signature` element to the `LogoutResponse`.
func (sp *ServiceProvider) SignLogoutResponse(resp *LogoutResponse) error {
	keyPair := tls.Certificate{
		Certificate: [][]byte{sp.Certificate.Raw},
		PrivateKey:  sp.Key,
		Leaf:        sp.Certificate,
	}
	// TODO: add intermediates for SP
	//for _, cert := range sp.Intermediates {
	//	keyPair.Certificate = append(keyPair.Certificate, cert.Raw)
	//}
	keyStore := dsig.TLSCertKeyStore(keyPair)

	if sp.SignatureMethod != dsig.RSASHA1SignatureMethod &&
		sp.SignatureMethod != dsig.RSASHA256SignatureMethod &&
		sp.SignatureMethod != dsig.RSASHA512SignatureMethod {
		return fmt.Errorf("invalid signing method %s", sp.SignatureMethod)
	}
	signatureMethod := sp.SignatureMethod
	signingContext := dsig.NewDefaultSigningContext(keyStore)
	signingContext.Canonicalizer = dsig.MakeC14N10ExclusiveCanonicalizerWithPrefixList(canonicalizerPrefixList)
	if err := signingContext.SetSignatureMethod(signatureMethod); err != nil {
		return err
	}

	assertionEl := resp.Element()

	signedRequestEl, err := signingContext.SignEnveloped(assertionEl)
	if err != nil {
		return err
	}

	sigEl := signedRequestEl.Child[len(signedRequestEl.Child)-1]
	resp.Signature = sigEl.(*etree.Element)
	return nil
}

func (sp *ServiceProvider) nameIDFormat() string {
	var nameIDFormat string
	switch sp.AuthnNameIDFormat {
	case "":
		// To maintain library back-compat, use "transient" if unset.
		nameIDFormat = string(TransientNameIDFormat)
	case UnspecifiedNameIDFormat:
		// Spec defines an empty value as "unspecified" so don't set one.
	default:
		nameIDFormat = string(sp.AuthnNameIDFormat)
	}
	return nameIDFormat
}

// ValidateLogoutResponseRequest validates the LogoutResponse content from the request
func (sp *ServiceProvider) ValidateLogoutResponseRequest(req *http.Request) error {
	if data := req.URL.Query().Get("SAMLResponse"); data != "" {
		return sp.ValidateLogoutResponseRedirect(data)
	}

	err := req.ParseForm()
	if err != nil {
		return fmt.Errorf("unable to parse form: %v", err)
	}

	return sp.ValidateLogoutResponseForm(req.PostForm.Get("SAMLResponse"))
}

// ValidateLogoutResponseForm returns a nil error if the logout response is valid.
func (sp *ServiceProvider) ValidateLogoutResponseForm(postFormData string) error {
	rawResponseBuf, err := base64.StdEncoding.DecodeString(postFormData)
	if err != nil {
		return fmt.Errorf("unable to parse base64: %s", err)
	}

	// TODO(ross): add test case for this (SLO does not have tests right now)
	if err := xrv.Validate(bytes.NewReader(rawResponseBuf)); err != nil {
		return fmt.Errorf("response contains invalid XML: %s", err)
	}

	var resp LogoutResponse
	if err := xml.Unmarshal(rawResponseBuf, &resp); err != nil {
		return fmt.Errorf("cannot unmarshal response: %s", err)
	}

	if err := sp.validateLogoutResponse(&resp); err != nil {
		return err
	}

	doc := etree.NewDocument()
	if err := doc.ReadFromBytes(rawResponseBuf); err != nil {
		return err
	}

	responseEl := doc.Root()
	return sp.validateSigned(responseEl)
}

// ValidateLogoutResponseRedirect returns a nil error if the logout response is valid.
//
// URL Binding appears to be gzip / flate encoded
// See https://www.oasis-open.org/committees/download.php/20645/sstc-saml-tech-overview-2%200-draft-10.pdf  6.6
func (sp *ServiceProvider) ValidateLogoutResponseRedirect(queryParameterData string) error {
	rawResponseBuf, err := base64.StdEncoding.DecodeString(queryParameterData)
	if err != nil {
		return fmt.Errorf("unable to parse base64: %s", err)
	}

	gr, err := ioutil.ReadAll(flate.NewReader(bytes.NewBuffer(rawResponseBuf)))
	if err != nil {
		return err
	}

	if err := xrv.Validate(bytes.NewReader(gr)); err != nil {
		return err
	}

	decoder := xml.NewDecoder(bytes.NewReader(gr))

	var resp LogoutResponse

	err = decoder.Decode(&resp)
	if err != nil {
		return fmt.Errorf("unable to flate decode: %s", err)
	}

	if err := sp.validateLogoutResponse(&resp); err != nil {
		return err
	}

	doc := etree.NewDocument()
	if _, err := doc.ReadFrom(bytes.NewReader(gr)); err != nil {
		return err
	}

	responseEl := doc.Root()
	return sp.validateSigned(responseEl)
}

// validateLogoutResponse validates the LogoutResponse fields. Returns a nil error if the LogoutResponse is valid.
func (sp *ServiceProvider) validateLogoutResponse(resp *LogoutResponse) error {
	if resp.Destination != sp.SloURL.String() {
		return fmt.Errorf("`Destination` does not match SloURL (expected %q)", sp.SloURL.String())
	}

	now := time.Now()
	if resp.IssueInstant.Add(MaxIssueDelay).Before(now) {
		return fmt.Errorf("issueInstant expired at %s", resp.IssueInstant.Add(MaxIssueDelay))
	}
	if resp.Issuer.Value != sp.IDPMetadata.EntityID {
		return fmt.Errorf("issuer does not match the IDP metadata (expected %q)", sp.IDPMetadata.EntityID)
	}
	if resp.Status.StatusCode.Value != StatusSuccess {
		return fmt.Errorf("status code was not %s", StatusSuccess)
	}

	return nil
}

func firstSet(a, b string) string {
	if a == "" {
		return b
	}
	return a
}
