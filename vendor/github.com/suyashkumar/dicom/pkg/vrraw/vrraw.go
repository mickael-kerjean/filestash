// Package vrraw offers aliases to all VR abbreviations as defined here:
//
// http://dicom.nema.org/medical/dicom/current/output/html/part05.html#table_6.2-1
//
// Deprecated VRs from older editions are also included
package vrraw

const (
	// ApplicationEntity (AE): A string of characters that identifies an Application
	// Entity with leading and trailing spaces (20H) being non-significant. A value
	// consisting solely of spaces shall not be used.
	ApplicationEntity = "AE"

	// AgeString (AS): A a string of characters with one of the following formats --
	// nnnD, nnnW, nnnM, nnnY; where nnn shall contain the number of days for D, weeks
	// for W, months for M, or years for Y.
	//
	// Example: "018M" would represent an age of 18 months.
	AgeString = "AS"

	// AttributeTag (AT): An ordered pair of 16-bit unsigned integers that is the
	// value of a Data Element Tag.
	//
	// Example: A Data Element Tag of (0018,00FF) would be encoded as a series of 4
	// bytes in a Little-Endian Transfer Syntax as 18H,00H,FFH,00H.
	AttributeTag = "AT"

	// CodeString (CS): A string of characters identifying a controlled concept.
	// Leading or trailing spaces (20H) are not significant.
	CodeString = "CS"

	// Date (DA): A string of characters of the format YYYYMMDD; where YYYY shall
	// contain year, MM shall contain the month, and DD shall contain the day,
	// interpreted as a date of the Gregorian calendar system.
	//
	// For further detail see DICOM spec.
	Date = "DA"

	// DecimalString (DS): A string of characters representing either a fixed point
	// number or a floating point number.
	//
	// For further detail, see DICOM spec.
	DecimalString = "DS"

	// DateTime (DT): A concatenated date-time character string in the format:
	// YYYYMMDDHHMMSS.FFFFFF&ZZXX
	//
	// For further detail, see DICOM spec.
	DateTime = "DT"

	// FloatingPointSingle (FL): Single precision binary floating point number
	// represented in IEEE 754:1985 32-bit Floating Point Number Format.
	FloatingPointSingle = "FL"

	// FloatingPointDouble (FD): Double precision binary floating point number
	// represented in IEEE 754:1985 64-bit Floating Point Number Format.
	FloatingPointDouble = "FD"

	// IntegerString: (IS): A string of characters representing an Integer in base-10
	// (decimal).
	//
	// For further detail, see DICOM spec.
	IntegerString = "IS"

	// LongString (LO): A character string that may be padded with leading and/or
	// trailing spaces.
	//
	// For further detail, see DICOM spec.
	LongString = "LO"

	// LongText (LT): A character string that may contain one or more paragraphs.
	//
	// For further detail, see DICOM spec.
	LongText = "LT"

	// OtherByte (OB): An octet-stream where the encoding of the contents is specified
	// by the negotiated Transfer Syntax.
	//
	// For further detail, see DICOM spec.
	OtherByte = "OB"

	// OtherDouble (OD): A stream of 64-bit IEEE 754:1985 floating point words. OD is a
	// VR that requires byte swapping within each 64-bit word when changing byte
	// ordering (see Section 7.3 of DICOM spec).
	OtherDouble = "OD"

	// OtherFloat (OF): A stream of 32-bit IEEE 754:1985 floating point words. OF is a
	// VR that requires byte swapping within each 32-bit word when changing byte
	// ordering (see Section 7.3 of DICOM spec).
	OtherFloat = "OF"

	// OtherLong (OL): A stream of 32-bit words where the encoding of the contents is
	// specified by the negotiated Transfer Syntax. OL is a VR that requires byte
	// swapping within each word when changing byte ordering (see Section 7.3 od DICOM
	// spec).
	OtherLong = "OL"

	// OtherVeryLong (OV): A stream of 64-bit words where the encoding of the contents
	// is specified by the negotiated Transfer Syntax. OV is a VR that requires byte
	// swapping within each word when changing byte ordering (see Section 7.3 of DICOM
	// spec).
	OtherVeryLong = "OV"

	// OtherWord (OW): A stream of 16-bit words where the encoding of the contents is
	// specified by the negotiated Transfer Syntax. OW is a VR that requires byte
	// swapping within each word when changing byte ordering (see Section 7.3 of DICOM
	// spec).
	OtherWord = "OW"

	// PersonName (PN): A character string encoded using a 5 component convention
	// representing the name of a person (patient, doctor, etc).
	//
	// For further detail, see the DICOM spec.
	PersonName = "PN"

	// ShortString (SH): A character string that may be padded with leading and/or
	// trailing spaces. The character code 05CH (the BACKSLASH "\" in ISO-IR 6) shall
	// not be present, as it is used as the delimiter between values for multiple data
	// elements. The string shall not have Control Characters except ESC.
	ShortString = "SH"

	// SignedLong (SL): Signed binary integer 32 bits long in 2's complement form.
	// Represents an integer, n, in the range: - 231<= n <= 231-1.
	SignedLong = "SL"

	// Sequence (SQ): Value is a Sequence of zero or more Items, as defined in
	// Section 7.5 of the DICOM spec.
	Sequence = "SQ"

	// SignedShort (SS): Signed binary integer 16 bits long in 2's complement form.
	// Represents an integer n in the range: -215<= n <= 215-1.
	SignedShort = "SS"

	// ShortText: (ST): A character string that may contain one or more paragraphs.
	//
	// For further detail, see the DICOM spec.
	ShortText = "ST"

	// SignedVeryLong (SV): Signed binary integer 64 bits long. Represents an integer n
	// in the range: - 263<= n <= 263-1.
	SignedVeryLong = "SV"

	// Time (TM): A string of characters of the format HHMMSS.FFFFFF; where HH contains
	// hours (range "00" - "23"), MM contains minutes (range "00" - "59"), SS contains
	// seconds (range "00" - "60"), and FFFFFF contains a fractional part of a second as
	// small as 1 millionth of a second (range "000000" - "999999").
	//
	// For further detail, see the DICOM spec.
	Time = "TM"

	// UnlimitedCharacters (UC): A character string that may be of unlimited length that
	// may be padded with trailing spaces. The character code 5CH (the BACKSLASH "\"
	// in ISO-IR 6) shall not be present, as it is used as the delimiter between values
	// in multi-valued data elements. The string shall not have Control Characters
	// except for ESC.
	UnlimitedCharacters = "UC"

	// UniqueIdentifier (UI): A character string containing a UID that is used to
	// uniquely identify a wide variety of items. The UID is a series of numeric
	// components separated by the period "." character. If a Value Field containing one
	// or more UIDs is an odd number of bytes in length, the Value Field shall be padded
	// with a single trailing NULL (00H) character to ensure that the Value Field is an
	// even number of bytes in length. See Section 9 and Annex B of the DICOM spec for a
	// complete specification and examples.
	//
	// NOTE: UniqueIdentifier is also referred to as UID.
	UniqueIdentifier = "UI"

	// UnsignedLong (UL): Unsigned binary integer 32 bits long. Represents an integer n
	// in the range: 0 <= n < 232.
	UnsignedLong = "UL"

	// Unknown (UN): An octet-stream where the encoding of the contents is
	// unknown (see Section 6.2.2 of the DICOM spec).
	Unknown = "UN"

	// UniversalResourceIdentifier (UR): A string of characters that identifies a URI or
	// a URL as defined in [RFC3986]. Leading spaces are not allowed. Trailing spaces
	// shall be ignored. Data Elements with this VR shall not be multi-valued.
	//
	// NOTE: Both absolute and relative URIs are permitted. If the URI is relative, then
	// it is relative to the base URI of the object within which it is contained.
	UniversalResourceIdentifier = "UR"

	// UnsignedShort (US): Unsigned binary integer 16 bits long. Represents integer n
	// in the range: 0 <= n < 216.
	UnsignedShort = "US"

	// UnlimitedText (UT): A character string that may contain one or more paragraphs.
	// It may contain the Graphic Character set and the Control Characters, CR, LF, FF,
	// and ESC. It may be padded with trailing spaces, which may be ignored, but leading
	// spaces are considered to be significant. Data Elements with this VR shall not be
	// multi-valued and therefore character code 5CH (the BACKSLASH "\" in ISO-IR 6) may
	// be used.
	UnlimitedText = "UT"

	// UnsignedVeryLong (UV): Unsigned binary integer 64 bits long. Represents an
	// integer n in the range: 0 <= n < 264.
	UnsignedVeryLong = "UV"
)
