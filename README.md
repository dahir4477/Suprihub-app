# Dispatch Application (Microservices + Kubernetes)

This project is a production-style dispatch application split into three microservices:

- `frontend` (React UI served by NGINX)
- `backend` (Node.js + Express REST API)
- `database` (PostgreSQL)

It provides an end-to-end flow:

`UI form -> POST /submit -> PostgreSQL -> persistent volume`

---

## 1) Project Structure

```text
C:\New-Supri-Hub-App
├── frontend/
├── backend/
├── database/
├── docker-compose.yml
├── k8s/
│   ├── deployments/
│   ├── services/
│   ├── storage/
│   └── configs/
└── README.md
```

---

## 2) Build Docker Images

From `C:\New-Supri-Hub-App`:

```powershell
docker build -t dispatch-frontend:latest .\frontend
docker build -t dispatch-backend:latest .\backend
docker build -t dispatch-db:latest .\database
```

Optional local stack test:

```powershell
docker compose up -d --build
docker compose ps
```

Frontend will be reachable at: `http://localhost:8080`

---

## 3) Deploy to Kubernetes

Make sure your local cluster can access local images (`minikube image load` or `kind load docker-image` if required).

Apply manifests in this order:

```powershell
kubectl apply -f .\k8s\storage\pv.yaml
kubectl apply -f .\k8s\storage\pvc.yaml
kubectl apply -f .\k8s\configs\db-secret.yaml
kubectl apply -f .\k8s\configs\backend-configmap.yaml
kubectl apply -f .\k8s\deployments\db-deployment.yaml
kubectl apply -f .\k8s\services\db-service.yaml
kubectl apply -f .\k8s\deployments\backend-deployment.yaml
kubectl apply -f .\k8s\services\backend-service.yaml
kubectl apply -f .\k8s\deployments\frontend-deployment.yaml
kubectl apply -f .\k8s\services\frontend-service.yaml
```

Optional future ingress (not required now):

```powershell
kubectl apply -f .\k8s\configs\ingress.yaml
```

---

## 4) Access Application (NodePort)

Get your node IP:

```powershell
kubectl get nodes -o wide
```

Open:

`http://<NODE_IP>:30080`

If using Docker Desktop Kubernetes locally, `http://localhost:30080` usually works.

---

## 5) Test Form Submission

1. Open the frontend NodePort URL.
2. Fill Name, Email, Message.
3. Click **Submit**.
4. Confirm success message appears.

Backend endpoint:

- `POST /submit`
- Validates input
- Saves to `submissions` table

To verify DB records:

```powershell
kubectl exec -it deploy/db-deployment -- psql -U root -d dispatchdb -c "SELECT id,name,email,message,created_at FROM submissions ORDER BY id DESC LIMIT 10;"
```

---

## 6) Verify Persistence After Pod Restart

1. Submit at least one form record.
2. Restart DB pod:

```powershell
kubectl delete pod -l app=dispatch-db
kubectl get pods -w
```

3. Re-run query:

```powershell
kubectl exec -it deploy/db-deployment -- psql -U root -d dispatchdb -c "SELECT COUNT(*) FROM submissions;"
```

If count is still present, persistence is working through `PersistentVolume` + `PersistentVolumeClaim`.

---

## 7) Service Networking Rules Implemented

- Frontend -> Backend via service name (`backend-service`) through NGINX proxy.
- Backend -> Database via service name (`db-service`).
- Internal services use `ClusterIP`.
- Frontend is externally exposed through `NodePort` (`30080`).

---

## 8) Scaling Notes

- Frontend and backend deployments run with multiple replicas.
- Database is single-replica and stateful via PVC.
- Ingress manifest is included as a placeholder for future external routing.

---

## 9) Jenkins CI Pipeline

This project includes a declarative pipeline at `Jenkinsfile`.

Recommended Jenkins job setup:

1. Create a **Pipeline** job.
2. Configure **Pipeline script from SCM** and point to this repository.
3. Set script path to `Jenkinsfile`.
4. Ensure Jenkins agent has `node`, `npm`, `docker`, and `docker compose`.

Pipeline stages:

- Checkout source
- Install frontend/backend dependencies
- Build frontend bundle and verify backend syntax
- Build Docker images for frontend/backend/database
- Run compose smoke test (`UI -> API -> DB`)
- Optional Docker Hub push (parameter-driven)

If pushing images:

- Add Jenkins credential (Username/Password) with ID `dockerhub-creds`
  - or set a different credential ID via `DOCKERHUB_CREDENTIALS_ID`
- Run with:
  - `PUSH_IMAGES=true`
  - `DOCKERHUB_NAMESPACE=<your-dockerhub-username-or-org>`
