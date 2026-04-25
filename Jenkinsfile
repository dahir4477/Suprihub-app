pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: "20"))
  }

  parameters {
    booleanParam(
      name: "PUSH_IMAGES",
      defaultValue: false,
      description: "Push built images to Docker Hub after CI passes."
    )
    string(
      name: "DOCKERHUB_NAMESPACE",
      defaultValue: "",
      description: "Docker Hub namespace (username or org). Required when PUSH_IMAGES=true."
    )
    string(
      name: "DOCKERHUB_CREDENTIALS_ID",
      defaultValue: "dockerhub-creds",
      description: "Jenkins credentials ID for Docker Hub username/password."
    )
    string(
      name: "IMAGE_TAG",
      defaultValue: "",
      description: "Image tag override. Leave empty to use BUILD_NUMBER."
    )
  }

  environment {
    FRONTEND_IMAGE = "dispatch-frontend"
    BACKEND_IMAGE = "dispatch-backend"
    DB_IMAGE = "dispatch-db"
  }

  stages {
    stage("Checkout") {
      steps {
        checkout scm
      }
    }

    stage("Resolve Tag") {
      steps {
        script {
          env.EFFECTIVE_TAG = params.IMAGE_TAG?.trim() ? params.IMAGE_TAG.trim() : env.BUILD_NUMBER
          echo "Using image tag: ${env.EFFECTIVE_TAG}"
        }
      }
    }

    stage("Tooling Check") {
      steps {
        script {
          if (isUnix()) {
            sh "node --version && npm --version && docker --version && docker compose version"
          } else {
            bat "node --version && npm --version && docker --version && docker compose version"
          }
        }
      }
    }

    stage("Install Dependencies") {
      parallel {
        stage("Frontend Install") {
          steps {
            dir("frontend") {
              script {
                if (isUnix()) {
                  sh "npm ci"
                } else {
                  bat "npm ci"
                }
              }
            }
          }
        }
        stage("Backend Install") {
          steps {
            dir("backend") {
              script {
                if (isUnix()) {
                  sh "npm ci"
                } else {
                  bat "npm ci"
                }
              }
            }
          }
        }
      }
    }

    stage("Build & Verify App") {
      steps {
        script {
          if (isUnix()) {
            sh "cd frontend && npm run build"
            sh "cd backend && node --check index.js"
          } else {
            bat "cd frontend && npm run build"
            bat "cd backend && node --check index.js"
          }
        }
      }
    }

    stage("Build Docker Images") {
      steps {
        script {
          if (isUnix()) {
            sh "docker build -t ${FRONTEND_IMAGE}:${EFFECTIVE_TAG} ./frontend"
            sh "docker build -t ${BACKEND_IMAGE}:${EFFECTIVE_TAG} ./backend"
            sh "docker build -t ${DB_IMAGE}:${EFFECTIVE_TAG} ./database"
          } else {
            bat "docker build -t %FRONTEND_IMAGE%:%EFFECTIVE_TAG% .\\frontend"
            bat "docker build -t %BACKEND_IMAGE%:%EFFECTIVE_TAG% .\\backend"
            bat "docker build -t %DB_IMAGE%:%EFFECTIVE_TAG% .\\database"
          }
        }
      }
    }

    stage("Compose Smoke Test (UI -> API -> DB)") {
      steps {
        script {
          if (isUnix()) {
            sh '''
              docker compose down -v || true
              docker compose up -d --build
              sleep 15
              curl -s -X POST "http://localhost:8080/api/submit" \
                -H "Content-Type: application/json" \
                -d '{"name":"Jenkins CI","email":"jenkins@example.com","message":"Smoke test"}'
              docker exec dispatch-db psql -U root -d dispatchdb -c "SELECT COUNT(*) AS total_submissions FROM submissions;"
            '''
          } else {
            bat '''
              docker compose down -v
              docker compose up -d --build
              timeout /t 15 /nobreak >nul
              powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=@{name='Jenkins CI';email='jenkins@example.com';message='Smoke test'}|ConvertTo-Json; Invoke-RestMethod -Uri 'http://localhost:8080/api/submit' -Method Post -ContentType 'application/json' -Body $b | ConvertTo-Json -Compress"
              docker exec dispatch-db psql -U root -d dispatchdb -c "SELECT COUNT(*) AS total_submissions FROM submissions;"
            '''
          }
        }
      }
    }

    stage("Push Docker Images") {
      when {
        expression { return params.PUSH_IMAGES }
      }
      steps {
        script {
          if (!params.DOCKERHUB_NAMESPACE?.trim()) {
            error("DOCKERHUB_NAMESPACE is required when PUSH_IMAGES=true")
          }
        }
        withCredentials([
          usernamePassword(
            credentialsId: params.DOCKERHUB_CREDENTIALS_ID,
            usernameVariable: "DOCKER_USER",
            passwordVariable: "DOCKER_PASS"
          )
        ]) {
          script {
            if (isUnix()) {
              sh '''
                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                docker tag ${FRONTEND_IMAGE}:${EFFECTIVE_TAG} ${DOCKERHUB_NAMESPACE}/${FRONTEND_IMAGE}:${EFFECTIVE_TAG}
                docker tag ${BACKEND_IMAGE}:${EFFECTIVE_TAG} ${DOCKERHUB_NAMESPACE}/${BACKEND_IMAGE}:${EFFECTIVE_TAG}
                docker tag ${DB_IMAGE}:${EFFECTIVE_TAG} ${DOCKERHUB_NAMESPACE}/${DB_IMAGE}:${EFFECTIVE_TAG}
                docker push ${DOCKERHUB_NAMESPACE}/${FRONTEND_IMAGE}:${EFFECTIVE_TAG}
                docker push ${DOCKERHUB_NAMESPACE}/${BACKEND_IMAGE}:${EFFECTIVE_TAG}
                docker push ${DOCKERHUB_NAMESPACE}/${DB_IMAGE}:${EFFECTIVE_TAG}
                docker logout
              '''
            } else {
              bat '''
                powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:DOCKER_PASS | docker login -u $env:DOCKER_USER --password-stdin"
                docker tag %FRONTEND_IMAGE%:%EFFECTIVE_TAG% %DOCKERHUB_NAMESPACE%/%FRONTEND_IMAGE%:%EFFECTIVE_TAG%
                docker tag %BACKEND_IMAGE%:%EFFECTIVE_TAG% %DOCKERHUB_NAMESPACE%/%BACKEND_IMAGE%:%EFFECTIVE_TAG%
                docker tag %DB_IMAGE%:%EFFECTIVE_TAG% %DOCKERHUB_NAMESPACE%/%DB_IMAGE%:%EFFECTIVE_TAG%
                docker push %DOCKERHUB_NAMESPACE%/%FRONTEND_IMAGE%:%EFFECTIVE_TAG%
                docker push %DOCKERHUB_NAMESPACE%/%BACKEND_IMAGE%:%EFFECTIVE_TAG%
                docker push %DOCKERHUB_NAMESPACE%/%DB_IMAGE%:%EFFECTIVE_TAG%
                docker logout
              '''
            }
          }
        }
      }
    }
  }

  post {
    always {
      script {
        if (isUnix()) {
          sh "docker compose down -v || true"
        } else {
          bat "docker compose down -v"
        }
      }
    }
    success {
      echo "CI pipeline completed successfully."
    }
    failure {
      echo "CI pipeline failed. Check stage logs."
    }
  }
}
