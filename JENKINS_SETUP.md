## Jenkins Job Checklist

### 1) Prerequisites on Jenkins agent
- Install and verify: `git`, `node`, `npm`, `docker`, `docker compose`
- Ensure Jenkins service account can run Docker (Docker Desktop/daemon access)
- Confirm outbound internet access (for npm/docker pulls)

Quick checks on agent:
```bash
node --version
npm --version
docker --version
docker compose version
git --version
```

---

### 2) Create credentials in Jenkins
- Go to **Manage Jenkins -> Credentials -> (Global) -> Add Credentials**
- Add:
  - **Type:** Username with password
  - **ID:** `dockerhub-creds` (or your custom ID)
  - **Username:** your Docker Hub username
  - **Password:** Docker Hub token/password

---

### 3) Create Pipeline job
- **New Item -> Pipeline**
- Name: `dispatch-app-ci`
- In job config:
  - **Build Triggers**: keep manual first (enable webhook later)
  - **Pipeline**:
    - Definition: **Pipeline script from SCM**
    - SCM: **Git**
    - Repository URL: your repo URL
    - Credentials: repo credential (if private)
    - Branch specifier: `*/main` (or your branch)
    - Script Path: `Jenkinsfile`
- Save

---

### 4) Recommended job options
- Disable concurrent builds (already enforced in Jenkinsfile)
- Discard old builds (already enforced in Jenkinsfile)
- Keep workspace clean (optional plugin: `ws-cleanup`)

---

### 5) First run parameters
Run **Build with Parameters**:
- `PUSH_IMAGES=false`
- `DOCKERHUB_NAMESPACE=` (empty)
- `DOCKERHUB_CREDENTIALS_ID=dockerhub-creds`
- `IMAGE_TAG=` (empty; defaults to build number)

This validates CI only.

---

### 6) Enable Docker Hub push
Run again with:
- `PUSH_IMAGES=true`
- `DOCKERHUB_NAMESPACE=<your-dockerhub-username-or-org>`
- `DOCKERHUB_CREDENTIALS_ID=dockerhub-creds`
- `IMAGE_TAG=1.0.0` (optional)

Expected pushed images:
- `<namespace>/dispatch-frontend:<tag>`
- `<namespace>/dispatch-backend:<tag>`
- `<namespace>/dispatch-db:<tag>`

---

## Webhook Trigger Setup (GitHub)

### Jenkins side
- Open job -> **Configure**
- Enable **Build Triggers -> GitHub hook trigger for GITScm polling**

### GitHub side
- Repo -> **Settings -> Webhooks -> Add webhook**
- Payload URL: `http(s)://<jenkins-url>/github-webhook/`
- Content type: `application/json`
- Events: **Just the push event** (or push + PR if needed)
- Save and test delivery

---

## Branch Strategy (recommended)

- `main`: protected, deployable
- `develop`: integration branch
- `feature/*`: feature work
- `hotfix/*`: urgent fixes

CI strategy:
- Trigger full pipeline on `main` and `develop`
- For `feature/*`, run CI without push (`PUSH_IMAGES=false`)
- Only push/tag images from `main` (manual or gated)

---

## Optional Multibranch Pipeline (better long-term)

Use **Multibranch Pipeline** instead of single pipeline job:
- Auto-discovers branches/PRs
- Builds each branch using its own `Jenkinsfile`
- Works best with GitHub Branch Source plugin

---

## Troubleshooting quick checks

- Docker permission errors:
  - Ensure Jenkins user can access Docker daemon
- `docker compose` not found:
  - Install Compose v2 plugin
- NPM install failures:
  - Check proxy/firewall and Node version compatibility
- Webhook not triggering:
  - Verify Jenkins URL accessibility and webhook delivery logs in GitHub

---

If you want, I can also provide a hardened `Jenkinsfile` variant with:
- cached npm dependencies,
- parallel image builds,
- Trivy image scanning,
- and gated push only on `main`.
