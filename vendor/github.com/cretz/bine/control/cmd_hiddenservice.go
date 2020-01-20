package control

// GetHiddenServiceDescriptorAsync invokes HSFETCH.
func (c *Conn) GetHiddenServiceDescriptorAsync(address string, server string) error {
	cmd := "HSFETCH " + address
	if server != "" {
		cmd += " SERVER=" + server
	}
	return c.sendRequestIgnoreResponse(cmd)
}

// PostHiddenServiceDescriptorAsync invokes HSPOST.
func (c *Conn) PostHiddenServiceDescriptorAsync(desc string, servers []string, address string) error {
	cmd := "+HSPOST"
	for _, server := range servers {
		cmd += " SERVER=" + server
	}
	if address != "" {
		cmd += "HSADDRESS=" + address
	}
	cmd += "\r\n" + desc + "\r\n."
	return c.sendRequestIgnoreResponse(cmd)
}
