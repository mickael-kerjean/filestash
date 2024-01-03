/* This is based on RFC3530 */

/*
 * NFS v4 Definitions
 */


/*
 *  Copyright (C) The Internet Society (1998,1999,2000,2001,2002).
 *  All Rights Reserved.
 */

/*
 *      nfs4_prot.x
 *
 */

/*
 * Sizes
 */
const NFS4_FHSIZE               = 128;
const NFS4_VERIFIER_SIZE        = 8;
const NFS4_OPAQUE_LIMIT         = 1024;
const NFS4_SESSIONID_SIZE       = 16;
/*
 * File types
 */
enum nfs_ftype4 {
     NF4REG          = 1,    /* Regular File */
     NF4DIR          = 2,    /* Directory */
     NF4BLK          = 3,    /* Special File - block device */
     NF4CHR          = 4,    /* Special File - character device */
     NF4LNK          = 5,    /* Symbolic Link */
     NF4SOCK         = 6,    /* Special File - socket */
     NF4FIFO         = 7,    /* Special File - fifo */
     NF4ATTRDIR      = 8,    /* Attribute Directory */
     NF4NAMEDATTR    = 9     /* Named Attribute */
};

/*
 * Error status
 */
enum nfsstat4 {
     NFS4_OK                 = 0,    /* everything is okay      */
     NFS4ERR_PERM            = 1,    /* caller not privileged   */
     NFS4ERR_NOENT           = 2,    /* no such file/directory  */
     NFS4ERR_IO              = 5,    /* hard I/O error          */
     NFS4ERR_NXIO            = 6,    /* no such device          */
     NFS4ERR_ACCESS          = 13,   /* access denied           */
     NFS4ERR_EXIST           = 17,   /* file already exists     */
     NFS4ERR_XDEV            = 18,   /* different filesystems   */
     /* Unused/reserved        19 */
     NFS4ERR_NOTDIR          = 20,   /* should be a directory   */
     NFS4ERR_ISDIR           = 21,   /* should not be directory */
     NFS4ERR_INVAL           = 22,   /* invalid argument        */
     NFS4ERR_FBIG            = 27,   /* file exceeds server max */
     NFS4ERR_NOSPC           = 28,   /* no space on filesystem  */
     NFS4ERR_ROFS            = 30,   /* read-only filesystem    */
     NFS4ERR_MLINK           = 31,   /* too many hard links     */
     NFS4ERR_NAMETOOLONG     = 63,   /* name exceeds server max */
     NFS4ERR_NOTEMPTY        = 66,   /* directory not empty     */
     NFS4ERR_DQUOT           = 69,   /* hard quota limit reached*/
     NFS4ERR_STALE           = 70,   /* file no longer exists   */
     NFS4ERR_BADHANDLE       = 10001,/* Illegal filehandle      */
     NFS4ERR_BAD_COOKIE      = 10003,/* READDIR cookie is stale */
     NFS4ERR_NOTSUPP         = 10004,/* operation not supported */
     NFS4ERR_TOOSMALL        = 10005,/* response limit exceeded */
     NFS4ERR_SERVERFAULT     = 10006,/* undefined server error  */
     NFS4ERR_BADTYPE         = 10007,/* type invalid for CREATE */
     NFS4ERR_DELAY           = 10008,/* file "busy" - retry     */
     NFS4ERR_SAME            = 10009,/* nverify says attrs same */
     NFS4ERR_DENIED          = 10010,/* lock unavailable        */
     NFS4ERR_EXPIRED         = 10011,/* lock lease expired      */
     NFS4ERR_LOCKED          = 10012,/* I/O failed due to lock  */
     NFS4ERR_GRACE           = 10013,/* in grace period         */
     NFS4ERR_FHEXPIRED       = 10014,/* filehandle expired      */
     NFS4ERR_SHARE_DENIED    = 10015,/* share reserve denied    */
     NFS4ERR_WRONGSEC        = 10016,/* wrong security flavor   */
     NFS4ERR_CLID_INUSE      = 10017,/* clientid in use         */
     NFS4ERR_RESOURCE        = 10018,/* resource exhaustion     */
     NFS4ERR_MOVED           = 10019,/* filesystem relocated    */
     NFS4ERR_NOFILEHANDLE    = 10020,/* current FH is not set   */
     NFS4ERR_MINOR_VERS_MISMATCH = 10021,/* minor vers not supp */
     NFS4ERR_STALE_CLIENTID  = 10022,/* server has rebooted     */
     NFS4ERR_STALE_STATEID   = 10023,/* server has rebooted     */
     NFS4ERR_OLD_STATEID     = 10024,/* state is out of sync    */
     NFS4ERR_BAD_STATEID     = 10025,/* incorrect stateid       */
     NFS4ERR_BAD_SEQID       = 10026,/* request is out of seq.  */
     NFS4ERR_NOT_SAME        = 10027,/* verify - attrs not same */
     NFS4ERR_LOCK_RANGE      = 10028,/* lock range not supported*/
     NFS4ERR_SYMLINK         = 10029,/* should be file/directory*/
     NFS4ERR_RESTOREFH       = 10030,/* no saved filehandle     */
     NFS4ERR_LEASE_MOVED     = 10031,/* some filesystem moved   */
     NFS4ERR_ATTRNOTSUPP     = 10032,/* recommended attr not sup*/
     NFS4ERR_NO_GRACE        = 10033,/* reclaim outside of grace*/
     NFS4ERR_RECLAIM_BAD     = 10034,/* reclaim error at server */
     NFS4ERR_RECLAIM_CONFLICT = 10035,/* conflict on reclaim    */
     NFS4ERR_BADXDR          = 10036,/* XDR decode failed       */
     NFS4ERR_LOCKS_HELD      = 10037,/* file locks held at CLOSE*/
     NFS4ERR_OPENMODE        = 10038,/* conflict in OPEN and I/O*/
     NFS4ERR_BADOWNER        = 10039,/* owner translation bad   */
     NFS4ERR_BADCHAR         = 10040,/* utf-8 char not supported*/
     NFS4ERR_BADNAME         = 10041,/* name not supported      */
     NFS4ERR_BAD_RANGE       = 10042,/* lock range not supported*/
     NFS4ERR_LOCK_NOTSUPP    = 10043,/* no atomic up/downgrade  */
     NFS4ERR_OP_ILLEGAL      = 10044,/* undefined operation     */
     NFS4ERR_DEADLOCK        = 10045,/* file locking deadlock   */
     NFS4ERR_FILE_OPEN       = 10046,/* open file blocks op.    */
     NFS4ERR_ADMIN_REVOKED   = 10047,/* lockowner state revoked */
     NFS4ERR_CB_PATH_DOWN    = 10048,/* callback path down      */
     NFS4ERR_BADIOMODE       = 10049,
     NFS4ERR_BADLAYOUT       = 10050,
     NFS4ERR_BAD_SESSION_DIGEST = 10051,
     NFS4ERR_BADSESSION      = 10052,
     NFS4ERR_BADSLOT         = 10053,
     NFS4ERR_COMPLETE_ALREADY = 10054,
     NFS4ERR_CONN_NOT_BOUND_TO_SESSION = 10055,
     NFS4ERR_DELEG_ALREADY_WANTED = 10056,
     NFS4ERR_BACK_CHAN_BUSY  = 10057,
     NFS4ERR_LAYOUTTRYLATER  = 10058,
     NFS4ERR_LAYOUTUNAVAILABLE = 10059,
     NFS4ERR_NOMATCHING_LAYOUT = 10060,
     NFS4ERR_RECALLCONFLICT  = 10061
};

/*
 * Basic data types
 */
typedef uint32_t        bitmap4<>;
typedef uint64_t        offset4;
typedef uint32_t        count4;
typedef uint64_t        length4;
typedef uint64_t        clientid4;
typedef uint32_t	sequenceid4;
typedef uint32_t        seqid4;
typedef uint32_t        slotid4;
typedef opaque          utf8string<>;
typedef utf8string      utf8str_cis;
typedef utf8string      utf8str_cs;
typedef utf8string      utf8str_mixed;
typedef utf8str_cs      component4;
typedef component4      pathname4<>;
typedef uint64_t        nfs_lockid4;
typedef uint64_t        nfs_cookie4;
typedef utf8str_cs      linktext4;
typedef opaque          sec_oid4<>;
typedef uint32_t        qop4;
typedef uint32_t        mode4;
typedef uint64_t        changeid4;
typedef opaque          verifier4[NFS4_VERIFIER_SIZE];
typedef opaque          sessionid4[NFS4_SESSIONID_SIZE];
/*
 * Authsys_parms
 */
struct authsys_parms {
     unsigned int stamp;
     string machinename<255>;
     unsigned int uid;
     unsigned int gid;
     unsigned int gids<16>;
};

const NFS4_DEVICEID4_SIZE = 16;

typedef opaque  deviceid4[NFS4_DEVICEID4_SIZE];

enum layouttype4 {
       LAYOUT4_NFSV4_1_FILES   = 0x1,
       LAYOUT4_OSD2_OBJECTS    = 0x2,
       LAYOUT4_BLOCK_VOLUME    = 0x3
};

struct layoutupdate4 {
       layouttype4             lou_type;
       opaque                  lou_body<>;
};


struct device_addr4 {
       layouttype4             da_layout_type;
       opaque                  da_addr_body<>;
};

/*
 * Timeval
 */
struct nfstime4 {
     int64_t         seconds;
     uint32_t        nseconds;
};

enum time_how4 {
     SET_TO_SERVER_TIME4 = 0,
     SET_TO_CLIENT_TIME4 = 1
};

enum layoutiomode4 {
       LAYOUTIOMODE4_READ      = 1,
       LAYOUTIOMODE4_RW        = 2,
       LAYOUTIOMODE4_ANY       = 3
};

struct layout_content4 {
       layouttype4 loc_type;
       opaque      loc_body<>;
};

struct layout4 {
       offset4                 lo_offset;
       length4                 lo_length;
       layoutiomode4           lo_iomode;
       layout_content4         lo_content;
};

union settime4 switch (time_how4 set_it) {
   case SET_TO_CLIENT_TIME4:
        nfstime4 time;
   default:
        void;
};

/*
 * File access handle
 */
typedef opaque  nfs_fh4<NFS4_FHSIZE>;

/*
 * File attribute definitions
 */

/*
 * FSID structure for major/minor
 */
struct fsid4 {
     uint64_t        major;
     uint64_t        minor;
};

/*
 * Filesystem locations attribute for relocation/migration
 */
struct fs_location4 {
     utf8str_cis     server<>;
     pathname4       rootpath;
};

struct fs_locations4 {
     pathname4       fs_root;
     fs_location4    locations<>;
};

/*
 * Various Access Control Entry definitions
 */

/*
 * Mask that indicates which Access Control Entries are supported.
 * Values for the fattr4_aclsupport attribute.
 */
const ACL4_SUPPORT_ALLOW_ACL    = 0x00000001;
const ACL4_SUPPORT_DENY_ACL     = 0x00000002;
const ACL4_SUPPORT_AUDIT_ACL    = 0x00000004;
const ACL4_SUPPORT_ALARM_ACL    = 0x00000008;


typedef uint32_t        acetype4;
/*
 * acetype4 values, others can be added as needed.
 */
const ACE4_ACCESS_ALLOWED_ACE_TYPE      = 0x00000000;
const ACE4_ACCESS_DENIED_ACE_TYPE       = 0x00000001;
const ACE4_SYSTEM_AUDIT_ACE_TYPE        = 0x00000002;
const ACE4_SYSTEM_ALARM_ACE_TYPE        = 0x00000003;


/*
 * ACE flag
 */
typedef uint32_t aceflag4;

/*
 * ACE flag values
 */
const ACE4_FILE_INHERIT_ACE             = 0x00000001;
const ACE4_DIRECTORY_INHERIT_ACE        = 0x00000002;
const ACE4_NO_PROPAGATE_INHERIT_ACE     = 0x00000004;
const ACE4_INHERIT_ONLY_ACE             = 0x00000008;
const ACE4_SUCCESSFUL_ACCESS_ACE_FLAG   = 0x00000010;
const ACE4_FAILED_ACCESS_ACE_FLAG       = 0x00000020;
const ACE4_IDENTIFIER_GROUP             = 0x00000040;


/*
 * ACE mask
 */
typedef uint32_t        acemask4;

/*
 * ACE mask values
 */
const ACE4_READ_DATA            = 0x00000001;
const ACE4_LIST_DIRECTORY       = 0x00000001;
const ACE4_WRITE_DATA           = 0x00000002;
const ACE4_ADD_FILE             = 0x00000002;
const ACE4_APPEND_DATA          = 0x00000004;
const ACE4_ADD_SUBDIRECTORY     = 0x00000004;
const ACE4_READ_NAMED_ATTRS     = 0x00000008;
const ACE4_WRITE_NAMED_ATTRS    = 0x00000010;
const ACE4_EXECUTE              = 0x00000020;
const ACE4_DELETE_CHILD         = 0x00000040;
const ACE4_READ_ATTRIBUTES      = 0x00000080;
const ACE4_WRITE_ATTRIBUTES     = 0x00000100;
const ACE4_DELETE               = 0x00010000;
const ACE4_READ_ACL             = 0x00020000;
const ACE4_WRITE_ACL            = 0x00040000;
const ACE4_WRITE_OWNER          = 0x00080000;
const ACE4_SYNCHRONIZE          = 0x00100000;

/*
 * ACE4_GENERIC_READ -- defined as combination of
 *      ACE4_READ_ACL |
 *      ACE4_READ_DATA |
 *      ACE4_READ_ATTRIBUTES |
 *      ACE4_SYNCHRONIZE
 */
const ACE4_GENERIC_READ = 0x00120081;

/*
 * ACE4_GENERIC_WRITE -- defined as combination of
 *      ACE4_READ_ACL |
 *      ACE4_WRITE_DATA |
 *      ACE4_WRITE_ATTRIBUTES |
 *      ACE4_WRITE_ACL |
 *      ACE4_APPEND_DATA |
 *      ACE4_SYNCHRONIZE
 */
const ACE4_GENERIC_WRITE = 0x00160106;

/*
 * ACE4_GENERIC_EXECUTE -- defined as combination of
 *      ACE4_READ_ACL
 *      ACE4_READ_ATTRIBUTES
 *      ACE4_EXECUTE
 *      ACE4_SYNCHRONIZE
 */
const ACE4_GENERIC_EXECUTE = 0x001200A0;


/*
 * Access Control Entry definition
 */
struct nfsace4 {
     acetype4        type;
     aceflag4        flag;
     acemask4        access_mask;
     utf8str_mixed   who;
};

/*
 * Field definitions for the fattr4_mode attribute
 */
const MODE4_SUID = 0x800;  /* set user id on execution */
const MODE4_SGID = 0x400;  /* set group id on execution */
const MODE4_SVTX = 0x200;  /* save text even after use */
const MODE4_RUSR = 0x100;  /* read permission: owner */
const MODE4_WUSR = 0x080;  /* write permission: owner */
const MODE4_XUSR = 0x040;  /* execute permission: owner */
const MODE4_RGRP = 0x020;  /* read permission: group */
const MODE4_WGRP = 0x010;  /* write permission: group */
const MODE4_XGRP = 0x008;  /* execute permission: group */
const MODE4_ROTH = 0x004;  /* read permission: other */
const MODE4_WOTH = 0x002;  /* write permission: other */
const MODE4_XOTH = 0x001;  /* execute permission: other */

/*
 * Special data/attribute associated with
 * file types NF4BLK and NF4CHR.
 */
struct specdata4 {
     uint32_t        specdata1;      /* major device number */
     uint32_t        specdata2;      /* minor device number */
};

/*
 * Values for fattr4_fh_expire_type
 */
const   FH4_PERSISTENT          = 0x00000000;
const   FH4_NOEXPIRE_WITH_OPEN  = 0x00000001;
const   FH4_VOLATILE_ANY        = 0x00000002;
const   FH4_VOL_MIGRATION       = 0x00000004;
const   FH4_VOL_RENAME          = 0x00000008;


typedef bitmap4         fattr4_supported_attrs;
typedef nfs_ftype4      fattr4_type;
typedef uint32_t        fattr4_fh_expire_type;
typedef changeid4       fattr4_change;
typedef uint64_t        fattr4_size;
typedef bool            fattr4_link_support;
typedef bool            fattr4_symlink_support;
typedef bool            fattr4_named_attr;
typedef fsid4           fattr4_fsid;
typedef bool            fattr4_unique_handles;
typedef uint32_t        fattr4_lease_time;
typedef nfsstat4        fattr4_rdattr_error;
typedef nfsace4         fattr4_acl<>;
typedef uint32_t        fattr4_aclsupport;
typedef bool            fattr4_archive;
typedef bool            fattr4_cansettime;
typedef bool            fattr4_case_insensitive;
typedef bool            fattr4_case_preserving;
typedef bool            fattr4_chown_restricted;
typedef uint64_t        fattr4_fileid;
typedef uint64_t        fattr4_files_avail;
typedef nfs_fh4         fattr4_filehandle;
typedef uint64_t        fattr4_files_free;
typedef uint64_t        fattr4_files_total;
typedef fs_locations4   fattr4_fs_locations;
typedef bool            fattr4_hidden;
typedef bool            fattr4_homogeneous;
typedef uint64_t        fattr4_maxfilesize;
typedef uint32_t        fattr4_maxlink;
typedef uint32_t        fattr4_maxname;
typedef uint64_t        fattr4_maxread;
typedef uint64_t        fattr4_maxwrite;
typedef utf8str_cs      fattr4_mimetype;
typedef mode4           fattr4_mode;
typedef uint64_t        fattr4_mounted_on_fileid;
typedef bool            fattr4_no_trunc;
typedef uint32_t        fattr4_numlinks;
typedef utf8str_mixed   fattr4_owner;
typedef utf8str_mixed   fattr4_owner_group;
typedef uint64_t        fattr4_quota_avail_hard;
typedef uint64_t        fattr4_quota_avail_soft;
typedef uint64_t        fattr4_quota_used;
typedef specdata4       fattr4_rawdev;
typedef uint64_t        fattr4_space_avail;
typedef uint64_t        fattr4_space_free;
typedef uint64_t        fattr4_space_total;
typedef uint64_t        fattr4_space_used;
typedef bool            fattr4_system;
typedef nfstime4        fattr4_time_access;
typedef settime4        fattr4_time_access_set;
typedef nfstime4        fattr4_time_backup;
typedef nfstime4        fattr4_time_create;
typedef nfstime4        fattr4_time_delta;
typedef nfstime4        fattr4_time_metadata;
typedef nfstime4        fattr4_time_modify;
typedef settime4        fattr4_time_modify_set;


/*
 * Mandatory Attributes
 */
const FATTR4_SUPPORTED_ATTRS    = 0;
const FATTR4_TYPE               = 1;
const FATTR4_FH_EXPIRE_TYPE     = 2;
const FATTR4_CHANGE             = 3;
const FATTR4_SIZE               = 4;
const FATTR4_LINK_SUPPORT       = 5;
const FATTR4_SYMLINK_SUPPORT    = 6;
const FATTR4_NAMED_ATTR         = 7;
const FATTR4_FSID               = 8;
const FATTR4_UNIQUE_HANDLES     = 9;
const FATTR4_LEASE_TIME         = 10;
const FATTR4_RDATTR_ERROR       = 11;
const FATTR4_FILEHANDLE         = 19;

/*
 * Recommended Attributes
 */
const FATTR4_ACL                = 12;
const FATTR4_ACLSUPPORT         = 13;
const FATTR4_ARCHIVE            = 14;
const FATTR4_CANSETTIME         = 15;
const FATTR4_CASE_INSENSITIVE   = 16;
const FATTR4_CASE_PRESERVING    = 17;
const FATTR4_CHOWN_RESTRICTED   = 18;
const FATTR4_FILEID             = 20;
const FATTR4_FILES_AVAIL        = 21;
const FATTR4_FILES_FREE         = 22;
const FATTR4_FILES_TOTAL        = 23;
const FATTR4_FS_LOCATIONS       = 24;
const FATTR4_HIDDEN             = 25;
const FATTR4_HOMOGENEOUS        = 26;
const FATTR4_MAXFILESIZE        = 27;
const FATTR4_MAXLINK            = 28;
const FATTR4_MAXNAME            = 29;
const FATTR4_MAXREAD            = 30;
const FATTR4_MAXWRITE           = 31;
const FATTR4_MIMETYPE           = 32;
const FATTR4_MODE               = 33;
const FATTR4_NO_TRUNC           = 34;
const FATTR4_NUMLINKS           = 35;
const FATTR4_OWNER              = 36;
const FATTR4_OWNER_GROUP        = 37;
const FATTR4_QUOTA_AVAIL_HARD   = 38;
const FATTR4_QUOTA_AVAIL_SOFT   = 39;
const FATTR4_QUOTA_USED         = 40;
const FATTR4_RAWDEV             = 41;
const FATTR4_SPACE_AVAIL        = 42;
const FATTR4_SPACE_FREE         = 43;
const FATTR4_SPACE_TOTAL        = 44;
const FATTR4_SPACE_USED         = 45;
const FATTR4_SYSTEM             = 46;
const FATTR4_TIME_ACCESS        = 47;
const FATTR4_TIME_ACCESS_SET    = 48;
const FATTR4_TIME_BACKUP        = 49;
const FATTR4_TIME_CREATE        = 50;
const FATTR4_TIME_DELTA         = 51;
const FATTR4_TIME_METADATA      = 52;
const FATTR4_TIME_MODIFY        = 53;
const FATTR4_TIME_MODIFY_SET    = 54;
const FATTR4_MOUNTED_ON_FILEID  = 55;

typedef opaque  attrlist4<>;

/*
 * File attribute container
 */
struct fattr4 {
     bitmap4         attrmask;
     attrlist4       attr_vals;
};

/*
 * Change info for the client
 */
struct change_info4 {
     bool            atomic;
     changeid4       before;
     changeid4       after;
};

struct clientaddr4 {
        /* see struct rpcb in RFC 1833 */
        string r_netid<>;               /* network id */
        string r_addr<>;                /* universal address */
};

/*
 * Callback program info as provided by the client
 */
struct cb_client4 {
        uint32_t        cb_program;
        clientaddr4     cb_location;
};

/*
 * Stateid
 */
struct stateid4 {
        uint32_t        seqid;
        opaque          other[12];
};

/*
 * Client ID
 */
struct nfs_client_id4 {
        verifier4       verifier;
        opaque          id<NFS4_OPAQUE_LIMIT>;
};

struct open_owner4 {
        clientid4       clientid;
        opaque          owner<NFS4_OPAQUE_LIMIT>;
};

struct lock_owner4 {
        clientid4       clientid;
        opaque          owner<NFS4_OPAQUE_LIMIT>;
};

enum nfs_lock_type4 {
        READ_LT         = 1,
        WRITE_LT        = 2,
        READW_LT        = 3,    /* blocking read */
        WRITEW_LT       = 4     /* blocking write */
};

/*
 * ACCESS: Check access permission
 */
const ACCESS4_READ      = 0x00000001;
const ACCESS4_LOOKUP    = 0x00000002;
const ACCESS4_MODIFY    = 0x00000004;
const ACCESS4_EXTEND    = 0x00000008;
const ACCESS4_DELETE    = 0x00000010;
const ACCESS4_EXECUTE   = 0x00000020;

struct ACCESS4args {
        /* CURRENT_FH: object */
        uint32_t        access;
};

struct ACCESS4resok {
        uint32_t        supported;
        uint32_t        access;
};

union ACCESS4res switch (nfsstat4 status) {
 case NFS4_OK:
         ACCESS4resok   resok4;
 default:
         void;
};

/*
 * CLOSE: Close a file and release share reservations
 */
struct CLOSE4args {
        /* CURRENT_FH: object */
        seqid4          seqid;
        stateid4        open_stateid;
};

union CLOSE4res switch (nfsstat4 status) {
 case NFS4_OK:
         stateid4       open_stateid;
 default:
         void;
};

/*
 * COMMIT: Commit cached data on server to stable storage
 */
struct COMMIT4args {
        /* CURRENT_FH: file */
        offset4         offset;
        count4          count;
};

struct COMMIT4resok {
        verifier4       writeverf;
};


union COMMIT4res switch (nfsstat4 status) {
 case NFS4_OK:
         COMMIT4resok   resok4;
 default:
         void;
};

/*
 * CREATE: Create a non-regular file
 */
union createtype4 switch (nfs_ftype4 type) {
 case NF4LNK:
         linktext4      linkdata;
 case NF4BLK:
 case NF4CHR:
         specdata4      devdata;
 case NF4SOCK:
 case NF4FIFO:
 case NF4DIR:
         void;
 default:
         void;          /* server should return NFS4ERR_BADTYPE */
};

struct CREATE4args {
        /* CURRENT_FH: directory for creation */
        createtype4     objtype;
        component4      objname;
        fattr4          createattrs;
};

struct CREATE4resok {
        change_info4    cinfo;
        bitmap4         attrset;        /* attributes set */
};

union CREATE4res switch (nfsstat4 status) {
 case NFS4_OK:
         CREATE4resok resok4;
 default:
         void;
};

/*
 * DELEGPURGE: Purge Delegations Awaiting Recovery
 */
struct DELEGPURGE4args {
        clientid4       clientid;
};

struct DELEGPURGE4res {
        nfsstat4        status;
};

/*
 * DELEGRETURN: Return a delegation
 */
struct DELEGRETURN4args {
        /* CURRENT_FH: delegated file */
        stateid4        deleg_stateid;
};

struct DELEGRETURN4res {
        nfsstat4        status;
};

/*
 * GETATTR: Get file attributes
 */
struct GETATTR4args {
        /* CURRENT_FH: directory or file */
        bitmap4         attr_request;
};

struct GETATTR4resok {
        fattr4          obj_attributes;
};

union GETATTR4res switch (nfsstat4 status) {
 case NFS4_OK:
         GETATTR4resok  resok4;
 default:
         void;
};

/*
 * GETFH: Get current filehandle
 */
struct GETFH4resok {
        nfs_fh4         object;
};

union GETFH4res switch (nfsstat4 status) {
 case NFS4_OK:
        GETFH4resok     resok4;
 default:
        void;
};

/*
 * LINK: Create link to an object
 */
struct LINK4args {
        /* SAVED_FH: source object */
        /* CURRENT_FH: target directory */
        component4      newname;
};

struct LINK4resok {
        change_info4    cinfo;
};

union LINK4res switch (nfsstat4 status) {
 case NFS4_OK:
         LINK4resok resok4;
 default:
         void;
};

/*
 * For LOCK, transition from open_owner to new lock_owner
 */
struct open_to_lock_owner4 {
        seqid4          open_seqid;
        stateid4        open_stateid;
        seqid4          lock_seqid;
        lock_owner4     lock_owner;
};

/*
 * For LOCK, existing lock_owner continues to request file locks
 */
struct exist_lock_owner4 {
        stateid4        lock_stateid;
        seqid4          lock_seqid;
};

union locker4 switch (bool new_lock_owner) {
 case TRUE:
        open_to_lock_owner4     open_owner;
 case FALSE:
        exist_lock_owner4       lock_owner;
};

/*
 * LOCK/LOCKT/LOCKU: Record lock management
 */
struct LOCK4args {
        /* CURRENT_FH: file */
        nfs_lock_type4  locktype;
        bool            reclaim;
        offset4         offset;
        length4         length;
        locker4         locker;
};

struct LOCK4denied {
        offset4         offset;
        length4         length;
        nfs_lock_type4  locktype;
        lock_owner4     owner;
};

struct LOCK4resok {
        stateid4        lock_stateid;
};

union LOCK4res switch (nfsstat4 status) {
 case NFS4_OK:
         LOCK4resok     resok4;
 case NFS4ERR_DENIED:
         LOCK4denied    denied;
 default:
         void;
};

struct LOCKT4args {
        /* CURRENT_FH: file */
        nfs_lock_type4  locktype;
        offset4         offset;
        length4         length;
        lock_owner4     owner;
};

union LOCKT4res switch (nfsstat4 status) {
 case NFS4ERR_DENIED:
         LOCK4denied    denied;
 case NFS4_OK:
         void;
 default:
         void;
};

struct LOCKU4args {
        /* CURRENT_FH: file */
        nfs_lock_type4  locktype;
        seqid4          seqid;
        stateid4        lock_stateid;
        offset4         offset;
        length4         length;
};

union LOCKU4res switch (nfsstat4 status) {
 case   NFS4_OK:
         stateid4       lock_stateid;
 default:
         void;
};

/*
 * LOOKUP: Lookup filename
 */
struct LOOKUP4args {
        /* CURRENT_FH: directory */
        component4      objname;
};

struct LOOKUP4res {
        /* CURRENT_FH: object */
        nfsstat4        status;
};

/*
 * LOOKUPP: Lookup parent directory
 */
struct LOOKUPP4res {
        /* CURRENT_FH: directory */
        nfsstat4        status;
};

/*
 * NVERIFY: Verify attributes different
 */
struct NVERIFY4args {
        /* CURRENT_FH: object */
        fattr4          obj_attributes;
};

struct NVERIFY4res {
        nfsstat4        status;
};

/*
 * Various definitions for OPEN
 */
enum createmode4 {
        UNCHECKED4      = 0,
        GUARDED4        = 1,
        EXCLUSIVE4      = 2
};

union createhow4 switch (createmode4 mode) {
 case UNCHECKED4:
 case GUARDED4:
         fattr4         createattrs;
 case EXCLUSIVE4:
         verifier4      createverf;
};

enum opentype4 {
        OPEN4_NOCREATE  = 0,
        OPEN4_CREATE    = 1
};

union openflag4 switch (opentype4 opentype) {
 case OPEN4_CREATE:
         createhow4     how;
 default:
         void;
};

/* Next definitions used for OPEN delegation */
enum limit_by4 {
        NFS_LIMIT_SIZE          = 1,
        NFS_LIMIT_BLOCKS        = 2
        /* others as needed */
};

struct nfs_modified_limit4 {
        uint32_t        num_blocks;
        uint32_t        bytes_per_block;
};

union nfs_space_limit4 switch (limit_by4 limitby) {
 /* limit specified as file size */
 case NFS_LIMIT_SIZE:
         uint64_t               filesize;
 /* limit specified by number of blocks */
 case NFS_LIMIT_BLOCKS:
         nfs_modified_limit4    mod_blocks;
} ;

/*
 * Share Access and Deny constants for open argument
 */
const OPEN4_SHARE_ACCESS_READ   = 0x00000001;
const OPEN4_SHARE_ACCESS_WRITE  = 0x00000002;
const OPEN4_SHARE_ACCESS_BOTH   = 0x00000003;

const OPEN4_SHARE_DENY_NONE     = 0x00000000;
const OPEN4_SHARE_DENY_READ     = 0x00000001;
const OPEN4_SHARE_DENY_WRITE    = 0x00000002;
const OPEN4_SHARE_DENY_BOTH     = 0x00000003;

enum open_delegation_type4 {
        OPEN_DELEGATE_NONE      = 0,
        OPEN_DELEGATE_READ      = 1,
        OPEN_DELEGATE_WRITE     = 2
};

enum open_claim_type4 {
        CLAIM_NULL              = 0,
        CLAIM_PREVIOUS          = 1,
        CLAIM_DELEGATE_CUR      = 2,
        CLAIM_DELEGATE_PREV     = 3,
        CLAIM_FH                = 4, /* new to v4.1 */
        CLAIM_DELEG_CUR_FH      = 5, /* new to v4.1 */
        CLAIM_DELEG_PREV_FH     = 6 /* new to v4.1 */
};

struct open_claim_delegate_cur4 {
        stateid4        delegate_stateid;
        component4      file;
};

union open_claim4 switch (open_claim_type4 claim) {
 /*
  * No special rights to file. Ordinary OPEN of the specified file.
  */
 case CLAIM_NULL:
        /* CURRENT_FH: directory */
        component4      file;

 /*
  * Right to the file established by an open previous to server
  * reboot.  File identified by filehandle obtained at that time
  * rather than by name.
  */
 case CLAIM_PREVIOUS:
        /* CURRENT_FH: file being reclaimed */
        open_delegation_type4   delegate_type;

 /*
  * Right to file based on a delegation granted by the server.
  * File is specified by name.
  */
 case CLAIM_DELEGATE_CUR:
        /* CURRENT_FH: directory */
        open_claim_delegate_cur4        delegate_cur_info;

 /* Right to file based on a delegation granted to a previous boot
  * instance of the client.  File is specified by name.
  */
 case CLAIM_DELEGATE_PREV:
         /* CURRENT_FH: directory */
        component4      file_delegate_prev;
};

/*
 * OPEN: Open a file, potentially receiving an open delegation
 */
struct OPEN4args {
        seqid4          seqid;
        uint32_t        share_access;
        uint32_t        share_deny;
        open_owner4     owner;
        openflag4       openhow;
        open_claim4     claim;
};

struct open_read_delegation4 {
        stateid4        stateid;        /* Stateid for delegation*/
        bool            recall;         /* Pre-recalled flag for
                                           delegations obtained
                                           by reclaim
                                           (CLAIM_PREVIOUS) */
        nfsace4         permissions;    /* Defines users who don't
                                           need an ACCESS call to
                                           open for read */
};

struct open_write_delegation4 {
        stateid4        stateid;        /* Stateid for delegation */
        bool            recall;         /* Pre-recalled flag for
                                           delegations obtained
                                           by reclaim
                                           (CLAIM_PREVIOUS) */
        nfs_space_limit4 space_limit;   /* Defines condition that
                                           the client must check to
                                           determine whether the
                                           file needs to be flushed
                                           to the server on close.
                                           */
        nfsace4         permissions;    /* Defines users who don't
                                           need an ACCESS call as
                                           part of a delegated
                                           open. */
};

union open_delegation4
switch (open_delegation_type4 delegation_type) {
        case OPEN_DELEGATE_NONE:
                void;
        case OPEN_DELEGATE_READ:
                open_read_delegation4 read;
        case OPEN_DELEGATE_WRITE:
                open_write_delegation4 write;
};
/*
 * Result flags
 */
/* Client must confirm open */
const OPEN4_RESULT_CONFIRM      = 0x00000002;
/* Type of file locking behavior at the server */
const OPEN4_RESULT_LOCKTYPE_POSIX = 0x00000004;

struct OPEN4resok {
        stateid4        stateid;        /* Stateid for open */
        change_info4    cinfo;          /* Directory Change Info */
        uint32_t        rflags;         /* Result flags */
        bitmap4         attrset;        /* attribute set for create*/
        open_delegation4 delegation;    /* Info on any open
                                           delegation */
};

union OPEN4res switch (nfsstat4 status) {
 case NFS4_OK:
        /* CURRENT_FH: opened file */
        OPEN4resok      resok4;
 default:
        void;
};

/*
 * OPENATTR: open named attributes directory
 */
struct OPENATTR4args {
        /* CURRENT_FH: object */
        bool    createdir;
};

struct OPENATTR4res {
        /* CURRENT_FH: named attr directory */
        nfsstat4        status;
};

/*
 * OPEN_CONFIRM: confirm the open
 */
struct OPEN_CONFIRM4args {
        /* CURRENT_FH: opened file */
        stateid4        open_stateid;
        seqid4          seqid;
};

struct OPEN_CONFIRM4resok {
        stateid4        open_stateid;
};

union OPEN_CONFIRM4res switch (nfsstat4 status) {
    case NFS4_OK:
            OPEN_CONFIRM4resok     resok4;
 default:
         void;
};

/*
 * OPEN_DOWNGRADE: downgrade the access/deny for a file
 */
struct OPEN_DOWNGRADE4args {
        /* CURRENT_FH: opened file */
        stateid4        open_stateid;
        seqid4          seqid;
        uint32_t        share_access;
        uint32_t        share_deny;
};

struct OPEN_DOWNGRADE4resok {
        stateid4        open_stateid;
};

union OPEN_DOWNGRADE4res switch(nfsstat4 status) {
 case NFS4_OK:
        OPEN_DOWNGRADE4resok    resok4;
 default:
         void;
};

/*
 * PUTFH: Set current filehandle
 */
struct PUTFH4args {
        nfs_fh4         object;
};

struct PUTFH4res {
        /* CURRENT_FH: */
        nfsstat4        status;
};

/*
 * PUTPUBFH: Set public filehandle
 */
struct PUTPUBFH4res {
        /* CURRENT_FH: public fh */
        nfsstat4        status;
};

/*
 * PUTROOTFH: Set root filehandle
 */
struct PUTROOTFH4res {

        /* CURRENT_FH: root fh */
        nfsstat4        status;
};

/*
 * READ: Read from file
 */
struct READ4args {
        /* CURRENT_FH: file */
        stateid4        stateid;
        offset4         offset;
        count4          count;
};

struct READ4resok {
        bool            eof;
        opaque          data<>;
};

union READ4res switch (nfsstat4 status) {
 case NFS4_OK:
         READ4resok     resok4;
 default:
         void;
};

/*
 * READDIR: Read directory
 */
struct READDIR4args {
        /* CURRENT_FH: directory */
        nfs_cookie4     cookie;
        verifier4       cookieverf;
        count4          dircount;
        count4          maxcount;
        bitmap4         attr_request;
};

struct entry4 {
        nfs_cookie4     cookie;
        component4      name;
        fattr4          attrs;
        entry4          *nextentry;
};

struct dirlist4 {
        entry4          *entries;
        bool            eof;
};

struct READDIR4resok {
        verifier4       cookieverf;
        dirlist4        reply;
};


union READDIR4res switch (nfsstat4 status) {
 case NFS4_OK:
         READDIR4resok  resok4;
 default:
         void;
};


/*
 * READLINK: Read symbolic link
 */
struct READLINK4resok {
        linktext4       link;
};

union READLINK4res switch (nfsstat4 status) {
 case NFS4_OK:
         READLINK4resok resok4;
 default:
         void;
};

/*
 * REMOVE: Remove filesystem object
 */
struct REMOVE4args {
        /* CURRENT_FH: directory */
        component4      target;
};

struct REMOVE4resok {
        change_info4    cinfo;
};

union REMOVE4res switch (nfsstat4 status) {
 case NFS4_OK:
         REMOVE4resok   resok4;
 default:
         void;
};

/*
 * RENAME: Rename directory entry
 */
struct RENAME4args {
        /* SAVED_FH: source directory */
        component4      oldname;
        /* CURRENT_FH: target directory */

        component4      newname;
};

struct RENAME4resok {
        change_info4    source_cinfo;
        change_info4    target_cinfo;
};

union RENAME4res switch (nfsstat4 status) {
 case NFS4_OK:
        RENAME4resok    resok4;
 default:
        void;
};

/*
 * RENEW: Renew a Lease
 */
struct RENEW4args {
        clientid4       clientid;
};

struct RENEW4res {
        nfsstat4        status;
};

/*
 * RESTOREFH: Restore saved filehandle
 */

struct RESTOREFH4res {
        /* CURRENT_FH: value of saved fh */
        nfsstat4        status;
};

/*
 * SAVEFH: Save current filehandle
 */
struct SAVEFH4res {
        /* SAVED_FH: value of current fh */
        nfsstat4        status;
};

/*
 * SECINFO: Obtain Available Security Mechanisms
 */
struct SECINFO4args {
        component4      name;
};

enum rpc_gss_svc_t {
        RPC_GSS_SVC_NONE        = 1,
        RPC_GSS_SVC_INTEGRITY   = 2,
        RPC_GSS_SVC_PRIVACY     = 3
};

struct rpcsec_gss_info {
        sec_oid4        oid;
        qop4            qop;
        rpc_gss_svc_t   service;
};

const RPCSEC_GSS = 6;

union secinfo4 switch (uint32_t flavor) {
 case RPCSEC_GSS:
         rpcsec_gss_info        flavor_info;
 default:
         void;
};

typedef secinfo4 SECINFO4resok<>;

union SECINFO4res switch (nfsstat4 status) {
 case NFS4_OK:
         SECINFO4resok resok4;
 default:
         void;
};

/*
 * SETATTR: Set attributes
 */
struct SETATTR4args {
        /* CURRENT_FH: target object */
        stateid4        stateid;
        fattr4          obj_attributes;
};

struct SETATTR4res {
        nfsstat4        status;
        bitmap4         attrsset;
};

/*
 * SETCLIENTID
 */
struct SETCLIENTID4args {
        nfs_client_id4  client;
        cb_client4      callback;
        uint32_t        callback_ident;

};

struct SETCLIENTID4resok {
        clientid4       clientid;
        verifier4       setclientid_confirm;
};

union SETCLIENTID4res switch (nfsstat4 status) {
 case NFS4_OK:
         SETCLIENTID4resok      resok4;
 case NFS4ERR_CLID_INUSE:
         clientaddr4    client_using;
 default:
         void;
};

struct SETCLIENTID_CONFIRM4args {
        clientid4       clientid;
        verifier4       setclientid_confirm;
};

struct SETCLIENTID_CONFIRM4res {
        nfsstat4        status;
};

/*
 * VERIFY: Verify attributes same
 */
struct VERIFY4args {
        /* CURRENT_FH: object */
        fattr4          obj_attributes;
};

struct VERIFY4res {
        nfsstat4        status;
};

/*
 * WRITE: Write to file
 */
enum stable_how4 {
        UNSTABLE4       = 0,
        DATA_SYNC4      = 1,
        FILE_SYNC4      = 2
};

struct WRITE4args {
        /* CURRENT_FH: file */
        stateid4        stateid;
        offset4         offset;
        stable_how4     stable;
        opaque          data<>;
};

struct WRITE4resok {
        count4          count;
        stable_how4     committed;
        verifier4       writeverf;
};

union WRITE4res switch (nfsstat4 status) {
 case NFS4_OK:
         WRITE4resok    resok4;
 default:
         void;
};

/*
 * RELEASE_LOCKOWNER: Notify server to release lockowner
 */
struct RELEASE_LOCKOWNER4args {
        lock_owner4     lock_owner;
};

struct RELEASE_LOCKOWNER4res {
        nfsstat4        status;
};

/*
 * BACKCHANNEL_CTL
 */
/*
typedef opaque gsshandle4_t<>;

struct gss_cb_handles4 {
       rpc_gss_svc_t           gcbp_service; RFC 2203
       gsshandle4_t            gcbp_handle_from_server;
       gsshandle4_t            gcbp_handle_from_client;
};
*/

union callback_sec_parms4 switch (uint32_t cb_secflavor) {
case AUTH_NONE:
       void;
case AUTH_SYS:
       authsys_parms   cbsp_sys_cred; /* RFC 1831 */
/*
 * case RPCSEC_GSS:
 *     gss_cb_handles4 cbsp_gss_handles;
 */
};

/*
struct BACKCHANNEL_CTL4args {
       uint32_t                bca_cb_program;
       callback_sec_parms4     bca_sec_parms<>;
};
*/

/*
 * CREATE_SESSION
 */
struct channel_attrs4 {
       count4                  ca_headerpadsize;
       count4                  ca_maxrequestsize;
       count4                  ca_maxresponsesize;
       count4                  ca_maxresponsesize_cached;
       count4                  ca_maxoperations;
       count4                  ca_maxrequests;
       uint32_t                ca_rdma_ird<1>;
};

const CREATE_SESSION4_FLAG_PERSIST              = 0x00000001;
const CREATE_SESSION4_FLAG_CONN_BACK_CHAN       = 0x00000002;
const CREATE_SESSION4_FLAG_CONN_RDMA            = 0x00000004;

struct CREATE_SESSION4args {
       clientid4               csa_clientid;
       sequenceid4             csa_sequence;
       uint32_t                csa_flags;
       channel_attrs4          csa_fore_chan_attrs;
       channel_attrs4          csa_back_chan_attrs;
       uint32_t                csa_cb_program;
       callback_sec_parms4     csa_sec_parms<>;
};

struct CREATE_SESSION4resok {
       sessionid4              csr_sessionid;
       sequenceid4             csr_sequence;
       uint32_t                csr_flags;
       channel_attrs4          csr_fore_chan_attrs;
       channel_attrs4          csr_back_chan_attrs;
};

union CREATE_SESSION4res switch (nfsstat4 csr_status) {
case NFS4_OK:
       CREATE_SESSION4resok    csr_resok4;
default:
       void;
};

/*
 * DESTROY_SESSION
 */
struct DESTROY_SESSION4args {
       sessionid4      dsa_sessionid;
};

struct DESTROY_SESSION4res {
       nfsstat4        dsr_status;
};

/*
 * FREE_STATEID
 */
struct FREE_STATEID4args {
       stateid4        fsa_stateid;
};

struct FREE_STATEID4res {
       nfsstat4        fsr_status;
};

/*
 * GET_DIR_DELEGATION
 */
typedef nfstime4 attr_notice4;

struct GET_DIR_DELEGATION4args {
       bool            gdda_signal_deleg_avail;
       bitmap4         gdda_notification_types;
       attr_notice4    gdda_child_attr_delay;
       attr_notice4    gdda_dir_attr_delay;
       bitmap4         gdda_child_attributes;
       bitmap4         gdda_dir_attributes;
};

struct GET_DIR_DELEGATION4resok {
       verifier4       gddr_cookieverf;
       stateid4        gddr_stateid;
       bitmap4         gddr_notification;
       bitmap4         gddr_child_attributes;
       bitmap4         gddr_dir_attributes;
};

enum gddrnf4_status {
       GDD4_OK         = 0,
       GDD4_UNAVAIL    = 1
};

union GET_DIR_DELEGATION4res_non_fatal switch (gddrnf4_status gddrnf_status) {
 case GDD4_OK:
     GET_DIR_DELEGATION4resok      gddrnf_resok4;
 case GDD4_UNAVAIL:
     bool                          gddrnf_will_signal_deleg_avail;
};

union GET_DIR_DELEGATION4res switch (nfsstat4 gddr_status) {
 case NFS4_OK:
     GET_DIR_DELEGATION4res_non_fatal      gddr_res_non_fatal4;
 default:
     void;
};

/*
 * GETDEVICEINFO
 */
struct GETDEVICEINFO4args {
       deviceid4       gdia_device_id;
       layouttype4     gdia_layout_type;
       count4          gdia_maxcount;
       bitmap4         gdia_notify_types;
};

struct GETDEVICEINFO4resok {
       device_addr4    gdir_device_addr;
       bitmap4         gdir_notification;
};

union GETDEVICEINFO4res switch (nfsstat4 gdir_status) {
case NFS4_OK:
       GETDEVICEINFO4resok     gdir_resok4;
case NFS4ERR_TOOSMALL:
       count4                  gdir_mincount;
default:
       void;
};

/*
 * GETDEVICELIST
 */
struct GETDEVICELIST4args {
        layouttype4     gdla_layout_type;
        count4          gdla_maxdevices;
        nfs_cookie4     gdla_cookie;
        verifier4       gdla_cookieverf;
};

struct GETDEVICELIST4resok {
       nfs_cookie4             gdlr_cookie;
       verifier4               gdlr_cookieverf;
       deviceid4               gdlr_deviceid_list<>;
       bool                    gdlr_eof;
};

union GETDEVICELIST4res switch (nfsstat4 gdlr_status) {
case NFS4_OK:
       GETDEVICELIST4resok     gdlr_resok4;
default:
       void;
};

/*
 * LAYOUTCOMMIT
 */
union newtime4 switch (bool nt_timechanged) {
case TRUE:
       nfstime4           nt_time;
case FALSE:
       void;
};

union newoffset4 switch (bool no_newoffset) {
case TRUE:
       offset4           no_offset;
case FALSE:
       void;
};

struct LAYOUTCOMMIT4args {
       offset4                 loca_offset;
       length4                 loca_length;
       bool                    loca_reclaim;
       stateid4                loca_stateid;
       newoffset4              loca_last_write_offset;
       newtime4                loca_time_modify;
       layoutupdate4           loca_layoutupdate;
};

union newsize4 switch (bool ns_sizechanged) {
case TRUE:
       length4         ns_size;
case FALSE:
       void;
};

struct LAYOUTCOMMIT4resok {
       newsize4                locr_newsize;
};

union LAYOUTCOMMIT4res switch (nfsstat4 locr_status) {
case NFS4_OK:
       LAYOUTCOMMIT4resok      locr_resok4;
default:
       void;
};

/*
 * LAYOUTGET
 */
struct LAYOUTGET4args {
       bool                    loga_signal_layout_avail;
       layouttype4             loga_layout_type;
       layoutiomode4           loga_iomode;
       offset4                 loga_offset;
       length4                 loga_length;
       length4                 loga_minlength;
       stateid4                loga_stateid;
       count4                  loga_maxcount;
};

struct LAYOUTGET4resok {
       bool               logr_return_on_close;
       stateid4           logr_stateid;
       layout4            logr_layout<>;
};

union LAYOUTGET4res switch (nfsstat4 logr_status) {
case NFS4_OK:
       LAYOUTGET4resok     logr_resok4;
case NFS4ERR_LAYOUTTRYLATER:
       bool                logr_will_signal_layout_avail;
default:
       void;
};

/*
 * LAYOUTRETURN
 */
const LAYOUT4_RET_REC_FILE      = 1;
const LAYOUT4_RET_REC_FSID      = 2;
const LAYOUT4_RET_REC_ALL       = 3;

enum layoutreturn_type4 {
       LAYOUTRETURN4_FILE = LAYOUT4_RET_REC_FILE,
       LAYOUTRETURN4_FSID = LAYOUT4_RET_REC_FSID,
       LAYOUTRETURN4_ALL  = LAYOUT4_RET_REC_ALL
};

struct layoutreturn_file4 {
       offset4         lrf_offset;
       length4         lrf_length;
       stateid4        lrf_stateid;
       opaque          lrf_body<>;
};

union layoutreturn4 switch(layoutreturn_type4 lr_returntype) {
       case LAYOUTRETURN4_FILE:
               layoutreturn_file4      lr_layout;
       default:
               void;
};

struct LAYOUTRETURN4args {
       bool                    lora_reclaim;
       layouttype4             lora_layout_type;
       layoutiomode4           lora_iomode;
       layoutreturn4           lora_layoutreturn;
};

union layoutreturn_stateid switch (bool lrs_present) {
case TRUE:
       stateid4                lrs_stateid;
case FALSE:
       void;
};

union LAYOUTRETURN4res switch (nfsstat4 lorr_status) {
case NFS4_OK:
       layoutreturn_stateid    lorr_stateid;
default:
       void;
};

/*
 * SECINFO_NO_NAME
 */
enum secinfo_style4 {
       SECINFO_STYLE4_CURRENT_FH       = 0,
       SECINFO_STYLE4_PARENT           = 1
};

typedef secinfo_style4 SECINFO_NO_NAME4args;

typedef SECINFO4res SECINFO_NO_NAME4res;

/*
 * SEQUENCE
 */
struct SEQUENCE4args {
       sessionid4     sa_sessionid;
       sequenceid4    sa_sequenceid;
       slotid4        sa_slotid;
       slotid4        sa_highest_slotid;
       bool           sa_cachethis;
};

const SEQ4_STATUS_CB_PATH_DOWN                  = 0x00000001;
const SEQ4_STATUS_CB_GSS_CONTEXTS_EXPIRING      = 0x00000002;
const SEQ4_STATUS_CB_GSS_CONTEXTS_EXPIRED       = 0x00000004;
const SEQ4_STATUS_EXPIRED_ALL_STATE_REVOKED     = 0x00000008;
const SEQ4_STATUS_EXPIRED_SOME_STATE_REVOKED    = 0x00000010;
const SEQ4_STATUS_ADMIN_STATE_REVOKED           = 0x00000020;
const SEQ4_STATUS_RECALLABLE_STATE_REVOKED      = 0x00000040;
const SEQ4_STATUS_LEASE_MOVED                   = 0x00000080;
const SEQ4_STATUS_RESTART_RECLAIM_NEEDED        = 0x00000100;
const SEQ4_STATUS_CB_PATH_DOWN_SESSION          = 0x00000200;
const SEQ4_STATUS_BACKCHANNEL_FAULT             = 0x00000400;
const SEQ4_STATUS_DEVID_CHANGED                 = 0x00000800;
const SEQ4_STATUS_DEVID_DELETED                 = 0x00001000;

struct SEQUENCE4resok {
       sessionid4      sr_sessionid;
       sequenceid4     sr_sequenceid;
       slotid4         sr_slotid;
       slotid4         sr_highest_slotid;
       slotid4         sr_target_highest_slotid;
       uint32_t        sr_status_flags;
};

union SEQUENCE4res switch (nfsstat4 sr_status) {
case NFS4_OK:
       SEQUENCE4resok  sr_resok4;
default:
       void;
};

/*
 * SET_SSV
 */
struct ssa_digest_input4 {
       SEQUENCE4args sdi_seqargs;
};

struct SET_SSV4args {
       opaque          ssa_ssv<>;
       opaque          ssa_digest<>;
};

struct ssr_digest_input4 {
       SEQUENCE4res sdi_seqres;
};

struct SET_SSV4resok {
       opaque          ssr_digest<>;
};

union SET_SSV4res switch (nfsstat4 ssr_status) {
case NFS4_OK:
       SET_SSV4resok   ssr_resok4;
default:
       void;
};

/*
 * TEST_STATEID
 */
struct TEST_STATEID4args {
       stateid4        ts_stateids<>;
};

struct TEST_STATEID4resok {
       nfsstat4        tsr_status_codes<>;
};

union TEST_STATEID4res switch (nfsstat4 tsr_status) {
   case NFS4_OK:
       TEST_STATEID4resok tsr_resok4;
   default:
       void;
};

/*
 * WANT_DELEGATION
 */
union deleg_claim4 switch (open_claim_type4 dc_claim) {
case CLAIM_FH:
       void;
case CLAIM_DELEG_PREV_FH:
       void;
case CLAIM_PREVIOUS:
       open_delegation_type4   dc_delegate_type;
};

struct WANT_DELEGATION4args {
       uint32_t        wda_want;
       deleg_claim4    wda_claim;
};

union WANT_DELEGATION4res switch (nfsstat4 wdr_status) {
case NFS4_OK:
       open_delegation4 wdr_resok4;
default:
       void;
};

/*
 * DESTROY_CLIENTID
 */
struct DESTROY_CLIENTID4args {
       clientid4       dca_clientid;
};

struct DESTROY_CLIENTID4res {
       nfsstat4        dcr_status;
};

/*
 * RECLAIM_COMPLETE
 */
struct RECLAIM_COMPLETE4args {
       bool            rca_one_fs;
};

struct RECLAIM_COMPLETE4res {
       nfsstat4        rcr_status;
};

/*
 * ILLEGAL: Response for illegal operation numbers
 */
struct ILLEGAL4res {
        nfsstat4        status;
};

/*
 * Operation arrays
 */

enum nfs_opnum4 {
        OP_ACCESS               = 3,
        OP_CLOSE                = 4,
        OP_COMMIT               = 5,
        OP_CREATE               = 6,
        OP_DELEGPURGE           = 7,
        OP_DELEGRETURN          = 8,
        OP_GETATTR              = 9,
        OP_GETFH                = 10,
        OP_LINK                 = 11,
        OP_LOCK                 = 12,
        OP_LOCKT                = 13,
        OP_LOCKU                = 14,
        OP_LOOKUP               = 15,
        OP_LOOKUPP              = 16,
        OP_NVERIFY              = 17,
        OP_OPEN                 = 18,
        OP_OPENATTR             = 19,
        OP_OPEN_CONFIRM         = 20,
        OP_OPEN_DOWNGRADE       = 21,
        OP_PUTFH                = 22,
        OP_PUTPUBFH             = 23,
        OP_PUTROOTFH            = 24,
        OP_READ                 = 25,
        OP_READDIR              = 26,
        OP_READLINK             = 27,
        OP_REMOVE               = 28,
        OP_RENAME               = 29,
        OP_RENEW                = 30,
        OP_RESTOREFH            = 31,
        OP_SAVEFH               = 32,
        OP_SECINFO              = 33,
        OP_SETATTR              = 34,
        OP_SETCLIENTID          = 35,
        OP_SETCLIENTID_CONFIRM  = 36,
        OP_VERIFY               = 37,
        OP_WRITE                = 38,
        OP_RELEASE_LOCKOWNER    = 39,
        OP_CREATE_SESSION       = 43,
        OP_DESTROY_SESSION      = 44,
        OP_FREE_STATEID         = 45,
        OP_GET_DIR_DELEGATION   = 46,
        OP_GETDEVICEINFO        = 47,
        OP_GETDEVICELIST        = 48,
        OP_LAYOUTCOMMIT         = 49,
        OP_LAYOUTGET            = 50,
        OP_LAYOUTRETURN         = 51,
        OP_SECINFO_NO_NAME      = 52,
        OP_SEQUENCE             = 53,
        OP_SET_SSV              = 54,
        OP_TEST_STATEID         = 55,
        OP_WANT_DELEGATION      = 56,
        OP_DESTROY_CLIENTID     = 57,
        OP_RECLAIM_COMPLETE     = 58,
        OP_ILLEGAL              = 10044
};

union nfs_argop4 switch (nfs_opnum4 argop) {
 case OP_ACCESS:        ACCESS4args opaccess;
 case OP_CLOSE:         CLOSE4args opclose;
 case OP_COMMIT:        COMMIT4args opcommit;
 case OP_CREATE:        CREATE4args opcreate;
 case OP_DELEGPURGE:    DELEGPURGE4args opdelegpurge;
 case OP_DELEGRETURN:   DELEGRETURN4args opdelegreturn;
 case OP_GETATTR:       GETATTR4args opgetattr;
 case OP_GETFH:         void;
 case OP_LINK:          LINK4args oplink;
 case OP_LOCK:          LOCK4args oplock;
 case OP_LOCKT:         LOCKT4args oplockt;
 case OP_LOCKU:         LOCKU4args oplocku;
 case OP_LOOKUP:        LOOKUP4args oplookup;
 case OP_LOOKUPP:       void;
 case OP_NVERIFY:       NVERIFY4args opnverify;
 case OP_OPEN:          OPEN4args opopen;
 case OP_OPENATTR:      OPENATTR4args opopenattr;
 case OP_OPEN_CONFIRM:  OPEN_CONFIRM4args opopen_confirm;
 case OP_OPEN_DOWNGRADE:        OPEN_DOWNGRADE4args opopen_downgrade;
 case OP_PUTFH:         PUTFH4args opputfh;
 case OP_PUTPUBFH:      void;
 case OP_PUTROOTFH:     void;
 case OP_READ:          READ4args opread;
 case OP_READDIR:       READDIR4args opreaddir;
 case OP_READLINK:      void;
 case OP_REMOVE:        REMOVE4args opremove;
 case OP_RENAME:        RENAME4args oprename;
 case OP_RENEW:         RENEW4args oprenew;
 case OP_RESTOREFH:     void;
 case OP_SAVEFH:        void;
 case OP_SECINFO:       SECINFO4args opsecinfo;
 case OP_SETATTR:       SETATTR4args opsetattr;
 case OP_SETCLIENTID:   SETCLIENTID4args opsetclientid;
 case OP_SETCLIENTID_CONFIRM:   SETCLIENTID_CONFIRM4args
                                        opsetclientid_confirm;
 case OP_VERIFY:        VERIFY4args opverify;
 case OP_WRITE:         WRITE4args opwrite;
 case OP_RELEASE_LOCKOWNER:     RELEASE_LOCKOWNER4args
                                    oprelease_lockowner;
 case OP_CREATE_SESSION:        CREATE_SESSION4args opcreatesession;
 case OP_DESTROY_SESSION:       DESTROY_SESSION4args opdestroysession;
 case OP_FREE_STATEID:          FREE_STATEID4args opfreestateid;
 case OP_GET_DIR_DELEGATION:    GET_DIR_DELEGATION4args opgetdirdelegation;
 case OP_GETDEVICEINFO:         GETDEVICEINFO4args opgetdeviceinfo;
 case OP_GETDEVICELIST:         GETDEVICELIST4args opgetdevicelist;
 case OP_LAYOUTCOMMIT:          LAYOUTCOMMIT4args oplayoutcommit;
 case OP_LAYOUTGET:             LAYOUTGET4args oplayoutget;
 case OP_LAYOUTRETURN:          LAYOUTRETURN4args oplayoutreturn;
 case OP_SECINFO_NO_NAME:       SECINFO_NO_NAME4args opsecinfononame;
 case OP_SEQUENCE:              SEQUENCE4args opsequence;
 case OP_SET_SSV:               SET_SSV4args opsetssv;
 case OP_TEST_STATEID:          TEST_STATEID4args opteststateid;
 case OP_WANT_DELEGATION:       WANT_DELEGATION4args opwantdelegation;
 case OP_DESTROY_CLIENTID:      DESTROY_CLIENTID4args opdestroyclientid;
 case OP_RECLAIM_COMPLETE:      RECLAIM_COMPLETE4args opreclaimcomplete;
 case OP_ILLEGAL:       void;
};

union nfs_resop4 switch (nfs_opnum4 resop){
 case OP_ACCESS:        ACCESS4res opaccess;
 case OP_CLOSE:         CLOSE4res opclose;
 case OP_COMMIT:        COMMIT4res opcommit;
 case OP_CREATE:        CREATE4res opcreate;
 case OP_DELEGPURGE:    DELEGPURGE4res opdelegpurge;
 case OP_DELEGRETURN:   DELEGRETURN4res opdelegreturn;
 case OP_GETATTR:       GETATTR4res opgetattr;
 case OP_GETFH:         GETFH4res opgetfh;
 case OP_LINK:          LINK4res oplink;
 case OP_LOCK:          LOCK4res oplock;
 case OP_LOCKT:         LOCKT4res oplockt;
 case OP_LOCKU:         LOCKU4res oplocku;
 case OP_LOOKUP:        LOOKUP4res oplookup;
 case OP_LOOKUPP:       LOOKUPP4res oplookupp;
 case OP_NVERIFY:       NVERIFY4res opnverify;
 case OP_OPEN:          OPEN4res opopen;
 case OP_OPENATTR:      OPENATTR4res opopenattr;
 case OP_OPEN_CONFIRM:  OPEN_CONFIRM4res opopen_confirm;
 case OP_OPEN_DOWNGRADE:        OPEN_DOWNGRADE4res opopen_downgrade;
 case OP_PUTFH:         PUTFH4res opputfh;
 case OP_PUTPUBFH:      PUTPUBFH4res opputpubfh;
 case OP_PUTROOTFH:     PUTROOTFH4res opputrootfh;
 case OP_READ:          READ4res opread;
 case OP_READDIR:       READDIR4res opreaddir;
 case OP_READLINK:      READLINK4res opreadlink;
 case OP_REMOVE:        REMOVE4res opremove;
 case OP_RENAME:        RENAME4res oprename;
 case OP_RENEW:         RENEW4res oprenew;
 case OP_RESTOREFH:     RESTOREFH4res oprestorefh;
 case OP_SAVEFH:        SAVEFH4res opsavefh;
 case OP_SECINFO:       SECINFO4res opsecinfo;
 case OP_SETATTR:       SETATTR4res opsetattr;
 case OP_SETCLIENTID:   SETCLIENTID4res opsetclientid;
 case OP_SETCLIENTID_CONFIRM:   SETCLIENTID_CONFIRM4res
                                        opsetclientid_confirm;
 case OP_VERIFY:        VERIFY4res opverify;
 case OP_WRITE:         WRITE4res opwrite;
 case OP_RELEASE_LOCKOWNER:     RELEASE_LOCKOWNER4res
                                    oprelease_lockowner;
 case OP_CREATE_SESSION:        CREATE_SESSION4res opcreatesession;
 case OP_DESTROY_SESSION:       DESTROY_SESSION4res opdestroysession;
 case OP_FREE_STATEID:          FREE_STATEID4res opfreestateid;
 case OP_GET_DIR_DELEGATION:    GET_DIR_DELEGATION4res opgetdirdelegation;
 case OP_GETDEVICEINFO:         GETDEVICEINFO4res opgetdeviceinfo;
 case OP_GETDEVICELIST:         GETDEVICELIST4res opgetdevicelist;
 case OP_LAYOUTCOMMIT:          LAYOUTCOMMIT4res oplayoutcommit;
 case OP_LAYOUTGET:             LAYOUTGET4res oplayoutget;
 case OP_LAYOUTRETURN:          LAYOUTRETURN4res oplayoutreturn;
 case OP_SECINFO_NO_NAME:       SECINFO_NO_NAME4res opsecinfononame;
 case OP_SEQUENCE:              SEQUENCE4res opsequence;
 case OP_SET_SSV:               SET_SSV4res opsetssv;
 case OP_TEST_STATEID:          TEST_STATEID4res opteststateid;
 case OP_WANT_DELEGATION:       WANT_DELEGATION4res opwantdelegation;
 case OP_DESTROY_CLIENTID:      DESTROY_CLIENTID4res opdestroyclientid;
 case OP_RECLAIM_COMPLETE:      RECLAIM_COMPLETE4res opreclaimcomplete;
 case OP_ILLEGAL:       ILLEGAL4res opillegal;
};

struct COMPOUND4args {
        utf8str_cs      tag;
        uint32_t        minorversion;
        nfs_argop4      argarray<>;
};

struct COMPOUND4res {
        nfsstat4 status;
        utf8str_cs      tag;
        nfs_resop4      resarray<>;
};

/*
 * Remote file service routines
 */
program NFS4_PROGRAM {
        version NFS_V4 {
                void
                        NFSPROC4_NULL(void) = 0;

                COMPOUND4res
                        NFSPROC4_COMPOUND(COMPOUND4args) = 1;

        } = 4;
} = 100003;



/*
 * NFS4 Callback Procedure Definitions and Program
 */

/*
 * CB_GETATTR: Get Current Attributes
 */
struct CB_GETATTR4args {
        nfs_fh4 fh;
        bitmap4 attr_request;
};

struct CB_GETATTR4resok {
        fattr4  obj_attributes;
};

union CB_GETATTR4res switch (nfsstat4 status) {
 case NFS4_OK:
         CB_GETATTR4resok       resok4;
 default:
         void;
};

/*
 * CB_RECALL: Recall an Open Delegation
 */
struct CB_RECALL4args {
        stateid4        stateid;
        bool            truncate;
        nfs_fh4         fh;
};

struct CB_RECALL4res {
        nfsstat4        status;
};

/*
 * CB_ILLEGAL: Response for illegal operation numbers
 */
struct CB_ILLEGAL4res {
        nfsstat4        status;
};

/*
 * Various definitions for CB_COMPOUND
 */
enum nfs_cb_opnum4 {
        OP_CB_GETATTR           = 3,
        OP_CB_RECALL            = 4,
        OP_CB_ILLEGAL           = 10044
};

union nfs_cb_argop4 switch (unsigned argop) {
 case OP_CB_GETATTR:    CB_GETATTR4args opcbgetattr;
 case OP_CB_RECALL:     CB_RECALL4args  opcbrecall;
 case OP_CB_ILLEGAL:    void;
};

union nfs_cb_resop4 switch (unsigned resop){
 case OP_CB_GETATTR:    CB_GETATTR4res  opcbgetattr;
 case OP_CB_RECALL:     CB_RECALL4res   opcbrecall;
 case OP_CB_ILLEGAL:    CB_ILLEGAL4res  opcbillegal;
};

struct CB_COMPOUND4args {
        utf8str_cs      tag;
        uint32_t        minorversion;
        uint32_t        callback_ident;
        nfs_cb_argop4   argarray<>;
};

struct CB_COMPOUND4res {
        nfsstat4 status;
        utf8str_cs      tag;
        nfs_cb_resop4   resarray<>;
};


/*
 * Program number is in the transient range since the client
 * will assign the exact transient program number and provide
 * that to the server via the SETCLIENTID operation.
 */
program NFS4_CALLBACK {
        version NFS_CB {
                void
                        CB_NULL(void) = 0;
                CB_COMPOUND4res
                        CB_COMPOUND(CB_COMPOUND4args) = 1;
        } = 1;
} = 0x40000000;
