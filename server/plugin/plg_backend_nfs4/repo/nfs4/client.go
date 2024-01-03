package nfs4

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"io"
	"math"
	"net"
	"os"
	"strings"
	"time"

	. "github.com/mickael-kerjean/filestash/server/plugin/plg_backend_nfs4/repo/internal"
)

const NfsReadBlockLen = 512 * 1024

var standardNfsAttrs = Bitmap4{
	1<<FATTR4_TYPE | 1<<FATTR4_SIZE,
	1 << (FATTR4_TIME_MODIFY - 32),
}

type NfsInterface interface {
	Ping() error
	Close()

	GetFileList(path string) ([]FileInfo, error)
	GetFileInfo(path string) (FileInfo, error)
	ReadFileAll(path string, writer io.Writer) (uint64, error)
	ReadFile(path string, offset, count uint64, writer io.Writer) (uint64, error)

	ReWriteFile(path string, reader io.Reader) (written uint64, err error)
	WriteFile(path string, truncate bool, offset uint64, reader io.Reader) (written uint64, err error)

	DeleteFile(path string) error
	MakePath(path string) error
}
type NfsClient struct {
	conn net.Conn
	xid  uint32

	nfsSeqId uint32

	authType Auth_flavor
	authData []byte

	clientId      string
	clientIdShort uint64
	openConfirmed bool

	rootFh Nfs_fh4
}

var _ NfsInterface = &NfsClient{}

type AuthParams struct {
	Uid, Gid    uint32
	MachineName string
}

type FileInfo struct {
	Name  string
	IsDir bool
	Size  uint64
	Mtime time.Time
}

// Create the NFS client with the specified parameters. The `server` string must include port.
// The default NFS port is 2049. E.g.: "127.0.0.1:2049".
// `auth` should contain a fairly unique MachineId to make sure clients can be distinguished.
func NewNfsClient(ctx context.Context, server string, auth AuthParams) (*NfsClient, error) {
	d := net.Dialer{}
	conn, err := d.DialContext(ctx, "tcp", server)
	if err != nil {
		return nil, err
	}

	return NewNfsClientWithConn(conn, auth)
}

func NewNfsClientWithConn(conn net.Conn, auth AuthParams) (*NfsClient, error) {
	clientId, err := os.Hostname()
	if err != nil {
		return nil, err
	}
	randId := make([]byte, 8)
	_, _ = rand.Read(randId)
	clientId += "-" + hex.EncodeToString(randId)

	cli := &NfsClient{
		conn:     conn,
		authType: AUTH_SYS,
		authData: makeAuthData(auth),
		nfsSeqId: 0,
		clientId: clientId,
	}
	cl := NewCleanup(cli.Close)
	defer cl.Cleanup()

	err = cli.Ping()
	if err != nil {
		return nil, err
	}
	err = cli.setClientId()
	if err != nil {
		return nil, err
	}
	err = cli.retrieveRootFh()
	if err != nil {
		return nil, err
	}

	cl.Disarm()
	return cli, nil
}

func (c *NfsClient) Close() {
	_ = c.conn.Close()
}

func makeAuthData(auth AuthParams) []byte {
	machName := auth.MachineName
	if len(machName) > 255 {
		machName = machName[0:255]
	}

	ap := Authsys_parms{
		Machinename: machName,
		Uid:         auth.Uid,
		Gid:         auth.Gid,
		Gids:        nil,
	}

	// Fill the machine ID (needs not to be super-unique but nice to have them distinct)
	_ = binary.Read(rand.Reader, binary.LittleEndian, &ap.Stamp)

	apBuf := bytes.NewBuffer([]byte{})
	XdrOut{Out: apBuf}.Marshal("", &ap)

	return apBuf.Bytes()
}

func (c *NfsClient) sendMessage(proc XdrProc) (xid uint32, err error) {
	xid = c.xid
	c.xid++

	msg := Rpc_msg{
		Xid: xid,
		Body: XdrAnon_Rpc_msg_Body{
			Mtype: CALL,
			U: &Call_body{
				Rpcvers: 2,
				Prog:    proc.Prog(),
				Vers:    proc.Vers(),
				Proc:    proc.Proc(),
				Cred: Opaque_auth{
					Flavor: c.authType,
					Body:   c.authData,
				},
				Verf: Opaque_auth{
					Flavor: AUTH_NONE,
				},
			},
		},
	}

	// The marshaller for some reason loves to panic.
	defer func() {
		if i := recover(); i != nil {
			if e, ok := i.(XdrError); ok {
				err = e
			} else {
				panic(i)
			}
		}
	}()

	buffer := bytes.NewBuffer([]byte{})
	out := XdrOut{Out: buffer}
	out.Marshal("", &msg)
	if _, ok := proc.GetArg().(XdrType_void); !ok {
		out.Marshal("", proc.GetArg())
	}

	// Yep, the RPC protocol requires this strange OR
	err = binary.Write(c.conn, binary.BigEndian, 0x80000000|uint32(buffer.Len()))
	if err != nil {
		return
	}
	_, err = c.conn.Write(buffer.Bytes())
	if err != nil {
		return
	}

	return
}

func (c *NfsClient) readNfsMessage(result XdrType) (xid uint32, err error) {
	lenBuf := make([]byte, 4)
	_, err = io.ReadFull(c.conn, lenBuf)
	if err != nil {
		return
	}
	// The RPC protocol sets the MSB to 1 for length fields. Don't ask me why.
	msgLen := binary.BigEndian.Uint32(lenBuf) & 0x7fffffff

	msgBuf := make([]byte, msgLen)
	_, err = io.ReadFull(c.conn, msgBuf)
	if err != nil {
		return
	}

	// The unmarshaller for some reason loves to panic. Sigh.
	defer func() {
		if i := recover(); i != nil {
			if e, ok := i.(XdrError); ok {
				err = e
			} else {
				panic(i)
			}
		}
	}()

	reply := Rpc_msg{}
	in := XdrIn{In: bytes.NewReader(msgBuf)}
	in.Marshal("", &reply)
	if _, ok := result.(XdrType_void); !ok {
		in.Marshal("", result)
	}

	if !c.isRpcSuccess(&reply) {
		err = fmt.Errorf("RPC error: %s", c.getRpcError(&reply))
		return
	}
	xid = reply.Xid

	return
}

// Returns true iff msg is an accepted REPLY with status SUCCESS.
func (c *NfsClient) isRpcSuccess(msg *Rpc_msg) bool {
	return msg != nil &&
		msg.Body.Mtype == REPLY &&
		msg.Body.Rbody().Stat == MSG_ACCEPTED &&
		msg.Body.Rbody().Areply().Reply_data.Stat == SUCCESS
}

// An *Rpc_msg can represent an error.  Call IsSuccess to see if there
// was actually an error.
func (c *NfsClient) getRpcError(m *Rpc_msg) string {
	if m.Body.Mtype != REPLY {
		return "RPC message not a REPLY"
	} else if m.Body.Rbody().Stat == MSG_ACCEPTED {
		stat := m.Body.Rbody().Areply().Reply_data.Stat
		c := stat.String()
		if stat == PROG_MISMATCH {
			mmi := m.Body.Rbody().Areply().Reply_data.Mismatch_info()
			c = fmt.Sprintf("%s (low %d, high %d)", c, mmi.Low, mmi.High)
		}
		return c
	} else if m.Body.Rbody().Stat == MSG_DENIED {
		stat := m.Body.Rbody().Rreply().Stat
		c := stat.String()
		return c
	}
	return "Invalid reply_stat"
}

func (c *NfsClient) Ping() error {
	nullProc := XdrProc_NFSPROC4_NULL{}

	xid, err := c.sendMessage(&nullProc)
	if err != nil {
		return err
	}
	xidRes, err := c.readNfsMessage(nullProc.GetRes())
	if err != nil {
		return err
	}
	if xidRes != xid {
		return fmt.Errorf("mismathced xids: %d and %d", xid, xidRes)
	}

	return nil
}

func (c *NfsClient) runNfsTransaction(ops []Nfs_argop4, pathHint string) ([]Nfs_resop4, error) {
	compound := XdrProc_NFSPROC4_COMPOUND{}

	args := compound.GetArg().(*COMPOUND4args)
	args.Argarray = ops

	xid, err := c.sendMessage(&compound)
	if err != nil {
		return nil, err
	}
	xid2, err := c.readNfsMessage(compound.GetRes())
	if err != nil {
		return nil, err
	}
	if xid != xid2 {
		return nil, fmt.Errorf("xids don't match: %d and %d", xid, xid2)
	}

	res := compound.GetRes().(*COMPOUND4res)
	// TODO: translate the error better
	if res.Status != NFS4_OK {
		return nil, &NfsError{
			Path:      pathHint,
			ErrorCode: NfsErrorCode(res.Status),
			ErrorString: fmt.Sprintf("NFS error: %s (%d), path='%s'",
				res.Status.String(), int32(res.Status), pathHint),
		}
	}

	return res.Resarray, nil
}

func (c *NfsClient) setClientId() error {
	res, err := c.runNfsTransaction([]Nfs_argop4{{
		Argop: OP_SETCLIENTID,
		U: &SETCLIENTID4args{
			Client: Nfs_client_id4{
				Verifier: Verifier4{},
				Id:       []byte(c.clientId),
			},
			Callback:       Cb_client4{},
			Callback_ident: 0,
		},
	}}, "")
	if err != nil {
		return err
	}

	resOk := res[0].Opsetclientid().Resok4()
	c.clientIdShort = resOk.Clientid

	_, err = c.runNfsTransaction([]Nfs_argop4{{
		Argop: OP_SETCLIENTID_CONFIRM,
		U: &SETCLIENTID_CONFIRM4args{
			Clientid:            resOk.Clientid,
			Setclientid_confirm: resOk.Setclientid_confirm,
		},
	}}, "")
	if err != nil {
		return err
	}

	return nil
}

func (c *NfsClient) retrieveRootFh() error {
	res, err := c.runNfsTransaction([]Nfs_argop4{
		{
			Argop: OP_PUTROOTFH,
		},
		{
			Argop: OP_GETFH,
		},
	}, "/")
	if err != nil {
		return err
	}
	c.rootFh = res[1].Opgetfh().Resok4().Object
	return nil
}

func splitPath(path string) []string {
	splits := strings.Split(path, "/")
	curPos := 0
	for _, s := range splits {
		if s == "" {
			continue
		}
		splits[curPos] = s
		curPos++
	}
	return splits[0:curPos]
}

func (c *NfsClient) GetFileList(path string) ([]FileInfo, error) {
	var args = c.makePathLookupArgs(splitPath(path))

	args = append(args,
		Nfs_argop4{Argop: OP_GETFH},
		Nfs_argop4{Argop: OP_READDIR,
			U: &READDIR4args{
				Cookie:       0,
				Cookieverf:   Verifier4{},
				Dircount:     1024 * 128,
				Maxcount:     1024 * 128,
				Attr_request: standardNfsAttrs,
			}},
	)

	res, err := c.runNfsTransaction(args, path)
	if err != nil {
		return nil, err
	}

	var fileList []FileInfo

	dirFh := res[len(res)-2].Opgetfh().Resok4().Object

	curDirList := res[len(res)-1].Opreaddir().Resok4()
	for {
		ent := curDirList.Reply.Entries
		if ent == nil {
			break
		}
		for {
			fileList = append(fileList, c.translateFileMeta(string(ent.Name), ent.Attrs))
			if ent.Nextentry == nil {
				break
			}
			ent = ent.Nextentry
		}

		if curDirList.Reply.Eof {
			break
		}
		res, err := c.runNfsTransaction([]Nfs_argop4{
			{
				Argop: OP_PUTFH,
				U:     &PUTFH4args{Object: dirFh},
			},
			{
				Argop: OP_READDIR,
				U: &READDIR4args{
					Cookie:       ent.Cookie,
					Cookieverf:   curDirList.Cookieverf,
					Dircount:     1024 * 128,
					Maxcount:     1024 * 128,
					Attr_request: standardNfsAttrs,
				},
			},
		}, path)
		if err != nil {
			return nil, err
		}
		curDirList = res[1].Opreaddir().Resok4()
	}

	return fileList, nil
}

// Make the commands to navigate the path to its leaf
func (c *NfsClient) makePathLookupArgs(path []string) []Nfs_argop4 {
	var args []Nfs_argop4
	args = append(args, Nfs_argop4{Argop: OP_PUTROOTFH})

	// Add lookups for the path components
	for _, p := range path {
		args = append(args, Nfs_argop4{
			Argop: OP_LOOKUP,
			U:     &LOOKUP4args{Objname: Component4(p)},
		})
	}
	return args
}

func (c *NfsClient) translateFileMeta(name string, attrs Fattr4) FileInfo {
	res := FileInfo{
		Name: name,
	}

	curOff := 0

	atm := attrs.Attrmask
	if len(atm) > 0 && atm[0]&(1<<FATTR4_TYPE) != 0 {
		fileType := binary.BigEndian.Uint32(attrs.Attr_vals[curOff : curOff+4])
		curOff += 4

		res.IsDir = Nfs_ftype4(fileType) == NF4DIR
	}

	if len(atm) > 0 && atm[0]&(1<<FATTR4_SIZE) != 0 {
		res.Size = binary.BigEndian.Uint64(attrs.Attr_vals[curOff : curOff+8])
		curOff += 8
	}

	if len(atm) > 1 && atm[1]&(1<<(FATTR4_TIME_MODIFY-32)) != 0 {
		mtimeSec := binary.BigEndian.Uint64(attrs.Attr_vals[curOff : curOff+8])
		curOff += 8

		mtimeNsec := binary.BigEndian.Uint32(attrs.Attr_vals[curOff : curOff+4])
		curOff += 4

		// I hope this works for times before 1970-01-01...
		res.Mtime = time.Unix(int64(mtimeSec), int64(mtimeNsec))
	}

	return res
}

func (c *NfsClient) GetFileInfo(path string) (FileInfo, error) {
	args := c.makePathLookupArgs(splitPath(path))
	args = append(args,
		Nfs_argop4{
			Argop: OP_GETATTR,
			U: &GETATTR4args{
				Attr_request: standardNfsAttrs,
			},
		})

	res, err := c.runNfsTransaction(args, path)
	if err != nil {
		return FileInfo{}, err
	}

	splits := splitPath(path)
	var name string
	if len(splits) == 1 {
		name = path
	} else {
		name = splits[len(splits)-1]
	}

	resInfo := c.translateFileMeta(name,
		res[len(res)-1].Opgetattr().Resok4().Obj_attributes)
	return resInfo, nil
}

func (c *NfsClient) ReadFileAll(path string, writer io.Writer) (uint64, error) {
	return c.ReadFile(path, 0, math.MaxUint64, writer)
}

func (c *NfsClient) ReadFile(path string, offset, count uint64, writer io.Writer) (uint64, error) {
	anonymousStateId := Stateid4{}
	args := c.makePathLookupArgs(splitPath(path))

	args = append(args,
		Nfs_argop4{Argop: OP_GETFH},
		Nfs_argop4{
			Argop: OP_READ,
			U: &READ4args{
				Stateid: anonymousStateId,
				Offset:  offset,
				Count:   Count4(MinUint64(NfsReadBlockLen, count)),
			},
		})

	res, err := c.runNfsTransaction(args, path)
	if err != nil {
		return 0, err
	}
	flDataBlock := res[len(res)-1].Opread().Resok4()
	fileFh := res[len(res)-2].Opgetfh().Resok4().Object

	var dataRead uint64
	for {
		_, err := writer.Write(flDataBlock.Data)
		if err != nil {
			return 0, err
		}
		ln := len(flDataBlock.Data)
		offset += uint64(ln)
		count -= uint64(ln)
		dataRead += uint64(ln)
		if flDataBlock.Eof || count == 0 {
			break
		}

		// Get the next file block
		res, err := c.runNfsTransaction([]Nfs_argop4{
			{
				Argop: OP_PUTFH,
				U:     &PUTFH4args{Object: fileFh},
			},
			{
				Argop: OP_READ,
				U: &READ4args{
					Stateid: anonymousStateId,
					Offset:  offset,
					Count:   Count4(MinUint64(NfsReadBlockLen, count)),
				},
			},
		}, path)
		if err != nil {
			return 0, err
		}
		flDataBlock = res[1].Opread().Resok4()
	}

	return dataRead, nil
}

func (c *NfsClient) openFileForWrite(path string, truncate bool) (Stateid4, Nfs_fh4, error) {
	splits := splitPath(path)

	// Put the directory FH as the current one
	args := c.makePathLookupArgs(splits[0 : len(splits)-1])
	// Make the file claim (i.e. the file name on top of the directory FH)
	flClaim := Component4(splits[len(splits)-1])

	var fileAttrs Fattr4
	if truncate {
		// Set the file size and mode (Unix access mask)
		fileAttrs.Attr_vals = make([]byte, 12)
		// This file size is set to 0
		binary.BigEndian.PutUint32(fileAttrs.Attr_vals[8:], MODE4_WUSR|MODE4_RUSR|MODE4_WGRP|MODE4_RGRP)
		fileAttrs.Attrmask = Bitmap4{1 << FATTR4_SIZE, 1 << (FATTR4_MODE - 32)}
	} else {
		// Set the file mode (Unix access mask)
		fileAttrs.Attr_vals = make([]byte, 4)
		binary.BigEndian.PutUint32(fileAttrs.Attr_vals, MODE4_WUSR|MODE4_RUSR|MODE4_WGRP|MODE4_RGRP)
		fileAttrs.Attrmask = Bitmap4{0, 1 << (FATTR4_MODE - 32)}
	}

	args = append(args,
		Nfs_argop4{
			Argop: OP_OPEN,
			U: &OPEN4args{
				Seqid:        c.nfsSeqId,
				Share_access: OPEN4_SHARE_ACCESS_WRITE,
				Share_deny:   OPEN4_SHARE_DENY_NONE,
				Owner: Open_owner4{
					Clientid: c.clientIdShort,
					Owner:    []byte(c.clientId),
				},
				Openhow: Openflag4{
					Opentype: OPEN4_CREATE,
					U: &Createhow4{
						Mode: UNCHECKED4,
						U:    &fileAttrs,
					},
				},
				Claim: Open_claim4{
					Claim: CLAIM_NULL,
					U:     &flClaim,
				},
			},
		},
		Nfs_argop4{
			Argop: OP_GETFH,
		})

	res, err := c.runNfsTransaction(args, path)
	c.incrementNfsSeq(err)
	if err != nil {
		return Stateid4{}, Nfs_fh4{}, err
	}

	openRes := res[len(res)-2].Opopen().Resok4()
	openFh := res[len(res)-1].Opgetfh().Resok4().Object

	// We need to confirm the opened file receipt the first time we run the operation
	if !c.openConfirmed {
		res, err = c.runNfsTransaction([]Nfs_argop4{
			{
				Argop: OP_PUTFH,
				U:     &PUTFH4args{Object: openFh},
			},
			{
				Argop: OP_OPEN_CONFIRM,
				U: &OPEN_CONFIRM4args{
					Open_stateid: openRes.Stateid,
					Seqid:        c.nfsSeqId,
				},
			},
		}, path)
		c.incrementNfsSeq(err)
		if err != nil {
			return Stateid4{}, Nfs_fh4{}, err
		}
		c.openConfirmed = true
		return res[len(res)-1].Opopen_confirm().Resok4().Open_stateid, openFh, nil
	}

	return openRes.Stateid, openFh, nil
}

func (c *NfsClient) closeFile(stateId Stateid4, fh Nfs_fh4, path string) error {
	_, err := c.runNfsTransaction([]Nfs_argop4{
		{
			Argop: OP_PUTFH,
			U:     &PUTFH4args{Object: fh},
		},
		{
			Argop: OP_CLOSE,
			U: &CLOSE4args{
				Open_stateid: stateId,
				Seqid:        c.nfsSeqId,
			},
		},
	}, path)
	c.incrementNfsSeq(err)

	if err != nil {
		return err
	}

	return nil
}

func (c *NfsClient) ReWriteFile(path string, reader io.Reader) (written uint64, err error) {
	return c.WriteFile(path, true, 0, reader)
}

func (c *NfsClient) WriteFile(path string, truncate bool, offset uint64,
	reader io.Reader) (written uint64, err error) {

	stateId, fh, err := c.openFileForWrite(path, truncate)
	if err != nil {
		return
	}
	defer func() {
		err = c.closeFile(stateId, fh, path)
	}()

	block := make([]byte, NfsReadBlockLen)
	for {
		var curRead int
		curRead, err = reader.Read(block)
		if curRead == 0 || err == io.EOF {
			break
		}
		if err != nil {
			return
		}

		// Write the block!
		err = c.writeBlock(stateId, fh, written+offset, block[0:curRead], path)
		if err != nil {
			return
		}

		written += uint64(curRead)
	}

	return
}

func (c *NfsClient) writeBlock(id Stateid4, fh Nfs_fh4, offset uint64, data []byte, path string) error {
	for len(data) > 0 {
		res, err := c.runNfsTransaction([]Nfs_argop4{
			{
				Argop: OP_PUTFH,
				U:     &PUTFH4args{Object: fh},
			},
			{
				Argop: OP_WRITE,
				U: &WRITE4args{
					Stateid: id,
					Offset:  offset,
					Stable:  UNSTABLE4,
					Data:    data,
				},
			},
		}, path)

		if err != nil {
			return err
		}

		written := res[1].Opwrite().Resok4().Count
		data = data[written:]
	}

	return nil
}

func (c *NfsClient) DeleteFile(path string) error {
	splits := splitPath(path)
	// Put the directory FH as the current one
	args := c.makePathLookupArgs(splits[0 : len(splits)-1])
	// Make the file claim (i.e. the file name on top of the directory FH)
	flClaim := Component4(splits[len(splits)-1])

	args = append(args,
		Nfs_argop4{
			Argop: OP_REMOVE,
			U: &REMOVE4args{
				Target: flClaim,
			},
		})

	_, err := c.runNfsTransaction(args, path)
	if err != nil {
		return err
	}

	return nil
}

func (c *NfsClient) MakePath(path string) error {
	curPath := ""
	var curPathElems []string

	for _, curElem := range splitPath(path) {
		if curPath != "" {
			curPath += "/"
		}
		curPath += curElem
		curPathElems = append(curPathElems, curElem)

		fi, err := c.GetFileInfo(curPath)
		if err == nil && !fi.IsDir {
			return &NfsError{
				ErrorCode: ERROR_NOTDIR,
				ErrorString: fmt.Sprintf("NFS error: should be a directory (%d), path='%s'",
					ERROR_NOTDIR, curPath),
				Path: curPath,
			}
		}

		if err != nil {
			if IsNfsError(err, ERROR_NOENT) {
				args := c.makePathLookupArgs(curPathElems[0 : len(curPathElems)-1])
				// Make the file claim (i.e. the file name on top of the directory FH)
				flClaim := Component4(curElem)

				// Set the file mode (Unix access mask)
				var dirAttrs Fattr4
				dirAttrs.Attr_vals = make([]byte, 4)
				binary.BigEndian.PutUint32(dirAttrs.Attr_vals,
					MODE4_WUSR|MODE4_RUSR|MODE4_XUSR|MODE4_WGRP|MODE4_RGRP|MODE4_XGRP)
				dirAttrs.Attrmask = Bitmap4{0, 1 << (FATTR4_MODE - 32)}

				args = append(args,
					Nfs_argop4{
						Argop: OP_CREATE,
						U: &CREATE4args{
							Objtype: Createtype4{
								Type: NF4DIR,
							},
							Objname:     flClaim,
							Createattrs: dirAttrs,
						},
					})
				_, err := c.runNfsTransaction(args, curPath)
				if err != nil {
					return err
				}
			} else {
				return err
			}
		}
	}

	return nil
}

// Increment NFS sequence ID for all operations, even the ones that return
// errors, except for a pre-defined list in https://tools.ietf.org/html/rfc3530#section-8.1.5
func (c *NfsClient) incrementNfsSeq(err error) {
	if err == nil {
		c.nfsSeqId++
		return
	}

	nfsErr, ok := err.(*NfsError)
	if !ok {
		c.nfsSeqId++
		return
	}

	switch Nfsstat4(nfsErr.ErrorCode) {
	case
		NFS4ERR_STALE_CLIENTID, NFS4ERR_STALE_STATEID,
		NFS4ERR_BAD_STATEID, NFS4ERR_BAD_SEQID, NFS4ERR_BADXDR,
		NFS4ERR_RESOURCE, NFS4ERR_NOFILEHANDLE:
		return
	default:
		c.nfsSeqId++
	}
}

func RemoveRecursive(nfs NfsInterface, path string) error {
	list, err := nfs.GetFileList(path)
	if IsNfsError(err, ERROR_NOENT) {
		return nil
	}
	if err != nil {
		return err
	}

	for _, fl := range list {
		curPath := path + "/" + fl.Name
		if fl.IsDir {
			err = RemoveRecursive(nfs, curPath)
			if err != nil {
				return err
			}
		} else {
			err = nfs.DeleteFile(curPath)
			if err != nil {
				return err
			}
		}
	}

	err = nfs.DeleteFile(path)
	if err != nil {
		return err
	}

	return nil
}
