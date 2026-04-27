pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu

                            NODE_VERSION="20.18.1"
                            TOOLS_DIR="$WORKSPACE/.jenkins-tools"
                            NODE_DIR="$TOOLS_DIR/node-v$NODE_VERSION-linux-x64"
                            NODE_ARCHIVE="$TOOLS_DIR/node.tar.gz"

                            if [ ! -x "$NODE_DIR/bin/node" ]; then
                                mkdir -p "$TOOLS_DIR"
                                rm -rf "$NODE_DIR" "$NODE_ARCHIVE"

                                if command -v curl >/dev/null 2>&1; then
                                    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" -o "$NODE_ARCHIVE"
                                elif command -v wget >/dev/null 2>&1; then
                                    wget -q "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" -O "$NODE_ARCHIVE"
                                else
                                    echo "ERROR: curl or wget is required to install Node.js on this Jenkins agent." >&2
                                    exit 1
                                fi

                                tar -xzf "$NODE_ARCHIVE" -C "$TOOLS_DIR"
                                rm -f "$NODE_ARCHIVE"
                            fi

                            export PATH="$NODE_DIR/bin:$PATH"

                            node --version
                            npm --version

                            npm --prefix backend ci
                            npm --prefix frontend ci
                            npm --prefix frontend run build
                        '''
                    } else {
                        bat '''
                            @echo off
                            where npm >nul 2>nul
                            if errorlevel 1 (
                                echo ERROR: Node.js/npm is not installed or not available on PATH.
                                exit /b 1
                            )

                            node --version
                            npm --version

                            npm --prefix backend ci
                            if errorlevel 1 exit /b 1

                            npm --prefix frontend ci
                            if errorlevel 1 exit /b 1

                            npm --prefix frontend run build
                        '''
                    }
                }
            }
        }
    }
}
