package nfs4

type NfsError struct {
	Path        string
	ErrorCode   NfsErrorCode
	ErrorString string
}

func (n *NfsError) Error() string {
	return n.ErrorString
}

func IsNfsError(err error, code NfsErrorCode) bool {
	ne, ok := err.(*NfsError)
	return ok && ne.ErrorCode == code
}

/*
 * Error status. See https://www.rfc-editor.org/rfc/rfc7530
 */
type NfsErrorCode int32
const (
	/* everything is okay      */
	OK NfsErrorCode = 0
	/* caller not privileged   */
	ERROR_PERM NfsErrorCode = 1
	/* no such file/directory  */
	ERROR_NOENT NfsErrorCode = 2
	/* hard I/O error          */
	ERROR_IO NfsErrorCode = 5
	/* no such device          */
	ERROR_NXIO NfsErrorCode = 6
	/* access denied           */
	ERROR_ACCESS NfsErrorCode = 13
	/* file already exists     */
	ERROR_EXIST NfsErrorCode = 17
	/* different filesystems   */
	ERROR_XDEV NfsErrorCode = 18
	/* should be a directory   */
	ERROR_NOTDIR NfsErrorCode = 20
	/* should not be directory */
	ERROR_ISDIR NfsErrorCode = 21
	/* invalid argument        */
	ERROR_INVAL NfsErrorCode = 22
	/* file exceeds server max */
	ERROR_FBIG NfsErrorCode = 27
	/* no space on filesystem  */
	ERROR_NOSPC NfsErrorCode = 28
	/* read-only filesystem    */
	ERROR_ROFS NfsErrorCode = 30
	/* too many hard links     */
	ERROR_MLINK NfsErrorCode = 31
	/* name exceeds server max */
	ERROR_NAMETOOLONG NfsErrorCode = 63
	/* directory not empty     */
	ERROR_NOTEMPTY NfsErrorCode = 66
	/* hard quota limit reached*/
	ERROR_DQUOT NfsErrorCode = 69
	/* file no longer exists   */
	ERROR_STALE NfsErrorCode = 70
	/* Illegal filehandle      */
	ERROR_BADHANDLE NfsErrorCode = 10001
	/* READDIR cookie is stale */
	ERROR_BAD_COOKIE NfsErrorCode = 10003
	/* operation not supported */
	ERROR_NOTSUPP NfsErrorCode = 10004
	/* response limit exceeded */
	ERROR_TOOSMALL NfsErrorCode = 10005
	/* undefined server error  */
	ERROR_SERVERFAULT NfsErrorCode = 10006
	/* type invalid for CREATE */
	ERROR_BADTYPE NfsErrorCode = 10007
	/* file "busy" - retry     */
	ERROR_DELAY NfsErrorCode = 10008
	/* nverify says attrs same */
	ERROR_SAME NfsErrorCode = 10009
	/* lock unavailable        */
	ERROR_DENIED NfsErrorCode = 10010
	/* lock lease expired      */
	ERROR_EXPIRED NfsErrorCode = 10011
	/* I/O failed due to lock  */
	ERROR_LOCKED NfsErrorCode = 10012
	/* in grace period         */
	ERROR_GRACE NfsErrorCode = 10013
	/* filehandle expired      */
	ERROR_FHEXPIRED NfsErrorCode = 10014
	/* share reserve denied    */
	ERROR_SHARE_DENIED NfsErrorCode = 10015
	/* wrong security flavor   */
	ERROR_WRONGSEC NfsErrorCode = 10016
	/* clientid in use         */
	ERROR_CLID_INUSE NfsErrorCode = 10017
	/* resource exhaustion     */
	ERROR_RESOURCE NfsErrorCode = 10018
	/* filesystem relocated    */
	ERROR_MOVED NfsErrorCode = 10019
	/* current FH is not set   */
	ERROR_NOFILEHANDLE NfsErrorCode = 10020
	/* minor vers not supp */
	ERROR_MINOR_VERS_MISMATCH NfsErrorCode = 10021
	/* server has rebooted     */
	ERROR_STALE_CLIENTID NfsErrorCode = 10022
	/* server has rebooted     */
	ERROR_STALE_STATEID NfsErrorCode = 10023
	/* state is out of sync    */
	ERROR_OLD_STATEID NfsErrorCode = 10024
	/* incorrect stateid       */
	ERROR_BAD_STATEID NfsErrorCode = 10025
	/* request is out of seq.  */
	ERROR_BAD_SEQID NfsErrorCode = 10026
	/* verify - attrs not same */
	ERROR_NOT_SAME NfsErrorCode = 10027
	/* lock range not supported*/
	ERROR_LOCK_RANGE NfsErrorCode = 10028
	/* should be file/directory*/
	ERROR_SYMLINK NfsErrorCode = 10029
	/* no saved filehandle     */
	ERROR_RESTOREFH NfsErrorCode = 10030
	/* some filesystem moved   */
	ERROR_LEASE_MOVED NfsErrorCode = 10031
	/* recommended attr not sup*/
	ERROR_ATTRNOTSUPP NfsErrorCode = 10032
	/* reclaim outside of grace*/
	ERROR_NO_GRACE NfsErrorCode = 10033
	/* reclaim error at server */
	ERROR_RECLAIM_BAD NfsErrorCode = 10034
	/* conflict on reclaim    */
	ERROR_RECLAIM_CONFLICT NfsErrorCode = 10035
	/* ZDR decode failed       */
	ERROR_BADZDR NfsErrorCode = 10036
	/* file locks held at CLOSE*/
	ERROR_LOCKS_HELD NfsErrorCode = 10037
	/* conflict in OPEN and I/O*/
	ERROR_OPENMODE NfsErrorCode = 10038
	/* owner translation bad   */
	ERROR_BADOWNER NfsErrorCode = 10039
	/* utf-8 char not supported*/
	ERROR_BADCHAR NfsErrorCode = 10040
	/* name not supported      */
	ERROR_BADNAME NfsErrorCode = 10041
	/* lock range not supported*/
	ERROR_BAD_RANGE NfsErrorCode = 10042
	/* no atomic up/downgrade  */
	ERROR_LOCK_NOTSUPP NfsErrorCode = 10043
	/* undefined operation     */
	ERROR_OP_ILLEGAL NfsErrorCode = 10044
	/* file locking deadlock   */
	ERROR_DEADLOCK NfsErrorCode = 10045
	/* open file blocks op.    */
	ERROR_FILE_OPEN NfsErrorCode = 10046
	/* lockowner state revoked */
	ERROR_ADMIN_REVOKED NfsErrorCode = 10047
)
