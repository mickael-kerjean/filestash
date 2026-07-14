package files

type FileInfo struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Size    int64  `json:"size"`
	Time    int64  `json:"time"`
	Mode    uint32 `json:"mode,omitempty"`
	Offline bool   `json:"offline,omitempty"`
}
