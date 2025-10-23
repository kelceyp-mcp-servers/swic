# Helix Platform - Deployment Guide

> **Note**: This is an unofficial guide based on our current understanding of the platform. It will be updated as we learn more and as the platform evolves.

**Last Updated**: 2025-10-07
**Audience**: Application developers deploying services on Helix

---

## Quick Reference

**Task** | **Command/Action**
---|---
Deploy service | Add code to `helix` repo → Add manifests to `helix-k8s` repo
Add secrets | GCP Secret Manager + Workload Identity
Check build | `gh run list --repo nc-helix/helix`
Check deployment | `kubectl get pods -n helix -l app=my-service`
View logs | `kubectl logs -n helix -l app=my-service -f`
Update env vars | Edit deployment.yaml in `helix-k8s`
Change resources | Edit deployment.yaml in `helix-k8s`

---

## The 3-Repository Model

The Helix platform uses 3 separate Git repositories:

```
┌─────────────────────────────────────────────┐
│  1. helix - Application Code                │
│     services/your-service/                  │
└─────────────────────────────────────────────┘
                  ↓ CI/CD
┌─────────────────────────────────────────────┐
│  2. helix-k8s - Deployment Manifests        │
│     k8s/development/helix/your-service/     │
└─────────────────────────────────────────────┘
                  ↓ Config Sync
┌─────────────────────────────────────────────┐
│  3. GKE Cluster - Running Services          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  helix-foundations - Infrastructure         │
│  Platform team only                         │
└─────────────────────────────────────────────┘
```

### Repository 1: helix
- **URL**: `https://github.com/nc-helix/helix`
- **Contains**: Service code, Dockerfiles, dependencies, tests
- **Structure**: `services/your-service/`

### Repository 2: helix-k8s
- **URL**: `https://github.com/nc-helix/helix-k8s`
- **Contains**: Kubernetes manifests
- **Structure**: `k8s/development/helix/your-service/`

### Repository 3: helix-foundations
- **URL**: `https://github.com/nc-helix/helix-foundations`
- **Contains**: GCP/GKE infrastructure (Terraform)
- **Access**: Platform team only

---

## Deployment Flow

```
1. Push code to helix/services/my-service/
   ↓
2. GitHub Actions builds Docker image
   ↓
3. Image pushed to Artifact Registry (commit SHA tag)
   ↓
4. PR created in helix-k8s updating image tag
   ↓
5. PR auto-merges (for main branch)
   ↓
6. Config Sync detects change
   ↓
7. Service deployed to GKE
   ↓
8. Available at https://my-service.helix-development.nurturecloud.io
```

**Timeline**: ~3-4 minutes from push to running service

**Image Tags**:
- Main branch: `<commit-sha>` → auto-deployed
- PR branch: `pr-<number>-<sha>` → manual review
- Other branches: Skipped

---

## Prerequisites

```bash
# Clone both repositories
git clone https://github.com/nc-helix/helix.git
git clone https://github.com/nc-helix/helix-k8s.git

# Authenticate to GCP
gcloud auth login
gcloud config set project nc-helix-development
gcloud container clusters get-credentials gke-autopilot \
  --region australia-southeast1 \
  --project nc-helix-development

# Verify access
kubectl get namespaces
```

---

## Step-by-Step: Deploy Your First Service

### Step 1: Add Service Code (helix repo)

```bash
cd helix
git checkout -b feature/add-my-service

# Create service directory
mkdir -p services/my-service
cd services/my-service

# Add your code, package.json, etc.

# Create Dockerfile (required)
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
EOF

# Test locally
docker build -t my-service:local .
docker run -p 8080:8080 my-service:local
curl http://localhost:8080/health

# Commit and push
git add services/my-service/
git commit -m "Add my-service"
git push origin feature/add-my-service

# Create PR, get approval, merge
gh pr create --title "Add my-service" --body "New service"
```

**Wait for build**: Check with `gh run list --repo nc-helix/helix --limit 5`

### Step 2: Add Deployment Manifests (helix-k8s repo)

```bash
cd ../helix-k8s
git checkout -b feature/add-my-service

mkdir -p k8s/development/helix/my-service
cd k8s/development/helix/my-service
```

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: helix
  labels:
    app: my-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      - name: my-service
        image: australia-southeast1-docker.pkg.dev/upside-ci/image-artifacts/my-service:latest
        # Note: :latest will be auto-updated to commit SHA by CI/CD
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: PORT
          value: "8080"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            # No CPU limits (causes throttling)
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

**service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: helix
spec:
  selector:
    app: my-service
  ports:
  - name: http
    port: 80
    targetPort: 8080
  type: ClusterIP
```

**httproute.yaml**:
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-service
  namespace: helix
spec:
  parentRefs:
  - name: helix-gateway
    namespace: gateway-system
  hostnames:
  - "my-service.helix-development.nurturecloud.io"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: my-service
      port: 80
```

```bash
# Commit and merge
git add k8s/development/helix/my-service/
git commit -m "Add my-service manifests"
git push origin feature/add-my-service

gh pr create --title "Add my-service manifests" \
  --body "Deployment configuration for my-service"
```

### Step 3: Verify Deployment

```bash
# Check Config Sync
kubectl get rootsync -n config-management-system root-sync -o yaml

# Check deployment
kubectl get deployment my-service -n helix

# Check pods
kubectl get pods -n helix -l app=my-service

# Check service
kubectl get service my-service -n helix

# Check HTTPRoute
kubectl get httproute my-service -n helix

# Test
curl https://my-service.helix-development.nurturecloud.io/health
```

---

## Secrets Management

### Create Secret in GCP Secret Manager

```bash
# Create secret
gcloud secrets create my-service-db-password \
  --replication-policy="automatic" \
  --project=nc-helix-development

# Add value
echo -n "super-secret-password" | \
  gcloud secrets versions add my-service-db-password \
  --data-file=- \
  --project=nc-helix-development
```

### Grant Service Account Access

```bash
SERVICE_ACCOUNT="my-service@nc-helix-development.iam.gserviceaccount.com"

gcloud secrets add-iam-policy-binding my-service-db-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=nc-helix-development
```

### Create Kubernetes Service Account

**service-account.yaml**:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service
  namespace: helix
  annotations:
    iam.gke.io/gcp-service-account: my-service@nc-helix-development.iam.gserviceaccount.com
```

### Bind Workload Identity

```bash
gcloud iam service-accounts add-iam-policy-binding \
  my-service@nc-helix-development.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:nc-helix-development.svc.id.goog[helix/my-service]" \
  --project=nc-helix-development
```

### Reference Secret in Deployment

Update deployment.yaml:
```yaml
spec:
  template:
    spec:
      serviceAccountName: my-service
      containers:
      - name: my-service
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: my-service-secrets
              key: password
```

---

## Resource Management

### Memory
- Set both requests and limits
- Start with: requests=128Mi, limits=256Mi
- Monitor and adjust

### CPU
- Set requests only (no limits)
- CPU limits cause harmful throttling
- Start with: requests=100m

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    # No cpu limit
```

### Resource Sizing

**Service Type** | **Memory Request** | **Memory Limit** | **CPU Request**
---|---|---|---
Lightweight API | 64Mi | 128Mi | 50m
Typical Web Service | 128Mi | 256Mi | 100m
Data Processing | 256Mi | 512Mi | 250m
Heavy Workload | 512Mi | 1Gi | 500m

---

## Health Checks

Your service must implement these endpoints:

### /health (Liveness)
- Returns 200 if process is alive
- Keep lightweight (< 100ms)

```javascript
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
```

### /ready (Readiness)
- Returns 200 if ready for traffic
- Check dependencies (database, etc.)
- Can be slower (< 1s)

```javascript
app.get('/ready', async (req, res) => {
  try {
    await db.ping();
    res.status(200).send('Ready');
  } catch (error) {
    res.status(503).send('Not Ready');
  }
});
```

---

## Making Changes

### Update Code
```bash
cd helix
git checkout -b feature/update-my-service
# Make changes
git commit -am "Update my-service: add feature"
git push origin feature/update-my-service
# Create PR, merge - new image automatically built and deployed
```

### Update Configuration
```bash
cd helix-k8s
git checkout -b feature/update-my-service-config
# Edit deployment.yaml (env vars, resources, etc.)
git commit -am "Update my-service config"
git push origin feature/update-my-service-config
# Create PR, merge - Config Sync applies changes (~60s)
```

### What's Automatic vs Manual

**Field** | **Automatic?** | **Where to Change**
---|---|---
Image tag | Yes | Don't touch - CI/CD updates
Environment variables | No | helix-k8s: deployment.yaml
Resource limits | No | helix-k8s: deployment.yaml
Replicas | No | helix-k8s: deployment.yaml
Service ports | No | helix-k8s: service.yaml
Routes/domains | No | helix-k8s: httproute.yaml

---

## Troubleshooting

### Pods Not Starting

```bash
# Check events
kubectl describe pod -n helix -l app=my-service

# Common causes:
# - ImagePullBackOff: Image doesn't exist
# - CrashLoopBackOff: App crashing (check logs)
# - Pending: Not enough resources
```

### Service Not Accessible

```bash
# Check HTTPRoute
kubectl describe httproute my-service -n helix

# Check service endpoints
kubectl get endpoints my-service -n helix

# Test from inside cluster
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
wget -O- http://my-service.helix/health
```

### View Logs

```bash
# Tail logs
kubectl logs -n helix -l app=my-service -f --tail=100

# Previous crash
kubectl logs -n helix <pod-name> --previous
```

### Check Build Status

```bash
# List builds
gh run list --repo nc-helix/helix --limit 10

# View failed logs
gh run view <run-id> --repo nc-helix/helix --log-failed
```

---

## Environment Information

**Current State**: Only `development` environment exists

**Aspect** | **Value**
---|---
Environment | Development (auto-deploy)
GCP Project | nc-helix-development
Cluster | gke-autopilot
Region | australia-southeast1
Namespace | helix
Domain | *.helix-development.nurturecloud.io

**Production**: Not yet created

---

## Key Takeaways

**When deploying a service:**
1. Create code in `helix` repo under `services/`
2. Create manifests in `helix-k8s` repo under `k8s/development/helix/`
3. Use GCP Secret Manager for secrets (never commit to Git)
4. Implement `/health` and `/ready` endpoints
5. Set memory requests and limits
6. Set CPU requests (no limits)
7. Wait ~3-4 minutes for full deployment

**Don't:**
- Run `kubectl apply` directly (bypasses GitOps)
- Build Docker images manually (CI/CD handles this)
- Push images to registry manually
- Commit secrets to Git
- Set CPU limits
- Touch helix-foundations repo

**The workflow:**
```
Code in helix → Manifests in helix-k8s → CI/CD → Deployed
```

---

## References

- helix repo: https://github.com/nc-helix/helix
- helix-k8s repo: https://github.com/nc-helix/helix-k8s
- GCP Console: https://console.cloud.google.com (project: nc-helix-development)
- Original comprehensive guide: `APP_DEVELOPER_GUIDE.md` (backup: `.md.backup`)
