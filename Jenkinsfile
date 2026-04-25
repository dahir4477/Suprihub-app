pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: "20"))
  }

  parameters {
    string(
      name: "GIT_REPO_URL",
      defaultValue: "",
      description: "Optional Git repository URL for inline Pipeline jobs (leave empty for Pipeline script from SCM/Multibranch)."
    )
    string(
      name: "GIT_BRANCH",
      defaultValue: "main",
      description: "Git branch to checkout when GIT_REPO_URL is provided."
    )
    string(
      name: "GIT_CREDENTIALS_ID",
      defaultValue: "",
      description: "Optional Jenkins credentials ID for private Git repository checkout."
    )
  }

  stages {
    stage("Checkout") {
      steps {
        script {
          def scmCheckedOut = false

          try {
            checkout scm
            scmCheckedOut = true
            echo "Checked out via Jenkins SCM context."
          } catch (err) {
            echo "SCM context checkout not available: ${err.getMessage()}"
          }

          if (!scmCheckedOut) {
            if (params.GIT_REPO_URL?.trim()) {
              echo "Checking out from GIT_REPO_URL for inline Pipeline job."
              def remoteConfig = [url: params.GIT_REPO_URL.trim()]
              if (params.GIT_CREDENTIALS_ID?.trim()) {
                remoteConfig.credentialsId = params.GIT_CREDENTIALS_ID.trim()
              }
              checkout([
                $class: "GitSCM",
                branches: [[name: "*/${params.GIT_BRANCH}"]],
                userRemoteConfigs: [remoteConfig]
              ])
              scmCheckedOut = true
            } else if (fileExists("frontend/package.json") && fileExists("backend/package.json")) {
              echo "Using pre-populated workspace content."
              scmCheckedOut = true
            }
          }

          if (!scmCheckedOut) {
            error(
              "No source code available. Use either Pipeline script from SCM/Multibranch, or set GIT_REPO_URL (and optional GIT_CREDENTIALS_ID) for inline jobs."
            )
          }
        }
      }
    }

    stage("Build") {
      parallel {
        stage("Build Frontend") {
          steps {
            dir("frontend") {
              script {
                if (isUnix()) {
                  sh "node --version && npm --version"
                  if (fileExists("package-lock.json")) {
                    sh "npm ci"
                  } else {
                    sh "npm install"
                  }
                  sh "npm run build"
                } else {
                  bat "node --version && npm --version"
                  if (fileExists("package-lock.json")) {
                    bat "npm ci"
                  } else {
                    bat "npm install"
                  }
                  bat "npm run build"
                }
              }
            }
          }
        }

        stage("Build Backend") {
          steps {
            dir("backend") {
              script {
                if (isUnix()) {
                  sh "node --version && npm --version"
                  if (fileExists("package-lock.json")) {
                    sh "npm ci"
                  } else {
                    sh "npm install"
                  }
                  sh "node --check index.js"
                } else {
                  bat "node --version && npm --version"
                  if (fileExists("package-lock.json")) {
                    bat "npm ci"
                  } else {
                    bat "npm install"
                  }
                  bat "node --check index.js"
                }
              }
            }
          }
        }
      }
    }
  }

  post {
    success {
      echo "Build-only CI pipeline completed successfully."
    }
    failure {
      echo "Build-only CI pipeline failed. Check stage logs."
    }
  }
}
