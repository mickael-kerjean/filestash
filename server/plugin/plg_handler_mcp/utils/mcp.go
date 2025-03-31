package utils

func GetArgumentsString(params map[string]any, name string) string {
	m, ok := params["arguments"].(map[string]any)
	if !ok {
		return ""
	}
	p, ok := m[name].(string)
	if !ok {
		return ""
	}
	return p
}

func GetArgumentString(params map[string]any, name string) string {
	m, ok := params["argument"].(map[string]any)
	if !ok {
		return ""
	}
	p, ok := m[name].(string)
	if !ok {
		return ""
	}
	return p
}
