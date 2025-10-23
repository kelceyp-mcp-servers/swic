# Helix Platform - Application Developer Guide

**Version**: 1.0
**Date**: 2025-10-07
**Audience**: Application developers building services on Helix platform
**Purpose**: Complete guide for deploying services - load this as a knowledge cartridge

---

## Quick Reference Card

**I want to...** | **Do this...**
---|---
Deploy a new service | Add code to `helix` repo → Add manifests to `helix-k8s` repo
Add secrets | Use GCP Secret Manager + Workload Identity (see [Secrets](#secrets-management))
Check build status | `gh run list --repo nc-helix/helix`
Check deployment | `kubectl get pods -n helix -l app=my-service`
View logs | `kubectl logs -n helix -l app=my-service -f`
Update env vars | Edit deployment.yaml in `helix-k8s` repo
Change resources | Edit deployment.yaml in `helix-k8s` repo (requests/limits)

---

## Understanding the Platform: The 3-Repository Model

### Critical Concept: Multiple Repositories

The Helix platform uses **3 separate Git repositories**. You will work in 2 of them:

```
┌─────────────────────────────────────────────────────────┐
│  1. nc-helix/helix (APPLICATION CODE)                   │
│     Your service code, Dockerfile, dependencies         │
│     └─ services/your-service/                           │
└─────────────────────────────────────────────────────────┘
                         ↓ (Automated CI/CD)
┌─────────────────────────────────────────────────────────┐
│  2. nc-helix/helix-k8s (DEPLOYMENT MANIFESTS)           │
│     Kubernetes YAML for deploying your service          │
│     └─ k8s/development/helix/your-service/              │
└─────────────────────────────────────────────────────────┘
                         ↓ (Config Sync watches this repo)
┌─────────────────────────────────────────────────────────┐
│  3. GKE Cluster (RUNNING SERVICES)                      │
│     Your service running in Kubernetes                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  nc-helix/helix-foundations (INFRASTRUCTURE)            │
│  ⚠️ PLATFORM TEAM ONLY - DON'T TOUCH                   │
└─────────────────────────────────────────────────────────┘
```

### Repository Details

#### Repository 1: helix (Application Code)
- **URL**: `https://github.com/nc-helix/helix`
- **Purpose**: Your service source code
- **You work here for**:
  - Writing application code
  - Creating/updating Dockerfiles
  - Adding dependencies (package.json, go.mod, etc.)
  - Unit tests
- **Directory structure**:
  ```
  helix/
  └── services/
      └── your-service/
          ├── Dockerfile          # Required
          ├── src/               # Your code
          ├── package.json       # Dependencies
          └── README.md          # Service docs
  ```

#### Repository 2: helix-k8s (Deployment Manifests)
- **URL**: `https://github.com/nc-helix/helix-k8s`
- **Purpose**: Kubernetes deployment configuration
- **You work here for**:
  - Deploying services to cluster
  - Setting environment variables
  - Configuring resource limits
  - Exposing services (HTTPRoutes)
  - Adding persistent storage
- **Directory structure**:
  ```
  helix-k8s/
  └── k8s/
      └── development/
          └── helix/
              └── your-service/
                  ├── deployment.yaml      # Pod configuration
                  ├── service.yaml         # Internal networking
                  ├── httproute.yaml       # External access
                  └── backend-policy-iap.yaml  # Authentication (optional)
  ```

#### Repository 3: helix-foundations (Infrastructure)
- **URL**: `https://github.com/nc-helix/helix-foundations`
- **Purpose**: Platform infrastructure (GCP, GKE, networking)
- **⚠️ DO NOT TOUCH**: Platform team only
- **Contains**: Terraform code for clusters, networks, IAM, etc.

---

## How Deployments Work: The Complete Flow

### The Automated Pipeline

```
1. YOU: Push code to helix/services/my-service/
   ↓
2. GITHUB ACTIONS: Detects change, builds Docker image
   ↓
3. ARTIFACT REGISTRY: Image stored with tag (commit SHA)
   ↓
4. GITHUB ACTIONS: Creates PR in helix-k8s updating image tag
   ↓
5. AUTO-MERGE: PR auto-merges (for main branch)
   ↓
6. CONFIG SYNC: Watches helix-k8s, detects change
   ↓
7. KUBERNETES: Deploys your service to cluster
   ↓
8. DONE: Service running at https://my-service.helix-development.nurturecloud.io
```

### Timeline Expectations

| Stage | Duration | What's Happening |
|-------|----------|------------------|
| Build | ~2 minutes | Docker image build + push to registry |
| Manifest Update | ~30 seconds | PR created and auto-merged in helix-k8s |
| Config Sync | ~60 seconds | Config Sync detects change and applies |
| Pod Startup | ~30 seconds | Kubernetes starts your pods |
| **TOTAL** | **~3-4 minutes** | From `git push` to service running |

### Image Tagging Convention

**Branch** | **Image Tag** | **Auto-Deploy?**
---|---|---
`main` | `abc1234` (commit SHA) | ✅ Yes - auto-merged
Pull Request | `pr-123-abc1234` | ❌ No - manual review
Feature branch | `feature-name-abc1234` | ❌ No - for testing

---

## Deploying Your First Service: Step-by-Step

### Prerequisites

```bash
# Clone both repositories
git clone https://github.com/nc-helix/helix.git
git clone https://github.com/nc-helix/helix-k8s.git

# Authenticate to GCP (for kubectl)
gcloud auth login
gcloud config set project nc-helix-development
gcloud container clusters get-credentials gke-autopilot \
  --region australia-southeast1 \
  --project nc-helix-development

# Verify access
kubectl get namespaces
# Should see: helix, gateway-system, platform, etc.
```

### Step 1: Add Service Code (helix repo)

```bash
cd helix
git checkout -b feature/add-my-service

# Create service directory
mkdir -p services/my-service
cd services/my-service

# Create your application code
# Example: src/index.ts, main.go, etc.

# Create Dockerfile (REQUIRED)
cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
EOF

# Test locally (optional but recommended)
docker build -t my-service:local .
docker run -p 8080:8080 my-service:local
curl http://localhost:8080/health  # Should return 200 OK

# Commit and push
git add services/my-service/
git commit -m "Add my-service application code"
git push origin feature/add-my-service

# Create PR, get approval, merge
gh pr create --title "Add my-service" --body "New service for X functionality"
```

**⏰ Wait for build**: Check GitHub Actions
```bash
gh run list --repo nc-helix/helix --limit 5
gh run watch  # Watch latest run
```

### Step 2: Add Deployment Manifests (helix-k8s repo)

```bash
cd ../helix-k8s
git checkout -b feature/add-my-service

# Create manifest directory
mkdir -p k8s/development/helix/my-service
cd k8s/development/helix/my-service
```

**Create deployment.yaml**:
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
        # ⚠️ NOTE: :latest tag will be auto-updated to commit SHA by CI/CD
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: PORT
          value: "8080"
        - name: LOG_LEVEL
          value: "info"
        # Add secrets here (see Secrets section)
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            # ⚠️ NO CPU LIMITS - harmful throttling
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

**Create service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: helix
  labels:
    app: my-service
spec:
  selector:
    app: my-service
  ports:
  - name: http
    port: 80
    targetPort: 8080
  type: ClusterIP
```

**Create httproute.yaml** (for external access):
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

**Commit and merge**:
```bash
git add k8s/development/helix/my-service/
git commit -m "Add my-service deployment manifests"
git push origin feature/add-my-service

# Create PR, get approval, merge
gh pr create --title "Add my-service manifests" \
  --body "Deployment configuration for my-service"
```

### Step 3: Verify Deployment

```bash
# Check Config Sync applied changes
kubectl get rootsync -n config-management-system root-sync -o yaml

# Check deployment exists
kubectl get deployment my-service -n helix

# Check pods are running
kubectl get pods -n helix -l app=my-service

# Should see:
# NAME                          READY   STATUS    RESTARTS   AGE
# my-service-xxxxx-yyyyy        1/1     Running   0          2m
# my-service-xxxxx-zzzzz        1/1     Running   0          2m

# Check service
kubectl get service my-service -n helix

# Check HTTPRoute
kubectl get httproute my-service -n helix

# Test your service
curl https://my-service.helix-development.nurturecloud.io/health
```

---

## Secrets Management

### ⚠️ CRITICAL RULES

❌ **NEVER** commit secrets to Git
❌ **NEVER** use `kubectl create secret` (bypasses GitOps)
✅ **ALWAYS** use GCP Secret Manager
✅ **ALWAYS** use Workload Identity for access

### How to Add Secrets

#### Step 1: Create Secret in GCP Secret Manager

```bash
# Create secret
gcloud secrets create my-service-db-password \
  --replication-policy="automatic" \
  --project=nc-helix-development

# Add secret value
echo -n "super-secret-password" | \
  gcloud secrets versions add my-service-db-password \
  --data-file=- \
  --project=nc-helix-development
```

#### Step 2: Grant Service Account Access

```bash
# Your service runs with this service account
SERVICE_ACCOUNT="my-service@nc-helix-development.iam.gserviceaccount.com"

# Grant access to secret
gcloud secrets add-iam-policy-binding my-service-db-password \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=nc-helix-development
```

#### Step 3: Create Kubernetes Service Account (helix-k8s repo)

**Create service-account.yaml**:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service
  namespace: helix
  annotations:
    iam.gke.io/gcp-service-account: my-service@nc-helix-development.iam.gserviceaccount.com
```

#### Step 4: Bind Workload Identity

```bash
# Allow Kubernetes SA to impersonate GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  my-service@nc-helix-development.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:nc-helix-development.svc.id.goog[helix/my-service]" \
  --project=nc-helix-development
```

#### Step 5: Reference Secret in Deployment

**Update deployment.yaml**:
```yaml
spec:
  template:
    spec:
      serviceAccountName: my-service  # Add this
      containers:
      - name: my-service
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: my-service-secrets
              key: password
```

**Create secret manifest using Config Connector**:

Create `k8s/development/helix/my-service/secret.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-service-secrets
  namespace: helix
type: Opaque
stringData:
  # Reference GCP Secret Manager
  # This requires External Secrets Operator OR manual management
  # For now, use kubectl to create from GCP:
  # gcloud secrets versions access latest --secret=my-service-db-password | kubectl create secret generic my-service-secrets --from-file=password=/dev/stdin -n helix
```

**Note**: Full Config Connector integration for secrets is a platform enhancement - coordinate with platform team.

---

## Resource Management

### CPU and Memory Guidelines

**Memory**:
- Set both `requests` and `limits`
- Request = minimum needed
- Limit = maximum allowed
- Start with: requests=128Mi, limits=256Mi
- Monitor and adjust

**CPU**:
- ✅ Set `requests`
- ❌ **DO NOT SET LIMITS** (causes harmful throttling)
- CPU is renewable - let pods use available cycles
- Start with: requests=100m (0.1 CPU)

```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    # NO cpu limit!
```

### Resource Sizing Guide

| Service Type | Memory Request | Memory Limit | CPU Request |
|--------------|----------------|--------------|-------------|
| Lightweight API | 64Mi | 128Mi | 50m |
| Typical Web Service | 128Mi | 256Mi | 100m |
| Data Processing | 256Mi | 512Mi | 250m |
| Heavy Workload | 512Mi | 1Gi | 500m |

**Monitor and adjust**:
```bash
# Check actual usage
kubectl top pods -n helix -l app=my-service

# If pods are OOMKilled or CPU throttled, increase requests/limits
```

---

## Health Checks (REQUIRED)

Your service **must** implement health check endpoints:

### /health (Liveness Probe)

**Purpose**: Is the process alive?
**When to return 200**: Process is running
**When to return 503**: Process is broken, restart me

```javascript
// Example (Node.js/Express)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
```

### /ready (Readiness Probe)

**Purpose**: Can I handle traffic?
**When to return 200**: All dependencies available, ready for requests
**When to return 503**: Not ready (database down, etc.) - don't send traffic

```javascript
// Example (Node.js/Express)
app.get('/ready', async (req, res) => {
  try {
    await db.ping();  // Check database
    await cache.ping();  // Check Redis
    res.status(200).send('Ready');
  } catch (error) {
    res.status(503).send('Not Ready');
  }
});
```

### Health Check Configuration

Already in your deployment.yaml:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30  # Wait for app to start
  periodSeconds: 10        # Check every 10s
  failureThreshold: 3      # Restart after 3 failures

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5   # Start checking quickly
  periodSeconds: 5         # Check every 5s
  failureThreshold: 3      # Remove from LB after 3 failures
```

---

## Service Dependencies (Database, Storage, etc.)

### Adding a Cloud SQL Database

**Option 1: Request from Platform Team** (Recommended for now)
- Create GitHub issue requesting database
- Platform team provisions via Terraform
- You get connection details

**Option 2: Config Connector** (Self-service, advanced)

Create `k8s/development/helix/my-service/database.yaml`:
```yaml
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLInstance
metadata:
  name: my-service-db
  namespace: helix
spec:
  databaseVersion: POSTGRES_14
  region: australia-southeast1
  settings:
    tier: db-f1-micro
    ipConfiguration:
      privateNetwork:
        name: default  # Use existing VPC
```

### Adding Pub/Sub Topic

Create `k8s/development/helix/my-service/pubsub.yaml`:
```yaml
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: my-service-events
  namespace: helix
---
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: my-service-events-sub
  namespace: helix
spec:
  topicRef:
    name: my-service-events
```

### Adding Storage Bucket

Create `k8s/development/helix/my-service/bucket.yaml`:
```yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-service-uploads
  namespace: helix
spec:
  location: australia-southeast1
  uniformBucketLevelAccess: true
```

---

## Making Changes

### Updating Code

```bash
cd helix
git checkout -b feature/update-my-service

# Make code changes
# Update tests

git commit -am "Update my-service: add new feature"
git push origin feature/update-my-service

# Create PR, merge
# New image automatically built and deployed
```

### Updating Configuration (Environment Variables, Resources)

```bash
cd helix-k8s
git checkout -b feature/update-my-service-config

# Edit deployment.yaml
# Change env vars, resources, replicas, etc.

git commit -am "Update my-service configuration"
git push origin feature/update-my-service-config

# Create PR, merge
# Config Sync applies changes (~60 seconds)
```

### What's Automatic vs Manual

| Field | Automatic? | Where to Change |
|-------|-----------|-----------------|
| Image tag | ✅ Auto-updated | Don't touch - CI/CD updates |
| Environment variables | ❌ Manual | helix-k8s: deployment.yaml |
| Resource limits | ❌ Manual | helix-k8s: deployment.yaml |
| Replicas | ❌ Manual | helix-k8s: deployment.yaml |
| Service ports | ❌ Manual | helix-k8s: service.yaml |
| Routes/domains | ❌ Manual | helix-k8s: httproute.yaml |
| Health check paths | ❌ Manual | helix-k8s: deployment.yaml |

---

## Monitoring and Troubleshooting

### Check Build Status

```bash
# List recent builds
gh run list --repo nc-helix/helix --limit 10

# Watch current build
gh run watch --repo nc-helix/helix

# View failed build logs
gh run view <run-id> --repo nc-helix/helix --log-failed
```

### Check Deployment Status

```bash
# Check Config Sync status
kubectl get rootsync -n config-management-system root-sync

# Check deployment
kubectl get deployment my-service -n helix

# Check pods
kubectl get pods -n helix -l app=my-service

# Describe pod (see events)
kubectl describe pod -n helix -l app=my-service

# Check specific pod
kubectl describe pod <pod-name> -n helix
```

### View Logs

```bash
# Tail logs from all pods
kubectl logs -n helix -l app=my-service -f --tail=100

# Logs from specific pod
kubectl logs -n helix <pod-name> -f

# Previous crashed container
kubectl logs -n helix <pod-name> --previous
```

### Common Issues

#### Pods Not Starting

```bash
# Check events
kubectl describe pod -n helix -l app=my-service

# Common causes:
# - ImagePullBackOff: Image doesn't exist (check build)
# - CrashLoopBackOff: App crashing (check logs)
# - Pending: Not enough resources (check node capacity)
```

#### Service Not Accessible

```bash
# Check HTTPRoute
kubectl get httproute my-service -n helix
kubectl describe httproute my-service -n helix

# Check Gateway
kubectl describe gateway helix-gateway -n gateway-system

# Check service endpoints
kubectl get endpoints my-service -n helix
# Should show pod IPs

# Test from inside cluster
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
# Inside pod:
wget -O- http://my-service.helix/health
```

#### High Memory/CPU Usage

```bash
# Check resource usage
kubectl top pods -n helix -l app=my-service

# If near limits, increase in deployment.yaml:
resources:
  requests:
    memory: "256Mi"  # Increased from 128Mi
    cpu: "200m"      # Increased from 100m
  limits:
    memory: "512Mi"  # Increased from 256Mi
```

---

## Environment Information

### Current State

**Only ONE environment exists**: `development`

| Aspect | Value |
|--------|-------|
| Environment | Development (auto-deploy) |
| GCP Project | nc-helix-development |
| Cluster | gke-autopilot |
| Region | australia-southeast1 |
| Namespace | helix |
| Domain | *.helix-development.nurturecloud.io |

**Production environment**: Not yet created

### Service URLs

Your service will be accessible at:
```
https://my-service.helix-development.nurturecloud.io
```

### Authentication

Services behind IAP (Identity-Aware Proxy) require:
1. Google account
2. IAM permission: `roles/iap.httpsResourceAccessor`

Contact platform team to add your account.

---

## Quick Troubleshooting Checklist

**Problem: Service not deploying**

- [ ] Check build succeeded: `gh run list --repo nc-helix/helix`
- [ ] Check image exists in registry: GCP Console → Artifact Registry
- [ ] Check helix-k8s PR merged: `gh pr list --repo nc-helix/helix-k8s`
- [ ] Check Config Sync status: `kubectl get rootsync -n config-management-system`
- [ ] Check pod status: `kubectl get pods -n helix -l app=my-service`
- [ ] Check pod events: `kubectl describe pod -n helix -l app=my-service`

**Problem: Pods crashing**

- [ ] Check logs: `kubectl logs -n helix -l app=my-service --tail=100`
- [ ] Check previous logs: `kubectl logs -n helix <pod> --previous`
- [ ] Verify health endpoints work: Test `/health` and `/ready`
- [ ] Check environment variables are correct
- [ ] Verify secrets are accessible (if using)
- [ ] Check resource limits (OOMKilled = increase memory)

**Problem: Can't access service externally**

- [ ] Check HTTPRoute exists: `kubectl get httproute my-service -n helix`
- [ ] Check HTTPRoute accepted: `kubectl describe httproute my-service -n helix`
- [ ] Check Gateway healthy: `kubectl get gateway -n gateway-system`
- [ ] Check DNS resolves: `nslookup my-service.helix-development.nurturecloud.io`
- [ ] Verify service has endpoints: `kubectl get endpoints my-service -n helix`

---

## Complete Example: Node.js Service

### Service Code (helix repo)

**services/example-api/package.json**:
```json
{
  "name": "example-api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

**services/example-api/src/index.js**:
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Health checks (REQUIRED)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/ready', (req, res) => {
  // Check dependencies here
  res.status(200).send('Ready');
});

// Your API
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Helix!' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

**services/example-api/Dockerfile**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

### Deployment Manifests (helix-k8s repo)

**k8s/development/helix/example-api/deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-api
  namespace: helix
  labels:
    app: example-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: example-api
  template:
    metadata:
      labels:
        app: example-api
    spec:
      containers:
      - name: example-api
        image: australia-southeast1-docker.pkg.dev/upside-ci/image-artifacts/example-api:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: PORT
          value: "8080"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
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

**k8s/development/helix/example-api/service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: example-api
  namespace: helix
spec:
  selector:
    app: example-api
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

**k8s/development/helix/example-api/httproute.yaml**:
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: example-api
  namespace: helix
spec:
  parentRefs:
  - name: helix-gateway
    namespace: gateway-system
  hostnames:
  - "example-api.helix-development.nurturecloud.io"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: example-api
      port: 80
```

---

## Getting Help

**Questions or Issues?**

1. **Check logs first**: Most issues are visible in pod logs
2. **Search existing issues**: [GitHub Issues](https://github.com/nc-helix/helix/issues)
3. **Create new issue**: Include pod name, logs, and what you tried
4. **Ask platform team**: For infrastructure-related questions

**Useful Links**:
- Helix repo: https://github.com/nc-helix/helix
- Helix-k8s repo: https://github.com/nc-helix/helix-k8s
- GCP Console: https://console.cloud.google.com (project: nc-helix-development)

---

## Key Takeaways for AI Agents

**When asked to "deploy a service":**

1. ✅ Create code in `helix` repository under `services/`
2. ✅ Create manifests in `helix-k8s` repository under `k8s/development/helix/`
3. ✅ Use GCP Secret Manager for secrets (never in Git)
4. ✅ Implement /health and /ready endpoints
5. ✅ Set memory requests and limits
6. ✅ Set CPU requests (NO limits)
7. ✅ Wait 3-4 minutes for full deployment

**Don't do:**
- ❌ Run `kubectl apply` directly (bypasses GitOps)
- ❌ Build Docker images manually (CI/CD handles this)
- ❌ Push images to registry manually
- ❌ Create workflows in .github/workflows/ (centralized)
- ❌ Commit secrets to Git
- ❌ Set CPU limits
- ❌ Touch helix-foundations repository

**The workflow is always:**
```
Code in helix → Manifests in helix-k8s → CI/CD → Deployed
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-07
**Maintained By**: Platform Team
**Feedback**: Create issue in nc-helix/helix repository
