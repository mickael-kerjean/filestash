pipeline {
    agent any
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
                    docker.image("node:14").inside("--user=root") {
                        sh "apt update -y && apt install -y brotli"
                        sh "npm install"
                        sh "make build_frontend"
                    }
                    docker.image("golang:1.21-bookworm").inside("--user=root") {
                        // prepare: todo - statically compile plg_image_c so we don't have to do this to pass the e2e tests
                        sh "sed -i 's|plg_image_c|plg_image_golang|' server/plugin/index.go"
                        // build
                        sh "go get ./..."
                        sh "go generate -x ./server/..."
                        sh "CGO_ENABLED=0 go build -o dist/filestash cmd/main.go"
                    }
                }
            }
        }
        stage("Test") {
            steps {
                script {
                    // smoke test
                    docker.image("golang:1.21-bookworm").inside("--user=root") {
                        sh 'timeout 5 ./dist/filestash > access.log || code=$?; if [ $code -ne 124 ]; then exit $code; fi'
                        sh "cat access.log"
                        sh "cat access.log | grep -q \"\\[http\\] starting\""
                        sh "cat access.log | grep -q \"listening\""
                        sh "cat access.log | grep -vz \"WARN\""
                        sh "cat access.log | grep -vz \"ERR\""
                    }
                    // test frontend
                    docker.image("node:14").inside("--user=root") {
                        sh "cd ./test/unit_js && npm install"
                        sh "cd ./test/unit_js && npm test"
                    }
                    // test backend
                    docker.image("golang:1.21-bookworm").inside("--user=root") {
                        sh "cp ./test/assets/* /tmp/"
                        sh "go generate ./test/unit_go/..."
                        sh "go get ./..."
                        sh "go test -count=1 \$(go list ./server/... | grep -v \"server/plugin\" | grep -v \"server/generator\")"
                    }
                    // test e2e
                    docker.image("machines/puppeteer:latest").inside("--user=root") {
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
                // amd64
                sh "docker build --no-cache -t machines/filestash:latest-amd64 ./docker/"
                sh "docker push machines/filestash:latest-amd64"

                // arm
                sh "docker buildx build --platform linux/arm64 -t machines/filestash:latest-arm64 ./docker/"

                // create final image
                sh "docker manifest rm machines/filestash:latest || true"
                sh "docker manifest create machines/filestash:latest --amend machines/filestash:latest-amd64 --amend machines/filestash:latest-arm64v8"
                sh "docker manifest push machines/filestash:latest"
            }
        }

        stage("Deploy") {
            steps {
                sh "kubectl rollout restart deployment app-filestash-demo -n filestash"
            }
        }
    }
    post {
        always {
            cleanWs()
        }
    }
}