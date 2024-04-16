package plg_backend_backblaze

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	. "github.com/mickael-kerjean/filestash/server/common"

	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob"
	"github.com/Azure/azure-sdk-for-go/sdk/storage/azblob/container"
)

type AzureBlob struct {
	client *azblob.Client
	ctx    context.Context
}

func init() {
	Backend.Register("azure", &AzureBlob{})
}

func (this AzureBlob) Init(params map[string]string, app *App) (IBackend, error) {
	cred, err := container.NewSharedKeyCredential(params["account_name"], params["account_key"])
	if err != nil {
		Log.Debug("plg_backend_azure::new_cred_error %s", err.Error())
		return nil, ErrAuthenticationFailed
	}
	serviceURL := fmt.Sprintf("https://%s.blob.core.windows.net/", params["account_name"])
	client, err := azblob.NewClientWithSharedKeyCredential(serviceURL, cred, nil)
	if err != nil {
		Log.Debug("plg_backend_azure::new_client_error %s", err.Error())
		return nil, ErrAuthenticationFailed
	}
	this.ctx = app.Context
	this.client = client
	return this, nil
}

func (this AzureBlob) LoginForm() Form {
	return Form{
		Elmnts: []FormElement{
			FormElement{
				Name:  "type",
				Type:  "hidden",
				Value: "azure",
			},
			FormElement{
				Name:        "account_name",
				Type:        "text",
				Placeholder: "Account Name",
			},
			FormElement{
				Name:        "account_key",
				Type:        "password",
				Placeholder: "Account Key",
			},
		},
	}
}

func (this AzureBlob) Ls(path string) ([]os.FileInfo, error) {
	files := make([]os.FileInfo, 0)
	ap := this.path(path)

	if ap.containerName == "" {
		pager := this.client.NewListContainersPager(nil)
		for pager.More() {
			resp, err := pager.NextPage(this.ctx)
			if err != nil {
				return files, err
			}
			for _, blob := range resp.ListContainersSegmentResponse.ContainerItems {
				files = append(files, File{
					FName: *blob.Name,
					FType: "directory",
				})
			}
		}
		return files, nil
	}

	client := this.client.ServiceClient().NewContainerClient(ap.containerName)
	pager := client.NewListBlobsHierarchyPager("/", &container.ListBlobsHierarchyOptions{
		Prefix: &ap.blobName,
	})
	for pager.More() {
		resp, err := pager.NextPage(this.ctx)
		if err != nil {
			return files, err
		}
		for _, blob := range resp.ListBlobsHierarchySegmentResponse.Segment.BlobPrefixes {
			files = append(files, File{
				FName: filepath.Base(*blob.Name),
				FType: "directory",
			})
		}
		for _, blob := range resp.ListBlobsHierarchySegmentResponse.Segment.BlobItems {
			files = append(files, File{
				FName: filepath.Base(*blob.Name),
				FType: "file",
			})
		}
	}
	return files, nil
}

func (this AzureBlob) Cat(path string) (io.ReadCloser, error) {
	ap := this.path(path)
	resp, err := this.client.DownloadStream(
		this.ctx,
		ap.containerName,
		ap.blobName,
		nil,
	)
	if err != nil {
		return nil, err
	}
	return resp.Body, nil
}

func (this AzureBlob) Mkdir(path string) error {
	ap := this.path(path)
	if ap.blobName == "" {
		_, err := this.client.CreateContainer(this.ctx, ap.containerName, nil)
		return err
	}
	_, err := this.client.UploadBuffer(this.ctx, ap.containerName, ap.blobName+".keep", []byte(""), nil)
	return err
}

func (this AzureBlob) Rm(path string) error {
	ap := this.path(path)
	if ap.blobName == "" {
		_, err := this.client.DeleteContainer(this.ctx, ap.containerName, nil)
		return err
	}
	if strings.HasSuffix(path, "/") == false {
		_, err := this.client.DeleteBlob(this.ctx, ap.containerName, ap.blobName, nil)
		return err
	}
	pager := this.client.NewListBlobsFlatPager(ap.containerName, &container.ListBlobsFlatOptions{
		Include: container.ListBlobsInclude{Snapshots: true, Versions: true},
	})
	for pager.More() {
		resp, err := pager.NextPage(this.ctx)
		if err != nil {
			return err
		}
		for _, blob := range resp.Segment.BlobItems {
			_, err := this.client.DeleteBlob(this.ctx, ap.containerName, *blob.Name, nil)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (this AzureBlob) Mv(from string, to string) error {
	return ErrNotSupported
}

func (this AzureBlob) Touch(path string) error {
	return this.Save(path, strings.NewReader(""))
}

func (this AzureBlob) Save(path string, file io.Reader) error {
	ap := this.path(path)
	_, err := this.client.UploadStream(
		this.ctx, ap.containerName, ap.blobName, file,
		nil,
	)
	return err
}

func (this AzureBlob) Meta(path string) Metadata {
	if path == "/" {
		return Metadata{
			CanCreateFile: NewBool(false),
			CanRename:     NewBool(false),
			CanMove:       NewBool(false),
			CanUpload:     NewBool(false),
		}
	}
	return Metadata{
		CanRename: NewBool(false),
		CanMove:   NewBool(false),
	}
}

type azurePath struct {
	containerName string
	blobName      string
}

func (this AzureBlob) path(path string) azurePath {
	ap := azurePath{}
	path = strings.TrimLeft(path, "/")
	sp := strings.SplitN(path, "/", 2)
	if len(sp) != 2 {
		return ap
	}
	ap.containerName = sp[0]
	ap.blobName = sp[1]
	return ap
}
