package common

func IsDirectory(path string) bool {
	if string(path[len(path)-1]) != "/" {
		return false
	}
	return true
}
