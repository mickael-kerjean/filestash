package plg_authenticate_wordpress

import (
	"strings"
)

func extractXMLValue(xml, key string) string {
	start := strings.Index(xml, "<name>"+key+"</name>")
	if start == -1 {
		return ""
	}
	start = strings.Index(xml[start:], "<string>")
	if start == -1 {
		return ""
	}
	start += len("<string>")
	end := strings.Index(xml[start:], "</string>")
	if end == -1 {
		return ""
	}
	return xml[start : start+end]
}

func extractXMLArray(xml, key string) []string {
	start := strings.Index(xml, "<name>"+key+"</name>")
	if start == -1 {
		return []string{}
	}
	start = strings.Index(xml[start:], "<array>")
	if start == -1 {
		return []string{}
	}
	end := strings.Index(xml[start:], "</array>")
	if end == -1 {
		return []string{}
	}

	arrayXML := xml[start : start+end]
	var values []string

	for {
		valStart := strings.Index(arrayXML, "<string>")
		if valStart == -1 {
			break
		}
		valStart += len("<string>")
		valEnd := strings.Index(arrayXML[valStart:], "</string>")
		if valEnd == -1 {
			break
		}
		values = append(values, arrayXML[valStart:valStart+valEnd])
		arrayXML = arrayXML[valStart+valEnd:]
	}

	return values
}
