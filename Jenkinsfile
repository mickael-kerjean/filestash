pipeline {
    agent any
    environment {
        GOCACHE = "/tmp/go-cache"
        npm_config_cache = "/tmp/npm-cache"
    }
    options {
        buildDiscarder(logRotator(numToKeepStr: "10", artifactNumToKeepStr: "1"))
    }
    stages {
        stage("Setup") {
            steps {
                git(
                    url: "git@github.com:mickael-kerjean/filestash",
                    branch: "master"
                )
                dir("test") {
                    git(
                        url: "git@github.com:mickael-kerjean/filestash-test.git",
                        credentialsId: "github-com-filestash-test",
                        branch: "main"
                    )
                }
            }
        }
        stage("Build") {
            steps {
                script {
                    docker.image("golang:1.26-trixie").inside() {
                        sh '''
                        sed -i 's|plg_image_c|plg_image_golang|' server/plugin/index.go
                        make init
                        CGO_ENABLED=0 GOARCH=amd64 go build -trimpath -ldflags="-s -w" --tags fts5 -o dist/release/filestash_linux_amd64.bin cmd/main.go
                        CGO_ENABLED=0 GOARCH=arm64 go build -trimpath -ldflags="-s -w" --tags fts5 -o dist/release/filestash_linux_arm64.bin cmd/main.go
                        cp dist/release/filestash_linux_amd64.bin dist/filestash
                        cd dist/release && sha256sum * > SHA256SUMS
                        '''
                    }
                }
            }
        }
        stage("Test") {
            steps {
                script {
                    // smoke test
                    docker.image("golang:1.26-bookworm").inside() {
                        sh 'timeout 5 ./dist/filestash > access.log || code=$?; if [ $code -ne 124 ]; then exit $code; fi'
                        sh "cat access.log"
                        sh "cat access.log | grep -q \"\\[http\\] starting\""
                        sh "cat access.log | grep -q \"listening\""
                        sh "cat access.log | grep -vz \"ERR\""
                    }
                    // test frontend
                    docker.image("node:20").inside() {
                        sh "cd public && npm install"
                        sh "cd public && npm run lint"
                        sh "cd public && npm run check"
                        // sh "cd public && npm run test"
                    }
                    // test backend
                    docker.image("golang:1.26-bookworm").inside() {
                        sh "cp ./test/assets/* /tmp/"
                        sh "make init"
                        sh "go generate ./test/unit_go/..."
                        sh "go get ./..."
                        sh "CGO_ENABLED=0 go test -count=1 \$(go list ./server/... | grep -v \"server/plugin\" | grep -v \"server/generator\")"
                    }
                    // test e2e
                    docker.image("machines/puppeteer:latest").inside() {
                        sh "cd ./test/e2e && npm install"
                        sh "chmod +x ./dist/filestash"
                        sh "./dist/filestash > /dev/null &"
                        sh "cd ./test/e2e && node servers/webdav.js > /dev/null &"
                        // sh "cd ./test/e2e && npm test"
                    }
                }
            }
        }

        stage("Release") {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: "app-filestash-hal", keyFileVariable: "KEY", usernameVariable: "USER")]) {
                    sh 'scp -i "$KEY" dist/release/* "$USER@hal.filestash.app:/mnt/me-kerjean-pages/projects/filestash/downloads/latest/"'
                }
                sh "docker buildx build --no-cache --platform linux/amd64,linux/arm64 -t machines/filestash:latest --push ./docker/"
            }
        }
    }
    post {
        always {
            cleanWs(disableDeferredWipeout: true, deleteDirs: true)
        }
    }
}