def notifySlack(String stageName, String status, String color) {
    String message = "${status}: ${env.JOB_NAME} #${env.BUILD_NUMBER} - ${stageName}"

    if (env.BUILD_URL) {
        message = "${message}\n${env.BUILD_URL}"
    }

    try {
        slackSend(channel: env.SLACK_CHANNEL, color: color, message: message)
    } catch (Throwable err) {
        echo "Slack notification failed for ${stageName}: ${err.getMessage()}"
    }
}

boolean hasChangeSets() {
    for (def changeSet in currentBuild.changeSets) {
        if (changeSet.items.length > 0) {
            return true
        }
    }

    return false
}

boolean changedIn(List<String> pathPrefixes) {
    if (!hasChangeSets()) {
        echo 'No Jenkins change set was available, so conditional stages will run.'
        return true
    }

    List<String> normalizedPrefixes = pathPrefixes.collect { prefix ->
        String normalized = prefix.replace('\\', '/')
        normalized = normalized.startsWith('./') ? normalized.substring(2) : normalized
        return normalized.endsWith('/') ? normalized : "${normalized}/"
    }

    for (def changeSet in currentBuild.changeSets) {
        for (def item in changeSet.items) {
            for (def affectedFile in item.affectedFiles) {
                String path = affectedFile.path.replace('\\', '/')

                for (String prefix in normalizedPrefixes) {
                    if (path == prefix[0..-2] || path.startsWith(prefix)) {
                        return true
                    }
                }
            }
        }
    }

    return false
}

boolean appOrPipelineChanged(List<String> pathPrefixes) {
    return changedIn(pathPrefixes + ['Jenkinsfile'])
}

pipeline {
    agent any

    environment {
        NODE_VERSION = '20.18.1'
        TOOLS_DIR = "${WORKSPACE}/.jenkins-tools"
        NODE_DIR = "${TOOLS_DIR}/node-v${NODE_VERSION}-linux-x64"
        NODE_ARCHIVE = "${TOOLS_DIR}/node.tar.gz"
        SLACK_CHANNEL = '#all-cicd'
        IMAGE_NAME_BACKEND = 'suprihub/dispatch-backend'
        IMAGE_NAME_FRONTEND = 'suprihub/dispatch-frontend'
        IMAGE_NAME_DATABASE = 'suprihub/dispatch-db'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10', daysToKeepStr: '30'))
        timestamps()
        timeout(time: 2, unit: 'HOURS')
        disableConcurrentBuilds()
    }

    stages {
        stage('Initialize') {
            steps {
                script {
                    env.BUILD_TIMESTAMP = isUnix()
                        ? sh(script: 'date +%Y%m%d-%H%M%S', returnStdout: true).trim()
                        : bat(script: '@echo off\r\npowershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"', returnStdout: true).trim()

                    echo '========== Pipeline Initialization =========='
                    echo "Build Number: ${env.BUILD_NUMBER}"
                    echo "Workspace: ${env.WORKSPACE}"
                    echo "Build Timestamp: ${env.BUILD_TIMESTAMP}"
                    echo "Node Version: ${env.NODE_VERSION}"
                    echo '========== Initialization Complete =========='
                }
            }
            post {
                success {
                    script {
                        notifySlack('Initialize', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Initialize', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Setup Node.js') {
            when {
                expression { appOrPipelineChanged(['backend/', 'frontend/']) }
            }
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu

                            echo "========== Setting up Node.js environment =========="

                            if [ ! -x "${NODE_DIR}/bin/node" ]; then
                                echo "Installing Node.js ${NODE_VERSION}..."
                                mkdir -p "${TOOLS_DIR}"
                                rm -rf "${NODE_DIR}" "${NODE_ARCHIVE}"

                                if command -v curl >/dev/null 2>&1; then
                                    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" -o "${NODE_ARCHIVE}"
                                elif command -v wget >/dev/null 2>&1; then
                                    wget -q "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" -O "${NODE_ARCHIVE}"
                                else
                                    echo "ERROR: curl or wget is required to install Node.js." >&2
                                    exit 1
                                fi

                                tar -xzf "${NODE_ARCHIVE}" -C "${TOOLS_DIR}"
                                rm -f "${NODE_ARCHIVE}"
                            else
                                echo "Node.js ${NODE_VERSION} already cached."
                            fi

                            export PATH="${NODE_DIR}/bin:${PATH}"

                            echo "========== Verifying Node.js and npm =========="
                            node --version
                            npm --version
                            echo "========== Node.js Setup Completed =========="
                        '''
                    } else {
                        bat '''
                            @echo off
                            echo ========== Verifying Node.js and npm ==========
                            where npm >nul 2>nul
                            if errorlevel 1 (
                                echo ERROR: Node.js/npm not found on PATH.
                                exit /b 1
                            )

                            node --version
                            npm --version
                            echo ========== Node.js Setup Completed ==========
                        '''
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Setup Node.js', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Setup Node.js', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Build') {
            parallel {
                stage('Backend Dependencies') {
                    when {
                        expression { appOrPipelineChanged(['backend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu
                                    export PATH="${NODE_DIR}/bin:${PATH}"

                                    echo "========== Installing backend dependencies =========="
                                    npm --prefix backend ci --prefer-offline
                                    echo "========== Backend Dependencies Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Installing backend dependencies ==========
                                    npm --prefix backend ci --prefer-offline
                                    if errorlevel 1 exit /b 1
                                    echo ========== Backend Dependencies Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Backend Dependencies', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Backend Dependencies', 'FAILURE', 'danger')
                            }
                        }
                    }
                }

                stage('Frontend Build') {
                    when {
                        expression { appOrPipelineChanged(['frontend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu
                                    export PATH="${NODE_DIR}/bin:${PATH}"

                                    echo "========== Installing frontend dependencies =========="
                                    npm --prefix frontend ci --prefer-offline

                                    echo "========== Building frontend application =========="
                                    npm --prefix frontend run build

                                    echo "========== Verifying build artifacts =========="
                                    if [ -d "frontend/dist" ] && [ -n "$(find frontend/dist -type f -print -quit)" ]; then
                                        echo "Frontend build successful"
                                        echo "Build artifacts: $(find frontend/dist -type f | wc -l) files"
                                    else
                                        echo "Frontend build failed - dist directory empty or missing"
                                        exit 1
                                    fi

                                    echo "========== Frontend Build Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Installing frontend dependencies ==========
                                    npm --prefix frontend ci --prefer-offline
                                    if errorlevel 1 exit /b 1

                                    echo ========== Building frontend application ==========
                                    npm --prefix frontend run build
                                    if errorlevel 1 exit /b 1

                                    echo ========== Verifying build artifacts ==========
                                    if not exist "frontend\\dist" (
                                        echo Frontend build failed - dist directory missing.
                                        exit /b 1
                                    )

                                    dir /b "frontend\\dist" >nul 2>nul
                                    if errorlevel 1 (
                                        echo Frontend build failed - dist directory empty.
                                        exit /b 1
                                    )

                                    echo Frontend build successful.
                                    echo ========== Frontend Build Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Frontend Build', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Frontend Build', 'FAILURE', 'danger')
                            }
                        }
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Build', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Build', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Test') {
            parallel {
                stage('Backend Tests') {
                    when {
                        expression { appOrPipelineChanged(['backend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    export PATH="${NODE_DIR}/bin:${PATH}"

                                    echo "========== Backend Test Suite =========="

                                    echo "Running JavaScript syntax validation..."
                                    ERRORS=0

                                    for file in backend/*.js; do
                                        if [ -f "$file" ]; then
                                            if node -c "$file"; then
                                                echo "OK: $file"
                                            else
                                                echo "Syntax error in $file"
                                                ERRORS=$((ERRORS + 1))
                                            fi
                                        fi
                                    done

                                    if [ "$ERRORS" -gt 0 ]; then
                                        echo "Backend syntax validation failed with $ERRORS error(s)."
                                        exit 1
                                    fi

                                    echo "Running npm audit for backend high/critical vulnerabilities..."
                                    npm --prefix backend audit --audit-level=high

                                    test -d backend/node_modules
                                    echo "Backend dependencies are installed."
                                    echo "========== Backend Tests Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    setlocal enabledelayedexpansion
                                    echo ========== Backend Test Suite ==========
                                    set ERRORS=0

                                    echo Running JavaScript syntax validation...
                                    for %%f in (backend\\*.js) do (
                                        node -c "%%f"
                                        if errorlevel 1 (
                                            echo Syntax error in %%f
                                            set /a ERRORS+=1
                                        ) else (
                                            echo OK: %%f
                                        )
                                    )

                                    if !ERRORS! gtr 0 (
                                        echo Backend syntax validation failed with !ERRORS! error(s).
                                        exit /b 1
                                    )

                                    echo Running npm audit for backend high/critical vulnerabilities...
                                    npm --prefix backend audit --audit-level=high
                                    if errorlevel 1 exit /b 1

                                    if not exist "backend\\node_modules" (
                                        echo Backend node_modules directory not found.
                                        exit /b 1
                                    )

                                    echo Backend dependencies are installed.
                                    echo ========== Backend Tests Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Backend Tests', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Backend Tests', 'FAILURE', 'danger')
                            }
                        }
                    }
                }

                stage('Frontend Tests') {
                    when {
                        expression { appOrPipelineChanged(['frontend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    export PATH="${NODE_DIR}/bin:${PATH}"

                                    echo "========== Frontend Test Suite =========="

                                    echo "Validating frontend build artifacts..."
                                    test -d frontend/dist

                                    ARTIFACT_COUNT=$(find frontend/dist -type f | wc -l)
                                    if [ "$ARTIFACT_COUNT" -eq 0 ]; then
                                        echo "No frontend build artifacts found."
                                        exit 1
                                    fi

                                    test -f frontend/dist/index.html
                                    echo "Build artifacts verified: $ARTIFACT_COUNT files."

                                    echo "Running npm audit for frontend high/critical vulnerabilities..."
                                    npm --prefix frontend audit --audit-level=high

                                    test -d frontend/node_modules
                                    echo "Frontend dependencies are installed."
                                    echo "========== Frontend Tests Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Frontend Test Suite ==========

                                    echo Validating frontend build artifacts...
                                    if not exist "frontend\\dist" (
                                        echo Build directory not found.
                                        exit /b 1
                                    )

                                    if not exist "frontend\\dist\\index.html" (
                                        echo frontend\\dist\\index.html not found.
                                        exit /b 1
                                    )

                                    echo Running npm audit for frontend high/critical vulnerabilities...
                                    npm --prefix frontend audit --audit-level=high
                                    if errorlevel 1 exit /b 1

                                    if not exist "frontend\\node_modules" (
                                        echo Frontend node_modules directory not found.
                                        exit /b 1
                                    )

                                    echo Frontend dependencies are installed.
                                    echo ========== Frontend Tests Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Frontend Tests', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Frontend Tests', 'FAILURE', 'danger')
                            }
                        }
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Test', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Test', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Security Scan') {
            when {
                expression { appOrPipelineChanged(['backend/', 'frontend/', 'database/']) }
            }
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu

                            echo "========== Security Scanning =========="

                            if [ -f ".env" ] || [ -f "backend/.env" ] || [ -f "frontend/.env" ]; then
                                echo "A .env file was found in the workspace. Do not commit secrets."
                                exit 1
                            fi

                            echo "Checking for common hardcoded credential patterns..."
                            if grep -RInE "(password|secret|token|apikey|api_key)[[:space:]]*[:=][[:space:]]*['\\\"][^'\\\"]+['\\\"]" backend frontend --exclude-dir=node_modules --exclude=package-lock.json; then
                                echo "Potential hardcoded credential detected."
                                exit 1
                            fi

                            grep -q "FROM node:20-alpine" backend/Dockerfile
                            grep -q "FROM nginx:1.27-alpine" frontend/Dockerfile
                            grep -q "npm install --omit=dev" backend/Dockerfile

                            echo "========== Security Scan Completed =========="
                        '''
                    } else {
                        bat '''
                            @echo off
                            echo ========== Security Scanning ==========

                            if exist ".env" (
                                echo A .env file was found in the workspace. Do not commit secrets.
                                exit /b 1
                            )
                            if exist "backend\\.env" (
                                echo A backend .env file was found in the workspace. Do not commit secrets.
                                exit /b 1
                            )
                            if exist "frontend\\.env" (
                                echo A frontend .env file was found in the workspace. Do not commit secrets.
                                exit /b 1
                            )

                            findstr /C:"FROM node:20-alpine" backend\\Dockerfile >nul || exit /b 1
                            findstr /C:"FROM nginx:1.27-alpine" frontend\\Dockerfile >nul || exit /b 1
                            findstr /C:"npm install --omit=dev" backend\\Dockerfile >nul || exit /b 1

                            echo ========== Security Scan Completed ==========
                        '''
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Security Scan', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Security Scan', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Code Quality') {
            parallel {
                stage('Backend Code Quality') {
                    when {
                        expression { appOrPipelineChanged(['backend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    echo "========== Backend Code Quality Checks =========="
                                    test -f backend/index.js
                                    test -f backend/db.js
                                    test -f backend/package.json
                                    test -f backend/package-lock.json
                                    test -f backend/Dockerfile
                                    test -f docker-compose.yml
                                    echo "========== Backend Code Quality Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Backend Code Quality Checks ==========
                                    if not exist "backend\\index.js" exit /b 1
                                    if not exist "backend\\db.js" exit /b 1
                                    if not exist "backend\\package.json" exit /b 1
                                    if not exist "backend\\package-lock.json" exit /b 1
                                    if not exist "backend\\Dockerfile" exit /b 1
                                    if not exist "docker-compose.yml" exit /b 1
                                    echo ========== Backend Code Quality Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Backend Code Quality', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Backend Code Quality', 'FAILURE', 'danger')
                            }
                        }
                    }
                }

                stage('Frontend Code Quality') {
                    when {
                        expression { appOrPipelineChanged(['frontend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    echo "========== Frontend Code Quality Checks =========="
                                    test -f frontend/src/App.jsx
                                    test -f frontend/src/main.jsx
                                    test -f frontend/package.json
                                    test -f frontend/package-lock.json
                                    test -f frontend/Dockerfile
                                    test -f frontend/nginx.conf
                                    test -d frontend/dist
                                    test -f docker-compose.yml
                                    echo "========== Frontend Code Quality Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Frontend Code Quality Checks ==========
                                    if not exist "frontend\\src\\App.jsx" exit /b 1
                                    if not exist "frontend\\src\\main.jsx" exit /b 1
                                    if not exist "frontend\\package.json" exit /b 1
                                    if not exist "frontend\\package-lock.json" exit /b 1
                                    if not exist "frontend\\Dockerfile" exit /b 1
                                    if not exist "frontend\\nginx.conf" exit /b 1
                                    if not exist "frontend\\dist" exit /b 1
                                    if not exist "docker-compose.yml" exit /b 1
                                    echo ========== Frontend Code Quality Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Frontend Code Quality', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Frontend Code Quality', 'FAILURE', 'danger')
                            }
                        }
                    }
                }

                stage('Database Code Quality') {
                    when {
                        expression { appOrPipelineChanged(['database/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    echo "========== Database Code Quality Checks =========="
                                    test -f database/Dockerfile
                                    test -f database/init.sql
                                    test -f docker-compose.yml
                                    echo "========== Database Code Quality Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Database Code Quality Checks ==========
                                    if not exist "database\\Dockerfile" exit /b 1
                                    if not exist "database\\init.sql" exit /b 1
                                    if not exist "docker-compose.yml" exit /b 1
                                    echo ========== Database Code Quality Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Database Code Quality', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Database Code Quality', 'FAILURE', 'danger')
                            }
                        }
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Code Quality', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Code Quality', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Kubernetes Manifests') {
            when {
                expression { appOrPipelineChanged(['k8s/']) }
            }
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu

                            echo "========== Kubernetes Manifest Validation =========="
                            test -f k8s/configs/backend-configmap.yaml
                            test -f k8s/configs/db-secret.yaml
                            test -f k8s/deployments/backend-deployment.yaml
                            test -f k8s/deployments/db-deployment.yaml
                            test -f k8s/deployments/frontend-deployment.yaml
                            test -f k8s/services/backend-service.yaml
                            test -f k8s/services/db-service.yaml
                            test -f k8s/services/frontend-service.yaml
                            test -f k8s/storage/pv.yaml
                            test -f k8s/storage/pvc.yaml

                            if command -v kubectl >/dev/null 2>&1; then
                                kubectl apply --dry-run=client -R -f k8s
                            else
                                echo "kubectl not installed - completed file presence validation only."
                            fi

                            echo "========== Kubernetes Manifest Validation Completed =========="
                        '''
                    } else {
                        bat '''
                            @echo off
                            echo ========== Kubernetes Manifest Validation ==========
                            if not exist "k8s\\configs\\backend-configmap.yaml" exit /b 1
                            if not exist "k8s\\configs\\db-secret.yaml" exit /b 1
                            if not exist "k8s\\deployments\\backend-deployment.yaml" exit /b 1
                            if not exist "k8s\\deployments\\db-deployment.yaml" exit /b 1
                            if not exist "k8s\\deployments\\frontend-deployment.yaml" exit /b 1
                            if not exist "k8s\\services\\backend-service.yaml" exit /b 1
                            if not exist "k8s\\services\\db-service.yaml" exit /b 1
                            if not exist "k8s\\services\\frontend-service.yaml" exit /b 1
                            if not exist "k8s\\storage\\pv.yaml" exit /b 1
                            if not exist "k8s\\storage\\pvc.yaml" exit /b 1

                            where kubectl >nul 2>nul
                            if errorlevel 1 (
                                echo kubectl not installed - completed file presence validation only.
                            ) else (
                                kubectl apply --dry-run=client -R -f k8s
                                if errorlevel 1 exit /b 1
                            )

                            echo ========== Kubernetes Manifest Validation Completed ==========
                        '''
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Kubernetes Manifests', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Kubernetes Manifests', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Package') {
            parallel {
                stage('Backend Docker Image') {
                    when {
                        expression { appOrPipelineChanged(['backend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    echo "========== Backend Docker Image Packaging =========="

                                    if ! command -v docker >/dev/null 2>&1; then
                                        echo "Docker is not installed or not on PATH."
                                        exit 1
                                    fi

                                    docker --version

                                    docker build \
                                        --build-arg NODE_ENV=production \
                                        --label "build.number=${BUILD_NUMBER}" \
                                        --label "build.timestamp=${BUILD_TIMESTAMP}" \
                                        -t "${IMAGE_NAME_BACKEND}:${BUILD_NUMBER}" \
                                        -t "${IMAGE_NAME_BACKEND}:latest" \
                                        -f backend/Dockerfile \
                                        backend

                                    docker images "${IMAGE_NAME_BACKEND}" --format "table {{.Repository}}\\t{{.Tag}}\\t{{.ID}}\\t{{.Size}}"

                                    if command -v trivy >/dev/null 2>&1; then
                                        trivy image --severity HIGH,CRITICAL --exit-code 1 "${IMAGE_NAME_BACKEND}:${BUILD_NUMBER}"
                                    else
                                        echo "Trivy not installed - skipping backend image vulnerability scan."
                                    fi

                                    echo "========== Backend Docker Packaging Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Backend Docker Image Packaging ==========

                                    docker --version
                                    if errorlevel 1 (
                                        echo Docker is not installed or not on PATH.
                                        exit /b 1
                                    )

                                    docker build ^
                                        --build-arg NODE_ENV=production ^
                                        --label "build.number=%BUILD_NUMBER%" ^
                                        --label "build.timestamp=%BUILD_TIMESTAMP%" ^
                                        -t "%IMAGE_NAME_BACKEND%:%BUILD_NUMBER%" ^
                                        -t "%IMAGE_NAME_BACKEND%:latest" ^
                                        -f backend\\Dockerfile ^
                                        backend
                                    if errorlevel 1 exit /b 1

                                    docker images "%IMAGE_NAME_BACKEND%"
                                    echo ========== Backend Docker Packaging Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Backend Docker Image', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Backend Docker Image', 'FAILURE', 'danger')
                            }
                        }
                    }
                }

                stage('Frontend Docker Image') {
                    when {
                        expression { appOrPipelineChanged(['frontend/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    echo "========== Frontend Docker Image Packaging =========="

                                    if ! command -v docker >/dev/null 2>&1; then
                                        echo "Docker is not installed or not on PATH."
                                        exit 1
                                    fi

                                    docker --version

                                    docker build \
                                        --label "build.number=${BUILD_NUMBER}" \
                                        --label "build.timestamp=${BUILD_TIMESTAMP}" \
                                        -t "${IMAGE_NAME_FRONTEND}:${BUILD_NUMBER}" \
                                        -t "${IMAGE_NAME_FRONTEND}:latest" \
                                        -f frontend/Dockerfile \
                                        frontend

                                    docker images "${IMAGE_NAME_FRONTEND}" --format "table {{.Repository}}\\t{{.Tag}}\\t{{.ID}}\\t{{.Size}}"

                                    if command -v trivy >/dev/null 2>&1; then
                                        trivy image --severity HIGH,CRITICAL --exit-code 1 "${IMAGE_NAME_FRONTEND}:${BUILD_NUMBER}"
                                    else
                                        echo "Trivy not installed - skipping frontend image vulnerability scan."
                                    fi

                                    echo "========== Frontend Docker Packaging Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Frontend Docker Image Packaging ==========

                                    docker --version
                                    if errorlevel 1 (
                                        echo Docker is not installed or not on PATH.
                                        exit /b 1
                                    )

                                    docker build ^
                                        --label "build.number=%BUILD_NUMBER%" ^
                                        --label "build.timestamp=%BUILD_TIMESTAMP%" ^
                                        -t "%IMAGE_NAME_FRONTEND%:%BUILD_NUMBER%" ^
                                        -t "%IMAGE_NAME_FRONTEND%:latest" ^
                                        -f frontend\\Dockerfile ^
                                        frontend
                                    if errorlevel 1 exit /b 1

                                    docker images "%IMAGE_NAME_FRONTEND%"
                                    echo ========== Frontend Docker Packaging Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Frontend Docker Image', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Frontend Docker Image', 'FAILURE', 'danger')
                            }
                        }
                    }
                }

                stage('Database Docker Image') {
                    when {
                        expression { appOrPipelineChanged(['database/']) }
                    }
                    steps {
                        script {
                            if (isUnix()) {
                                sh '''
                                    set -eu

                                    echo "========== Database Docker Image Packaging =========="

                                    if ! command -v docker >/dev/null 2>&1; then
                                        echo "Docker is not installed or not on PATH."
                                        exit 1
                                    fi

                                    docker --version

                                    docker build \
                                        --label "build.number=${BUILD_NUMBER}" \
                                        --label "build.timestamp=${BUILD_TIMESTAMP}" \
                                        -t "${IMAGE_NAME_DATABASE}:${BUILD_NUMBER}" \
                                        -t "${IMAGE_NAME_DATABASE}:latest" \
                                        -f database/Dockerfile \
                                        database

                                    docker images "${IMAGE_NAME_DATABASE}" --format "table {{.Repository}}\\t{{.Tag}}\\t{{.ID}}\\t{{.Size}}"

                                    if command -v trivy >/dev/null 2>&1; then
                                        trivy image --severity HIGH,CRITICAL --exit-code 1 "${IMAGE_NAME_DATABASE}:${BUILD_NUMBER}"
                                    else
                                        echo "Trivy not installed - skipping database image vulnerability scan."
                                    fi

                                    echo "========== Database Docker Packaging Completed =========="
                                '''
                            } else {
                                bat '''
                                    @echo off
                                    echo ========== Database Docker Image Packaging ==========

                                    docker --version
                                    if errorlevel 1 (
                                        echo Docker is not installed or not on PATH.
                                        exit /b 1
                                    )

                                    docker build ^
                                        --label "build.number=%BUILD_NUMBER%" ^
                                        --label "build.timestamp=%BUILD_TIMESTAMP%" ^
                                        -t "%IMAGE_NAME_DATABASE%:%BUILD_NUMBER%" ^
                                        -t "%IMAGE_NAME_DATABASE%:latest" ^
                                        -f database\\Dockerfile ^
                                        database
                                    if errorlevel 1 exit /b 1

                                    docker images "%IMAGE_NAME_DATABASE%"
                                    echo ========== Database Docker Packaging Completed ==========
                                '''
                            }
                        }
                    }
                    post {
                        success {
                            script {
                                notifySlack('Database Docker Image', 'SUCCESS', 'good')
                            }
                        }
                        failure {
                            script {
                                notifySlack('Database Docker Image', 'FAILURE', 'danger')
                            }
                        }
                    }
                }
            }
            post {
                success {
                    script {
                        notifySlack('Package', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Package', 'FAILURE', 'danger')
                    }
                }
            }
        }

        stage('Archive') {
            when {
                expression { appOrPipelineChanged(['frontend/']) }
            }
            steps {
                script {
                    if (isUnix()) {
                        sh '''
                            set -eu

                            echo "========== Archiving Build Artifacts =========="
                            rm -rf build-artifacts
                            mkdir -p build-artifacts

                            tar -czf "build-artifacts/frontend-dist-${BUILD_NUMBER}.tar.gz" frontend/dist

                            cat > "build-artifacts/build-metadata-${BUILD_NUMBER}.txt" <<EOF
Build Information
=================
Build Number: ${BUILD_NUMBER}
Build Timestamp: ${BUILD_TIMESTAMP}
Workspace: ${WORKSPACE}
Node Version: ${NODE_VERSION}

Docker Images
=============
Backend Image: ${IMAGE_NAME_BACKEND}:${BUILD_NUMBER}
Frontend Image: ${IMAGE_NAME_FRONTEND}:${BUILD_NUMBER}
Database Image: ${IMAGE_NAME_DATABASE}:${BUILD_NUMBER}
EOF

                            docker images "${IMAGE_NAME_BACKEND}" > "build-artifacts/backend-images-${BUILD_NUMBER}.txt" || true
                            docker images "${IMAGE_NAME_FRONTEND}" > "build-artifacts/frontend-images-${BUILD_NUMBER}.txt" || true
                            docker images "${IMAGE_NAME_DATABASE}" > "build-artifacts/database-images-${BUILD_NUMBER}.txt" || true

                            ls -lh build-artifacts
                            echo "========== Archiving Completed =========="
                        '''
                    } else {
                        bat '''
                            @echo off
                            echo ========== Archiving Build Artifacts ==========

                            if exist build-artifacts rmdir /s /q build-artifacts
                            mkdir build-artifacts

                            powershell -NoProfile -Command "Compress-Archive -Path 'frontend\\dist\\*' -DestinationPath ('build-artifacts\\frontend-dist-' + $env:BUILD_NUMBER + '.zip') -Force"
                            if errorlevel 1 exit /b 1

                            (
                                echo Build Information
                                echo =================
                                echo Build Number: %BUILD_NUMBER%
                                echo Build Timestamp: %BUILD_TIMESTAMP%
                                echo Workspace: %WORKSPACE%
                                echo Node Version: %NODE_VERSION%
                                echo.
                                echo Docker Images
                                echo =============
                                echo Backend Image: %IMAGE_NAME_BACKEND%:%BUILD_NUMBER%
                                echo Frontend Image: %IMAGE_NAME_FRONTEND%:%BUILD_NUMBER%
                                echo Database Image: %IMAGE_NAME_DATABASE%:%BUILD_NUMBER%
                            ) > "build-artifacts\\build-metadata-%BUILD_NUMBER%.txt"

                            docker images "%IMAGE_NAME_BACKEND%" > "build-artifacts\\backend-images-%BUILD_NUMBER%.txt" 2>nul
                            docker images "%IMAGE_NAME_FRONTEND%" > "build-artifacts\\frontend-images-%BUILD_NUMBER%.txt" 2>nul
                            docker images "%IMAGE_NAME_DATABASE%" > "build-artifacts\\database-images-%BUILD_NUMBER%.txt" 2>nul

                            dir build-artifacts
                            echo ========== Archiving Completed ==========
                        '''
                    }

                    archiveArtifacts artifacts: 'build-artifacts/**/*', allowEmptyArchive: false, fingerprint: true
                }
            }
            post {
                success {
                    script {
                        notifySlack('Archive', 'SUCCESS', 'good')
                    }
                }
                failure {
                    script {
                        notifySlack('Archive', 'FAILURE', 'danger')
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo ''
                echo '========== Pipeline Execution Summary =========='
                echo "Build Number: ${env.BUILD_NUMBER}"
                echo "Result: ${currentBuild.currentResult}"
                echo "Duration: ${currentBuild.durationString}"
            }
        }
        success {
            script {
                echo 'Pipeline completed successfully.'
                echo "Docker Images Ready:"
                echo "  ${env.IMAGE_NAME_BACKEND}:${env.BUILD_NUMBER}"
                echo "  ${env.IMAGE_NAME_FRONTEND}:${env.BUILD_NUMBER}"
                echo "  ${env.IMAGE_NAME_DATABASE}:${env.BUILD_NUMBER}"
                notifySlack('Pipeline', 'SUCCESS', 'good')
            }
        }
        failure {
            script {
                echo 'Pipeline failed. Review the Jenkins console output for details.'
                notifySlack('Pipeline', 'FAILURE', 'danger')
            }
        }
    }
}
