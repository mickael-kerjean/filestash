package images

func IsRaw(mType string) bool {
	switch mType {
	case "image/x-tif":
	case "image/x-canon-cr2":
	case "image/x-canon-crw":
	case "image/x-nikon-nef":
	case "image/x-nikon-nrw":
	case "image/x-sony-arw":
	case "image/x-sony-sr2":
	case "image/x-minolta-mrw":
	case "image/x-minolta-mdc":
	case "image/x-olympus-orf":
	case "image/x-panasonic-rw2":
	case "image/x-pentax-pef":
	case "image/x-epson-erf":
	case "image/x-raw":
	case "image/x-x3f":
	case "image/x-fuji-raf":
	case "image/x-aptus-mos":
	case "image/x-mamiya-mef":
	case "image/x-hasselblad-3fr":
	case "image/x-adobe-dng":
	case "image/x-samsung-srw":
	case "image/x-kodak-kdc":
	case "image/x-kodak-dcr":
	default:
		return false
	}
	return true
}
