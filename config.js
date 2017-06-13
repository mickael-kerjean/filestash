// GOOGLE DRIVE
// 1) enable the api: https://console.developers.google.com/apis/api/drive.googleapis.com/overview
// 2) create credentials: https://console.developers.google.com/apis/credentials/oauthclient

// DROPBOX
// 1) create an third party app: https://www.dropbox.com/developers/apps/create
//    -> dropbox api -> Full Dropbox -> whatever name you want ->
//    -> set redirect URI to https://example.com/login ->  

module.exports = {
    info: {
        host: 'https://nuage.kerjean.me'
    },
    gdrive: {
        redirectURI: "https://nuage.kerjean.me/login",
        clientID: "client_id",
        clientSecret: "client_secret"
    },
    dropbox: {
        clientID: "client_id",
        redirectURI: "https://nuage.kerjean.me/login"
    }
}
