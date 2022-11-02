package plg_backend_tmp

import (
	"encoding/base64"
	"fmt"
	. "github.com/mickael-kerjean/filestash/server/common"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

const (
	FILESTASH_DIRECTORY = "/tmp/filestash_tmp/"
	EMPTY_DOCX          = "UEsDBBQACAgIAE80OVQAAAAAAAAAAAAAAAALAAAAX3JlbHMvLnJlbHOtkk1LA0EMhu/9FUPu3WwriMjO9iJCbyL1B4SZ7O7Qzgczaa3/3kEKulCKoMe8efPwHNJtzv6gTpyLi0HDqmlBcTDRujBqeNs9Lx9g0y+6Vz6Q1EqZXCqq3oSiYRJJj4jFTOypNDFxqJshZk9SxzxiIrOnkXHdtveYfzKgnzHV1mrIW7sCtftI/Dc2ehayJIQmZl6mXK+zOC4VTnlk0WCjealx+Wo0lQx4XWj9e6E4DM7wUzRHz0GuefFZOFi2t5UopVtGd/9pNG98y7zHbNFe4ovNosPZG/SfUEsHCOjQASPZAAAAPQIAAFBLAwQUAAgICABPNDlUAAAAAAAAAAAAAAAAEQAAAGRvY1Byb3BzL2NvcmUueG1sbVLJTsMwEL3zFZHviZ0UKIqSVCzqiUpIFIG4GXuaGhLHsqdN+/c4SZuy9DZv8Zuxx9lsV1fBFqxTjc5JHDESgBaNVLrMyctyHt6QwCHXkleNhpzswZFZcZEJk4rGwpNtDFhU4AIfpF0qTE7WiCal1Ik11NxF3qG9uGpszdFDW1LDxRcvgSaMXdMakEuOnHaBoRkTySFSijHSbGzVB0hBoYIaNDoaRzE9eRFs7c4e6JUfzlrh3sBZ61Ec3TunRmPbtlE76a1+/pi+LR6f+6uGSndPJYAU2WGQVFjgCDLwAenQ7qi8Tu4flnNSJCxJQhaHydUynqaTy5RN3zP653wXONSNLTr1BHwtwQmrDPodDuIvwuOK63LjH7wAHd6+9JaR6lZZcYcLv/SVAnm39xlnOE9Z2KruoxSsd4ywa+E2H58gcOg/Al+jwgoG+lj++zzFN1BLBwgfJ++WUQEAAIgCAABQSwMEFAAICAgATzQ5VAAAAAAAAAAAAAAAABAAAABkb2NQcm9wcy9hcHAueG1snZHNbsIwEITvfYrI4kqcIEoRcoz6o56QitQUekOuvSSuEtuyFwRvX4eoEPVYn3ZmR9+ubbY8tU1yBB+0NQXJ04wkYKRV2lQF+Shfx3OSBBRGicYaKMgZAlnyO7b21oFHDSGJBBMKUiO6BaVB1tCKkMa2iZ299a3AKH1F7X6vJbxYeWjBIJ1k2YzCCcEoUGN3BZKeuDjif6HKym6/sCnPLvI4K6F1jUDgjN7K0qJoSt0Cz6J9FezRuUZLgfFF+Ep/eXi7jKAPaZ5O08lopc3htPucz3azaTII7OIVvkEizbPR00E3ajxhdAjryJv+qXl+n2bxXAK/HluLCgLPGe0LtrVehW67vmDPtfBCYox35kANOluN9bsTEv5kBn6c40XlhasvmYGK4voN/AdQSwcIXlesNisBAAAcAgAAUEsDBBQACAgIAE80OVQAAAAAAAAAAAAAAAAcAAAAd29yZC9fcmVscy9kb2N1bWVudC54bWwucmVsc62RTQrCMBCF954izN6mVRCRpm5EcCv1ADGdtsE2CckoensDiloo4sLl/H3vMS9fX/uOXdAHbY2ALEmBoVG20qYRcCi30yWsi0m+x05SXAmtdoHFGxMEtERuxXlQLfYyJNahiZPa+l5SLH3DnVQn2SCfpemC+08GFAMm21UC/K7KgJU3h7+wbV1rhRurzj0aGpHggW4dhkiUvkES8KiTyAE+Lj/7p3xtDZXy2OHbwav1zcT8rz9Aopjl5xeenaeFSc4H4RZ3UEsHCPkvMMDFAAAAEwIAAFBLAwQUAAgICABPNDlUAAAAAAAAAAAAAAAAEQAAAHdvcmQvZG9jdW1lbnQueG1spZRNbtswEIX3PYXAvS2pCQJXiJyN0aKLBgbsHoCiKIktySGGlBX19CX1m6RFYCQb05w3/GbeSNT9w5OS0YWjFaBzkm4TEnHNoBS6zsnP89fNjkTWUV1SCZrnpOeWPOw/3XdZCaxVXLvIE7TNICct6syyhitqN0owBAuV2zBQGVSVYHxayHQCc9I4Z7I4ng5twXDttQpQUee3WMfjkcNUK/6cJHcxckmd79c2wtiZdnmr/kXJOa+7pmoHWBoExq31g1ByrKuo0AsmTa4wHDjLCXNN5RJp96zky0YOo7gS7T/IpY2tb2Oa3kDxvDR5xTs11PCVVn+M9g2hNTNNsWvcKoq/WxMmZvwTLYQUrh+Mr02ltx/r6vXM3scL749i2fdaA9JC+ovgQVHojuz9XSig7MNqhp8jDsvJ9ZJHXXahMiePwbUk8ZAtSjHHkzH0i80BySs3xjBw4nWduPg/bcoIkuXMjZmuN0t9zZ/ckdZ8RJv69Mcr/i6k6Zcw7S5r/P+73c1uTvhB0UdDNyHp5jbkoKibZ9uG05Jj8OA3DsyqVABuUQpwDtQq1q2bxKnUY6vOY6uV8viSM7HMKrwtRwQ3+6iotJMJ5y0dBHq7/luwjA/PRZDjdRDx/Hzi9aO1/wtQSwcIwYDsx98BAAD5BAAAUEsDBBQACAgIAE80OVQAAAAAAAAAAAAAAAAPAAAAd29yZC9zdHlsZXMueG1sxVTbbuIwEH3fr4j8TkNR1a1Q04plhYrEslUvH2CcCbHq29pOKf36HZukpSRsbyv1BeIz8vjMOUdzev4gRXIP1nGtMnJ40CcJKKZzrpYZub2Z9E5I4jxVORVaQUbW4Mj52bfT1dD5tQCX4H3lhquMlN6bYZo6VoKk7kAbUFgrtJXU49Eu05W2ubGagXPYXop00O8fp5JyRZo2h0etRpIzq50u/AHTMtVFwRnEVnj9sB+/pGgaSPYWIpLau8r0sJ+hni+44H4dyZBEsuF0qbSlC4HTIh9yhrPmmv2EglbCu3C0l7Y+1qf4N9HKu2Q1pI5xnpEZX4DF9lol12B5QbBUjpTbUwLq/MhxmpHRVXI5S25/oUbJeB5qzGVkYgGuqXIkDY/dgVVYuKciI4MN5B6fgKMGGbtdTFDsWmOgeqPbl28/lr3NkwueI9GS96bzcDGtx0x3hze7p/C34rlejVEOq8WGSWWMRdtHldcXa1OCeiLmbQX1C6Z+Ybtn2hI/5g5v+7VBhwy1dGmpKQPpWJrmGZkHs0W0TlEJzVs1HCn9mcRApP+iHURo7va3SX6N6UwLbRs+FKX88ixEwd9qygXQsFZarjT4RnLqIP+tuhxT8OAb/Aa/f+h8vdfLOwAz37rQxAz5GMp4HHwBuBQg6NEPRGnhweIOHLzf6mBRt9N15X1Gb9l30mHfyWdceFJu14YAJqH6qhG1Ls9CCq7gqgoLM6ayRpDp92OypfMLlY+6VP7oUDPufGugCHbN8jI8W1uny+1ddz5KcUxNSESLZYO/JnpHxputOkOx55XE0Lk9CQ+ZfkfC24nkm9+xe/N6+ahOU5XDQ0ulDfrfNPqM3c2XO/sLUEsHCKSuMVSCAgAAPQkAAFBLAwQUAAgICABPNDlUAAAAAAAAAAAAAAAAEgAAAHdvcmQvZm9udFRhYmxlLnhtbK1QQU7DMBC88wrLd+q0B4SiphUS4oR6oOUBW2fTWLLXkdck9Pe4TishyKGg3uyd2ZnZWa4/nRU9BjaeKjmfFVIgaV8bOlTyffdy/ygFR6AarCes5BFZrld3y6FsPEUWaZ24HCrZxtiVSrFu0QHPfIeUsMYHBzF9w0ENPtRd8BqZk7qzalEUD8qBIXmWCdfI+KYxGp+9/nBIcRQJaCGmC7g1HcvVOZ0YSgKXQu+MQxYbHMSbd0CZoFsIjCdOD7aSRSFV3gNn7PEyDZmegc5E3V7mPQQDe4snSI1mv0y3R7f3dtJrcWuvp0SZtpo8iwfD/E+rV7PHkMsWWwymya5g4yahF52ffaupZPNbl/A9GRBPBRt7uj7On4o6P3j1BVBLBwjBx9kIHQEAAFUDAABQSwMEFAAICAgATzQ5VAAAAAAAAAAAAAAAABEAAAB3b3JkL3NldHRpbmdzLnhtbGWQPW7DMAyF957C0N5ICdA/I3a2okunpAdgZDoWIImCRMd1T1+mRuChG8XvkY9P+8N38NUVc3EUG7XdGFVhtNS5eGnU1+n98VVVhSF24Clio2Ys6tA+7Ke6ILOoSiUbYqmnRg3Mqda62AEDlA0ljMJ6ygFYnvmiJ8pdymSxFBkNXu+MedYBXFStrPwhCtVUJ8wWI8s5xih9Ax32MHo+wfnIlERyBd+oF/O2YBiZPuY0YASWHHfOecRFYCkk4LU6LreLMEKQVEvXnZ13PH9Sh0rQmN2/TMHZTIV63siIpr53Fv9Sqbvp9ulmqVdPvX5V+wtQSwcInYQHjPEAAABvAQAAUEsDBBQACAgIAE80OVQAAAAAAAAAAAAAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbL2Uy07DMBBF9/2KyFuUuLBACCXpgscSughrZOxJaogfst3S/j3jNKpQFZoChWU8c++ZuU6Sz9aqTVbgvDS6IOfZlCSguRFSNwV5qu7TKzIrJ3m1seAT7NW+IIsQ7DWlni9AMZ8ZCxortXGKBXx0DbWMv7EG6MV0ekm50QF0SEP0IGV+CzVbtiG5W+Pxlotyktxs+yKqIMzaVnIWsExjlQ7qHLT+gHClxd50aT9Zhsquxy+k9WdfE6xu9gBSxc3i+bDi1cKwpCug5hHjdlJAMmcuPDCFDfQ5bkKzE+8zRBKGz52xHq/FQXY4+AO8qE4tGoELEo4jovX3gaauJQf0WCqUZBCDFiCOZL8bJ/pwdxbY/h9Bd+jP0F/tHd1wZQ7e46eJG+wqikk9OocPmxb86afY+o7ia0RW7KX9wQs3NsHOejwDCAE1f5FC79yPMMlp978sPwBQSwcIC9URx1QBAABeBQAAUEsBAhQAFAAICAgATzQ5VOjQASPZAAAAPQIAAAsAAAAAAAAAAAAAAAAAAAAAAF9yZWxzLy5yZWxzUEsBAhQAFAAICAgATzQ5VB8n75ZRAQAAiAIAABEAAAAAAAAAAAAAAAAAEgEAAGRvY1Byb3BzL2NvcmUueG1sUEsBAhQAFAAICAgATzQ5VF5XrDYrAQAAHAIAABAAAAAAAAAAAAAAAAAAogIAAGRvY1Byb3BzL2FwcC54bWxQSwECFAAUAAgICABPNDlU+S8wwMUAAAATAgAAHAAAAAAAAAAAAAAAAAALBAAAd29yZC9fcmVscy9kb2N1bWVudC54bWwucmVsc1BLAQIUABQACAgIAE80OVTBgOzH3wEAAPkEAAARAAAAAAAAAAAAAAAAABoFAAB3b3JkL2RvY3VtZW50LnhtbFBLAQIUABQACAgIAE80OVSkrjFUggIAAD0JAAAPAAAAAAAAAAAAAAAAADgHAAB3b3JkL3N0eWxlcy54bWxQSwECFAAUAAgICABPNDlUwcfZCB0BAABVAwAAEgAAAAAAAAAAAAAAAAD3CQAAd29yZC9mb250VGFibGUueG1sUEsBAhQAFAAICAgATzQ5VJ2EB4zxAAAAbwEAABEAAAAAAAAAAAAAAAAAVAsAAHdvcmQvc2V0dGluZ3MueG1sUEsBAhQAFAAICAgATzQ5VAvVEcdUAQAAXgUAABMAAAAAAAAAAAAAAAAAhAwAAFtDb250ZW50X1R5cGVzXS54bWxQSwUGAAAAAAkACQA8AgAAGQ4AAAAA"
)

var ChrootCache AppCache

func init() {
	Backend.Register("tmp", TmpStorage{})
	ChrootCache = NewAppCache(60 * 24 * 30)
	ChrootCache.OnEvict(func(key string, value interface{}) {
		chroot := value.(string)
		if strings.HasPrefix(chroot, FILESTASH_DIRECTORY) {
			os.RemoveAll(chroot)
		}
	})
	os.RemoveAll(FILESTASH_DIRECTORY)
}

type TmpStorage struct{}

func (this TmpStorage) Init(params map[string]string, app *App) (IBackend, error) {
	if len(params["userID"]) == 0 {
		return nil, ErrAuthenticationFailed
	} else if regexp.MustCompile(`^[a-zA-Z0-9]*$`).MatchString(params["userID"]) == false {
		return nil, ErrAuthenticationFailed
	}
	p := filepath.Join(FILESTASH_DIRECTORY, params["userID"])
	if strings.HasSuffix(p, "/") == false {
		p = fmt.Sprintf("%s/", p)
	}
	if err := this.VerifyPath(p); err != nil {
		return nil, ErrAuthenticationFailed
	}
	if c := ChrootCache.Get(params); c == nil {
		ChrootCache.Set(params, p)
	}
	os.MkdirAll(p, 0755)
	params["path"] = p
	return TmpStorage{}, nil
}

func (this TmpStorage) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			{
				Name:  "type",
				Type:  "hidden",
				Value: "tmp",
			},
			{
				Name:        "userID",
				Type:        "text",
				Placeholder: "user ID",
			},
		},
	}
}

func (this TmpStorage) Ls(path string) ([]os.FileInfo, error) {
	if err := this.VerifyPath(path); err != nil {
		return nil, err
	}
	f, err := SafeOsOpenFile(path, os.O_RDONLY, os.ModePerm)
	if err != nil {
		return nil, err
	}
	return f.Readdir(-1)
}

func (this TmpStorage) Cat(path string) (io.ReadCloser, error) {
	if err := this.VerifyPath(path); err != nil {
		return nil, err
	}
	reader, err := SafeOsOpenFile(path, os.O_RDONLY, os.ModePerm)
	if err == nil {
		return reader, nil
	}

	if os.IsExist(err) == false {
		if strings.HasSuffix(path, ".doc") || strings.HasSuffix(path, ".docx") {
			docx, err := base64.StdEncoding.DecodeString(EMPTY_DOCX)
			if err != nil {
				return nil, err
			}
			return NewReadCloserFromBytes(docx), nil
		}
		return NewReadCloserFromBytes([]byte("")), nil
	}
	return reader, err
}

func (this TmpStorage) Mkdir(path string) error {
	if err := this.VerifyPath(path); err != nil {
		return err
	}
	return SafeOsMkdir(path, 0755)
}

func (this TmpStorage) Rm(path string) error {
	if err := this.VerifyPath(path); err != nil {
		return err
	}
	return SafeOsRemoveAll(path)
}

func (this TmpStorage) Mv(from, to string) error {
	if err := this.VerifyPath(from); err != nil {
		return err
	} else if err = this.VerifyPath(to); err != nil {
		return err
	}
	return SafeOsRename(from, to)
}

func (this TmpStorage) Save(path string, content io.Reader) error {
	if err := this.VerifyPath(path); err != nil {
		return err
	}
	f, err := SafeOsOpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, os.ModePerm)
	if err != nil {
		return err
	}
	_, err = io.Copy(f, content)
	return err
}

func (this TmpStorage) Touch(path string) error {
	if err := this.VerifyPath(path); err != nil {
		return err
	}
	f, err := SafeOsOpenFile(path, os.O_WRONLY|os.O_CREATE, os.ModePerm)
	if err != nil {
		return err
	}
	if _, err = f.Write([]byte("")); err != nil {
		f.Close()
		return err
	}
	return f.Close()
}

func (this TmpStorage) VerifyPath(path string) error {
	if strings.HasPrefix(path, FILESTASH_DIRECTORY) == false {
		Log.Warning("plg_backend_tmp::chroot attempt to circumvent chroot via path[%s]", path)
		return ErrPermissionDenied
	}
	return nil
}
