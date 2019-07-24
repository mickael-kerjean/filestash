package plg_backend_ldap

/*
 * Introduction
 * ============
 * To get a sample of what this backend can do:
 * - example.com: http://127.0.0.1:8334/login#type=ldap&hostname=ldap://ldap.forumsys.com&bind_cn=uid%3Dtesla,dc%3Dexample,dc%3Dcom&bind_password=password&base_dn=dc%3Dexample,dc%3Dcom
 * - freeipa:     http://127.0.0.1:8334/login#type=ldap&hostname=ldap://ipa.demo1.freeipa.org&bind_cn=uid%3Dadmin,cn%3Dusers,cn%3Daccounts,dc%3Ddemo1,dc%3Dfreeipa,dc%3Dorg&bind_password=Secret123&base_dn=dc%3Ddemo1,dc%3Dfreeipa,dc%3Dorg
 */

import (
	"encoding/json"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"gopkg.in/ldap.v3"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

var LDAPCache AppCache

func init() {
	Backend.Register("ldap", LDAP{})
	LDAPCache = NewAppCache(2, 1)
	LDAPCache.OnEvict(func(key string, value interface{}) {
		c := value.(*LDAP)
		c.dial.Close()
	})
}

type LDAP struct {
	dial   *ldap.Conn
	baseDN string
}

func (this LDAP) Init(params map[string]string, app *App) (IBackend, error) {
	if obj := LDAPCache.Get(params); obj != nil {
		return obj.(*LDAP), nil
	}

	dialURL := func() string {
		if params["port"] == "" {
			// default port will be set by the LDAP library
			return params["hostname"]
		}
		return fmt.Sprintf("%s:%s", params["hostname"], params["port"])
	}()

	l, err := ldap.DialURL(dialURL)
	if err != nil {
		return nil, err
	}
	if err = l.Bind(params["bind_cn"], params["bind_password"]); err != nil {
		return nil, err
	}

	b := &LDAP{ baseDN: params["base_dn"], dial: l}
	LDAPCache.Set(params, b)
	return b, nil
}

func (this LDAP) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:        "type",
				Type:        "hidden",
				Value:       "ldap",
			},
			FormElement{
				Name:        "hostname",
				Type:        "text",
				Placeholder: "Hostname",
			},
			FormElement{
				Name:        "bind_cn",
				Type:        "text",
				Placeholder: "bind CN",
			},
			FormElement{
				Name:        "bind_password",
				Type:        "password",
				Placeholder: "Bind CN password",
			},
			FormElement{
				Name:        "base_dn",
				Type:        "text",
				Placeholder: "Base DN",
			},
			FormElement{
				Name:        "advanced",
				Type:        "enable",
				Placeholder: "Advanced",
				Target:      []string{"ldap_path", "ldap_port"},
			},
			FormElement{
				Id:          "ldap_path",
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
			FormElement{
				Id:          "ldap_port",
				Name:        "port",
				Type:        "number",
				Placeholder: "Port",
			},
		},
	}
}

func (this LDAP) Ls(path string) ([]os.FileInfo, error) {
	baseDN := this.pathToBase(path)
	files := make([]os.FileInfo, 0)

	// explore the current folder
	sr, err := this.dial.Search(ldap.NewSearchRequest(
		baseDN,
		ldap.ScopeSingleLevel, ldap.NeverDerefAliases, 0, 0, false,
		"(objectClass=*)",
		[]string{"objectClass"},
		nil,
	))
	if err != nil {
		return files, err
	}

	for i:=0; i<len(sr.Entries); i++ {
		entry := sr.Entries[i]

		// filename as will appear in the UI:
		filename := strings.TrimSuffix(entry.DN, "," + baseDN)

		// data type as will appear in the UI
		t := "file"
		if len(entry.Attributes) != 1 {
			continue
		}
		objectClasses := entry.Attributes[0].Values
		for j:=0; j<len(objectClasses); j++ {
			if s := Schema[objectClasses[j]]; s != nil {
				if s.IsContainer {
					t = "directory"
					break
				}
			}
		}

		if t == "file" {
			filename += ".form"
		}

		files = append(files, File{
			FName: filename,
			FType: t,
			FTime: 1497276000000,
			FSize: -1,
		})
	}
	return files, nil
}

func (this LDAP) Cat(path string) (io.ReadCloser, error) {
	///////////////////////////////////////////////
	// STEP1: search for the requested entry
	baseDN := this.pathToBase(path)
	sr, err := this.dial.Search(ldap.NewSearchRequest(
		baseDN,
		ldap.ScopeBaseObject, ldap.NeverDerefAliases, 2, 0, false,
		"(objectClass=*)",
		[]string{},
		nil,
	))
	if err != nil {
		return nil, err
	}
	if len(sr.Entries) != 1 {
		return nil, ErrNotValid
	}
	entry := sr.Entries[0]

	///////////////////////////////////////////////
	// STEP2: create the form that fits in the entry schema
	var forms []FormElement = []FormElement{
		NewFormElementFromAttributeWithValue("dn",          baseDN),
		NewFormElementFromAttributeWithValue("objectClass", strings.Join(entry.GetAttributeValues("objectClass"), ", ")),
	}
	forms[0].ReadOnly = true
	forms[0].Required = true

	required := make([]FormElement, 0)
	optional := make([]FormElement, 0)
	for _, value := range entry.GetAttributeValues("objectClass") {
		required = append(required, FindRequiredAttributesForObject(value)...)
		optional = append(optional, FindOptionalAttributesForObject(value)...)
	}
	sort.SliceStable(required, sortFormElement(required))
	sort.SliceStable(optional, sortFormElement(optional))
	forms = append(forms, required...)
	forms = append(forms, optional...)

	///////////////////////////////////////////////
	// STEP3: fillup the form with the entry values

	for i:=0; i<len(entry.Attributes); i++ {
		data := struct{
			key  string
			value string
		}{
			key: entry.Attributes[i].Name,
			value: strings.Join(entry.Attributes[i].Values, ", "),
		}

		var i int
		for i, _ = range forms {
			if forms[i].Name == data.key {
				forms[i].Value = data.value
			}
		}

		if i == len(forms) {
			forms = append(forms, NewFormElementFromAttributeWithValue(data.key, data.value))
		}

		if forms[i].Name == "gidNumber" {
			for _, value := range entry.GetAttributeValues("objectClass") {
				if value == "posixAccount" {
					forms[i].Datalist = this.autocompleteLDAP("(objectclass=posixGroup)", "gidNumber")
					break
				}
			}
		} else if forms[i].Name == "memberUid" {
			for _, value := range entry.GetAttributeValues("objectClass") {
				if value == "posixGroup" {
					forms[i].Datalist = this.autocompleteLDAP("(objectclass=posixAccount)", "cn")
					forms[i].MultiValue = true
					break
				}
			}
		}
	}

	///////////////////////////////////////////////
	// STEP4: Send the form data over
	b, err := Form{Elmnts: forms}.MarshalJSON();
	if err != nil {
		return nil, err
	}
	return NewReadCloserFromBytes(b), nil
}

func (this LDAP) Mkdir(path string) error {
	ldapNode := strings.Split(filepath.Base(path), "=")
	if len(ldapNode) != 2 {
		return ErrNotValid
	}

	var objectClass string
	switch ldapNode[0] {
	case "ou": objectClass = "organizationalUnit"
	case "o": objectClass = "organization"
	case "c": objectClass = "country"
	default:
		return ErrNotValid
	}

	forms := FindRequiredAttributesForObject(objectClass)
	for i := range forms {
		if forms[i].Name == "objectClass" {
			forms[i].Value = strings.Join(FindDerivatedClasses(objectClass), ", ")
		}else {
			forms[i].Value = ldapNode[1]
		}
	}

	if err := this.dial.Add(&ldap.AddRequest{
		DN: this.pathToBase(path),
		Attributes: func() []ldap.Attribute {
			attributes := make([]ldap.Attribute, 0, len(forms))
			for i:=0; i<len(forms); i++ {
				attributes = append(attributes, ldap.Attribute{
					Type: forms[i].Name,
					Vals: strings.Split(fmt.Sprintf("%s", forms[i].Value), ", "),
				})
			}
			return attributes
		}(),
	}); err != nil {
		return ErrPermissionDenied
	}
	return nil
}

func (this LDAP) Rm(path string) error {
	var err error

	sr, err := this.dial.Search(ldap.NewSearchRequest(
		this.pathToBase(path),
		ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
		"(objectClass=*)",
		[]string{},
		nil,
	));
	if err != nil {
		return err
	}

	for i:=len(sr.Entries)-1; i>=0; i-- {
		if err == nil {
			err = this.dial.Del(&ldap.DelRequest{
				DN: sr.Entries[i].DN,
			})
		}
	}
	return err
}

func (this LDAP) Mv(from string, to string) error {
	toBase := this.pathToBase(to)
	fromBase := this.pathToBase(from)

	return this.dial.ModifyDN(&ldap.ModifyDNRequest{
		DN: fromBase,
		NewRDN: func(t string) string {
			a := strings.Split(t, ",")
			if len(a) == 0 {
				return t
			}
			return a[0]
		}(toBase),
		DeleteOldRDN: true,
		NewSuperior: func(t string) string {
			a := strings.Split(t, ",")
			if len(a) == 0 {
				return t
			}
			return strings.Join(a[1:], ",")
		}(toBase),
	})
}

func (this LDAP) Touch(path string) error {
	ldapNode := strings.Split(filepath.Base(path), "=")
	if len(ldapNode) != 2 {
		return ErrNotValid
	}
	var objectClass []string
	switch ldapNode[0] {
	case "cn": objectClass = []string{"inetOrgPerson", "posixAccount"}
	default:
		return ErrNotValid
	}
	ldapNode[1] = strings.TrimSuffix(ldapNode[1], ".form")

	var uniqueForms map[string]FormElement = make(map[string]FormElement)
	for i:=0; i<len(objectClass); i++ {
		for _, obj := range FindRequiredAttributesForObject(objectClass[i]) {
			uniqueForms[obj.Name] = obj
		}
	}
	var forms []FormElement = make([]FormElement, 0)
	for _, element := range uniqueForms {
		if element.Name == "objectClass" {
			element.Value = strings.Join(objectClass, ", ")
		} else {
			element.Value = this.generateLDAP(element.Name, ldapNode[1])
		}
		forms = append(forms, element)
	}

	if err := this.dial.Add(&ldap.AddRequest{
		DN: this.pathToBase(path),
		Attributes: func() []ldap.Attribute {
			attributes := make([]ldap.Attribute, 0, len(forms))
			for i:=0; i<len(forms); i++ {
				attributes = append(attributes, ldap.Attribute{
					Type: forms[i].Name,
					Vals: strings.Split(fmt.Sprintf("%s", forms[i].Value), ", "),
				})
			}
			return attributes
		}(),
	}); err != nil {
		return ErrPermissionDenied
	}
	return nil
}

func (this LDAP) Save(path string, file io.Reader) error {
	var data map[string]FormElement
	if err := json.NewDecoder(file).Decode(&data); err != nil {
		return err
	} else if data["dn"].Value == nil {
		return ErrNotValid
	}
	if this.pathToBase(path) != data["dn"].Value { // change in the path can only be perform via `MV`
		return ErrNotAllowed
	}

	sr, err := this.dial.Search(ldap.NewSearchRequest(
		fmt.Sprintf("%s", data["dn"].Value),
		ldap.ScopeBaseObject, ldap.NeverDerefAliases, 0, 0, false,
		"(objectClass=*)",
		[]string{},
		nil,
	));
	if err != nil {
		return err
	}
	if len(sr.Entries) != 1 {
		return ErrNotValid
	}

	var attributes map[string]*[]string = make(map[string]*[]string)
	for i:=0; i<len(sr.Entries[0].Attributes); i++ {
		attributes[sr.Entries[0].Attributes[i].Name] = &sr.Entries[0].Attributes[i].Values
	}
	modifyRequest := ldap.NewModifyRequest(fmt.Sprintf("%s", data["dn"].Value), nil)
	for key := range data {
		if data[key].Value == nil || key == "dn" {
			continue
		}
		if attributes[key] == nil {
			modifyRequest.Add(key, strings.Split(fmt.Sprintf("%s", data[key].Value), ", "))
		} else if data[key].Value != strings.Join(*attributes[key], ", ") {
			modifyRequest.Replace(key, strings.Split(fmt.Sprintf("%s", data[key].Value), ", "))
		}
	}
	for key := range attributes {
		if data[key].Value == nil && attributes[key] != nil {
			modifyRequest.Delete(key, *attributes[key])
		}
	}

	if err := this.dial.Modify(modifyRequest); err != nil {
		return ErrPermissionDenied
	}
	return nil
}

func (this LDAP) Meta(path string) Metadata {
	return Metadata{
		CanUpload:          NewBool(false),
		HideExtension:      NewBool(true),
		RefreshOnCreate:    NewBool(true),
	}
}

func (this LDAP) pathToBase(path string) string {
	path = strings.TrimSuffix(path, ".form")
	if path = strings.Trim(path, "/"); path == "" {
		return this.baseDN
	}
	pathArray := strings.Split(path, "/")
	baseArray := strings.Split(this.baseDN, ",")
	reversedPath := []string{}
	for i:=len(pathArray)-1; i>=0; i-- {
		reversedPath = append(reversedPath, pathArray[i])
	}
	return strings.Join(append(reversedPath, baseArray...), ",")
}

func (this LDAP) autocompleteLDAP(filter string, value string) []string {
	val := []string{}
	sr, err := this.dial.Search(ldap.NewSearchRequest(
		this.baseDN,
		ldap.ScopeWholeSubtree, ldap.NeverDerefAliases, 0, 0, false,
		filter,
		[]string{value},
		nil,
	));
	if err != nil {
		return val
	}
	for i:=0; i<len(sr.Entries); i++ {
		val = append(val, sr.Entries[i].GetAttributeValue(value))
	}
	sort.Strings(val)
	return val
}


func (this LDAP) generateLDAP(name string, deflts string) string {
	d := strings.Split(deflts, "-")
	switch name {
	case "cn": return strings.ToLower(deflts)
	case "uid": return strings.ToLower(deflts)
	case "uidNumber": return "65534"
	case "homeDirectory": return "/home/"+strings.ToLower(deflts)
	case "loginShell": return "/bin/false"
	case "aliasedObjectName": return strings.ToLower(deflts)
	case "c": return strings.ToLower(deflts)
	case "o": return strings.ToLower(deflts)
	case "userPassword": return "welcome"
	case "gidNumber": return "65534"
	case "sn":
		if len(d) == 2 {
			return strings.Title(d[1])
		}
		return strings.Title(strings.Join(d, " "))
	case "givenName":
		if len(d) == 2 {
			return strings.Title(d[0])
		}
		return strings.Title(strings.Join(d, " "))
	default: return deflts
	}
}


type LDAPSchema struct {
	IsContainer bool     // can be used as a folder to store more entry?
	Description string   // doc string coming from the schema
	Type        string   // AUXILIARY / STRUCTURAL or ABSTRACT
	Silent      bool     // show up (or not) as part of the client autocomplete
	Required    []string // required attributes
	Optional    []string // optional attributes
	Inherit     []string // class this schema inherits
}

func FindRequiredAttributesForObject(objectClass string) []FormElement {
	if Schema[objectClass] == nil {
		return make([]FormElement, 0)
	}
	elements := make([]FormElement, 0, len(Schema[objectClass].Required))
	for i:=0; i<len(Schema[objectClass].Inherit); i++{
		els := FindRequiredAttributesForObject(Schema[objectClass].Inherit[i])
		elements = append(elements, els...)
	}
	for i:=0; i<len(Schema[objectClass].Required); i++{
		elements = append(
			elements,
			func() FormElement {
				f := NewFormElementFromAttribute(Schema[objectClass].Required[i])
				f.Required = true
				return f
			}(),
		)
	}
	return elements
}

func FindOptionalAttributesForObject(objectClass string) []FormElement {
	if Schema[objectClass] == nil {
		return make([]FormElement, 0)
	}
	elements := make([]FormElement, 0, len(Schema[objectClass].Optional))
	for i:=0; i<len(Schema[objectClass].Inherit); i++{
		els := FindOptionalAttributesForObject(Schema[objectClass].Inherit[i])
		elements = append(elements, els...)
	}
	for i:=0; i<len(Schema[objectClass].Optional); i++{
		elements = append(
			elements,
			NewFormElementFromAttribute(Schema[objectClass].Optional[i]),
		)
	}
	return elements
}

func NewFormElementFromAttribute(attr string) FormElement {
	var form FormElement = FormElement{}
	if LDAPAttribute[attr] != nil {
		form = *LDAPAttribute[attr]
	}
	if form.Name == "" {
		form.Name = attr
	}
	if form.Type == "" {
		form.Type = "text"
	}
	return form
}

func NewFormElementFromAttributeWithValue(attr string, value string) FormElement {
	f := NewFormElementFromAttribute(attr)
	f.Value = value
	return f
}

func FindDerivatedClasses(objectClass string) []string {
	classes := []string{objectClass}
	if Schema[objectClass] == nil {
		return classes
	}
	for i:=0; i<len(Schema[objectClass].Inherit); i++ {
		classes = append(classes, FindDerivatedClasses(Schema[objectClass].Inherit[i])...)
	}
	return classes
}

func sortFormElement(e []FormElement) func(i, j int) bool {
	return func(i, j int) bool {
		l := LDAPAttribute[e[i].Name]
		r := LDAPAttribute[e[j].Name]

		if l == nil && r == nil { // tie
			return false
		} else if r == nil {
			return true
		} else if l == nil {
			return false
		}

		if l.Order == 0 && r.Order == 0 {
			return false
		} else if l.Order == 0 {
			return false
		} else if r.Order == 0 {
			return true
		}
		return l.Order < r.Order
	}
}

/*
 * The following is loading LDAP schema that was found on the openLDAP directory:
 * https://github.com/openldap/openldap/tree/master/servers/slapd/schema
 * As such, the source code in OpenLDAP says:
 * "Redistribution and use in source and binary forms, with or without modification,
 * are permitted only as authorized by the OpenLDAP Public License."
 * This license can be found: http://www.openldap.org/software/release/license.html
 *
 * It includes: core.schema, inetorgperson.schema, collective.schema, corba.schema, cosine.schema
 * duaconf.schema, dyngroup.schema, java.schema, misc.schema, msuser.schema, nis.schema, openldap.schema
 * pmi.schema, ppolicy.schema.
 */
var Schema map[string]*LDAPSchema = map[string]*LDAPSchema{
	// SCHEMA: core.schema
	"top": &LDAPSchema{
		Description: "Top of the superclass chain - RFC2256",
		Type: "ABSTRACT",
		IsContainer: false,
		Silent: true,
		Inherit: []string{},
		Required: []string{"objectClass"},
		Optional: []string{},
	},
	"alias": &LDAPSchema{
		Description: "An alias - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"aliasedObjectName"},
		Optional: []string{},
	},
	"country": &LDAPSchema{
		Description: "A country - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: true,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"c"},
		Optional: []string{"searchGuide", "description"},
	},
	"locality": &LDAPSchema{
		Description: "A locality - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"street", "seeAlso", "searchGuide", "st", "l", "description"},
	},
	"organization": &LDAPSchema{
		Description: "An organization - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: true,
		Silent: false,
		Inherit: []string{"top"},
		Required: []string{"o"},
		Optional: []string{"userPassword", "searchGuide", "seeAlso", "businessCategory", "x121Address", "registeredAddress", "destinationIndicator", "preferredDeliveryMethod", "telexNumber", "teletexTerminalIdentifier", "telephoneNumber", "internationaliSDNNumber", "facsimileTelephoneNumber", "street", "postOfficeBox", "postalCode", "postalAddress", "physicalDeliveryOfficeName", "st", "l", "description"},
	},
	"organizationalUnit": &LDAPSchema{
		Description: "An organizational unit - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: true,
		Silent: false,
		Inherit: []string{"top"},
		Required: []string{"ou"},
		Optional: []string{"userPassword", "searchGuide", "seeAlso", "businessCategory", "x121Address", "registeredAddress", "destinationIndicator", "preferredDeliveryMethod", "telexNumber", "teletexTerminalIdentifier", "telephoneNumber", "internationaliSDNNumber", "facsimileTelephoneNumber", "street", "postOfficeBox", "postalCode", "postalAddress", "physicalDeliveryOfficeName", "st", "l", "description"},
	},
	"person": &LDAPSchema{
		Description: "A person - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: false,
		Inherit: []string{"top"},
		Required: []string{"sn", "cn"},
		Optional: []string{"userPassword", "telephoneNumber", "seeAlso", "description"},
	},
	"organizationalPerson": &LDAPSchema{
		Description: "An organizational person - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: false,
		Inherit: []string{"person"},
		Required: []string{},
		Optional: []string{"title", "x121Address", "registeredAddress", "destinationIndicator", "preferredDeliveryMethod", "telexNumber", "teletexTerminalIdentifier", "telephoneNumber", "internationaliSDNNumber", "facsimileTelephoneNumber", "street", "postOfficeBox", "postalCode", "postalAddress", "physicalDeliveryOfficeName", "ou", "st", "l"},
	},
	"organizationalRole": &LDAPSchema{
		Description: "An organizational role - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"x121Address", "registeredAddress", "destinationIndicator", "preferredDeliveryMethod", "telexNumber", "teletexTerminalIdentifier", "telephoneNumber", "internationaliSDNNumber", "facsimileTelephoneNumber", "seeAlso", "roleOccupant", "preferredDeliveryMethod", "street", "postOfficeBox", "postalCode", "postalAddress", "physicalDeliveryOfficeName", "ou", "st", "l", "description"},
	},
	"groupOfNames": &LDAPSchema{
		Description: "A group of names (DNs) - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"member", "cn"},
		Optional: []string{"businessCategory", "seeAlso", "owner", "ou", "o", "description"},
	},
	"residentialPerson": &LDAPSchema{
		Description: "An residential person - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"person"},
		Required: []string{"l"},
		Optional: []string{"businessCategory", "x121Address", "registeredAddress", "destinationIndicator", "preferredDeliveryMethod", "telexNumber", "teletexTerminalIdentifier", "telephoneNumber", "internationaliSDNNumber", "facsimileTelephoneNumber", "preferredDeliveryMethod", "street", "postOfficeBox", "postalCode", "postalAddress", "physicalDeliveryOfficeName", "st", "l"},
	},
	"applicationProcess": &LDAPSchema{
		Description: "An application process - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"seeAlso", "ou", "l", "description"},
	},
	"applicationEntity": &LDAPSchema{
		Description: "An application entity - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"presentationAddress", "cn"},
		Optional: []string{"supportedApplicationContext", "seeAlso", "ou", "o", "l", "description"},
	},
	"dSA": &LDAPSchema{
		Description: "A directory system agent (a server) - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"applicationEntity STRUCTURAL"},
		Required: []string{},
		Optional: []string{"knowledgeInformation"},
	},
	"device": &LDAPSchema{
		Description: "A device - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"serialNumber", "seeAlso", "owner", "ou", "o", "l", "description"},
	},
	"strongAuthenticationUser": &LDAPSchema{
		Description: "A strong authentication user - RFC2256",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"userCertificate"},
		Optional: []string{},
	},
	"certificationAuthority": &LDAPSchema{
		Description: "A certificate authority - RFC2256",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"authorityRevocationList", "certificateRevocationList", ""},
		Optional: []string{"crossCertificatePair"},
	},
	"groupOfUniqueNames": &LDAPSchema{
		Description: "A group of unique names (DN and Unique Identifier) - RFC2256",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"uniqueMember", "cn"},
		Optional: []string{"businessCategory", "seeAlso", "owner", "ou", "o", "description"},
	},
	"userSecurityInformation": &LDAPSchema{
		Description: "A user security information - RFC2256",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"supportedAlgorithms"},
	},
	"certificationAuthority-V2": &LDAPSchema{
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"certificationAuthority"},
		Required: []string{},
		Optional: []string{"deltaRevocationList"},
	},
	"cRLDistributionPoint": &LDAPSchema{
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"certificateRevocationList", "authorityRevocationList", "deltaRevocationList"},
	},
	"dmd": &LDAPSchema{
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"dmdName"},
		Optional: []string{"userPassword", "searchGuide", "seeAlso", "businessCategory", "x121Address", "registeredAddress", "destinationIndicator", "preferredDeliveryMethod", "telexNumber", "teletexTerminalIdentifier", "telephoneNumber", "internationaliSDNNumber", "facsimileTelephoneNumber", "street", "postOfficeBox", "postalCode", "postalAddress", "physicalDeliveryOfficeName", "st", "l", "description"},
	},
	"pkiUser": &LDAPSchema{
		Description: "A PKI user - RFC2587",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"userCertificate"},
	},
	"pkiCA": &LDAPSchema{
		Description: "PKI certificate authority - RFC2587",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"authorityRevocationList", "certificateRevocationList", "cACertificate", "crossCertificatePair"},
	},
	"deltaCRL": &LDAPSchema{
		Description: "PKI user - RFC2587",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"deltaRevocationList"},
	},
	"labeledURIObject": &LDAPSchema{
		Description: "Object that contains the URI attribute type - RFC2079",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"labeledURI"},
	},
	"simpleSecurityObject": &LDAPSchema{
		Description: "Simple security object - RFC1274",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: false,
		Inherit: []string{"top"},
		Required: []string{"userPassword"},
		Optional: []string{},
	},
	"dcObject": &LDAPSchema{
		Description: "Domain component object - RFC2247",
		Type: "AUXILIARY",
		IsContainer: true,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"dc"},
		Optional: []string{},
	},
	"uidObject": &LDAPSchema{
		Description: "Uid object - RFC2377",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"uid"},
		Optional: []string{},
	},
	// SCHEMA: inetorgperson.schema
	"inetOrgPerson": &LDAPSchema{
		Description: "Internet Organizational Person - RFC2798",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: false,
		Inherit: []string{"organizationalPerson"},
		Required: []string{},
		Optional: []string{"audio", "businessCategory", "carLicense", "departmentNumber", "displayName", "employeeNumber", "employeeType", "givenName", "homePhone", "homePostalAddress", "initials", "jpegPhoto", "labeledURI", "mail", "manager", "mobile", "o", "pager", "photo", "roomNumber", "secretary", "uid", "userCertificate", "x500uniqueIdentifier", "preferredLanguage", "userSMIMECertificate", "userPKCS12"},
	},
	// SCHEMA: collective.schema
	// SCHEMA: corba.schema
	"corbaContainer": &LDAPSchema{
		Description: "Container for a CORBA object",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{},
	},
	"corbaObject": &LDAPSchema{
		Description: "CORBA object representation",
		Type: "ABSTRACT",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"corbaRepositoryId", "description"},
	},
	"corbaObjectReference": &LDAPSchema{
		Description: "CORBA interoperable object reference",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"corbaObject"},
		Required: []string{"corbaIor"},
		Optional: []string{},
	},
	// SCHEMA: cosine.schema
	"pilotObject": &LDAPSchema{
		Description: "Pilot object - RFC1274",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"info", "photo", "manager", "uniqueIdentifier", "lastModifiedTime", "lastModifiedBy", "dITRedirect", "audio"},
	},
	"pilotPerson": &LDAPSchema{
		Description: "The PilotPerson object class is used as a sub-class of person, to allow the use of a number of additional attributes to be assigned to entries of object class person",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"person"},
		Required: []string{},
		Optional: []string{"userid", "textEncodedORAddress", "rfc822Mailbox", "favouriteDrink", "roomNumber", "userClass", "homeTelephoneNumber", "homePostalAddress", "secretary", "personalTitle", "preferredDeliveryMethod", "businessCategory", "janetMailbox", "otherMailbox", "mobileTelephoneNumber", "pagerTelephoneNumber", "organizationalStatus", "mailPreferenceOption", "personalSignature"},
	},
	"newPilotPerson": &LDAPSchema{
		Description: "The PilotPerson object class is used as a sub-class of person, to allow the use of a number of additional attributes to be assigned to entries of object class person",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"person"},
		Required: []string{},
		Optional: []string{"userid", "textEncodedORAddress", "rfc822Mailbox", "favouriteDrink", "roomNumber", "userClass", "homeTelephoneNumber", "homePostalAddress", "secretary", "personalTitle", "preferredDeliveryMethod", "businessCategory", "janetMailbox", "otherMailbox", "mobileTelephoneNumber", "pagerTelephoneNumber", "organizationalStatus", "mailPreferenceOption", "personalSignature"},
	},
	"account": &LDAPSchema{
		Description: "The Account object class is used to define entries representing computer accounts.  The userid attribute should be used for naming entries of this object class.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"userid"},
		Optional: []string{"description", "seeAlso", "localityName", "organizationName", "organizationalUnitName", "host"},
	},
	"document": &LDAPSchema{
		Description: "The Document object class is used to define entries which represent documents.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"documentIdentifier"},
		Optional: []string{"commonName", "description", "seeAlso", "localityName", "organizationName", "organizationalUnitName", "documentTitle", "documentVersion", "documentAuthor", "documentLocation", "documentPublisher"},
	},
	"room": &LDAPSchema{
		Description: "The Room object class is used to define entries representing rooms. The commonName attribute should be used for naming pentries of this object class.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"commonName"},
		Optional: []string{"roomNumber", "description", "seeAlso", "telephoneNumber"},
	},
	"documentSeries": &LDAPSchema{
		Description: "The Document Series object class is used to define an entry which represents a series of documents (e.g., The Request For Comments papers).",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"commonName"},
		Optional: []string{"description", "seeAlso", "telephonenumber", "localityName", "organizationName", "organizationalUnitName"},
	},
	"domain": &LDAPSchema{
		Description: "The Domain object class is used to define entries which represent DNS or NRS domains.  The domainComponent attribute should be used for naming entries of this object class.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"domainComponent"},
		Optional: []string{"associatedName", "organizationName", "description", "businessCategory", "seeAlso", "searchGuide", "userPassword", "localityName", "stateOrProvinceName", "streetAddress", "physicalDeliveryOfficeName", "postalAddress", "postalCode", "postOfficeBox", "streetAddress", "facsimileTelephoneNumber", "internationalISDNNumber", "telephoneNumber", "teletexTerminalIdentifier", "telexNumber", "preferredDeliveryMethod", "destinationIndicator", "registeredAddress", "x121Address"},
	},
	"RFC822localPart": &LDAPSchema{
		Description: "The RFC822 Local Part object class is used to define entries which represent the local part of RFC822 mail addresses.  This treats this part of an RFC822 address as a domain.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"domain"},
		Required: []string{},
		Optional: []string{"commonName", "surname", "description", "seeAlso", "telephoneNumber", "physicalDeliveryOfficeName", "postalAddress", "postalCode", "postOfficeBox", "streetAddress", "facsimileTelephoneNumber", "internationalISDNNumber", "telephoneNumber", "teletexTerminalIdentifier", "telexNumber", "preferredDeliveryMethod", "destinationIndicator", "registeredAddress", "x121Address"},
	},
	"dNSDomain": &LDAPSchema{
		Description: "The DNS Domain (Domain NameServer) object class is used to define entries for DNS domains.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"domain"},
		Required: []string{},
		Optional: []string{"ARecord", "MDRecord", "MXRecord", "NSRecord", "SOARecord", "CNAMERecord"},
	},
	"domainRelatedObject": &LDAPSchema{
		Description: "An object related to an domain - RFC1274. The Domain Related Object object class is used to define entries which represent DNS/NRS domains which are \"equivalent\" to an X.500 domain: e.g., an organisation or organisational unit",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"associatedDomain"},
		Optional: []string{},
	},
	"friendlyCountry": &LDAPSchema{
		Description: "The Friendly Country object class is used to define country entries in the DIT.  The object class is used to allow friendlier naming of countries than that allowed by the object class country.  The naming attribute of object class country, countryName, has to be a 2 letter string defined in ISO 3166.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"country"},
		Required: []string{"friendlyCountryName"},
		Optional: []string{},
	},
	"pilotOrganization": &LDAPSchema{
		Description: "The PilotOrganization object class is used as a sub-class of organization and organizationalUnit to allow a number of additional attributes to be assigned to entries of object classes organization and organizationalUnit.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"organization", "organizationalUnit"},
		Required: []string{},
		Optional: []string{"buildingName"},
	},
	"pilotDSA": &LDAPSchema{
		Description: "The PilotDSA object class is used as a sub-class of the dsa object class to allow additional attributes to be assigned to entries for DSAs.",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"dsa"},
		Required: []string{},
		Optional: []string{"dSAQuality"},
	},
	"qualityLabelledData": &LDAPSchema{
		Description: "The Quality Labelled Data object class is used to allow the ssignment of the data quality attributes to subtrees in the DIT",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"dsaQuality"},
		Optional: []string{"subtreeMinimumQuality", "subtreeMaximumQuality"},
	},
	// SCHEMA: duaconf.schema
	"DUAConfigProfile": &LDAPSchema{
		Description: "Abstraction of a base configuration for a DUA",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"defaultServerList", "preferredServerList", "defaultSearchBase", "defaultSearchScope", "searchTimeLimit", "bindTimeLimit", "credentialLevel", "authenticationMethod", "followReferrals", "dereferenceAliases", "serviceSearchDescriptor", "serviceCredentialLevel", "serviceAuthenticationMethod", "objectclassMap", "attributeMap", "profileTTL"},
	},
	// SCHEMA: dyngroup.schema
	"groupOfURLs": &LDAPSchema{
		Description: "undefined",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"memberURL", "businessCategory", "description", "o", "ou", "owner", "seeAlso"},
	},
	"dgIdentityAux": &LDAPSchema{
		Description: "undefined",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"dgIdentity", "dgAuthz"},
	},
	// SCHEMA: java.schema
	"javaContainer": &LDAPSchema{
		Description: "Container for a Java object",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{},
	},
	"javaObject": &LDAPSchema{
		Description: "Java object representation",
		Type: "ABSTRACT",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"javaClassName"},
		Optional: []string{"javaClassNames", "javaCodebase", "javaDoc", "description"},
	},
	"javaSerializedObject": &LDAPSchema{
		Description: "Java serialized object",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"javaObject"},
		Required: []string{"javaSerializedData"},
		Optional: []string{},
	},
	"javaMarshalledObject": &LDAPSchema{
		Description: "Java marshalled object",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"javaObject"},
		Required: []string{"javaSerializedData"},
		Optional: []string{},
	},
	"javaNamingReference": &LDAPSchema{
		Description: "JNDI reference",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"javaObject"},
		Required: []string{},
		Optional: []string{"javaReferenceAddress", "javaFactory"},
	},
	// SCHEMA: misc.schema
	"inetLocalMailRecipient": &LDAPSchema{
		Description: "Internet local mail recipient",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{},
	},
	"nisMailAlias": &LDAPSchema{
		Description: "NIS mail alias",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
	},
	// SCHEMA: msuser.schema
	"mstop": &LDAPSchema{
		Type: "ABSTRACT",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"objectClass", "instanceType", "nTSecurityDescriptor", "objectCategory"},
		Optional: []string{"cn", "description", "distinguishedName", "whenCreated", "whenChanged", "subRefs", "displayName", "uSNCreated", "isDeleted", "dSASignature", "objectVersion", "repsTo", "repsFrom", "memberOf", "ownerBL", "uSNChanged", "uSNLastObjRem", "showInAdvancedViewOnly", "adminDisplayName", "proxyAddresses", "adminDescription", "extensionName", "uSNDSALastObjRemoved", "displayNamePrintable", "directReports", "wWWHomePage", "USNIntersite", "name", "objectGUID", "replPropertyMetaData", "replUpToDateVector", "flags", "revision", "wbemPath", "fSMORoleOwner", "systemFlags", "siteObjectBL", "serverReferenceBL", "nonSecurityMemberBL", "queryPolicyBL", "wellKnownObjects", "isPrivilegeHolder", "partialAttributeSet", "managedObjects", "partialAttributeDeletionList", "url", "lastKnownParent", "bridgeheadServerListBL", "netbootSCPBL", "isCriticalSystemObject", "frsComputerReferenceBL", "fRSMemberReferenceBL", "uSNSource", "fromEntry", "allowedChildClasses", "allowedChildClassesEffective", "allowedAttributes", "allowedAttributesEffective", "possibleInferiors", "canonicalName", "proxiedObjectName", "sDRightsEffective", "dSCorePropagationData", "otherWellKnownObjects", "mS-DS-ConsistencyGuid", "mS-DS-ConsistencyChildCount", "masteredBy", "msCOM-PartitionSetLink", "msCOM-UserLink", "msDS-Approx-Immed-Subordinates", "msDS-NCReplCursors", "msDS-NCReplInboundNeighbors", "msDS-NCReplOutboundNeighbors", "msDS-ReplAttributeMetaData", "msDS-ReplValueMetaData", "msDS-NonMembersBL", "msDS-MembersForAzRoleBL", "msDS-OperationsForAzTaskBL", "msDS-TasksForAzTaskBL", "msDS-OperationsForAzRoleBL", "msDS-TasksForAzRoleBL", "msDs-masteredBy", "msDS-ObjectReferenceBL", "msDS-PrincipalName", "msDS-RevealedDSAs", "msDS-KrbTgtLinkBl", "msDS-IsFullReplicaFor", "msDS-IsDomainFor", "msDS-IsPartialReplicaFor", "msDS-AuthenticatedToAccountlist", "msDS-NC-RO-Replica-Locations-BL", "msDS-RevealedListBL", "msDS-PSOApplied", "msDS-NcType", "msDS-OIDToGroupLinkBl", "msDS-HostServiceAccountBL", "isRecycled", "msDS-LocalEffectiveDeletionTime", "msDS-LocalEffectiveRecycleTime", "msDS-LastKnownRDN", "msDS-EnabledFeatureBL", "msDS-ClaimSharesPossibleValuesWithBL", "msDS-MembersOfResourcePropertyListBL", "msDS-IsPrimaryComputerFor", "msDS-ValueTypeReferenceBL", "msDS-TDOIngressBL", "msDS-TDOEgressBL", "msDS-parentdistname", "msDS-ReplValueMetaDataExt", "msds-memberOfTransitive", "msds-memberTransitive", "msSFU30PosixMemberOf", "msDFSR-MemberReferenceBL", "msDFSR-ComputerReferenceBL"},
	},
	"group": &LDAPSchema{
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"mstop"},
		Required: []string{"groupType"},
		Optional: []string{"member", "nTGroupMembers", "operatorCount", "adminCount", "groupAttributes", "groupMembershipSAM", "controlAccessRights", "desktopProfile", "nonSecurityMember", "managedBy", "primaryGroupToken", "msDS-AzLDAPQuery", "msDS-NonMembers", "msDS-AzBizRule", "msDS-AzBizRuleLanguage", "msDS-AzLastImportedBizRulePath", "msDS-AzApplicationData", "msDS-AzObjectGuid", "msDS-AzGenericData", "msDS-PrimaryComputer", "mail", "msSFU30Name", "msSFU30NisDomain", "msSFU30PosixMember"},
	},
	"user": &LDAPSchema{
		Description: "undefined",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"mstop", "organizationalPerson"},
		Required: []string{},
		Optional: []string{"o", "businessCategory", "userCertificate", "givenName", "initials", "x500uniqueIdentifier", "displayName", "networkAddress", "employeeNumber", "employeeType", "homePostalAddress", "userAccountControl", "badPwdCount", "codePage", "homeDirectory", "homeDrive", "badPasswordTime", "lastLogoff", "lastLogon", "dBCSPwd", "localeID", "scriptPath", "logonHours", "logonWorkstation", "maxStorage", "userWorkstations", "unicodePwd", "otherLoginWorkstations", "ntPwdHistory", "pwdLastSet", "preferredOU", "primaryGroupID", "userParameters", "profilePath", "operatorCount", "adminCount", "accountExpires", "lmPwdHistory", "groupMembershipSAM", "logonCount", "controlAccessRights", "defaultClassStore", "groupsToIgnore", "groupPriority", "desktopProfile", "dynamicLDAPServer", "userPrincipalName", "lockoutTime", "userSharedFolder", "userSharedFolderOther", "servicePrincipalName", "aCSPolicyName", "terminalServer", "mSMQSignCertificates", "mSMQDigests", "mSMQDigestsMig", "mSMQSignCertificatesMig", "msNPAllowDialin", "msNPCallingStationID", "msNPSavedCallingStationID", "msRADIUSCallbackNumber", "msRADIUSFramedIPAddress", "msRADIUSFramedRoute", "msRADIUSServiceType", "msRASSavedCallbackNumber", "msRASSavedFramedIPAddress", "msRASSavedFramedRoute", "mS-DS-CreatorSID", "msCOM-UserPartitionSetLink", "msDS-Cached-Membership", "msDS-Cached-Membership-Time-Stamp", "msDS-Site-Affinity", "msDS-User-Account-Control-Computed", "lastLogonTimestamp", "msIIS-FTPRoot", "msIIS-FTPDir", "msDRM-IdentityCertificate", "msDS-SourceObjectDN", "msPKIRoamingTimeStamp", "msPKIDPAPIMasterKeys", "msPKIAccountCredentials", "msRADIUS-FramedInterfaceId", "msRADIUS-SavedFramedInterfaceId", "msRADIUS-FramedIpv6Prefix", "msRADIUS-SavedFramedIpv6Prefix", "msRADIUS-FramedIpv6Route", "msRADIUS-SavedFramedIpv6Route", "msDS-SecondaryKrbTgtNumber", "msDS-AuthenticatedAtDC", "msDS-SupportedEncryptionTypes", "msDS-LastSuccessfulInteractiveLogonTime", "msDS-LastFailedInteractiveLogonTime", "msDS-FailedInteractiveLogonCount", "msDS-FailedInteractiveLogonCountAtLastSuccessfulLogon", "msTSProfilePath", "msTSHomeDirectory", "msTSHomeDrive", "msTSAllowLogon", "msTSRemoteControl", "msTSMaxDisconnectionTime", "msTSMaxConnectionTime", "msTSMaxIdleTime", "msTSReconnectionAction", "msTSBrokenConnectionAction", "msTSConnectClientDrives", "msTSConnectPrinterDrives", "msTSDefaultToMainPrinter", "msTSWorkDirectory", "msTSInitialProgram", "msTSProperty01", "msTSProperty02", "msTSExpireDate", "msTSLicenseVersion", "msTSManagingLS", "msDS-UserPasswordExpiryTimeComputed", "msTSExpireDate2", "msTSLicenseVersion2", "msTSManagingLS2", "msTSExpireDate3", "msTSLicenseVersion3", "msTSManagingLS3", "msTSExpireDate4", "msTSLicenseVersion4", "msTSManagingLS4", "msTSLSProperty01", "msTSLSProperty02", "msDS-ResultantPSO", "msPKI-CredentialRoamingTokens", "msTSPrimaryDesktop", "msTSSecondaryDesktops", "msDS-PrimaryComputer", "msDS-SyncServerUrl", "msDS-AssignedAuthNPolicySilo", "msDS-AuthNPolicySiloMembersBL", "msDS-AssignedAuthNPolicy", "userSMIMECertificate", "uid", "mail", "roomNumber", "photo", "manager", "homePhone", "secretary", "mobile", "pager", "audio", "jpegPhoto", "carLicense", "departmentNumber", "preferredLanguage", "userPKCS12", "labeledURI", "msSFU30Name", "msSFU30NisDomain"},
	},
	"container": &LDAPSchema{
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"mstop"},
		Required: []string{"cn"},
		Optional: []string{"schemaVersion", "defaultClassStore", "msDS-ObjectReference"},
	},
	"computer": &LDAPSchema{
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"user"},
		Required: []string{},
		Optional: []string{"cn", "networkAddress", "localPolicyFlags", "defaultLocalPolicyObject", "machineRole", "location", "netbootInitialization", "netbootGUID", "netbootMachineFilePath", "siteGUID", "operatingSystem", "operatingSystemVersion", "operatingSystemServicePack", "operatingSystemHotfix", "volumeCount", "physicalLocationObject", "dNSHostName", "policyReplicationFlags", "managedBy", "rIDSetReferences", "catalogs", "netbootSIFFile", "netbootMirrorDataFile", "msDS-AdditionalDnsHostName", "msDS-AdditionalSamAccountName", "msDS-ExecuteScriptPassword", "msDS-KrbTgtLink", "msDS-RevealedUsers", "msDS-NeverRevealGroup", "msDS-RevealOnDemandGroup", "msDS-RevealedList", "msDS-AuthenticatedAtDC", "msDS-isGC", "msDS-isRODC", "msDS-SiteName", "msDS-PromotionSettings", "msTPM-OwnerInformation", "msTSProperty01", "msTSProperty02", "msDS-IsUserCachableAtRodc", "msDS-HostServiceAccount", "msTSEndpointData", "msTSEndpointType", "msTSEndpointPlugin", "msTSPrimaryDesktopBL", "msTSSecondaryDesktopBL", "msTPM-TpmInformationForComputer", "msDS-GenerationId", "msImaging-ThumbprintHash", "msImaging-HashAlgorithm", "netbootDUID", "msSFU30Name", "msSFU30Aliases", "msSFU30NisDomain", "nisMapName"},
	},
	// SCHEMA: nis.schema
	"posixAccount": &LDAPSchema{
		Description: "Abstraction of an account with POSIX attributes",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: false,
		Inherit: []string{"top"},
		Required: []string{"cn", "uid", "uidNumber", "gidNumber", "homeDirectory"},
		Optional: []string{"userPassword", "loginShell", "gecos", "description"},
	},
	"shadowAccount": &LDAPSchema{
		Description: "Additional attributes for shadow passwords",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"uid"},
		Optional: []string{"userPassword", "shadowLastChange", "shadowMin", "shadowMax", "shadowWarning", "shadowInactive", "shadowExpire", "shadowFlag", "description"},
	},
	"posixGroup": &LDAPSchema{
		Description: "Abstraction of a group of accounts",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: false,
		Inherit: []string{"top"},
		Required: []string{"cn", "gidNumber"},
		Optional: []string{"userPassword", "memberUid", "description"},
	},
	"ipService": &LDAPSchema{
		Description: "Abstraction an Internet Protocol service",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn", "ipServicePort", "ipServiceProtocol"},
		Optional: []string{"description"},
	},
	"ipProtocol": &LDAPSchema{
		Description: "Abstraction of an IP protocol",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn", "ipProtocolNumber", "description"},
		Optional: []string{"description"},
	},
	"oncRpc": &LDAPSchema{
		Description: "Abstraction of an ONC/RPC binding",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn", "oncRpcNumber", "description"},
		Optional: []string{"description"},
	},
	"ipHost": &LDAPSchema{
		Description: "Abstraction of a host, an IP device",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn", "ipHostNumber"},
		Optional: []string{"l", "description", "manager"},
	},
	"ipNetwork": &LDAPSchema{
		Description: "Abstraction of an IP network",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn", "ipNetworkNumber"},
		Optional: []string{"ipNetmaskNumber", "l", "description", "manager"},
	},
	"nisNetgroup": &LDAPSchema{
		Description: "Abstraction of a netgroup",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{"nisNetgroupTriple", "memberNisNetgroup", "description"},
	},
	"nisMap": &LDAPSchema{
		Description: "A generic abstraction of a NIS map",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"nisMapName"},
		Optional: []string{"description"},
	},
	"nisObject": &LDAPSchema{
		Description: "An entry in a NIS map",
		Type: "STRUCTURAL",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn", "nisMapEntry", "nisMapName"},
		Optional: []string{"description"},
	},
	"ieee802Device": &LDAPSchema{
		Description: "A device with a MAC address",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"macAddress"},
	},
	"bootableDevice": &LDAPSchema{
		Description: "A device with boot parameters",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"bootFile", "bootParameter"},
	},
	// SCHEMA: openldap.schema
	"OpenLDAPorg": &LDAPSchema{
		Description: "OpenLDAP Organizational Object",
		Type: "UNSPECIFIED",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"organization"},
		Required: []string{},
		Optional: []string{"buildingName", "displayName", "labeledURI"},
	},
	"OpenLDAPou": &LDAPSchema{
		Description: "OpenLDAP Organizational Unit Object",
		Type: "UNSPECIFIED",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"organizationalUnit"},
		Required: []string{},
		Optional: []string{"buildingName", "displayName", "labeledURI", "o"},
	},
	"OpenLDAPperson": &LDAPSchema{
		Description: "OpenLDAP Person",
		Type: "UNSPECIFIED",
		IsContainer: false,
		Silent: true,
		Inherit: []string{"pilotPerson", "inetOrgPerson"},
		Required: []string{"uid", "cn"},
		Optional: []string{"givenName", "labeledURI", "o"},
	},
	"OpenLDAPdisplayableObject": &LDAPSchema{
		Description: "OpenLDAP Displayable Object",
		Type: "AUXILIARY",
		IsContainer: false,
		Silent: true,
		Inherit: []string{},
		Required: []string{},
		Optional: []string{"displayName"},
	},
	// SCHEMA: extra
	"nsContainer": &LDAPSchema{ // https://access.redhat.com/documentation/en-US/Red_Hat_Directory_Server/8.1/html/Configuration_and_Command_Reference/config-object-classes.html
		Description: "Container Entry",
		Type: "UNSPECIFIED",
		IsContainer: true,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{"cn"},
		Optional: []string{},
	},
	"aeZone": &LDAPSchema{ // https://docs.ldap.com/specs/draft-howard-namedobject-01.txt
		Type: "STRUCTURAL",
		IsContainer: true,
		Silent: true,
		Inherit: []string{"top"},
		Required: []string{},
		Optional: []string{"cn"},
	},
}

var LDAPAttribute map[string]*FormElement = map[string]*FormElement{
	//////////////////////////
	// SCHEMA: core.schema:
	"objectClass": &FormElement{
		Description: "Object classes of the entity - RFC2256",
		Order: 1,
		Datalist: func() []string {
			list := make([]string, 0)
			for key, _ := range Schema {
				if Schema[key].Silent == false {
					list = append(list, key)
				}
			}
			sort.Strings(list)
			return list
		}(),
		MultiValue: true,
	},
	"aliasedObjectName": &FormElement{
		Description: "Name of aliased object - RFC2256",
	},
	"aliasedEntryName": &FormElement{
		Description: "Name of aliased object - RFC2256",
	},
	"knowledgeInformation": &FormElement{
		Description: "Knowledge information - RFC2256",
	},
	"cn": &FormElement{
		Description: "Common name(s) for which the entity is known by - RFC2256",
		Order: 1,
	},
	"commonName": &FormElement{
		Description: "Common name(s) for which the entity is known by - RFC2256",
		Order: 2,
	},
	"sn": &FormElement{
		Description: "Last (family) name(s) for which the entity is known by - RFC2256",
		Order: 4,
	},
	"surname": &FormElement{
		Description: "Last (family) name(s) for which the entity is known by - RFC2256",
		Order: 4,
	},
	"serialNumber": &FormElement{
		Description: "Serial number of the entity - RFC2256",
	},
	"c": &FormElement{
		Description: "Two-letter ISO-3166 country code - RFC4519",
	},
	"countryName": &FormElement{
		Description: "Two-letter ISO-3166 country code - RFC4519",
		Order: 15,
	},
	"l": &FormElement{
		Description: "Locality which this object resides in - RFC2256",
		Order: 15,
	},
	"localityName": &FormElement{
		Description: "Locality which this object resides in - RFC2256",
		Order: 15,
	},
	"st": &FormElement{
		Description: "State or province which this object resides in - RFC2256",
		Order: 15,
	},
	"stateOrProvinceName": &FormElement{
		Description: "State or province which this object resides in - RFC2256",
		Order: 15,
	},
	"street": &FormElement{
		Description: "Street address of this object - RFC2256",
		Order: 15,
	},
	"streetAddress": &FormElement{
		Description: "Street address of this object - RFC2256",
		Order: 15,
	},
	"o": &FormElement{
		Description: "Organization this object belongs to - RFC2256",
		Order: 10,
	},
	"organizationName": &FormElement{
		Description: "Organization this object belongs to - RFC2256",
		Order: 10,
	},
	"ou": &FormElement{
		Description: "Organizational unit this object belongs to - RFC2256",
		Order: 10,
	},
	"organizationalUnitName": &FormElement{
		Description: "Organizational unit this object belongs to - RFC2256",
		Order: 10,
	},
	"title": &FormElement{
		Description: "Title associated with the entity - RFC2256",
		Order: 20,
	},
	"description": &FormElement{
		Description: "Descriptive information - RFC2256",
		Order: 5,
	},
	"searchGuide": &FormElement{
		Description: "Search guide, deprecated by enhancedSearchGuide - RFC2256",
	},
	"businessCategory": &FormElement{
		Description: "Business category - RFC2256",
	},
	"postalAddress": &FormElement{
		Description: "Postal address - RFC2256",
		Order: 15,
	},
	"postalCode": &FormElement{
		Description: "Postal code - RFC2256",
		Order: 15,
	},
	"postOfficeBox": &FormElement{
		Description: "Post Office Box - RFC2256",
		Order: 15,
	},
	"physicalDeliveryOfficeName": &FormElement{
		Description: "Physical Delivery Office Name - RFC2256",
		Order: 20,
	},
	"telephoneNumber": &FormElement{
		Description: "Telephone Number - RFC2256",
		Order: 8,
	},
	"telexNumber": &FormElement{
		Description: "Telex Number - RFC2256",
		Order: 25,
	},
	"teletexTerminalIdentifier": &FormElement{
		Description: "Teletex Terminal Identifier - RFC2256",
		Order: 25,
	},
	"facsimileTelephoneNumber": &FormElement{
		Description: "Facsimile (Fax) Telephone Number - RFC2256",
		Order: 25,
	},
	"fax": &FormElement{
		Description: "Facsimile (Fax) Telephone Number - RFC2256",
		Order: 25,
	},
	"x121Address": &FormElement{
		Description: "X.121 Address - RFC2256",
	},
	"internationaliSDNNumber": &FormElement{
		Description: "International ISDN number - RFC2256",
	},
	"registeredAddress": &FormElement{
		Description: "Registered postal address - RFC2256",
		Order: 15,
	},
	"destinationIndicator": &FormElement{
		Description: "Destination indicator - RFC2256",
	},
	"preferredDeliveryMethod": &FormElement{
		Description: "Preferred delivery method - RFC2256",
	},
	"presentationAddress": &FormElement{
		Description: "Presentation address - RFC2256",
	},
	"supportedApplicationContext": &FormElement{
		Description: "Supported application context - RFC2256",
	},
	"member": &FormElement{
		Description: "Member of a group - RFC2256",
	},
	"owner": &FormElement{
		Description: "Owner (of the object) - RFC2256",
	},
	"roleOccupant": &FormElement{
		Description: "Occupant of role - RFC2256",
	},
	"seeAlso": &FormElement{
		Description: "DN of related object - RFC2256",
		Order: 20,
	},
	"userPassword": &FormElement{
		Description: "Password of user - RFC2256/2307",
		Order: 6,
	},
	"userCertificate": &FormElement{
		Description: "X.509 user certificate, use ;binary - RFC2256",
	},
	"cACertificate": &FormElement{
		Description: "X.509 CA certificate, use ;binary - RFC2256",
	},
	"authorityRevocationList": &FormElement{
		Description: "X.509 authority revocation list, use ;binary - RFC2256",
	},
	"certificateRevocationList": &FormElement{
		Description: "X.509 certificate revocation list, use ;binary - RFC2256",
	},
	"crossCertificatePair": &FormElement{
		Description: "X.509 cross certificate pair, use ;binary - RFC2256",
	},
	"name": &FormElement{
		Order: 4,
	},
	"givenName": &FormElement{
		Description: "First name(s) for which the entity is known by - RFC2256",
		Order: 4,
	},
	"gn": &FormElement{
		Description: "First name(s) for which the entity is known by - RFC2256",
		Order: 4,
	},
	"initials": &FormElement{
		Description: "Initials of some or all of names, but not the surname(s). - RFC2256",
		Order: 20,
	},
	"generationQualifier": &FormElement{
		Description: "Name qualifier indicating a generation - RFC2256",
	},
	"x500UniqueIdentifier": &FormElement{
		Description: "X.500 unique identifier - RFC2256",
	},
	"dnQualifier": &FormElement{
		Description: "DN qualifier - RFC2256",
	},
	"enhancedSearchGuide": &FormElement{
		Description: "Enhanced search guide - RFC2256",
	},
	"protocolInformation": &FormElement{
		Description: "Protocol information - RFC2256",
	},
	"distinguishedName": &FormElement{
	},
	"uniqueMember": &FormElement{
		Description: "Unique member of a group - RFC2256",
		Order: 9,
	},
	"houseIdentifier": &FormElement{
		Description: "House identifier - RFC2256",
	},
	"supportedAlgorithms": &FormElement{
		Description: "Supported algorithms - RFC2256",
	},
	"deltaRevocationList": &FormElement{
		Description: "Delta revocation list; use ;binary - RFC2256",
	},
	"dmdName": &FormElement{
		Description: "Name of DMD - RFC2256",
	},
	"pseudonym": &FormElement{
		Description: "Pseudonym for the object - X.520(4th)",
	},
	"labeledURI": &FormElement{
		Description: "Uniform Resource Identifier with optional label - RFC2079",
	},
	"uid": &FormElement{
		Description: "User identifier - RFC1274",
		Order: 7,
	},
	"userid": &FormElement{
		Description: "User identifier - RFC1274",
	},
	"mail": &FormElement{
		Description: "RFC822 Mailbox - RFC1274",
		Order: 7,
	},
	"rfc822Mailbox": &FormElement{
		Description: "RFC822 Mailbox - RFC1274",
	},
	"dc": &FormElement{
		Description: "Domain component - RFC1274/2247",
		Order: 10,
	},
	"domainComponent": &FormElement{
		Description: "Domain component - RFC1274/2247",
		Order: 10,
	},
	"associatedDomain": &FormElement{
		Description: "Domain associated with object - RFC1274",
	},
	"email": &FormElement{
		Description: "Legacy attribute for email addresses in DNs - RFC3280",
	},
	"emailAddress": &FormElement{
		Description: "Legacy attribute for email addresses in DNs - RFC3280",
	},
	"pkcs9email": &FormElement{
		Description: "Legacy attribute for email addresses in DNs - RFC3280",
	},
	//////////////////////////
	// SCHEMA: inetorgperson.schema
	"carLicense": &FormElement{
		Description: "Vehicle license or registration plate - RFC2798",
		Order: 20,
	},
	"departmentNumber": &FormElement{
		Description: "Identifies a department within an organization - RFC2798",
		Order: 20,
	},
	"displayName": &FormElement{
		Description: "Preferred name to be used when displaying entries - RFC2798",
		Order: 5,
	},
	"employeeNumber": &FormElement{
		Description: "Numerically identifies an employee within an organization - RFC2798",
		Order: 20,
	},
	"employeeType": &FormElement{
		Description: "Type of employment for a person - RFC2798",
		Order: 20,
	},
	"jpegPhoto": &FormElement{
		Description: "A JPEG image - RFC2798",
		Order: 17,
	},
	"preferredLanguage": &FormElement{
		Description: "Preferred written or spoken language for a person - RFC2798",
		Order: 19,
	},
	"userSMIMECertificate": &FormElement{
		Description: "PKCS7 SignedData used to support S/MIME - RFC2798",
	},
	"userPKCS12": &FormElement{
		Description: "Personal identity information, a PKCS 12 PFX - RFC2798",
	},
	//////////////////////////
	// SCHEMA: collective.schema
	"c-l": &FormElement{
		Description: "Locality name for the collection of entries",
	},
	"c-st": &FormElement{
		Description: "State or province name for the collection of entries",
	},
	"c-street": &FormElement{
		Description: "Street address for the collection of entries",
	},
	"c-o": &FormElement{
		Description: "Organization name for the collection of entries",
		Order: 10,
	},
	"c-ou": &FormElement{
		Description: "Organizational unit name for the collection of entries",
		Order: 10,
	},
	"c-PostalAddress": &FormElement{
		Description: "Postal address for the collection of entries",
		Order: 15,
	},
	"c-PostalCode": &FormElement{
		Order: 15,
		Description: "Postal code for the collection of entries",
	},
	"c-PostOfficeBox": &FormElement{
		Order: 15,
		Description: "Post office box for the collection of entries",
	},
	"c-PhysicalDeliveryOfficeName": &FormElement{
		Order: 20,
		Description: "Physical dlivery office name for a collection of entries.",
	},
	"c-TelephoneNumber": &FormElement{
		Order: 8,
		Description: "telephone number for the collection of entries",
	},
	"c-TelexNumber": &FormElement{
		Order: 25,
		Description: "Telex number for the collection of entries",
	},
	"c-FacsimileTelephoneNumber": &FormElement{
		Description: "Facsimile telephone number for a collection of entries.",
	},
	"c-InternationalISDNNumber": &FormElement{
		Description: "International ISDN number for the collection of entries",
	},
	//////////////////////////
	// SCHEMA: corba.schema
	"corbaIor": &FormElement{
		Description: "Stringified interoperable object reference of a CORBA object",
	},
	"corbaRepositoryId": &FormElement{
		Description: "Repository ids of interfaces implemented by a CORBA object",
	},
	//////////////////////////
	// SCHEMA: cosine.schema
	"textEncodedORAddress": &FormElement{
		Description: "Text encoding of an X.400 O/R address, as specified in RFC 987",
	},
	"info": &FormElement{
		Description: "General information - RFC1274",
	},
	"drink": &FormElement{
		Description: "Favorite drink - RFC1274",
	},
	"favouriteDrink": &FormElement{
		Description: "Favorite drink - RFC1274",
	},
	"roomNumber": &FormElement{
		Description: "Room number - RFC1274",
		Order: 20,
	},
	"photo": &FormElement{
		Description: "Photo (G3 fax) - RFC1274",
		Order: 17,
	},
	"userClass": &FormElement{
		Description: "Category of user - RFC1274",
	},
	"host": &FormElement{
		Description: "Host computer - RFC1274",
	},
	"manager": &FormElement{
		Description: "DN of manager - RFC1274",
		Order: 20,
	},
	"documentIdentifier": &FormElement{
		Description: "Unique identifier of document - RFC1274",
	},
	"documentTitle": &FormElement{
		Description: "Title of document - RFC1274",
	},
	"documentVersion": &FormElement{
		Description: "Version of document - RFC1274",
	},
	"documentAuthor": &FormElement{
		Description: "DN of author of document - RFC1274",
	},
	"documentLocation": &FormElement{
		Description: "Location of document original - RFC1274",
	},
	"homePhone": &FormElement{
		Description: "Home telephone number - RFC1274",
		Order: 8,
	},
	"homeTelephoneNumber": &FormElement{
		Description: "Home telephone number - RFC1274",
	},
	"secretary": &FormElement{
		Description: "DN of secretary - RFC1274",
	},
	"otherMailbox": &FormElement{
	},
	"lastModifiedTime": &FormElement{
		Description: "Time of last modify, replaced by modifyTimestamp - RFC1274",
	},
	"lastModifiedBy": &FormElement{
		Description: "Last modifier, replaced by modifiersName - RFC1274",
	},
	"aRecord": &FormElement{
		Description: "Type A (Address) DNS resource record",
	},
	"mDRecord": &FormElement{
	},
	"mXRecord": &FormElement{
		Description: "Mail Exchange DNS resource record",
	},
	"nSRecord": &FormElement{
		Description: "Name Server DNS resource record",
	},
	"sOARecord": &FormElement{
		Description: "Start of Authority DNS resource record",
	},
	"cNAMERecord": &FormElement{
		Description: "CNAME (Canonical Name) DNS resource record",
	},
	"associatedName": &FormElement{
		Description: "DN of entry associated with domain - RFC1274",
	},
	"homePostalAddress": &FormElement{
		Description: "Home postal address - RFC1274",
		Order: 15,
	},
	"personalTitle": &FormElement{
		Description: "Personal title - RFC1274",
	},
	"mobile": &FormElement{
		Description: "Mobile telephone number - RFC1274",
		Order: 8,
	},
	"mobileTelephoneNumber": &FormElement{
		Description: "Mobile telephone number - RFC1274",
		Order: 8,
	},
	"pager": &FormElement{
		Description: "Pager telephone number - RFC1274",
		Order: 20,
	},
	"pagerTelephoneNumber": &FormElement{
		Description: "Pager telephone number - RFC1274",
		Order: 20,
	},
	"co": &FormElement{
		Description: "Friendly country name - RFC1274",
	},
	"friendlyCountryName": &FormElement{
		Description: "Friendly country name - RFC1274",
	},
	"uniqueIdentifier": &FormElement{
		Description: "Unique identifer - RFC1274",
	},
	"organizationalStatus": &FormElement{
		Description: "Organizational status - RFC1274",
	},
	"janetMailbox": &FormElement{
		Description: "Janet mailbox - RFC1274",
	},
	"mailPreferenceOption": &FormElement{
		Description: "Mail preference option - RFC1274",
	},
	"buildingName": &FormElement{
		Description: "Name of building - RFC1274",
	},
	"dSAQuality": &FormElement{
		Description: "DSA Quality - RFC1274",
	},
	"singleLevelQuality": &FormElement{
		Description: "Single Level Quality - RFC1274",
	},
	"subtreeMinimumQuality": &FormElement{
		Description: "Subtree Minimum Quality - RFC1274",
	},
	"subtreeMaximumQuality": &FormElement{
		Description: "Subtree Maximum Quality - RFC1274",
	},
	"personalSignature": &FormElement{
		Description: "Personal Signature (G3 fax) - RFC1274",
	},
	"dITRedirect": &FormElement{
		Description: "DIT Redirect - RFC1274",
	},
	"audio": &FormElement{
		Description: "Audio (u-law) - RFC1274",
	},
	"documentPublisher": &FormElement{
		Description: "Publisher of document - RFC1274",
	},
	//////////////////////////
	// SCHEMA: duaconf.schema
	"defaultServerList": &FormElement{
		Description: "Default LDAP server host address used by a DUA",
	},
	"defaultSearchBase": &FormElement{
		Description: "Default LDAP base DN used by a DUA",
	},
	"preferredServerList": &FormElement{
		Description: "Preferred LDAP server host addresses to be used by a DUA",
	},
	"searchTimeLimit": &FormElement{
		Description: "Maximum time in seconds a DUA should allow for a search to complete",
	},
	"bindTimeLimit": &FormElement{
		Description: "Maximum time in seconds a DUA should allow for the bind operation to complete",
	},
	"followReferrals": &FormElement{
		Description: "Tells DUA if it should follow referrals returned by a DSA search result",
	},
	"dereferenceAliases": &FormElement{
		Description: "Tells DUA if it should dereference aliases",
	},
	"authenticationMethod": &FormElement{
		Description: "A keystring which identifies the type of authentication method used to contact the DSA",
	},
	"profileTTL": &FormElement{
		Description: "Time to live, in seconds, before a client DUA should re-read this configuration profile",
	},
	"serviceSearchDescriptor": &FormElement{
		Description: "LDAP search descriptor list used by a DUA",
	},
	"attributeMap": &FormElement{
		Description: "Attribute mappings used by a DUA",
	},
	"credentialLevel": &FormElement{
		Description: "Identifies type of credentials a DUA should use when binding to the LDAP server",
	},
	"objectclassMap": &FormElement{
		Description: "Objectclass mappings used by a DUA",
	},
	"defaultSearchScope": &FormElement{
		Description: "Default search scope used by a DUA",
	},
	"serviceCredentialLevel": &FormElement{
		Description: "Identifies type of credentials a DUA should use when binding to the LDAP server for a specific service",
	},
	"serviceAuthenticationMethod": &FormElement{
		Description: "Authentication method used by a service of the DUA",
	},
	//////////////////////////
	// SCHEMA: dyngroup.schema
	"memberURL": &FormElement{
		Description: "Identifies an URL associated with each member of a group. Any type of labeled URL can be used.",
	},
	"dgIdentity": &FormElement{
		Description: "Identity to use when processing the memberURL",
	},
	"dgAuthz": &FormElement{
		Description: "Optional authorization rules that determine who is allowed to assume the dgIdentity",
	},
	//////////////////////////
	// SCHEMA: java.schema
	"javaClassName": &FormElement{
		Description: "Fully qualified name of distinguished Java class or interface",
	},
	"javaCodebase": &FormElement{
		Description: "URL(s) specifying the location of class definition",
	},
	"javaClassNames": &FormElement{
		Description: "Fully qualified Java class or interface name",
	},
	"javaSerializedData": &FormElement{
		Description: "Serialized form of a Java object",
	},
	"javaFactory": &FormElement{
		Description: "Fully qualified Java class name of a JNDI object factory",
	},
	"javaReferenceAddress": &FormElement{
		Description: "Addresses associated with a JNDI Reference",
	},
	"javaDoc": &FormElement{
		Description: "The Java documentation for the class",
	},
	//////////////////////////
	// SCHEMA: misc.schema
	"mailLocalAddress": &FormElement{
		Description: "RFC822 email address of this recipient",
	},
	"mailHost": &FormElement{
		Description: "FQDN of the SMTP/MTA of this recipient",
	},
	"mailRoutingAddress": &FormElement{
		Description: "RFC822 routing address of this recipient",
	},
	"rfc822MailMember": &FormElement{
		Description: "Rfc822 mail address of group member(s)",
	},
	//////////////////////////
	// SCHEMA: msuser.schema
	"ownerBL": &FormElement{
	},
	"msCOM-PartitionSetLink": &FormElement{
	},
	"msCOM-UserLink": &FormElement{
	},
	"msDS-Approx-Immed-Subordinates": &FormElement{
	},
	"msDS-NCReplCursors": &FormElement{
	},
	"msDS-NCReplInboundNeighbors": &FormElement{
	},
	"msDS-NCReplOutboundNeighbors": &FormElement{
	},
	"msDS-ReplAttributeMetaData": &FormElement{
	},
	"msDS-ReplValueMetaData": &FormElement{
	},
	"msDS-NonMembers": &FormElement{
	},
	"msDS-NonMembersBL": &FormElement{
	},
	"msDS-MembersForAzRole": &FormElement{
	},
	"msDS-MembersForAzRoleBL": &FormElement{
	},
	"msDS-OperationsForAzTask": &FormElement{
	},
	"msDS-OperationsForAzTaskBL": &FormElement{
	},
	"msDS-TasksForAzTask": &FormElement{
	},
	"msDS-TasksForAzTaskBL": &FormElement{
	},
	"msDS-OperationsForAzRole": &FormElement{
	},
	"msDS-OperationsForAzRoleBL": &FormElement{
	},
	"msDS-TasksForAzRole": &FormElement{
	},
	"msDS-TasksForAzRoleBL": &FormElement{
	},
	"msDs-masteredBy": &FormElement{
	},
	"msDS-ObjectReference": &FormElement{
	},
	"msDS-ObjectReferenceBL": &FormElement{
	},
	"msDS-PrincipalName": &FormElement{
	},
	"msDS-RevealedDSAs": &FormElement{
	},
	"msDS-KrbTgtLinkBl": &FormElement{
	},
	"msDS-IsFullReplicaFor": &FormElement{
	},
	"msDS-IsDomainFor": &FormElement{
	},
	"msDS-IsPartialReplicaFor": &FormElement{
	},
	"msDS-AuthenticatedToAccountlist": &FormElement{
	},
	"msDS-AuthenticatedAtDC": &FormElement{
	},
	"msDS-RevealedListBL": &FormElement{
	},
	"msDS-NC-RO-Replica-Locations-BL": &FormElement{
	},
	"msDS-PSOApplied": &FormElement{
	},
	"msDS-NcType": &FormElement{
	},
	"msDS-OIDToGroupLinkBl": &FormElement{
	},
	"isRecycled": &FormElement{
	},
	"msDS-LocalEffectiveDeletionTime": &FormElement{
	},
	"msDS-LocalEffectiveRecycleTime": &FormElement{
	},
	"msDS-LastKnownRDN": &FormElement{
	},
	"msDS-EnabledFeatureBL": &FormElement{
	},
	"msDS-MembersOfResourcePropertyListBL": &FormElement{
	},
	"msDS-ValueTypeReferenceBL": &FormElement{
	},
	"msDS-TDOIngressBL": &FormElement{
	},
	"msDS-TDOEgressBL": &FormElement{
	},
	"msDS-parentdistname": &FormElement{
	},
	"msDS-ReplValueMetaDataExt": &FormElement{
	},
	"msds-memberOfTransitive": &FormElement{
	},
	"msds-memberTransitive": &FormElement{
	},
	"msSFU30PosixMemberOf": &FormElement{
	},
	"msDFSR-MemberReferenceBL": &FormElement{
	},
	"msDFSR-ComputerReferenceBL": &FormElement{
	},
	"msDS-AzLDAPQuery": &FormElement{
	},
	"msDS-AzBizRuleLanguage": &FormElement{
	},
	"msDS-AzLastImportedBizRulePath": &FormElement{
	},
	"msDS-AzApplicationData": &FormElement{
	},
	"msDS-AzObjectGuid": &FormElement{
	},
	"msDS-AzGenericData": &FormElement{
	},
	"msDS-PrimaryComputer": &FormElement{
	},
	"msSFU30Name": &FormElement{
	},
	"msSFU30NisDomain": &FormElement{
	},
	"msSFU30PosixMember": &FormElement{
	},
	"msCOM-UserPartitionSetLink": &FormElement{
	},
	"msDS-Cached-Membership": &FormElement{
	},
	"msDS-Cached-Membership-Time-Stamp": &FormElement{
	},
	"msDS-Site-Affinity": &FormElement{
	},
	"msDS-User-Account-Control-Computed": &FormElement{
	},
	"lastLogonTimestamp": &FormElement{
	},
	"msIIS-FTPRoot": &FormElement{
	},
	"msIIS-FTPDir": &FormElement{
	},
	"msDRM-IdentityCertificate": &FormElement{
	},
	"msDS-SourceObjectDN": &FormElement{
	},
	"msPKIRoamingTimeStamp": &FormElement{
	},
	"msPKIDPAPIMasterKeys": &FormElement{
	},
	"msPKIAccountCredentials": &FormElement{
	},
	"msRADIUS-FramedInterfaceId": &FormElement{
	},
	"msRADIUS-SavedFramedInterfaceId": &FormElement{
	},
	"msRADIUS-FramedIpv6Prefix": &FormElement{
	},
	"msRADIUS-SavedFramedIpv6Prefix": &FormElement{
	},
	"msRADIUS-FramedIpv6Route": &FormElement{
	},
	"msRADIUS-SavedFramedIpv6Route": &FormElement{
	},
	"msDS-SecondaryKrbTgtNumber": &FormElement{
	},
	"msDS-SupportedEncryptionTypes": &FormElement{
	},
	"msDS-LastSuccessfulInteractiveLogonTime": &FormElement{
	},
	"msDS-LastFailedInteractiveLogonTime": &FormElement{
	},
	"msDS-FailedInteractiveLogonCount": &FormElement{
	},
	"msDS-FailedInteractiveLogonCountAtLastSuccessfulLogon": &FormElement{
	},
	"msTSProfilePath": &FormElement{
	},
	"msTSHomeDirectory": &FormElement{
	},
	"msTSHomeDrive": &FormElement{
	},
	"msTSAllowLogon": &FormElement{
	},
	"msTSRemoteControl": &FormElement{
	},
	"msTSMaxDisconnectionTime": &FormElement{
	},
	"msTSMaxConnectionTime": &FormElement{
	},
	"msTSMaxIdleTime": &FormElement{
	},
	"msTSReconnectionAction": &FormElement{
	},
	"msTSBrokenConnectionAction": &FormElement{
	},
	"msTSConnectClientDrives": &FormElement{
	},
	"msTSConnectPrinterDrives": &FormElement{
	},
	"msTSDefaultToMainPrinter": &FormElement{
	},
	"msTSWorkDirectory": &FormElement{
	},
	"msTSInitialProgram": &FormElement{
	},
	"msTSProperty01": &FormElement{
	},
	"msTSProperty02": &FormElement{
	},
	"msTSExpireDate": &FormElement{
	},
	"msTSLicenseVersion": &FormElement{
	},
	"msTSManagingLS": &FormElement{
	},
	"msDS-UserPasswordExpiryTimeComputed": &FormElement{
	},
	"msTSManagingLS4": &FormElement{
	},
	"msTSManagingLS3": &FormElement{
	},
	"msTSManagingLS2": &FormElement{
	},
	"msTSExpireDate4": &FormElement{
	},
	"msTSExpireDate3": &FormElement{
	},
	"msTSExpireDate2": &FormElement{
	},
	"msTSLicenseVersion3": &FormElement{
	},
	"msTSLicenseVersion2": &FormElement{
	},
	"msTSLicenseVersion4": &FormElement{
	},
	"msTSLSProperty01": &FormElement{
	},
	"msTSLSProperty02": &FormElement{
	},
	"msDS-ResultantPSO": &FormElement{
	},
	"msPKI-CredentialRoamingTokens": &FormElement{
	},
	"msTSPrimaryDesktop": &FormElement{
	},
	"msTSSecondaryDesktops": &FormElement{
	},
	"msDS-SyncServerUrl": &FormElement{
	},
	"msDS-AssignedAuthNPolicySilo": &FormElement{
	},
	"msDS-AuthNPolicySiloMembersBL": &FormElement{
	},
	"msDS-AssignedAuthNPolicy": &FormElement{
	},
	"msDS-Behavior-Version": &FormElement{
	},
	"msDS-PerUserTrustQuota": &FormElement{
	},
	"msDS-AllUsersTrustQuota": &FormElement{
	},
	"msDS-PerUserTrustTombstonesQuota": &FormElement{
	},
	"msDS-AdditionalDnsHostName": &FormElement{
	},
	"msDS-AdditionalSamAccountName": &FormElement{
	},
	"msDS-ExecuteScriptPassword": &FormElement{
	},
	"msDS-KrbTgtLink": &FormElement{
	},
	"msDS-RevealedUsers": &FormElement{
	},
	"msDS-NeverRevealGroup": &FormElement{
	},
	"msDS-RevealOnDemandGroup": &FormElement{
	},
	"msDS-RevealedList": &FormElement{
	},
	"msDS-isGC": &FormElement{
	},
	"msDS-isRODC": &FormElement{
	},
	"msDS-SiteName": &FormElement{
	},
	"msDS-PromotionSettings": &FormElement{
	},
	"msTPM-OwnerInformation": &FormElement{
	},
	"msDS-IsUserCachableAtRodc": &FormElement{
	},
	"msDS-HostServiceAccount": &FormElement{
	},
	"msTSEndpointData": &FormElement{
	},
	"msTSEndpointType": &FormElement{
	},
	"msTSEndpointPlugin": &FormElement{
	},
	"msTSPrimaryDesktopBL": &FormElement{
	},
	"msTSSecondaryDesktopBL": &FormElement{
	},
	"msTPM-TpmInformationForComputer": &FormElement{
	},
	"msDS-GenerationId": &FormElement{
	},
	"msImaging-ThumbprintHash": &FormElement{
	},
	"msImaging-HashAlgorithm": &FormElement{
	},
	"netbootDUID": &FormElement{
	},
	"msSFU30Aliases": &FormElement{
	},
	"netbootNewMachineOU": &FormElement{
	},
	"builtinCreationTime": &FormElement{
	},
	"pKIEnrollmentAccess": &FormElement{
	},
	"pKIExtendedKeyUsage": &FormElement{
	},
	"msNPCalledStationID": &FormElement{
	},
	"initialAuthIncoming": &FormElement{
	},
	"objectClassCategory": &FormElement{
	},
	"generatedConnection": &FormElement{
	},
	"allowedChildClasses": &FormElement{
	},
	"machineArchitecture": &FormElement{
	},
	"aCSMaxPeakBandwidth": &FormElement{
	},
	"marshalledInterface": &FormElement{
	},
	"rIDManagerReference": &FormElement{
	},
	"aCSEnableACSService": &FormElement{
	},
	"mSMQRoutingService": &FormElement{
	},
	"mS-SQL-AllowQueuedUpdatingSubscription": &FormElement{
	},
	"primaryTelexNumber": &FormElement{
	},
	"userAccountControl": &FormElement{
	},
	"shellPropertyPages": &FormElement{
	},
	"replUpToDateVector": &FormElement{
	},
	"fRSDirectoryFilter": &FormElement{
	},
	"printSeparatorFile": &FormElement{
	},
	"pKIMaxIssuingDepth": &FormElement{
	},
	"accountNameHistory": &FormElement{
	},
	"mS-SQL-GPSLongitude": &FormElement{
	},
	"adminPropertyPages": &FormElement{
	},
	"securityIdentifier": &FormElement{
	},
	"groupMembershipSAM": &FormElement{
	},
	"serviceDNSNameType": &FormElement{
	},
	"meetingIsEncrypted": &FormElement{
	},
	"mS-SQL-Applications": &FormElement{
	},
	"lastUpdateSequence": &FormElement{
	},
	"lastContentIndexed": &FormElement{
	},
	"meetingDescription": &FormElement{
	},
	"fRSTimeLastCommand": &FormElement{
	},
	"monikerDisplayName": &FormElement{
	},
	"requiredCategories": &FormElement{
	},
	"upgradeProductCode": &FormElement{
	},
	"aCSMaxNoOfLogFiles": &FormElement{
	},
	"mS-SQL-CharacterSet": &FormElement{
	},
	"meetingContactInfo": &FormElement{
	},
	"mS-SQL-CreationDate": &FormElement{
	},
	"domainPolicyObject": &FormElement{
	},
	"dhcpObjDescription": &FormElement{
	},
	"meetingApplication": &FormElement{
	},
	"defaultHidingValue": &FormElement{
	},
	"fRSMemberReference": &FormElement{
	},
	"dhcpIdentification": &FormElement{
	},
	"trustAuthOutgoing": &FormElement{
	},
	"systemMustContain": &FormElement{
	},
	"primaryGroupToken": &FormElement{
	},
	"rpcNsProfileEntry": &FormElement{
	},
	"trustAuthIncoming": &FormElement{
	},
	"mSMQPrevSiteGates": &FormElement{
	},
	"queryPolicyObject": &FormElement{
	},
	"optionDescription": &FormElement{
	},
	"aCSMaximumSDUSize": &FormElement{
	},
	"nonSecurityMember": &FormElement{
	},
	"fRSReplicaSetType": &FormElement{
	},
	"aCSTotalNoOfFlows": &FormElement{
	},
	"possibleInferiors": &FormElement{
	},
	"netbootMaxClients": &FormElement{
	},
	"mS-SQL-GPSLatitude": &FormElement{
	},
	"aCSPermissionBits": &FormElement{
	},
	"mSMQTransactional": &FormElement{
	},
	"mS-SQL-Description": &FormElement{
	},
	"allowedAttributes": &FormElement{
	},
	"fRSFaultCondition": &FormElement{
	},
	"tombstoneLifetime": &FormElement{
	},
	"remoteStorageGUID": &FormElement{
	},
	"showInAddressBook": &FormElement{
	},
	"defaultClassStore": &FormElement{
	},
	"meetingOriginator": &FormElement{
	},
	"userPrincipalName": &FormElement{
	},
	"aCSMinimumLatency": &FormElement{
	},
	"isPrivilegeHolder": &FormElement{
	},
	"fRSReplicaSetGUID": &FormElement{
	},
	"rIDAllocationPool": &FormElement{
	},
	"pKIDefaultKeySpec": &FormElement{
	},
	"dynamicLDAPServer": &FormElement{
	},
	"serverReferenceBL": &FormElement{
	},
	"fRSServiceCommand": &FormElement{
	},
	"sDRightsEffective": &FormElement{
	},
	"proxiedObjectName": &FormElement{
	},
	"meetingRecurrence": &FormElement{
	},
	"cOMTreatAsClassId": &FormElement{
	},
	"globalAddressList": &FormElement{
	},
	"extendedClassInfo": &FormElement{
	},
	"machineWidePolicy": &FormElement{
	},
	"foreignIdentifier": &FormElement{
	},
	"dNReferenceUpdate": &FormElement{
	},
	"trustPosixOffset": &FormElement{
	},
	"enabledConnection": &FormElement{
	},
	"ipsecNFAReference": &FormElement{
	},
	"userWorkstations": &FormElement{
	},
	"garbageCollPeriod": &FormElement{
	},
	"mSMQComputerType": &FormElement{
	},
	"logonWorkstation": &FormElement{
	},
	"mSMQJournalQuota": &FormElement{
	},
	"remoteSourceType": &FormElement{
	},
	"pwdHistoryLength": &FormElement{
	},
	"mSMQBasePriority": &FormElement{
	},
	"systemMayContain": &FormElement{
	},
	"mS-SQL-ThirdParty": &FormElement{
	},
	"mSMQQueueNameExt": &FormElement{
	},
	"fRSUpdateTimeout": &FormElement{
	},
	"mSMQPrivacyLevel": &FormElement{
	},
	"shellContextMenu": &FormElement{
	},
	"wellKnownObjects": &FormElement{
	},
	"transportDLLName": &FormElement{
	},
	"qualityOfService": &FormElement{
	},
	"lockoutThreshold": &FormElement{
	},
	"remoteServerName": &FormElement{
	},
	"previousParentCA": &FormElement{
	},
	"dSUIShellMaximum": &FormElement{
	},
	"notificationList": &FormElement{
	},
	"addressBookRoots": &FormElement{
	},
	"fRSPrimaryMember": &FormElement{
	},
	"meetingStartTime": &FormElement{
	},
	"mSMQSiteGatesMig": &FormElement{
	},
	"dhcpReservations": &FormElement{
	},
	"adminContextMenu": &FormElement{
	},
	"pKIOverlapPeriod": &FormElement{
	},
	"winsockAddresses": &FormElement{
	},
	"mSMQAuthenticate": &FormElement{
	},
	"dSUIAdminMaximum": &FormElement{
	},
	"appSchemaVersion": &FormElement{
	},
	"serviceClassInfo": &FormElement{
	},
	"aCSEventLogLevel": &FormElement{
	},
	"userSharedFolder": &FormElement{
	},
	"domainWidePolicy": &FormElement{
	},
	"rIDSetReferences": &FormElement{
	},
	"canUpgradeScript": &FormElement{
	},
	"classDisplayName": &FormElement{
	},
	"adminDescription": &FormElement{
	},
	"lSAModifiedCount": &FormElement{
	},
	"serviceClassName": &FormElement{
	},
	"localPolicyFlags": &FormElement{
	},
	"rpcNsInterfaceID": &FormElement{
	},
	"adminDisplayName": &FormElement{
	},
	"nameServiceFlags": &FormElement{
	},
	"meetingBandwidth": &FormElement{
	},
	"domainIdentifier": &FormElement{
	},
	"rIDAvailablePool": &FormElement{
	},
	"legacyExchangeDN": &FormElement{
	},
	"trustAttributes": &FormElement{
	},
	"fRSRootSecurity": &FormElement{
	},
	"superiorDNSRoot": &FormElement{
	},
	"printMaxYExtent": &FormElement{
	},
	"printMaxXExtent": &FormElement{
	},
	"printMinYExtent": &FormElement{
	},
	"printMinXExtent": &FormElement{
	},
	"attributeSyntax": &FormElement{
	},
	"printAttributes": &FormElement{
	},
	"groupAttributes": &FormElement{
	},
	"fileExtPriority": &FormElement{
	},
	"mSMQServiceType": &FormElement{
	},
	"operatingSystem": &FormElement{
	},
	"mS-SQL-SortOrder": &FormElement{
	},
	"versionNumberLo": &FormElement{
	},
	"msRRASAttribute": &FormElement{
	},
	"lastKnownParent": &FormElement{
	},
	"shortServerName": &FormElement{
	},
	"lockoutDuration": &FormElement{
	},
	"defaultPriority": &FormElement{
	},
	"rpcNsEntryFlags": &FormElement{
	},
	"optionsLocation": &FormElement{
	},
	"versionNumberHi": &FormElement{
	},
	"rpcNsAnnotation": &FormElement{
	},
	"purportedSearch": &FormElement{
	},
	"aCSDSBMPriority": &FormElement{
	},
	"mSMQSiteForeign": &FormElement{
	},
	"currentLocation": &FormElement{
	},
	"meetingProtocol": &FormElement{
	},
	"publicKeyPolicy": &FormElement{
	},
	"mS-SQL-Publisher": &FormElement{
	},
	"createWizardExt": &FormElement{
	},
	"mS-SQL-Clustered": &FormElement{
	},
	"volTableIdxGUID": &FormElement{
	},
	"currentParentCA": &FormElement{
	},
	"seqNotification": &FormElement{
	},
	"serverReference": &FormElement{
	},
	"msNPAllowDialin": &FormElement{
	},
	"mS-SQL-GPSHeight": &FormElement{
	},
	"mS-SQL-AppleTalk": &FormElement{
	},
	"linkTrackSecret": &FormElement{
	},
	"dnsAllowDynamic": &FormElement{
	},
	"badPasswordTime": &FormElement{
	},
	"privilegeHolder": &FormElement{
	},
	"printMediaReady": &FormElement{
	},
	"printMACAddress": &FormElement{
	},
	"lSACreationTime": &FormElement{
	},
	"meetingLocation": &FormElement{
	},
	"aCSIdentityName": &FormElement{
	},
	"mS-DS-CreatorSID": &FormElement{
	},
	"mS-SQL-NamedPipe": &FormElement{
	},
	"lDAPAdminLimits": &FormElement{
	},
	"lDAPDisplayName": &FormElement{
	},
	"applicationName": &FormElement{
	},
	"pendingParentCA": &FormElement{
	},
	"aCSCacheTimeout": &FormElement{
	},
	"meetingLanguage": &FormElement{
	},
	"aCSDSBMDeadTime": &FormElement{
	},
	"cACertificateDN": &FormElement{
	},
	"userParameters": &FormElement{
	},
	"trustDirection": &FormElement{
	},
	"mSMQQueueQuota": &FormElement{
	},
	"mSMQEncryptKey": &FormElement{
	},
	"terminalServer": &FormElement{
	},
	"printStartTime": &FormElement{
	},
	"syncWithObject": &FormElement{
	},
	"groupsToIgnore": &FormElement{
	},
	"syncMembership": &FormElement{
	},
	"syncAttributes": &FormElement{
	},
	"nextLevelStore": &FormElement{
	},
	"sAMAccountType": &FormElement{
	},
	"mS-SQL-Keywords": &FormElement{
	},
	"proxyAddresses": &FormElement{
	},
	"bytesPerMinute": &FormElement{
	},
	"printMaxCopies": &FormElement{
	},
	"primaryGroupID": &FormElement{
	},
	"nTGroupMembers": &FormElement{
	},
	"mSMQDsServices": &FormElement{
	},
	"fRSVersionGUID": &FormElement{
	},
	"fRSWorkingPath": &FormElement{
	},
	"otherTelephone": &FormElement{
	},
	"otherHomePhone": &FormElement{
	},
	"oEMInformation": &FormElement{
	},
	"networkAddress": &FormElement{
	},
	"mSMQDigestsMig": &FormElement{
	},
	"meetingKeyword": &FormElement{
	},
	"lDAPIPDenyList": &FormElement{
	},
	"installUiLevel": &FormElement{
	},
	"gPCFileSysPath": &FormElement{
	},
	"fRSStagingPath": &FormElement{
	},
	"auxiliaryClass": &FormElement{
	},
	"accountExpires": &FormElement{
	},
	"dhcpProperties": &FormElement{
	},
	"desktopProfile": &FormElement{
	},
	"aCSServiceType": &FormElement{
	},
	"assocNTAccount": &FormElement{
	},
	"creationWizard": &FormElement{
	},
	"cOMOtherProgId": &FormElement{
	},
	"auditingPolicy": &FormElement{
	},
	"privilegeValue": &FormElement{
	},
	"mS-SQL-Location": &FormElement{
	},
	"pKIDefaultCSPs": &FormElement{
	},
	"printShareName": &FormElement{
	},
	"isSingleValued": &FormElement{
	},
	"domainCrossRef": &FormElement{
	},
	"netbootSIFFile": &FormElement{
	},
	"cOMUniqueLIBID": &FormElement{
	},
	"serviceDNSName": &FormElement{
	},
	"objectCategory": &FormElement{
	},
	"serviceClassID": &FormElement{
	},
	"dhcpUpdateTime": &FormElement{
	},
	"sAMAccountName": &FormElement{
	},
	"meetingEndTime": &FormElement{
	},
	"mS-SQL-Language": &FormElement{
	},
	"aCSDSBMRefresh": &FormElement{
	},
	"mS-SQL-Database": &FormElement{
	},
	"cOMInterfaceID": &FormElement{
	},
	"mS-SQL-AllowKnownPullSubscription": &FormElement{
	},
	"mS-SQL-AllowAnonymousSubscription": &FormElement{
	},
	"managedObjects": &FormElement{
	},
	"possSuperiors": &FormElement{
	},
	"transportType": &FormElement{
	},
	"groupPriority": &FormElement{
	},
	"rpcNsPriority": &FormElement{
	},
	"mSMQQueueType": &FormElement{
	},
	"versionNumber": &FormElement{
	},
	"uSNLastObjRem": &FormElement{
	},
	"templateRoots": &FormElement{
	},
	"pwdProperties": &FormElement{
	},
	"printNumberUp": &FormElement{
	},
	"fRSExtensions": &FormElement{
	},
	"printRateUnit": &FormElement{
	},
	"msiScriptSize": &FormElement{
	},
	"printSpooling": &FormElement{
	},
	"queryPolicyBL": &FormElement{
	},
	"proxyLifetime": &FormElement{
	},
	"operatorCount": &FormElement{
	},
	"netbootServer": &FormElement{
	},
	"fSMORoleOwner": &FormElement{
	},
	"driverVersion": &FormElement{
	},
	"mS-SQL-Version": &FormElement{
	},
	"mSMQNameStyle": &FormElement{
	},
	"schemaVersion": &FormElement{
	},
	"directReports": &FormElement{
	},
	"addressSyntax": &FormElement{
	},
	"printFormName": &FormElement{
	},
	"msiScriptPath": &FormElement{
	},
	"aCSServerList": &FormElement{
	},
	"moveTreeState": &FormElement{
	},
	"mSMQSiteGates": &FormElement{
	},
	"mSMQDsService": &FormElement{
	},
	"objectVersion": &FormElement{
	},
	"dNSTombstoned": &FormElement{
	},
	"mSMQLongLived": &FormElement{
	},
	"fRSLevelLimit": &FormElement{
	},
	"msiScriptName": &FormElement{
	},
	"dhcpUniqueKey": &FormElement{
	},
	"extensionName": &FormElement{
	},
	"rpcNsBindings": &FormElement{
	},
	"printBinNames": &FormElement{
	},
	"replicaSource": &FormElement{
	},
	"printLanguage": &FormElement{
	},
	"mS-SQL-Contact": &FormElement{
	},
	"nTMixedDomain": &FormElement{
	},
	"fRSFileFilter": &FormElement{
	},
	"birthLocation": &FormElement{
	},
	"friendlyNames": &FormElement{
	},
	"ipsecDataType": &FormElement{
	},
	"meetingRating": &FormElement{
	},
	"indexedScopes": &FormElement{
	},
	"rpcNsObjectID": &FormElement{
	},
	"modifiedCount": &FormElement{
	},
	"oMObjectClass": &FormElement{
	},
	"aCSPolicyName": &FormElement{
	},
	"timeVolChange": &FormElement{
	},
	"currMachineId": &FormElement{
	},
	"schemaFlagsEx": &FormElement{
	},
	"validAccesses": &FormElement{
	},
	"domainReplica": &FormElement{
	},
	"mSMQInterval2": &FormElement{
	},
	"mSMQInterval1": &FormElement{
	},
	"canonicalName": &FormElement{
	},
	"ntPwdHistory": &FormElement{
	},
	"trustPartner": &FormElement{
	},
	"lmPwdHistory": &FormElement{
	},
	"mS-SQL-Status": &FormElement{
	},
	"USNIntersite": &FormElement{
	},
	"netbootTools": &FormElement{
	},
	"priorSetTime": &FormElement{
	},
	"mS-SQL-Memory": &FormElement{
	},
	"mSMQServices": &FormElement{
	},
	"currentValue": &FormElement{
	},
	"siteLinkList": &FormElement{
	},
	"remoteSource": &FormElement{
	},
	"setupCommand": &FormElement{
	},
	"dSHeuristics": &FormElement{
	},
	"replInterval": &FormElement{
	},
	"printEndTime": &FormElement{
	},
	"instanceType": &FormElement{
	},
	"otherIpPhone": &FormElement{
	},
	"mSMQSiteName": &FormElement{
	},
	"meetingOwner": &FormElement{
	},
	"printCollate": &FormElement{
	},
	"defaultGroup": &FormElement{
	},
	"minPwdLength": &FormElement{
	},
	"netbootSCPBL": &FormElement{
	},
	"mhsORAddress": &FormElement{
	},
	"rpcNsCodeset": &FormElement{
	},
	"hasMasterNCs": &FormElement{
	},
	"mSMQMigrated": &FormElement{
	},
	"dSASignature": &FormElement{
	},
	"invocationId": &FormElement{
	},
	"cOMTypelibId": &FormElement{
	},
	"creationTime": &FormElement{
	},
	"meetingScope": &FormElement{
	},
	"volTableGUID": &FormElement{
	},
	"siteObjectBL": &FormElement{
	},
	"aCSTimeOfDay": &FormElement{
	},
	"aCSDirection": &FormElement{
	},
	"maxTicketAge": &FormElement{
	},
	"schemaUpdate": &FormElement{
	},
	"minTicketAge": &FormElement{
	},
	"ipsecNegotiationPolicyReference": &FormElement{
	},
	"helpFileName": &FormElement{
	},
	"schemaIDGUID": &FormElement{
	},
	"createDialog": &FormElement{
	},
	"mSMQNt4Flags": &FormElement{
	},
	"packageFlags": &FormElement{
	},
	"wWWHomePage": &FormElement{
	},
	"volumeCount": &FormElement{
	},
	"printStatus": &FormElement{
	},
	"uPNSuffixes": &FormElement{
	},
	"trustParent": &FormElement{
	},
	"tokenGroups": &FormElement{
	},
	"systemFlags": &FormElement{
	},
	"syncWithSID": &FormElement{
	},
	"dNSProperty": &FormElement{
	},
	"superScopes": &FormElement{
	},
	"sPNMappings": &FormElement{
	},
	"printNotify": &FormElement{
	},
	"printMemory": &FormElement{
	},
	"serverState": &FormElement{
	},
	"mSMQVersion": &FormElement{
	},
	"rIDUsedPool": &FormElement{
	},
	"queryFilter": &FormElement{
	},
	"printerName": &FormElement{
	},
	"preferredOU": &FormElement{
	},
	"primaryInternationalISDNNumber": &FormElement{
	},
	"oMTIndxGuid": &FormElement{
	},
	"mSMQUserSid": &FormElement{
	},
	"fRSRootPath": &FormElement{
	},
	"mSMQJournal": &FormElement{
	},
	"contextMenu": &FormElement{
	},
	"aCSPriority": &FormElement{
	},
	"mSMQSignKey": &FormElement{
	},
	"netbootGUID": &FormElement{
	},
	"mSMQOwnerID": &FormElement{
	},
	"mustContain": &FormElement{
	},
	"dnsAllowXFR": &FormElement{
	},
	"mS-SQL-Vines": &FormElement{
	},
	"mSMQDigests": &FormElement{
	},
	"lockoutTime": &FormElement{
	},
	"lastSetTime": &FormElement{
	},
	"countryCode": &FormElement{
	},
	"mS-SQL-TCPIP": &FormElement{
	},
	"mSMQForeign": &FormElement{
	},
	"meetingType": &FormElement{
	},
	"dhcpOptions": &FormElement{
	},
	"dhcpServers": &FormElement{
	},
	"assetNumber": &FormElement{
	},
	"addressType": &FormElement{
	},
	"mSMQCSPName": &FormElement{
	},
	"msiFileList": &FormElement{
	},
	"dNSHostName": &FormElement{
	},
	"dhcpSubnets": &FormElement{
	},
	"pKIKeyUsage": &FormElement{
	},
	"attributeID": &FormElement{
	},
	"objectCount": &FormElement{
	},
	"timeRefresh": &FormElement{
	},
	"profilePath": &FormElement{
	},
	"productCode": &FormElement{
	},
	"otherMobile": &FormElement{
	},
	"badPwdCount": &FormElement{
	},
	"mS-SQL-Build": &FormElement{
	},
	"nETBIOSName": &FormElement{
	},
	"mS-SQL-Alias": &FormElement{
	},
	"maxRenewAge": &FormElement{
	},
	"treatAsLeaf": &FormElement{
	},
	"mSMQNt4Stub": &FormElement{
	},
	"packageType": &FormElement{
	},
	"isEphemeral": &FormElement{
	},
	"dMDLocation": &FormElement{
	},
	"dhcpClasses": &FormElement{
	},
	"forceLogoff": &FormElement{
	},
	"whenCreated": &FormElement{
	},
	"meetingName": &FormElement{
	},
	"mailAddress": &FormElement{
	},
	"meetingBlob": &FormElement{
	},
	"machineRole": &FormElement{
	},
	"searchFlags": &FormElement{
	},
	"whenChanged": &FormElement{
	},
	"dhcpObjName": &FormElement{
	},
	"aCSMaxAggregatePeakRatePerUser": &FormElement{
	},
	"packageName": &FormElement{
	},
	"systemOnly": &FormElement{
	},
	"mSMQOSType": &FormElement{
	},
	"queryPoint": &FormElement{
	},
	"printOwner": &FormElement{
	},
	"uSNCreated": &FormElement{
	},
	"siteServer": &FormElement{
	},
	"rpcNsGroup": &FormElement{
	},
	"sIDHistory": &FormElement{
	},
	"fRSVersion": &FormElement{
	},
	"logonHours": &FormElement{
	},
	"netbootAnswerOnlyValidClients": &FormElement{
	},
	"pwdLastSet": &FormElement{
	},
	"printColor": &FormElement{
	},
	"mS-SQL-Type": &FormElement{
	},
	"fromServer": &FormElement{
	},
	"serverRole": &FormElement{
	},
	"priorValue": &FormElement{
	},
	"logonCount": &FormElement{
	},
	"unicodePwd": &FormElement{
	},
	"subClassOf": &FormElement{
	},
	"mS-SQL-Size": &FormElement{
	},
	"privateKey": &FormElement{
	},
	"siteObject": &FormElement{
	},
	"scriptPath": &FormElement{
	},
	"serverName": &FormElement{
	},
	"mSMQSiteID": &FormElement{
	},
	"rightsGuid": &FormElement{
	},
	"rIDNextRID": &FormElement{
	},
	"meetingURL": &FormElement{
	},
	"addressEntryDisplayTableMSDOS": &FormElement{
	},
	"maxStorage": &FormElement{
	},
	"rangeUpper": &FormElement{
	},
	"rangeLower": &FormElement{
	},
	"otherPager": &FormElement{
	},
	"isMemberOfPartialAttributeSet": &FormElement{
	},
	"parentGUID": &FormElement{
	},
	"department": &FormElement{
	},
	"mayContain": &FormElement{
	},
	"adminCount": &FormElement{
	},
	"lastLogoff": &FormElement{
	},
	"masteredBy": &FormElement{
	},
	"employeeID": &FormElement{
	},
	"dhcpMaxKey": &FormElement{
	},
	"driverName": &FormElement{
	},
	"mS-SQL-Name": &FormElement{
	},
	"categoryId": &FormElement{
	},
	"additionalTrustedServiceNames": &FormElement{
	},
	"scopeFlags": &FormElement{
	},
	"categories": &FormElement{
	},
	"netbootNewMachineNamingPolicy": &FormElement{
	},
	"cOMClassID": &FormElement{
	},
	"uSNChanged": &FormElement{
	},
	"objectGUID": &FormElement{
	},
	"dhcpRanges": &FormElement{
	},
	"schemaInfo": &FormElement{
	},
	"otherFacsimileTelephoneNumber": &FormElement{
	},
	"machinePasswordChangeInterval": &FormElement{
	},
	"rootTrust": &FormElement{
	},
	"trustType": &FormElement{
	},
	"groupType": &FormElement{
	},
	"uSNSource": &FormElement{
	},
	"mSMQQuota": &FormElement{
	},
	"mSMQSites": &FormElement{
	},
	"fromEntry": &FormElement{
	},
	"mS-SQL-SPX": &FormElement{
	},
	"gPOptions": &FormElement{
	},
	"msiScript": &FormElement{
	},
	"printRate": &FormElement{
	},
	"cRLPartitionedRevocationList": &FormElement{
	},
	"assistant": &FormElement{
	},
	"fRSDSPoll": &FormElement{
	},
	"partialAttributeDeletionList": &FormElement{
	},
	"lastLogon": &FormElement{
	},
	"governsID": &FormElement{
	},
	"appliesTo": &FormElement{
	},
	"eFSPolicy": &FormElement{
	},
	"uASCompat": &FormElement{
	},
	"prefixMap": &FormElement{
	},
	"isDefunct": &FormElement{
	},
	"dhcpSites": &FormElement{
	},
	"iPSECNegotiationPolicyAction": &FormElement{
	},
	"dnsRecord": &FormElement{
	},
	"cOMProgID": &FormElement{
	},
	"homeDrive": &FormElement{
	},
	"meetingIP": &FormElement{
	},
	"aCSNonReservedMinPolicedSize": &FormElement{
	},
	"dhcpState": &FormElement{
	},
	"mSMQLabel": &FormElement{
	},
	"maxPwdAge": &FormElement{
	},
	"minPwdAge": &FormElement{
	},
	"cRLObject": &FormElement{
	},
	"objectSid": &FormElement{
	},
	"meetingID": &FormElement{
	},
	"ipsecName": &FormElement{
	},
	"isDeleted": &FormElement{
	},
	"aCSAggregateTokenRatePerUser": &FormElement{
	},
	"ipsecData": &FormElement{
	},
	"domainCAs": &FormElement{
	},
	"cAConnect": &FormElement{
	},
	"printMaxResolutionSupported": &FormElement{
	},
	"dhcpFlags": &FormElement{
	},
	"helpData16": &FormElement{
	},
	"managedBy": &FormElement{
	},
	"helpData32": &FormElement{
	},
	"mSMQSite2": &FormElement{
	},
	"mSMQSite1": &FormElement{
	},
	"replTopologyStayOfExecution": &FormElement{
	},
	"allowedChildClassesEffective": &FormElement{
	},
	"oMSyntax": &FormElement{
	},
	"priority": &FormElement{
	},
	"keywords": &FormElement{
	},
	"mSMQCost": &FormElement{
	},
	"siteList": &FormElement{
	},
	"revision": &FormElement{
	},
	"repsFrom": &FormElement{
	},
	"userCert": &FormElement{
	},
	"mSMQQMID": &FormElement{
	},
	"portName": &FormElement{
	},
	"netbootLocallyInstalledOSes": &FormElement{
	},
	"division": &FormElement{
	},
	"aCSMaxSizeOfRSVPAccountFile": &FormElement{
	},
	"dhcpType": &FormElement{
	},
	"wbemPath": &FormElement{
	},
	"siteGUID": &FormElement{
	},
	"rDNAttID": &FormElement{
	},
	"aCSRSVPAccountFilesLocation": &FormElement{
	},
	"mSMQDependentClientServices": &FormElement{
	},
	"location": &FormElement{
	},
	"fRSFlags": &FormElement{
	},
	"iconPath": &FormElement{
	},
	"cAWEBURL": &FormElement{
	},
	"mscopeId": &FormElement{
	},
	"treeName": &FormElement{
	},
	"schedule": &FormElement{
	},
	"parentCA": &FormElement{
	},
	"cOMCLSID": &FormElement{
	},
	"catalogs": &FormElement{
	},
	"memberOf": &FormElement{
	},
	"cAUsages": &FormElement{
	},
	"dhcpMask": &FormElement{
	},
	"flatName": &FormElement{
	},
	"domainID": &FormElement{
	},
	"localeID": &FormElement{
	},
	"codePage": &FormElement{
	},
	"aCSEnableRSVPMessageLogging": &FormElement{
	},
	"printOrientationsSupported": &FormElement{
	},
	"msRRASVendorAttributeEntry": &FormElement{
	},
	"interSiteTopologyGenerator": &FormElement{
	},
	"options": &FormElement{
	},
	"dnsRoot": &FormElement{
	},
	"iPSECNegotiationPolicyType": &FormElement{
	},
	"mS-SQL-InformationDirectory": &FormElement{
	},
	"operatingSystemServicePack": &FormElement{
	},
	"nextRid": &FormElement{
	},
	"pekList": &FormElement{
	},
	"subRefs": &FormElement{
	},
	"oMTGuid": &FormElement{
	},
	"pKTGuid": &FormElement{
	},
	"company": &FormElement{
	},
	"moniker": &FormElement{
	},
	"comment": &FormElement{
	},
	"ipPhone": &FormElement{
	},
	"mS-DS-ConsistencyChildCount": &FormElement{
	},
	"creator": &FormElement{
	},
	"uNCName": &FormElement{
	},
	"dBCSPwd": &FormElement{
	},
	"mSMQDependentClientService": &FormElement{
	},
	"certificateAuthorityObject": &FormElement{
	},
	"ipsecID": &FormElement{
	},
	"allowedAttributesEffective": &FormElement{
	},
	"aCSMaxPeakBandwidthPerFlow": &FormElement{
	},
	"Enabled": &FormElement{
	},
	"perRecipDialogDisplayTable": &FormElement{
	},
	"interSiteTopologyFailover": &FormElement{
	},
	"transportAddressAttribute": &FormElement{
	},
	"netbootCurrentClientCount": &FormElement{
	},
	"rIDPreviousAllocationPool": &FormElement{
	},
	"repsTo": &FormElement{
	},
	"defaultSecurityDescriptor": &FormElement{
	},
	"lastBackupRestorationTime": &FormElement{
	},
	"fRSControlOutboundBacklog": &FormElement{
	},
	"vendor": &FormElement{
	},
	"gPLink": &FormElement{
	},
	"originalDisplayTableMSDOS": &FormElement{
	},
	"linkID": &FormElement{
	},
	"msNPSavedCallingStationID": &FormElement{
	},
	"mAPIID": &FormElement{
	},
	"serviceBindingInformation": &FormElement{
	},
	"nCName": &FormElement{
	},
	"tokenGroupsNoGCAcceptable": &FormElement{
	},
	"tokenGroupsGlobalAndUniversal": &FormElement{
	},
	"msRASSavedFramedIPAddress": &FormElement{
	},
	"aCSAllocableRSVPBandwidth": &FormElement{
	},
	"lockOutObservationWindow": &FormElement{
	},
	"netbootIntelliMirrorOSes": &FormElement{
	},
	"aCSNonReservedMaxSDUSize": &FormElement{
	},
	"notes": &FormElement{
	},
	"retiredReplDSASignatures": &FormElement{
	},
	"aCSMaxTokenBucketPerFlow": &FormElement{
	},
	"addressEntryDisplayTable": &FormElement{
	},
	"aCSMinimumDelayVariation": &FormElement{
	},
	"fRSControlInboundBacklog": &FormElement{
	},
	"flags": &FormElement{
	},
	"mS-SQL-LastDiagnosticDate": &FormElement{
	},
	"gPCMachineExtensionNames": &FormElement{
	},
	"ms-DS-MachineAccountQuota": &FormElement{
	},
	"perMsgDialogDisplayTable": &FormElement{
	},
	"defaultLocalPolicyObject": &FormElement{
	},
	"msRASSavedCallbackNumber": &FormElement{
	},
	"parentCACertificateChain": &FormElement{
	},
	"gPCFunctionalityVersion": &FormElement{
	},
	"fRSServiceCommandStatus": &FormElement{
	},
	"aCSNonReservedTokenSize": &FormElement{
	},
	"aCSMaxSizeOfRSVPLogFile": &FormElement{
	},
	"cost": &FormElement{
	},
	"modifiedCountAtLastProm": &FormElement{
	},
	"aCSRSVPLogFilesLocation": &FormElement{
	},
	"supplementalCredentials": &FormElement{
	},
	"bridgeheadTransportList": &FormElement{
	},
	"mSMQSignCertificatesMig": &FormElement{
	},
	"msRADIUSFramedIPAddress": &FormElement{
	},
	"mS-DS-ReplicatesNCReason": &FormElement{
	},
	"aCSEnableRSVPAccounting": &FormElement{
	},
	"fRSTimeLastConfigChange": &FormElement{
	},
	"printStaplingSupported": &FormElement{
	},
	"interSiteTopologyRenew": &FormElement{
	},
	"operatingSystemVersion": &FormElement{
	},
	"otherLoginWorkstations": &FormElement{
	},
	"netbootAllowNewClients": &FormElement{
	},
	"mS-SQL-UnicodeSortOrder": &FormElement{
	},
	"url": &FormElement{
	},
	"pKT": &FormElement{
	},
	"serviceInstanceVersion": &FormElement{
	},
	"showInAdvancedViewOnly": &FormElement{
	},
	"aCSMaxTokenRatePerFlow": &FormElement{
	},
	"isCriticalSystemObject": &FormElement{
	},
	"meetingMaxParticipants": &FormElement{
	},
	"aNR": &FormElement{
	},
	"rid": &FormElement{
	},
	"proxyGenerationEnabled": &FormElement{
	},
	"fRSControlDataCreation": &FormElement{
	},
	"previousCACertificates": &FormElement{
	},
	"contentIndexingAllowed": &FormElement{
	},
	"policyReplicationFlags": &FormElement{
	},
	"frsComputerReferenceBL": &FormElement{
	},
	"aCSNonReservedPeakRate": &FormElement{
	},
	"aCSMaxNoOfAccountFiles": &FormElement{
	},
	"physicalLocationObject": &FormElement{
	},
	"mSMQOutRoutingServers": &FormElement{
	},
	"bridgeheadServerListBL": &FormElement{
	},
	"msRADIUSCallbackNumber": &FormElement{
	},
	"netbootMachineFilePath": &FormElement{
	},
	"mSMQQueueJournalQuota": &FormElement{
	},
	"netbootAnswerRequests": &FormElement{
	},
	"operatingSystemHotfix": &FormElement{
	},
	"attributeSecurityGUID": &FormElement{
	},
	"superScopeDescription": &FormElement{
	},
	"otherWellKnownObjects": &FormElement{
	},
	"aCSNonReservedTxLimit": &FormElement{
	},
	"authenticationOptions": &FormElement{
	},
	"altSecurityIdentities": &FormElement{
	},
	"gPCUserExtensionNames": &FormElement{
	},
	"netbootInitialization": &FormElement{
	},
	"mS-SQL-RegisteredOwner": &FormElement{
	},
	"aCSMaxDurationPerFlow": &FormElement{
	},
	"pKICriticalExtensions": &FormElement{
	},
	"attributeDisplayNames": &FormElement{
	},
	"mS-SQL-AllowImmediateUpdatingSubscription": &FormElement{
	},
	"msRASSavedFramedRoute": &FormElement{
	},
	"userSharedFolderOther": &FormElement{
	},
	"extendedAttributeInfo": &FormElement{
	},
	"netbootMirrorDataFile": &FormElement{
	},
	"aCSMinimumPolicedSize": &FormElement{
	},
	"localizationDisplayId": &FormElement{
	},
	"meetingAdvertiseScope": &FormElement{
	},
	"dSUIAdminNotification": &FormElement{
	},
	"mS-SQL-LastUpdatedDate": &FormElement{
	},
	"dSCorePropagationData": &FormElement{
	},
	"implementedCategories": &FormElement{
	},
	"defaultObjectCategory": &FormElement{
	},
	"domainPolicyReference": &FormElement{
	},
	"mSMQInRoutingServers": &FormElement{
	},
	"printDuplexSupported": &FormElement{
	},
	"pendingCACertificates": &FormElement{
	},
	"nTSecurityDescriptor": &FormElement{
	},
	"systemAuxiliaryClass": &FormElement{
	},
	"aCSNonReservedTxSize": &FormElement{
	},
	"mS-SQL-InformationURL": &FormElement{
	},
	"replPropertyMetaData": &FormElement{
	},
	"mS-SQL-PublicationURL": &FormElement{
	},
	"printKeepPrintedJobs": &FormElement{
	},
	"uSNDSALastObjRemoved": &FormElement{
	},
	"dnsNotifySecondaries": &FormElement{
	},
	"mS-DS-ConsistencyGuid": &FormElement{
	},
	"frsComputerReference": &FormElement{
	},
	"mS-SQL-ServiceAccount": &FormElement{
	},
	"msNPCallingStationID": &FormElement{
	},
	"mSMQSignCertificates": &FormElement{
	},
	"ipsecOwnersReference": &FormElement{
	},
	"builtinModifiedCount": &FormElement{
	},
	"privilegeDisplayName": &FormElement{
	},
	"dnsSecureSecondaries": &FormElement{
	},
	"localizedDescription": &FormElement{
	},
	"systemPossSuperiors": &FormElement{
	},
	"displayNamePrintable": &FormElement{
	},
	"servicePrincipalName": &FormElement{
	},
	"pekKeyChangeInterval": &FormElement{
	},
	"originalDisplayTable": &FormElement{
	},
	"mS-SQL-LastBackupDate": &FormElement{
	},
	"ipsecPolicyReference": &FormElement{
	},
	"certificateTemplates": &FormElement{
	},
	"hasPartialReplicaNCs": &FormElement{
	},
	"localPolicyReference": &FormElement{
	},
	"extendedCharsAllowed": &FormElement{
	},
	"ipsecFilterReference": &FormElement{
	},
	"ipsecISAKMPReference": &FormElement{
	},
	"fRSMemberReferenceBL": &FormElement{
	},
	"rpcNsTransferSyntax": &FormElement{
	},
	"mSMQRoutingServices": &FormElement{
	},
	"mS-SQL-MultiProtocol": &FormElement{
	},
	"enrollmentProviders": &FormElement{
	},
	"printNetworkAddress": &FormElement{
	},
	"msRADIUSServiceType": &FormElement{
	},
	"printPagesPerMinute": &FormElement{
	},
	"printMediaSupported": &FormElement{
	},
	"signatureAlgorithms": &FormElement{
	},
	"fRSPartnerAuthLevel": &FormElement{
	},
	"privilegeAttributes": &FormElement{
	},
	"partialAttributeSet": &FormElement{
	},
	"netbootLimitClients": &FormElement{
	},
	"mS-SQL-ConnectionURL": &FormElement{
	},
	"mS-SQL-AllowSnapshotFilesFTPDownloading": &FormElement{
	},
	"pKIExpirationPeriod": &FormElement{
	},
	"nonSecurityMemberBL": &FormElement{
	},
	"initialAuthOutgoing": &FormElement{
	},
	"msRADIUSFramedRoute": &FormElement{
	},
	"controlAccessRights": &FormElement{
	},
	//////////////////////////
	// SCHEMA: nis.schema
	"uidNumber": &FormElement{
		Description: "An integer uniquely identifying a user in an administrative domain",
		Order: 9,
	},
	"gidNumber": &FormElement{
		Description: "An integer uniquely identifying a group in an administrative domain",
		Order: 9,
	},
	"gecos": &FormElement{
		Description: "The GECOS field; the common name",
	},
	"homeDirectory": &FormElement{
		Description: "The absolute path to the home directory",
		Order: 6,
		Datalist: []string{
			"/home/",
			"/home/{user}",
		},
	},
	"loginShell": &FormElement{
		Description: "The path to the login shell",
		Order: 6,
		Datalist: []string{
			"/bin/bash",
			"/bin/false",
			"/bin/sh",
		},
	},
	"shadowLastChange": &FormElement{
	},
	"shadowMin": &FormElement{
	},
	"shadowMax": &FormElement{
	},
	"shadowWarning": &FormElement{
	},
	"shadowInactive": &FormElement{
	},
	"shadowExpire": &FormElement{
	},
	"shadowFlag": &FormElement{
	},
	"memberUid": &FormElement{
	},
	"memberNisNetgroup": &FormElement{
	},
	"nisNetgroupTriple": &FormElement{
		Description: "Netgroup triple",
	},
	"ipServicePort": &FormElement{
	},
	"ipServiceProtocol": &FormElement{
	},
	"ipProtocolNumber": &FormElement{
	},
	"oncRpcNumber": &FormElement{
	},
	"ipHostNumber": &FormElement{
		Description: "IP address",
	},
	"ipNetworkNumber": &FormElement{
		Description: "IP network",
	},
	"ipNetmaskNumber": &FormElement{
		Description: "IP netmask",
	},
	"macAddress": &FormElement{
		Description: "MAC address",
	},
	"bootParameter": &FormElement{
		Description: "Rpc.bootparamd parameter",
	},
	"bootFile": &FormElement{
		Description: "Boot image name",
	},
	"nisMapName": &FormElement{
	},
	"nisMapEntry": &FormElement{
	},
	//////////////////////////
	// SCHEMA: openldap.schema
	//////////////////////////
	// SCHEMA: pmi.schema
	"role": &FormElement{
		Description: "X.509 Role attribute, use ;binary",
	},
	"xmlPrivilegeInfo": &FormElement{
		Description: "X.509 XML privilege information attribute",
	},
	"attributeCertificateAttribute": &FormElement{
		Description: "X.509 Attribute certificate attribute, use ;binary",
	},
	"aACertificate": &FormElement{
		Description: "X.509 AA certificate attribute, use ;binary",
	},
	"attributeDescriptorCertificate": &FormElement{
		Description: "X.509 Attribute descriptor certificate attribute, use ;binary",
	},
	"attributeCertificateRevocationList": &FormElement{
		Description: "X.509 Attribute certificate revocation list attribute, use ;binary",
	},
	"attributeAuthorityRevocationList": &FormElement{
		Description: "X.509 AA certificate revocation list attribute, use ;binary",
	},
	"delegationPath": &FormElement{
		Description: "X.509 Delegation path attribute, use ;binary",
	},
	"privPolicy": &FormElement{
		Description: "X.509 Privilege policy attribute, use ;binary",
	},
	"protPrivPolicy": &FormElement{
		Description: "X.509 Protected privilege policy attribute, use ;binary",
	},
	"xmlPrivPolicy": &FormElement{
		Description: "X.509 XML Protected privilege policy attribute",
	},
	//////////////////////////
	// SCHEMA: ppolicy.schema
	"pwdAttribute": &FormElement{
		Description: "Name of the attribute to which the password policy is applied. For example, the password policy may be applied to the userPassword attribute",
	},
	"pwdMinAge": &FormElement{
		Description: "Number of seconds that must elapse between modifications to the password. If this attribute is not present, 0 seconds is assumed.",
	},
	"pwdMaxAge": &FormElement{
		Description: "Number of seconds after which a modified password will expire. If this attribute is not present, or if the value is 0 the password does not expire. If not 0, the value must be greater than or equal to the value of the pwdMinAge.",
	},
	"pwdInHistory": &FormElement{
		Description: "Maximum number of used passwords stored in the pwdHistory attribute. If this attribute is not present, or if the value is 0, used passwords are not stored in the pwdHistory attribute and thus may be reused.",
	},
	"pwdCheckQuality": &FormElement{
		Description: "Indicates how the password quality will be verified while being modified or added",
	},
	"pwdMinLength": &FormElement{
		Description: "When quality checking is enabled, this attribute holds the minimum number of characters that must be used in a password. If this attribute is not present, no minimum password length will be enforced. If the server is unable to check the length (due to a hashed password or otherwise), the server will, depending on the value of the pwdCheckQuality attribute, either accept the password without checking it ('0' or '1') or refuse it ('2').",
	},
	"pwdExpireWarning": &FormElement{
		Description: "specifies the maximum number of seconds before a password is due to expire that expiration warning messages will be returned to an authenticating user. If this attribute is not present, or if the value is 0 no warnings will be returned. If not 0, the value must be smaller than the value of the pwdMaxAge attribute.",
	},
	"pwdGraceAuthNLimit": &FormElement{
		Description: "This attribute specifies the number of times an expired password can be used to authenticate. If this attribute is not present or if the value is 0, authentication will fail.",
	},
	"pwdLockout": &FormElement{
		Description: "This attribute indicates, when its value is \"TRUE\", that the password may not be used to authenticate after a specified number of consecutive failed bind attempts. The maximum number of consecutive failed bind attempts is specified in pwdMaxFailure. If this attribute is not present, or if the value is \"FALSE\", the password may be used to authenticate when the number of failed bind attempts has been reached.",
	},
	"pwdLockoutDuration": &FormElement{
		Description: "This attribute holds the number of seconds that the password cannot be used to authenticate due to too many failed bind attempts. If this attribute is not present, or if the value is 0 the password cannot be used to authenticate until reset by a password administrator.",
	},
	"pwdMaxFailure": &FormElement{
		Description: "This attribute specifies the number of consecutive failed bind attempts after which the password may not be used to authenticate. If this attribute is not present, or if the value is 0, this policy is not checked, and the value of pwdLockout will be ignored.",
	},
	"pwdFailureCountInterval": &FormElement{
		Description: "This attribute holds the number of seconds after which the password failures are purged from the failure counter, even though no successful authentication occurred. If this attribute is not present, or if its value is 0, the failure counter is only reset by a successful authentication.",
	},
	"pwdMustChange": &FormElement{
		Description: "This attribute specifies with a value of \"TRUE\" that users must change their passwords when they first bind to the directory after a password is set or reset by a password administrator. If this attribute is not present, or if the value is \"FALSE\", users are not required to change their password upon binding after the password administrator sets or resets the password. This attribute is not set due to any actions specified by this document, it is typically set by a password administrator after resetting a user's password.",
	},
	"pwdAllowUserChange": &FormElement{
		Description: "This attribute indicates whether users can change their own passwords, although the change operation is still subject to access control. If this attribute is not present, a value of \"TRUE\" is assumed. This attribute is intended to be used in the absence of an access control mechanism.",
	},
	"pwdSafeModify": &FormElement{
		Description: "This attribute specifies whether or not the existing password must be sent along with the new password when being changed. If this attribute is not present, a \"FALSE\" value is assumed.",
	},
	"pwdMaxRecordedFailure": &FormElement{
		Description: "This attribute specifies the maximum number of consecutive failed bind attempts to record. If this attribute is not present, or if the value is 0, it defaults to the value of pwdMaxFailure. If that value is also 0, this value defaults to 5.",
	},
	"pwdCheckModule": &FormElement{
		Description: "Loadable module that instantiates check_password() function. This attribute names a user-defined loadable module that provides a check_password() function. If pwdCheckQuality is set to '1' or '2' this function will be called after all of the internal password quality checks have been passed. The function has this prototype: int check_password( char *password, char **errormessage, void *arg ) The function should return LDAP_SUCCESS for a valid password.",
	},
}
