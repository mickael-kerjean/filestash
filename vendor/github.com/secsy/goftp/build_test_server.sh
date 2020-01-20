#!/bin/bash -ex

goftp_dir=`pwd`

mkdir -p ftpd
cd ftpd

ftpd_dir=`pwd`

curl -O ftp://ftp.proftpd.org/distrib/source/proftpd-1.3.5.tar.gz
tar -xzf proftpd-1.3.5.tar.gz
cd proftpd-1.3.5

# fix slow tls data connection handshake (https://github.com/proftpd/proftpd/pull/48)
perl -pi -e 's/(\Qpr_inet_set_proto_nodelay(conn->pool, conn, 1);\E)/$1\n(void) pr_inet_set_proto_cork(conn->wfd, 0);/' contrib/mod_tls.c

# fix a segfault on mac
perl -pi -e 's/\Qsstrncpy(cwd, dir, sizeof(cwd));\E/char dircpy[sizeof(cwd)];\nsstrncpy(dircpy, dir, sizeof(dircpy));\nsstrncpy(cwd, dircpy, sizeof(cwd));/' src/fsio.c

if [ "$(uname)" == "Darwin" ]; then
  cflags=-I/usr/local/opt/openssl/include
  ldflags=-L/usr/local/opt/openssl/lib
fi

CFLAGS=$cflags LDFLAGS=$ldflags ./configure --with-modules=mod_tls --disable-ident

make
mv proftpd ..

cd ..

cat > proftpd.conf <<CONF
ServerType standalone
Port 2124
DefaultAddress 127.0.0.1
AuthUserFile $ftpd_dir/users.txt
AuthOrder mod_auth_file.c
PidFile /dev/null
ScoreboardFile /dev/null
User `id -u -n`
Group `id -g -n`
AllowStoreRestart on
AllowOverwrite on
UseReverseDNS off
RequireValidShell off
TLSOptions NoSessionReuseRequired
<IfModule mod_tls.c>
  TLSEngine on
  TLSRSACertificateFile $ftpd_dir/server.cert
  TLSRSACertificateKeyFile $ftpd_dir/server.key
</IfModule>
CONF

cat > server.key <<"KEY"
-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQDOMHBkxoVgenJqLimeIkztEE9Hp3XcIE7cmZILqkMDuo0kGAVU
Mvldyo+sYqop46aPbobiqPxU3knyrHJJ2H0ucFnb67kUH5ITncYo8iNephtgtuMR
D0JKYneaGtJ0Z+kTWIJV3/9f2GFLK8InY7ipoxZX3hGkSeIVyh6F66CZ5QIDAQAB
AoGAfuC/yMOAf4XZsg0F/xEMVTScFHOvyuz2mjjF7fevlTPOdk9xuAZF/LkQ//sW
ywATFl/lEMT7wR2oU3RaP6bAICCf1vGba51U+yFTS/8T1+VJvRuojMX4RVJhaFU4
HJx9Fd9a8kLzHTaBkaVtGJzK3GxXpa7mwSlJ+Eeeh+CYYAECQQDq4Mb1tgcEOWFB
v9j9StMby+0FF8uitx5+E78r3xPRRjIjgray6UuFCc41U/pPuw2iqreDCkjLKb5G
SIqQ7BrlAkEA4Ls0cAejrONvO/1+NIeNQn30WIgH7zqBmRYJnLqw8xo0xML51pFU
gXYCEp+M2AtDL6yQ0zSN7D2JhtbzLweTAQJAf7rteAIdnrZ1pYPnRRfD5oHny7U9
EKf09StX80vFQzGhYp5bLMCiSR8j/OxGW8WljKi6U5DsNU/mIeKhOF6t4QJAfUAZ
E69OS9decYLwyfoagsqMWqNGONDU1itwJAfxAyzB6D/62tmYzaaltRdzeh2czn9R
IEWUK+yIL7yxQK7qAQJABD3UYT2yZaZJDNerK9h9RJRptN1f0vJ29qURkj7OpFbY
2hgLZ/lfrSE5RCSmYQtmk2hyuSzMSe928k85Y14+wg==
-----END RSA PRIVATE KEY-----
KEY

cat > server.cert <<"CERT"
-----BEGIN CERTIFICATE-----
MIICdzCCAeCgAwIBAgIJAJls3dJsiITyMA0GCSqGSIb3DQEBBQUAMDIxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMQ4wDAYDVQQKEwVHb0ZUUDAeFw0x
NTAyMTYwNTQ0MDhaFw0xNTAzMTgwNTQ0MDhaMDIxCzAJBgNVBAYTAlVTMRMwEQYD
VQQIEwpDYWxpZm9ybmlhMQ4wDAYDVQQKEwVHb0ZUUDCBnzANBgkqhkiG9w0BAQEF
AAOBjQAwgYkCgYEAzjBwZMaFYHpyai4pniJM7RBPR6d13CBO3JmSC6pDA7qNJBgF
VDL5XcqPrGKqKeOmj26G4qj8VN5J8qxySdh9LnBZ2+u5FB+SE53GKPIjXqYbYLbj
EQ9CSmJ3mhrSdGfpE1iCVd//X9hhSyvCJ2O4qaMWV94RpEniFcoeheugmeUCAwEA
AaOBlDCBkTAdBgNVHQ4EFgQUb/FNa79J/POe13rCUSA3eSJviGgwYgYDVR0jBFsw
WYAUb/FNa79J/POe13rCUSA3eSJviGihNqQ0MDIxCzAJBgNVBAYTAlVTMRMwEQYD
VQQIEwpDYWxpZm9ybmlhMQ4wDAYDVQQKEwVHb0ZUUIIJAJls3dJsiITyMAwGA1Ud
EwQFMAMBAf8wDQYJKoZIhvcNAQEFBQADgYEAhUH0UnU46s2XbAGq6RpmKuONjgJX
X4qKrpmBhSg6KS4WkgnLr8+YrvvcFhhPGf9xLpCS1o+RC0W6BuwqiAtM+ckqDnI5
pb3vMhAhXTjg1bLWDNFn98iI5tSqGSjy9d7RfdC2yyFQsliq2b74yHxCOysC5OW0
VpOorURz8ETlfAA=
-----END CERTIFICATE-----
CERT

curl -O https://download.pureftpd.org/pub/pure-ftpd/releases/obsolete/pure-ftpd-1.0.36.tar.gz
tar -xzf pure-ftpd-1.0.36.tar.gz
cd pure-ftpd-1.0.36

# build normal binary with explicit tls support
CFLAGS=$cflags LDFLAGS=$ldflags ./configure --with-nonroot --with-puredb --with-tls --with-certfile=$ftpd_dir/pure-ftpd.pem
make clean
make
mv src/pure-ftpd ..

# build separate binary with implicit tls
CFLAGS=$cflags LDFLAGS=$ldflags ./configure --with-nonroot --with-puredb --with-tls --with-certfile=$ftpd_dir/pure-ftpd.pem --with-implicittls
make clean
make
mv src/pure-ftpd ../pure-ftpd-implicittls

cd ..

cat server.key server.cert > pure-ftpd.pem

# setup up a goftp user for ftp server
if [ "$(uname)" == "Darwin" ]; then
  echo "goftp:_.../HVM0l1lcNKVtiKs:`id -u`:`id -g`::$goftp_dir/testroot/./::::::::::::" > users.txt
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
  echo "goftp:\$1\$salt\$IbAl9EugC.V4mMOY6YMYE0:`id -u`:`id -g`::$goftp_dir/testroot/./::::::::::::" > users.txt
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
  echo "Doesn't support windows yet"
  exit 1
fi

chmod 600 users.txt

# generate puredb user db file
pure-ftpd-1.0.36/src/pure-pw mkdb users.pdb -f users.txt
