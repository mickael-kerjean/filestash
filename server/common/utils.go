package common

func NewBool(t bool) *bool {
	return &t
}

func NewString(t string) *string {
	if t == "" {
		return nil
	}
	return &t
}

func NewInt(t int) *int {
	return &t
}

func NewBoolFromInterface(val interface{}) bool {
	switch val.(type) {
	case bool: return val.(bool)
	default: return false
	}
}
func NewInt64pFromInterface(val interface{}) *int64 {
	switch val.(type) {
	case int64:
		v := val.(int64)
		return &v
	case float64:
		v := int64(val.(float64))
		return &v
	default: return nil
	}
}
func NewStringpFromInterface(val interface{}) *string {
	switch val.(type) {
	case string:
		v := val.(string)
		return &v
	default: return nil
	}
}

func NewStringFromInterface(val interface{}) string {
	switch val.(type) {
	case string:
		v := val.(string)
		return v
	default: return ""
	}
}
