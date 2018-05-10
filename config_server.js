// GOOGLE DRIVE
// 1) enable the api: https://console.developers.google.com/apis/api/drive.googleapis.com/overview
// 2) create credentials: https://console.developers.google.com/apis/credentials/oauthclient

// DROPBOX
// 1) create an third party app: https://www.dropbox.com/developers/apps/create
//    -> dropbox api -> Full Dropbox -> whatever name you want ->
//    -> set redirect URI to https://example.com/login ->

module.exports = {
    // SERVER CONFIG
    info: {
        host: process.env.APPLICATION_URL || "http://nuage.kerjean.me",
        usage_stats: true
    },
    gdrive: {
        redirectURI: process.env.APPLICATION_URL+"/login",
        clientID: process.env.GDRIVE_CLIENT_ID,
        clientSecret: process.env.GDRIVE_CLIENT_SECRET
    },
    dropbox: {
        clientID: process.env.DROPBOX_CLIENT_ID,
        redirectURI: process.env.APPLICATION_URL+"/login"
    },
    secret_key: process.env.SECRET_KEY ||  (Math.random()*Math.pow(10,16)).toString(32)
};
