package plg_backend_azure

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"

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

func (this *AzureBlob) Init(params map[string]string, app *App) (IBackend, error) {
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

func (this *AzureBlob) LoginForm() Form {
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
			FormElement{
				Name:        "path",
				Type:        "text",
				Placeholder: "Path",
			},
		},
	}
}

func (this *AzureBlob) Ls(path string) ([]os.FileInfo, error) {
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
					FTime: blob.Properties.LastModified.Unix(),
					FSize: -1,
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
			if *blob.Name == "/" {
				continue
			}
			files = append(files, File{
				FName: filepath.Base(*blob.Name),
				FType: "directory",
				FTime: -1,
				FSize: -1,
			})
		}
		for _, blob := range resp.ListBlobsHierarchySegmentResponse.Segment.BlobItems {
			files = append(files, File{
				FName: filepath.Base(*blob.Name),
				FType: "file",
				FTime: blob.Properties.LastModified.Unix(),
				FSize: *blob.Properties.ContentLength,
			})
		}
	}
	return files, nil
}

func (this AzureBlob) Cat(path string) (io.ReadCloser, error) {
	ap := this.path(path)
	return &azureFilecat{
		offset: 0,
		ctx:    this.ctx,
		ap:     ap,
		client: this.client,
		reader: nil,
	}, nil
}

type azureFilecat struct {
	offset int64
	ctx    context.Context
	ap     azurePath
	reader io.ReadCloser
	client *azblob.Client
	mu     sync.Mutex
}

func (this *azureFilecat) Read(p []byte) (n int, err error) {
	this.mu.Lock()
	defer this.mu.Unlock()
	if this.reader == nil {
		resp, err := this.client.DownloadStream(
			this.ctx,
			this.ap.containerName,
			this.ap.blobName,
			&azblob.DownloadStreamOptions{
				Range: azblob.HTTPRange{
					Offset: this.offset,
				},
			},
		)
		if err != nil {
			return 0, err
		}
		this.reader = resp.Body
	}
	return this.reader.Read(p)
}

func (this *azureFilecat) Seek(offset int64, whence int) (int64, error) {
	this.mu.Lock()
	defer this.mu.Unlock()
	if offset < 0 {
		return this.offset, os.ErrInvalid
	}

	switch whence {
	case io.SeekStart:
	case io.SeekCurrent:
		offset += this.offset
	case io.SeekEnd:
		props, err := this.client.ServiceClient().NewContainerClient(this.ap.containerName).NewBlockBlobClient(this.ap.blobName).GetProperties(this.ctx, nil)
		if err != nil {
			return this.offset, err
		}
		offset += *props.ContentLength
	default:
		return this.offset, ErrNotImplemented
	}

	this.offset = offset
	return this.offset, nil
}

func (this *azureFilecat) Close() error {
	this.mu.Lock()
	defer this.mu.Unlock()
	if this.reader == nil {
		return nil
	}
	return this.reader.Close()
}

func (this *AzureBlob) Mkdir(path string) error {
	ap := this.path(path)
	if ap.blobName == "" {
		_, err := this.client.CreateContainer(this.ctx, ap.containerName, nil)
		return err
	}
	_, err := this.client.UploadBuffer(this.ctx, ap.containerName, ap.blobName+".keep", []byte(""), nil)
	return err
}

func (this *AzureBlob) Rm(path string) error {
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
		Prefix:  &ap.blobName,
	})
	for pager.More() {
		resp, err := pager.NextPage(this.ctx)
		if err != nil {
			return err
		}
		for _, blob := range resp.Segment.BlobItems {
			_, err := this.client.DeleteBlob(context.Background(), ap.containerName, *blob.Name, nil)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func (this *AzureBlob) Mv(from string, to string) error {
	return ErrNotSupported
}

func (this *AzureBlob) Touch(path string) error {
	return this.Save(path, strings.NewReader(""))
}

func (this *AzureBlob) Save(path string, file io.Reader) error {
	ap := this.path(path)
	_, err := this.client.UploadStream(
		this.ctx, ap.containerName, ap.blobName, file,
		nil,
	)
	return err
}

func (this *AzureBlob) Meta(path string) Metadata {
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
