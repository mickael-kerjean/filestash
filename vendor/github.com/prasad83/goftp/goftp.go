// Copyright 2015 Muir Manders.  All rights reserved.
// Use of this source code is governed by a MIT-style
// license that can be found in the LICENSE file.

/*
Package goftp provides a high-level FTP client for go.
*/
package goftp

import (
	"errors"
	"fmt"
	"net"
	"regexp"
)

// Dial creates an FTP client using the default config. See DialConfig for
// information about "hosts".
func Dial(hosts ...string) (*Client, error) {
	return DialConfig(Config{}, hosts...)
}

// DialConfig creates an FTP client using the given config. "hosts" is a list
// of IP addresses or hostnames with an optional port (defaults to 21).
// Hostnames will be expanded to all the IP addresses they resolve to. The
// client's connection pool will pick from all the addresses in a round-robin
// fashion. If you specify multiple hosts, they should be identical mirrors of
// each other.
func DialConfig(config Config, hosts ...string) (*Client, error) {
	expandedHosts, err := lookupHosts(hosts, config.IPv6Lookup)
	if err != nil {
		return nil, err
	}

	return newClient(config, expandedHosts), nil
}

var hasPort = regexp.MustCompile(`^[^:]+:\d+$|\]:\d+$`)

func lookupHosts(hosts []string, ipv6Lookup bool) ([]string, error) {
	if len(hosts) == 0 {
		return nil, errors.New("must specify at least one host")
	}

	var (
		ret  []string
		ipv6 []string
	)

	for i, host := range hosts {
		if !hasPort.MatchString(host) {
			host = fmt.Sprintf("[%s]:21", host)
		}
		hostnameOrIP, port, err := net.SplitHostPort(host)
		if err != nil {
			return nil, fmt.Errorf(`invalid host "%s"`, hosts[i])
		}

		if net.ParseIP(hostnameOrIP) != nil {
			// is IP, add to list
			ret = append(ret, host)
		} else {
			// not an IP, must be hostname
			ips, err := net.LookupIP(hostnameOrIP)

			// consider not returning error if other hosts in the list work
			if err != nil {
				return nil, fmt.Errorf(`error resolving host "%s": %s`, hostnameOrIP, err)
			}

			for _, ip := range ips {
				ipAndPort := fmt.Sprintf("[%s]:%s", ip.String(), port)
				if ip.To4() == nil && !ipv6Lookup {
					ipv6 = append(ipv6, ipAndPort)
				} else {
					ret = append(ret, ipAndPort)
				}
			}
		}
	}

	// if you only found IPv6 addresses and IPv6Lookup was off, try them anyway
	// just for kicks
	if len(ret) == 0 && len(ipv6) > 0 {
		return ipv6, nil
	}

	return ret, nil
}
