package control

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"

	"github.com/cretz/bine/torutil"
	"github.com/cretz/bine/torutil/ed25519"
)

// KeyType is a key type for Key in AddOnion.
type KeyType string

const (
	// KeyTypeNew is NEW.
	KeyTypeNew KeyType = "NEW"
	// KeyTypeRSA1024 is RSA1024.
	KeyTypeRSA1024 KeyType = "RSA1024"
	// KeyTypeED25519V3 is ED25519-V3.
	KeyTypeED25519V3 KeyType = "ED25519-V3"
)

// KeyAlgo is a key algorithm for GenKey on AddOnion.
type KeyAlgo string

const (
	// KeyAlgoBest is BEST.
	KeyAlgoBest KeyAlgo = "BEST"
	// KeyAlgoRSA1024 is RSA1024.
	KeyAlgoRSA1024 KeyAlgo = "RSA1024"
	// KeyAlgoED25519V3 is ED25519-V3.
	KeyAlgoED25519V3 KeyAlgo = "ED25519-V3"
)

// Key is a type of key to use for AddOnion. Implementations include GenKey,
// RSAKey, and ED25519Key.
type Key interface {
	// Type is the KeyType for AddOnion.
	Type() KeyType
	// Blob is the serialized key for AddOnion.
	Blob() string
}

// KeyFromString creates a Key for AddOnion based on a response string.
func KeyFromString(str string) (Key, error) {
	typ, blob, _ := torutil.PartitionString(str, ':')
	switch KeyType(typ) {
	case KeyTypeNew:
		return GenKeyFromBlob(blob), nil
	case KeyTypeRSA1024:
		return RSA1024KeyFromBlob(blob)
	case KeyTypeED25519V3:
		return ED25519KeyFromBlob(blob)
	default:
		return nil, fmt.Errorf("Unrecognized key type: %v", typ)
	}
}

// GenKey is a Key for AddOnion that asks Tor to generate a key for the given
// algorithm.
type GenKey KeyAlgo

// GenKeyFromBlob creates a GenKey for the given response blob which is a
// KeyAlgo.
func GenKeyFromBlob(blob string) GenKey { return GenKey(KeyAlgo(blob)) }

// Type implements Key.Type.
func (GenKey) Type() KeyType { return KeyTypeNew }

// Blob implements Key.Blob.
func (g GenKey) Blob() string { return string(g) }

// RSAKey is a Key for AddOnion that is a RSA-1024 key (i.e. v2).
type RSAKey struct{ *rsa.PrivateKey }

// RSA1024KeyFromBlob creates a RSAKey for the given response blob.
func RSA1024KeyFromBlob(blob string) (*RSAKey, error) {
	byts, err := base64.StdEncoding.DecodeString(blob)
	if err != nil {
		return nil, err
	}
	rsaKey, err := x509.ParsePKCS1PrivateKey(byts)
	if err != nil {
		return nil, err
	}
	return &RSAKey{rsaKey}, nil
}

// Type implements Key.Type.
func (*RSAKey) Type() KeyType { return KeyTypeRSA1024 }

// Blob implements Key.Blob.
func (r *RSAKey) Blob() string {
	return base64.StdEncoding.EncodeToString(x509.MarshalPKCS1PrivateKey(r.PrivateKey))
}

// ED25519Key is a Key for AddOnion that is a ed25519 key (i.e. v3).
type ED25519Key struct{ ed25519.KeyPair }

// ED25519KeyFromBlob creates a ED25519Key for the given response blob.
func ED25519KeyFromBlob(blob string) (*ED25519Key, error) {
	byts, err := base64.StdEncoding.DecodeString(blob)
	if err != nil {
		return nil, err
	}
	return &ED25519Key{ed25519.PrivateKey(byts).KeyPair()}, nil
}

// Type implements Key.Type.
func (*ED25519Key) Type() KeyType { return KeyTypeED25519V3 }

// Blob implements Key.Blob.
func (e *ED25519Key) Blob() string { return base64.StdEncoding.EncodeToString(e.PrivateKey()) }

// AddOnionRequest is a set of request params for AddOnion.
type AddOnionRequest struct {
	// Key is the key to use or GenKey if Tor should generate it.
	Key Key
	// Flags are ADD_ONION flags.
	Flags []string
	// MaxStreams is ADD_ONION MaxStreams.
	MaxStreams int
	// Ports are ADD_ONION Port values. Key is virtual port, Val is target
	// port (or can be empty to use virtual port).
	Ports []*KeyVal
	// ClientAuths are ADD_ONION ClientAuth values. If value is empty string,
	// Tor will generate the password.
	ClientAuths map[string]string
}

// AddOnionResponse is the response for AddOnion.
type AddOnionResponse struct {
	// ServiceID is the ADD_ONION response ServiceID value.
	ServiceID string
	// Key is the ADD_ONION response PrivateKey value.
	Key Key
	// ClientAuths are the ADD_ONION response ClientAuth values.
	ClientAuths map[string]string
	// RawResponse is the raw ADD_ONION response.
	RawResponse *Response
}

// AddOnion invokes ADD_ONION and returns its response.
func (c *Conn) AddOnion(req *AddOnionRequest) (*AddOnionResponse, error) {
	// Build command
	if req.Key == nil {
		return nil, c.protoErr("Key required")
	}
	cmd := "ADD_ONION " + string(req.Key.Type()) + ":" + req.Key.Blob()
	if len(req.Flags) > 0 {
		cmd += " Flags=" + strings.Join(req.Flags, ",")
	}
	if req.MaxStreams > 0 {
		cmd += " MaxStreams=" + strconv.Itoa(req.MaxStreams)
	}
	for _, port := range req.Ports {
		cmd += " Port=" + port.Key
		if port.Val != "" {
			cmd += "," + port.Val
		}
	}
	for name, blob := range req.ClientAuths {
		cmd += " ClientAuth=" + name
		if blob != "" {
			cmd += ":" + blob
		}
	}
	// Invoke and read response
	resp, err := c.SendRequest(cmd)
	if err != nil {
		return nil, err
	}
	ret := &AddOnionResponse{RawResponse: resp}
	for _, data := range resp.Data {
		key, val, _ := torutil.PartitionString(data, '=')
		switch key {
		case "ServiceID":
			ret.ServiceID = val
		case "PrivateKey":
			if ret.Key, err = KeyFromString(val); err != nil {
				return nil, err
			}
		case "ClientAuth":
			name, pass, _ := torutil.PartitionString(val, ':')
			if ret.ClientAuths == nil {
				ret.ClientAuths = map[string]string{}
			}
			ret.ClientAuths[name] = pass
		}
	}
	return ret, nil
}

// DelOnion invokes DELONION.
func (c *Conn) DelOnion(serviceID string) error {
	return c.sendRequestIgnoreResponse("DEL_ONION %v", serviceID)
}
