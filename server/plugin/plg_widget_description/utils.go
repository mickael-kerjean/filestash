package plg_widget_description

func getUser(session map[string]string) string {
	if session["user"] != "" {
		return session["user"]
	}
	return "unknown"
}
