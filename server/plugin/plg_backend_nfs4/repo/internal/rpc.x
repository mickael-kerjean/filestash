/* RPC message format as defined by RFC 5531 */

enum auth_flavor {
  AUTH_NONE       = 0,
  AUTH_SYS        = 1,
  AUTH_SHORT      = 2,
  AUTH_DH         = 3,
  RPCSEC_GSS      = 6
};

struct opaque_auth {
  auth_flavor flavor;
  opaque body<400>;
};

enum msg_type {
  CALL  = 0,
  REPLY = 1
};

/* A reply to a call message can take on two forms: the message was
   either accepted or rejected. */
enum reply_stat {
  MSG_ACCEPTED = 0,
  MSG_DENIED   = 1
};

/* Given that a call message was accepted, the following is the status
   of an attempt to call a remote procedure. */
enum accept_stat {
  SUCCESS       = 0, /* RPC executed successfully       */
  PROG_UNAVAIL  = 1, /* remote hasn't exported program  */
  PROG_MISMATCH = 2, /* remote can't support version #  */
  PROC_UNAVAIL  = 3, /* program can't support procedure */
  GARBAGE_ARGS  = 4, /* procedure can't decode params   */
  SYSTEM_ERR    = 5  /* e.g. memory allocation failure  */
};

/* Reasons why a call message was rejected: */
enum reject_stat {
  RPC_MISMATCH = 0, /* RPC version number != 2          */
  AUTH_ERROR = 1    /* remote can't authenticate caller */
};

/* Why authentication failed: */
enum auth_stat {
  AUTH_OK           = 0,  /* success                        */
  /*
   * failed at remote end
   */
  AUTH_BADCRED      = 1,  /* bad credential (seal broken)   */
  AUTH_REJECTEDCRED = 2,  /* client must begin new session  */
  AUTH_BADVERF      = 3,  /* bad verifier (seal broken)     */
  AUTH_REJECTEDVERF = 4,  /* verifier expired or replayed   */
  AUTH_TOOWEAK      = 5,  /* rejected for security reasons  */
  /*
   * failed locally
   */
  AUTH_INVALIDRESP  = 6,  /* bogus response verifier        */
  AUTH_FAILED       = 7,  /* reason unknown                 */
  /*
   * AUTH_KERB errors; deprecated.  See [RFC2695]
   */
  AUTH_KERB_GENERIC = 8,  /* kerberos generic error */
  AUTH_TIMEEXPIRE = 9,    /* time of credential expired */
  AUTH_TKT_FILE = 10,     /* problem with ticket file */
  AUTH_DECODE = 11,       /* can't decode authenticator */
  AUTH_NET_ADDR = 12,     /* wrong net address in ticket */
  /*
   * RPCSEC_GSS GSS related errors
   */
  RPCSEC_GSS_CREDPROBLEM = 13, /* no credentials for user */
  RPCSEC_GSS_CTXPROBLEM = 14   /* problem with context */
};

/* Body of an RPC call: */
struct call_body {
  unsigned int rpcvers;       /* must be equal to two (2) */
  unsigned int prog;
  unsigned int vers;
  unsigned int proc;
  opaque_auth cred;
  opaque_auth verf;
  /* procedure-specific parameters start here */
};

/* Reply to an RPC call that was accepted by the server: */
struct accepted_reply {
  opaque_auth verf;
  union switch (accept_stat stat) {
  case SUCCESS:
    opaque results[0];
    /*
     * procedure-specific results start here
     */
  case PROG_MISMATCH:
    struct {
      unsigned int low;
      unsigned int high;
    } mismatch_info;
  default:
    /*
     * Void.  Cases include PROG_UNAVAIL, PROC_UNAVAIL,
     * GARBAGE_ARGS, and SYSTEM_ERR.
     */
    void;
  } reply_data;
};

/* Reply to an RPC call that was rejected by the server: */
union rejected_reply switch (reject_stat stat) {
 case RPC_MISMATCH:
   struct {
     unsigned int low;
     unsigned int high;
   } mismatch_info;
 case AUTH_ERROR:
   auth_stat rj_why;
};

/* Body of a reply to an RPC call: */
union reply_body switch (reply_stat stat) {
 case MSG_ACCEPTED:
   accepted_reply areply;
 case MSG_DENIED:
   rejected_reply rreply;
};

/* The RPC message: */
struct rpc_msg {
  unsigned int xid;
  union switch (msg_type mtype) {
  case CALL:
    call_body cbody;
  case REPLY:
    reply_body rbody;
  } body;
};
