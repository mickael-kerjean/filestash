module.exports = {
    fork_button: false,
    search: {
        enable: true,
        max_depth: 15,
        max_per_min: 20, // avoid DDOS your own server
        max_folder_per_path: 30 // avoid indexing unecessary crapp like node_modules, etc...
    },
    connections: {
        // Autofill form in the login page, this config is used to generate
        // custom login form
        webdav: {
            label: 'WebDav',
            // url: 'http://owncloud.example.com',
            // username: 'username',
            // password: 'password',
            // advanced: false,
            // path: '/home'
        },
        ftp: {
            label: 'FTP',
            // hostname: 'ftp.example.com',
            // username: 'username',
            // password: 'password',
            // path: '/trash',
            // port: 21,
            // advanced: false
        },
        sftp: {
            label: 'SFTP',
            // host: 'sftp.kerjean.me',
            // username: 'username',
            // password: 'password',
            // advanced: false,
            // path: '/home/',
            // port: 22,
            // private_key: 'test',
        },
        git: {
            label: 'Git',
            // repo: 'http://github.com/mickael-kerjean/nuage.git',
            // username: 'mickael@kerjean.me',
            // password: 'superpassword',
            // advanced: false,
            // passphrase: 'superpassword',
            // commit: '{action} ({filename}): {path}',
            // branch: 'master',
            // author_email: 'mickael@kerjean.me',
            // author_name: 'Mickael Kerjean',
            // committer_email: 'mickael@kerjean.me',
            // committer_name: 'Mickael Kerjean',
        },
        s3: {
            label: 'S3',
            // access_key_id: 'my_access_key',
            // secret_access_key: 'my_secret_key',
            // advanced: false,
            // path: '/bucketname/'
        },
        dropbox: {label: 'Dropbox'},
        gdrive: {label: 'Drive'}
    }
}
