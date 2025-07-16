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
                    docker.image("node:20").inside("--user=root") {
                        sh "apt update -y && apt install -y brotli"
                        sh "npm install"
                        sh "make build_frontend"
                    }
                    docker.image("golang:1.24-bookworm").inside("--user=root") {
                        sh "sed -i 's|plg_image_c|plg_image_golang|' server/plugin/index.go"
                        sh "make build_init"
                        sh "make build_backend"
                    }
                }
            }
        }
        stage("Test") {
            steps {
                script {
                    // smoke test
                    docker.image("golang:1.24-bookworm").inside("--user=root") {
                        sh 'timeout 5 ./dist/filestash > access.log || code=$?; if [ $code -ne 124 ]; then exit $code; fi'
                        sh "cat access.log"
                        sh "cat access.log | grep -q \"\\[http\\] starting\""
                        sh "cat access.log | grep -q \"listening\""
                        sh "cat access.log | grep -vz \"ERR\""
                    }
                    // test frontend old
                    docker.image("node:14").inside("--user=root") {
                        sh "cd ./test/unit_js && npm install"
                        sh "cd ./test/unit_js && npm test"
                    }
                    // test frontend new
                    docker.image("node:20").inside("--user=root") {
                        sh "cd public && npm install"
                        // sh "cd public && npm run lint"
                        sh "cd public && npm run check"
                        // sh "cd public && npm run test"
                    }
                    // test backend
                    docker.image("golang:1.24-bookworm").inside("--user=root") {
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
                sh "docker buildx build --platform linux/amd64,linux/arm64 -t machines/filestash:latest --push ./docker/"
            }
        }
    }
    post {
        always {
            cleanWs()
        }
    }
}