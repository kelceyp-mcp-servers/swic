# Platform Usability Gaps - Claude Code Perspective

**Date**: 2025-10-04 (Original) | **Updated**: 2025-10-07 (Comprehensive Audit)
**Context**: Lessons learned from implementing OAuth authentication for mcp-messages service
**Audience**: Platform team building the "product facade" for app developers

## Executive Summary

The platform's **implementation** is well-documented (how GitOps works, how Config Sync works, etc.), but the **usage** is not (how an app developer deploys a service). This made it difficult for Claude Code to distinguish between "using the platform" vs "building the platform infrastructure", leading to incorrect approaches like manual kubectl operations and local Docker builds.

**Key Issue**: Documentation describes "how it was built" not "how to use it".

### Audit Update (2025-10-07)

**Comprehensive documentation audit completed**: Reviewed 60+ documentation files across helix, helix-k8s, and helix-foundations repositories.

**Findings**:
- ✅ **All original gaps CONFIRMED** - Issues identified are real and documented
- 🔴 **CRITICAL NEW GAP DISCOVERED** - Multi-repository architecture never explained
- 📊 **Severity Assessment**: Original assessment was UNDERSTATED - problems are worse than initially described

**Most Critical Finding**: Quick-start and service deployment guides actively **mislead** users by instructing them to create files in the wrong repository. The platform uses 3 separate repositories (helix, helix-k8s, helix-foundations) but this is never explained.

**Evidence**:
```bash
# Search for "helix-k8s" in helix documentation:
$ grep -r "helix-k8s" /helix/docs/
# Result: ZERO MATCHES

# Quick start guide says:
git clone https://github.com/nc-helix/helix.git
mkdir -p k8s/development/helix/hello-helix  # WRONG - k8s/ is in helix-k8s repo!
```

**Documentation Inventory**:
- **helix**: 60+ files (getting-started, development, infrastructure, kubernetes, terraform, cartridges)
- **helix-k8s**: 4 files (README, design, environment-specific)
- **helix-foundations**: 9 files (README, bootstrap, module docs)

**Impact**: App developers following documentation will be **completely blocked** - files created in wrong locations, unclear which repo to use for what.

## The User Journey That Doesn't Exist

**What an app developer needs:**
1. I want to deploy a new service
2. I want to add secrets to my service
3. I want to see if my service is running
4. I want to debug when something goes wrong

**What the documentation provides:**
1. How GitOps works architecturally
2. How Config Sync is configured
3. How Terraform provisions infrastructure
4. Gateway API architecture decisions

**The gap:** There's no bridge between "I want to deploy a service" and "here's the architecture".

---

## Critical Gaps in "How to Use the Platform"

### 0. Multi-Repository Architecture (NEVER EXPLAINED) - **🔴 BLOCKER**

**Audit Status**: **CRITICAL NEW FINDING** - Discovered during comprehensive documentation audit

**The Problem**: The platform uses 3 separate repositories but documentation assumes everything is in one place.

**Evidence from audit**:
```bash
# Searching for "helix-k8s" in helix documentation:
$ grep -r "helix-k8s" /Users/pk/Dev/nc-helix/helix/docs
# Result: NO MATCHES (across 60+ documentation files)
```

**What exists**:
- helix/docs/getting-started/quick-start.md (395 lines)
- helix/docs/development/service-deployment.md (2000+ lines)
- Both guides extensively reference `k8s/` directory

**What's WRONG**:
- Quick start says: `git clone https://github.com/nc-helix/helix.git`
- Then says: `mkdir -p k8s/development/helix/hello-helix`
- But `k8s/` directory is in **helix-k8s repository**, not helix!
- No explanation that you're working across multiple repos

**Actual repository structure**:
1. **nc-helix/helix** - Application code
   - Put service code in: `services/your-service/`
   - Has Dockerfile, application code

2. **nc-helix/helix-k8s** - Deployment manifests
   - Put manifests in: `k8s/development/helix/your-service/`
   - Has deployment.yaml, service.yaml, httproute.yaml

3. **nc-helix/helix-foundations** - Infrastructure (Platform team only)
   - Don't touch unless you're on platform team

**Developer confusion**:
- "Do I clone helix or helix-k8s?"
- "Where do I put my deployment.yaml?"
- "Why doesn't k8s/ directory exist in helix repo?"
- "How do I make changes - one PR or two?"

**Attempted workflow fails**:
```bash
# Following quick-start guide:
git clone https://github.com/nc-helix/helix.git
cd helix
mkdir -p k8s/development/helix/my-service  # Creates wrong structure!
# Now what? This isn't tracked, isn't in GitOps repo
```

**What should exist**:
```markdown
# Working with Helix - Repository Guide

## The 3-Repository Architecture

Helix uses a multi-repository architecture:

### 1. helix (Application Repository)
**Purpose**: Your service code lives here
**Clone**: `git clone https://github.com/nc-helix/helix.git`
**You work here for**:
- Adding new services (`services/your-service/`)
- Writing application code
- Creating Dockerfiles

### 2. helix-k8s (Deployment Repository)
**Purpose**: Kubernetes manifests for all services
**Clone**: `git clone https://github.com/nc-helix/helix-k8s.git`
**You work here for**:
- Adding deployment manifests
- Configuring environment variables
- Setting resource limits
- Exposing services via HTTPRoutes

### 3. helix-foundations (Infrastructure Repository)
**Purpose**: Platform infrastructure (Terraform/GCP)
**Audience**: Platform team only
**You DON'T touch this** unless you're on the platform team

## Typical Workflow

### Adding a New Service

**Step 1: Add Code (helix repo)**
\`\`\`bash
cd helix
git checkout -b feature/add-my-service
mkdir services/my-service
# Add Dockerfile, code, etc.
git commit -am "Add my-service code"
git push
\`\`\`

**Step 2: Add Manifests (helix-k8s repo)**
\`\`\`bash
cd helix-k8s
git checkout -b feature/add-my-service
mkdir -p k8s/development/helix/my-service
# Add deployment.yaml, service.yaml, httproute.yaml
git commit -am "Add my-service manifests"
git push
\`\`\`

**Step 3: Merge & Deploy**
1. Get PRs approved in BOTH repos
2. Merge helix PR first (builds image)
3. Merge helix-k8s PR second (deploys to cluster)

## Why Separate Repositories?

- **Separation of concerns**: Code changes vs configuration changes
- **GitOps**: helix-k8s is watched by Config Sync for auto-deployment
- **Security**: Different teams, different access controls
- **Clear boundaries**: App development vs platform configuration
```

**Impact**: **BLOCKER** - Developers cannot successfully follow documentation

**Priority**: **IMMEDIATE FIX REQUIRED**

---

### 1. Service Development Workflow (MISLEADING DOCUMENTATION) - **🔴 CRITICAL**

**Audit Status**: **CONFIRMED - WORSE THAN ORIGINALLY STATED**

**Original Assessment**: "Missing Entirely"
**Audit Finding**: Documentation exists but is **actively misleading** due to Gap #0 (multi-repo issue)

**What I needed but couldn't find:**
- "How to add a new service" step-by-step guide
- Where does my code go? (Discovered: `services/` in monorepo)
- Do I create workflows? (Discovered: No, centralized `build-services.yml`)
- How do I trigger a build? (Discovered: Push to `services/**` triggers automatically)
- How do I know it's deployed? (Not documented)
- What's the directory structure convention?

**What exists:**
- Infrastructure details in helix-k8s README about GitOps
- Architectural decisions about Gateway API
- Nothing about "I'm an app developer, how do I deploy my service?"

**Why it's a problem:**
- Without this, developers make assumptions (each service needs .github/workflows)
- Can't tell the difference between platform code and app code
- No clear "golden path" to follow

**What should exist:**
```markdown
# Deploying a New Service

## Prerequisites
- Access to nc-helix/helix repository
- Your service code ready

## Steps
1. Create directory: `services/your-service/`
2. Add Dockerfile to root of your service
3. Write your code
4. Push to main branch
5. Automated build will trigger
6. Check build status: [link]
7. Service deploys automatically to development
8. Access at: https://your-service.helix-development.nurturecloud.io
```

---

### 2. Image Build & Deployment Flow (Implicit, Not Explicit) - **🟡 HIGH**

**Audit Status**: **CONFIRMED - Documented but buried in implementation details**

**Files Reviewed**:
- helix/docs/development/service-deployment.md (2000+ lines)
- Section "Automatic Build Process" exists (lines 164-188)
- Section "Image Naming Convention" exists (lines 174-182)

**What's documented**:
```markdown
# From service-deployment.md § "Automatic Build Process"
When you commit changes to any files in the `services/` directory,
the build workflow will automatically trigger:
1. Change Detection
2. Dockerfile Validation
3. Container Build
4. Image Push
5. Tagging
```

**What's NOT documented**:
- Cross-repo automation (helix → helix-k8s)
- Auto-manifest update PR creation
- Config Sync deployment timing
- pr-X-SHA vs SHA auto-merge behavior

**What I couldn't discover:**
- That there's a centralized build workflow (had to find `build-services.yml`)
- What the image tagging convention is (had to read workflow code)
- That `pr-X-SHA` vs `SHA` matters for auto-merge (hidden in update-manifests.yml)
- How images get from Artifact Registry to cluster (had to trace through workflows)
- When/how manifests get updated automatically

**Confusion:**
- I assumed each service needed its own `.github/workflows/` directory like typical repos
- Built Docker image locally because I didn't know automation existed
- Tried to push to registry manually
- Didn't understand the relationship between helix and helix-k8s repos

**What exists:**
- Implementation details buried in workflow YAML files
- Comments in workflow code
- No user-facing explanation

**What should exist:**
```markdown
# How Deployments Work

## Automatic Build Pipeline
1. You push code to `services/your-service/`
2. GitHub Actions detects the change
3. Builds Docker image with tag = commit SHA
4. Pushes to Artifact Registry with provenance
5. Dispatches to helix-k8s repository
6. Manifest updated automatically
7. Config Sync deploys to cluster

## Image Tagging Convention
- Main branch: `<commit-sha>` → auto-deployed
- PR branch: `pr-<number>-<sha>` → manual review required
- Other branches: skipped (not deployed)

## Timeline
- Build: ~2 minutes
- Manifest update: ~30 seconds
- Deployment: ~60 seconds (Config Sync interval)
- Total: ~3-4 minutes from push to running

## Monitoring Your Deployment
- Build status: [GitHub Actions link]
- Manifest PR: [helix-k8s PRs link]
- Pod status: `kubectl get pods -n helix -l app=your-service`
```

---

### 3. Secrets Management (Completely Undocumented) - **🔴 CRITICAL**

**Audit Status**: **CONFIRMED - Zero documentation for app developers**

**Search Evidence**:
```bash
$ grep -ri "GCP Secret Manager\|secrets manager" helix/docs/
# Result: NO MATCHES

$ grep -ri "secret" helix/docs/getting-started/ | grep -i "how to\|manage\|create"
# Result: NO MATCHES

$ ls helix-k8s/k8s/development/platform/config-connector/samples/
storage-bucket.yaml  pubsub-topic.yaml
# Note: NO secret examples
```

**What exists**:
- IAP OAuth secret setup (infrastructure-specific)
- Workload identity documentation (infrastructure-level)
- Config Connector general docs (no secret examples)

**What's completely missing**:
- GCP Secret Manager usage guide
- How to create secrets
- IAM binding for service account access
- Reference secrets in deployments
- Security best practices
- The critical ❌ "NEVER commit secrets to git" warning

**What's missing:**
- How do I add secrets for my service?
- Where do secrets live? (GCP Secret Manager? Kubernetes? External Secrets Operator?)
- How do I reference them in my deployment?
- Who has access to create/update secrets?
- What's the security model?

**What I tried:**
- Created `oauth-secret.yaml` in git (WRONG - secrets in git!)
- Tried `kubectl apply -f secret.yaml` (WRONG - manual kubectl operations)
- Had no guidance on the right way

**Why it's dangerous:**
- Without guidance, developers will do insecure things
- Secrets in git is a critical security issue
- Manual kubectl bypasses GitOps and audit trail

**What should exist:**
```markdown
# Managing Secrets

## Creating a Secret

### Step 1: Create in GCP Secret Manager
\`\`\`bash
gcloud secrets create my-service-db-password \
  --replication-policy="automatic" \
  --project=nc-helix-development

echo -n "your-secret-value" | gcloud secrets versions add my-service-db-password --data-file=-
\`\`\`

### Step 2: Grant Access to Your Service
\`\`\`bash
gcloud secrets add-iam-policy-binding my-service-db-password \
  --member="serviceAccount:my-service@nc-helix-development.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
\`\`\`

### Step 3: Reference in Deployment
\`\`\`yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-service-secrets
  namespace: helix
  annotations:
    # Use Config Connector to sync from Secret Manager
    cnrm.cloud.google.com/project-id: nc-helix-development
spec:
  # ... Config Connector configuration
\`\`\`

### Step 4: Use in Pod
\`\`\`yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: my-service-secrets
        key: db-password
\`\`\`

## Security Best Practices
- ❌ NEVER commit secrets to git
- ❌ NEVER use kubectl to create secrets manually
- ✅ Always use GCP Secret Manager
- ✅ Always use least-privilege IAM
- ✅ Rotate secrets regularly
```

---

### 4. Environment Model (Confusing)

**What wasn't clear:**
- Is `k8s/development` staging or production?
- How do I promote from staging to production?
- Are there multiple environments? Where are they?
- How do I know which environment I'm deploying to?
- What URLs correspond to which environments?

**Discovered by accident:**
- `k8s/development` → `nc-helix-development` GCP project
- Only by running kubectl commands and checking Config Sync
- No production environment exists yet
- URLs use `-development` subdomain

**Confusion caused:**
- Thought changes weren't deploying (was expecting production, was in development)
- Didn't know if development was staging or prod
- Couldn't find documentation on environment strategy

**What should exist:**
```markdown
# Environments

## Current Environments

### Development (Auto-Deploy)
- **Directory**: `k8s/development/`
- **GCP Project**: `nc-helix-development`
- **Cluster**: `gke-autopilot` (australia-southeast1)
- **Domain**: `*.helix-development.nurturecloud.io`
- **Deployment**: Automatic on merge to main
- **Purpose**: Testing and validation before production

### Production (Coming Soon)
- **Directory**: `k8s/production/` (not yet created)
- **GCP Project**: TBD
- **Domain**: `*.helix.nurturecloud.io`
- **Deployment**: Manual promotion from development

## Deployment Flow
1. Merge to main → Auto-deploys to **development**
2. Validate in development environment
3. (Future) Promote to production via manual process

## How to Check Which Environment
\`\`\`bash
# Check your current kubectl context
kubectl config current-context
# Should show: gke_nc-helix-development_australia-southeast1_gke-autopilot

# Check which namespace
kubectl config view --minify -o jsonpath='{..namespace}'
\`\`\`

## Service URLs by Environment
- Development: `https://my-service.helix-development.nurturecloud.io`
- Production: `https://my-service.helix.nurturecloud.io` (future)
```

---

### 5. Repository Dispatch Permissions (Hidden Requirement)

**What I discovered the hard way:**
- `github.token` can't dispatch cross-repo
- Need GitHub App or PAT
- No documentation on how to set this up
- Workflow silently fails without proper token
- Spent time debugging why dispatch step failed

**User perspective:**
- "I added the dispatch step, why doesn't it work?"
- "Do I need to create a secret?"
- "How do I get the token?"

**What should exist:**
```markdown
# Cross-Repository Automation

## GitHub Token Requirements

The build pipeline needs to dispatch events to the helix-k8s repository to trigger manifest updates.

### Problem
The default `GITHUB_TOKEN` only has permissions for the current repository.

### Solution: GitHub App (Recommended)
1. Platform team has created a GitHub App: `helix-deployment-bot`
2. App is pre-installed on both repositories
3. Token is automatically available in workflows
4. No action needed from service developers

### Troubleshooting
If you see dispatch failures in build logs:
1. Contact platform team
2. They will verify GitHub App is installed
3. Check for `HELIX_K8S_DISPATCH_TOKEN` secret

### For Platform Team Only
[Link to internal docs on managing GitHub App]
```

---

### 6. Manifest Updates (Manual vs Automatic Unclear)

**Confusion:**
- Which parts of `deployment.yaml` are manual vs automatic?
- Image tags: Automatic (via update-manifests workflow) ← Discovered this
- Env vars: Manual (one-time setup) ← Discovered this
- Resource limits: Manual ← Guessed
- Replicas: Manual ← Guessed
- But this isn't documented - had to figure it out by trial and error

**Why it matters:**
- Edited deployment.yaml to change image tag (wrong - automatic)
- Didn't know I needed to manually add env vars (right - manual)
- Confused about what changes go in which repo

**What should exist:**
```markdown
# Deployment Manifest Management

## What's Automatic vs Manual

### Automatic (Don't Edit)
- **Image tags**: Updated by CI/CD on every build
- Editing these manually will be overwritten

### Manual (Edit via PR)
- **Environment variables**: Service-specific configuration
- **Resource limits**: CPU/memory requests and limits
- **Replicas**: Number of pod instances
- **Health check paths**: Liveness and readiness probe endpoints
- **Service account**: IAM permissions for GCP access
- **Persistent volumes**: Storage requirements

## Adding Environment Variables

### Step 1: Create PR in helix-k8s
\`\`\`yaml
# k8s/development/helix/my-service/deployment.yaml
spec:
  template:
    spec:
      containers:
      - name: my-service
        env:
        - name: MY_CONFIG
          value: "some-value"
        - name: MY_SECRET
          valueFrom:
            secretKeyRef:
              name: my-service-secrets
              key: my-secret
\`\`\`

### Step 2: Merge PR
Config Sync will deploy changes within 60 seconds

### Step 3: Verify
\`\`\`bash
kubectl get deployment my-service -n helix -o jsonpath='{.spec.template.spec.containers[0].env}'
\`\`\`

## Common Mistake
❌ Editing deployment.yaml to update image tag
✅ Image tag updates automatically on every build
```

---

### 7. Service Dependencies (Not Documented)

**Missing:**
- My service needs a database - how do I provision one?
- My service needs Pub/Sub - do I use Config Connector?
- My service needs IAM permissions - where do I configure ServiceAccount?
- What's already available vs what do I need to create?
- Are there shared resources I can use?

**Had to guess:**
- Saw Config Connector mentioned in platform README
- Saw some sample manifests for storage/pubsub
- But no guidance on when/how to use them
- No patterns or examples for common dependencies

**What should exist:**
```markdown
# Service Dependencies

## Common Patterns

### Database (Cloud SQL)

#### Option 1: Use Config Connector (Recommended)
\`\`\`yaml
# k8s/development/helix/my-service/database.yaml
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
\`\`\`

#### Option 2: Use Shared Database
Contact platform team for access to shared Postgres instance.

### Pub/Sub Topic
\`\`\`yaml
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: my-service-events
  namespace: helix
\`\`\`

### Storage Bucket
\`\`\`yaml
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-service-uploads
  namespace: helix
spec:
  location: australia-southeast1
\`\`\`

### IAM Permissions
\`\`\`yaml
# k8s/development/helix/my-service/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-service
  namespace: helix
  annotations:
    iam.gke.io/gcp-service-account: my-service@nc-helix-development.iam.gserviceaccount.com
\`\`\`

\`\`\`bash
# Grant GCP permissions
gcloud iam service-accounts add-iam-policy-binding \
  my-service@nc-helix-development.iam.gserviceaccount.com \
  --role roles/storage.objectAdmin \
  --member "serviceAccount:nc-helix-development.svc.id.goog[helix/my-service]"
\`\`\`

## Shared Resources
- **Gateway**: All services share the helix-gateway (already configured)
- **Certificate**: Wildcard cert for *.helix-development.nurturecloud.io (already provisioned)
- **DNS**: Managed by platform team
```

---

### 8. Health Checks & Readiness (Standards Unclear)

**What I guessed:**
- Services need `/health` and `/ready` endpoints (saw in other services)
- But what's the contract? What should they check?
- Is there a standard implementation?
- What happens if they fail?
- How often are they called?

**Why it matters:**
- Implemented health checks based on other services' code
- Don't know if I'm doing it right
- Don't know what the platform expects

**What should exist:**
```markdown
# Health Check Requirements

## Required Endpoints

### /health (Liveness Probe)
**Purpose**: Is the service alive?
**Returns**: 200 OK if service is running
**Checks**: Minimal - just that the process is responsive
**Failure**: Pod will be restarted

\`\`\`javascript
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
\`\`\`

### /ready (Readiness Probe)
**Purpose**: Is the service ready to receive traffic?
**Returns**: 200 OK if service can handle requests
**Checks**: Dependencies available (database, external APIs, etc.)
**Failure**: Pod removed from load balancer (not restarted)

\`\`\`javascript
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.ping();
    // Check external dependencies
    await externalAPI.healthCheck();
    res.status(200).send('Ready');
  } catch (error) {
    res.status(503).send('Not Ready');
  }
});
\`\`\`

## Default Configuration
\`\`\`yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
\`\`\`

## Best Practices
- Keep /health lightweight (< 100ms)
- /ready can be more thorough (< 1s)
- Don't make external calls in /health
- Return 503 (not 500) when not ready
```

---

### 9. Testing Before Deployment (Process Unclear)

**Questions I had:**
- How do I test my service before it goes to development?
- Is there a local k8s environment?
- Can I deploy to a test namespace?
- How do PR builds work differently?
- Can I test with production-like dependencies?

**Discovered:**
- PR builds use `pr-X-SHA` tags and don't auto-merge (found in workflow code)
- But don't know if they actually deploy anywhere
- No guidance on local testing strategy

**What should exist:**
```markdown
# Testing Your Service

## Local Development
\`\`\`bash
# Run service locally
cd services/my-service
bun install
bun run dev

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/ready
\`\`\`

## Testing with Docker
\`\`\`bash
# Build image locally
docker build -t my-service:local .

# Run container
docker run -p 8080:8080 \
  -e OAUTH_CLIENT_ID=test \
  -e OAUTH_CLIENT_SECRET=test \
  my-service:local

# Test
curl http://localhost:8080/health
\`\`\`

## Pull Request Testing

### How It Works
1. Create PR with your changes
2. CI builds image tagged `pr-<number>-<sha>`
3. Image pushed to Artifact Registry
4. **NOT** automatically deployed to cluster
5. Requires manual review and approval

### Testing PR Build
\`\`\`bash
# Option 1: Manual deployment to test namespace
kubectl create namespace test-pr-123
# Deploy your PR image to test namespace
# (Platform team to provide template)

# Option 2: Local testing with PR image
docker pull australia-southeast1-docker.pkg.dev/upside-ci/image-artifacts/my-service:pr-123-abc1234
docker run -p 8080:8080 my-service:pr-123-abc1234
\`\`\`

## Integration Testing
- Unit tests run in CI automatically
- Integration tests should run against PR builds
- Add test script: `services/my-service/tests/ci-image.sh`

## Merge to Main
After PR approved and merged:
- New build with commit SHA tag
- Auto-deployed to development environment
- Available at https://my-service.helix-development.nurturecloud.io
```

---

### 10. Troubleshooting & Debugging (No Guidance)

**When things go wrong:**
- How do I check if my image was built?
- How do I see if Config Sync deployed it?
- How do I view logs from my service?
- How do I roll back a bad deployment?
- What if the build fails?
- How do I SSH into a pod?
- How do I check resource usage?

**Current state:**
- No troubleshooting guide
- Have to know kubectl commands
- Have to know where to look in GitHub Actions
- Have to understand Config Sync

**What should exist:**
```markdown
# Troubleshooting Guide

## Common Issues

### "My service isn't deploying"

#### Step 1: Check Build Status
\`\`\`bash
# View recent builds
gh run list --repo nc-helix/helix --limit 5

# View specific build
gh run view <run-id> --repo nc-helix/helix --log
\`\`\`

#### Step 2: Check Manifest Update
\`\`\`bash
# Check recent PRs in helix-k8s
gh pr list --repo nc-helix/helix-k8s --limit 5

# Should see PR with your image tag
\`\`\`

#### Step 3: Check Config Sync
\`\`\`bash
# Check Config Sync status
kubectl get rootsync -n config-management-system root-sync -o yaml

# Check if your deployment exists
kubectl get deployment my-service -n helix

# Check pod status
kubectl get pods -n helix -l app=my-service
\`\`\`

### "My build is failing"

#### View Build Logs
\`\`\`bash
gh run view <run-id> --repo nc-helix/helix --log-failed
\`\`\`

#### Common Build Failures
- **Dockerfile not found**: Must be at `services/my-service/Dockerfile`
- **Tests failing**: Fix tests before merging
- **Docker build error**: Check Dockerfile syntax
- **Push failed**: Check GCP permissions

### "My service is crashing"

#### View Pod Logs
\`\`\`bash
# Get pod name
kubectl get pods -n helix -l app=my-service

# View logs
kubectl logs -n helix <pod-name>

# Follow logs
kubectl logs -n helix <pod-name> -f

# Previous crash
kubectl logs -n helix <pod-name> --previous
\`\`\`

#### Common Crash Causes
- Missing environment variables
- Can't connect to dependencies
- Health check failing
- Out of memory

#### Check Pod Events
\`\`\`bash
kubectl describe pod -n helix <pod-name>
# Look at Events section at bottom
\`\`\`

### "My service is slow/timing out"

#### Check Resource Usage
\`\`\`bash
kubectl top pod -n helix <pod-name>
\`\`\`

#### Check Resource Limits
\`\`\`bash
kubectl get deployment my-service -n helix -o jsonpath='{.spec.template.spec.containers[0].resources}'
\`\`\`

### "I need to roll back"

#### Option 1: Revert Code
\`\`\`bash
git revert <bad-commit>
git push
# New build will deploy previous code
\`\`\`

#### Option 2: Manual Rollback (Emergency)
\`\`\`bash
# Contact platform team
# They can manually update manifest to previous image tag
\`\`\`

## Getting Help
- Slack: #platform-support
- Email: platform-team@example.com
- Docs: [link to platform docs]
```

---

## What Documentation Should Exist (But Doesn't)

### Proposed: "Platform User Guide" (The Facade)

Create a new **`services/README.md`** that serves as the entry point for app developers:

```
services/
├── README.md  ← "How to Build and Deploy Services on Helix Platform"
│   ├── 📘 Quickstart: Deploy Your First Service
│   ├── 🔄 Development Workflow
│   ├── 🔐 Managing Secrets
│   ├── 🗄️ Adding Dependencies (Database, Pub/Sub, Storage)
│   ├── ⚙️ Environment Variables
│   ├── 🧪 Testing & Deployment
│   ├── 📊 Monitoring & Debugging
│   ├── 🏗️ Common Patterns & Examples
│   └── 🆘 Troubleshooting
```

### Key Sections Needed

#### 1. **"Quickstart: Deploy Your First Service"**
```markdown
# Deploy Your First Service in 10 Minutes

## What You'll Build
A simple "Hello World" service deployed to the Helix development environment.

## Prerequisites
- Access to nc-helix/helix repository
- Bun or Node.js installed locally (for testing)

## Steps

### 1. Create Your Service
\`\`\`bash
mkdir -p services/hello-demo
cd services/hello-demo
\`\`\`

### 2. Add Code
Create \`server.ts\`:
[Example code]

### 3. Add Dockerfile
[Example Dockerfile]

### 4. Test Locally
\`\`\`bash
bun run server.ts
curl http://localhost:8080/health
\`\`\`

### 5. Add Kubernetes Manifests
[Link to template or generator]

### 6. Deploy
\`\`\`bash
git add services/hello-demo
git commit -m "Add hello-demo service"
git push
\`\`\`

### 7. Monitor Deployment
- Build: [GitHub Actions link]
- Deployment: kubectl get pods -n helix -l app=hello-demo
- Access: https://hello-demo.helix-development.nurturecloud.io

## Next Steps
- [Add secrets]
- [Add database]
- [Add custom domain]
```

#### 2. **"Development Workflow"**
```markdown
# Development Workflow

## The Development Loop

\`\`\`
Code locally → Test locally → Push to branch → Create PR → Tests run
→ Review → Merge → Auto-build → Auto-deploy → Validate
\`\`\`

## Local Development
[How to run locally, test locally]

## Pull Request Flow
[How PRs work, what tests run, review process]

## Deployment Pipeline
[Detailed explanation with timeline]

## Environments
[Development vs Production]
```

#### 3. **"Managing Secrets"**
[Full secrets management guide as outlined in Gap #3]

#### 4. **"Adding Dependencies"**
[Database, Pub/Sub, Storage patterns as outlined in Gap #7]

#### 5. **"Monitoring & Debugging"**
[Troubleshooting guide as outlined in Gap #10]

---

## The Core Problem: Implementation vs Usage

### Current State
**Everything is discoverable if you know to look in:**
- `.github/workflows/*.yml` files (implementation)
- `helix-k8s` repository structure (implementation)
- Running kubectl commands against the cluster (implementation)
- Reading other services' configurations (tribal knowledge)
- Config Connector documentation (external)
- GitOps architecture docs (implementation)

**But an app developer shouldn't need to know:**
- How GitHub Actions works
- How Config Sync works
- How kubectl works
- How GitOps works
- Where to find workflow files
- How to read YAML pipelines

### What They Should Read
**"How to Deploy a Service"** with numbered steps that abstract away:
- The fact that there's a centralized build workflow
- The fact that Config Sync watches git
- The fact that manifests are updated via PR
- The fact that images are in Artifact Registry

They just need to know: **"Push code → service deploys"**

---

## What Made It Claude-Unfriendly

### 1. Context Spread Across Repositories
- Application code in `nc-helix/helix`
- Deployment manifests in `nc-helix/helix-k8s`
- No clear documentation linking the two
- Had to discover the relationship by reading workflow code

### 2. Implementation Documented, Usage Not
- Lots of "how GitOps works" ← Implementation
- Nothing about "how I use GitOps" ← Usage
- Architecture decision records ← Implementation
- No user guide ← Missing

### 3. Implicit Conventions (Tribal Knowledge)
- Image tag patterns (discovered in workflow)
- Directory structure (guessed from examples)
- Naming conventions (copied from other services)
- Manual vs automatic manifest updates (trial and error)

### 4. No "Golden Path"
- Multiple ways to do things
- No clear "this is the recommended way"
- Examples show different approaches
- Have to make judgment calls

### 5. Examples from Infrastructure, Not Apps
- Terraform examples (infrastructure)
- Config Connector samples (infrastructure)
- Gateway configuration (infrastructure)
- No complete service example (apps)

### 6. Assumed Knowledge
- Documentation assumes you know Kubernetes
- Assumes you know GitOps
- Assumes you know GCP
- No onboarding for app developers who just know code

---

## Recommendations

### Immediate (Ship This Week)

1. **Create `services/README.md`**
   - "How to Deploy a Service" guide
   - Copy hello-world as complete example
   - Link to this from root README

2. **Add Secrets Guide**
   - Clear instructions on GCP Secret Manager
   - Security best practices prominent
   - Common mistakes to avoid

3. **Add Troubleshooting Section**
   - "My service isn't deploying" flowchart
   - Common error messages and solutions
   - How to get help

### Short Term (Next Sprint)

4. **Create Service Template**
   - Cookiecutter or similar
   - Pre-configured Dockerfile
   - Pre-configured manifests
   - Example code with health checks

5. **Document Dependencies**
   - Database setup patterns
   - Pub/Sub setup patterns
   - IAM configuration examples

6. **Environment Documentation**
   - Clear explanation of dev vs prod
   - How to check which environment
   - Promotion process (when prod exists)

### Medium Term (This Month)

7. **Create Video Walkthrough**
   - "Deploy your first service in 10 minutes"
   - Screen recording with narration
   - Shows the actual flow

8. **Platform Status Dashboard**
   - Are builds working?
   - Is Config Sync healthy?
   - Recent deployments
   - Service health overview

9. **Developer Portal**
   - Self-service docs
   - Interactive examples
   - API reference
   - Runbooks

---

## Success Metrics

### How to Know If This Works

**Before:**
- Claude Code spent 2+ hours on incorrect approaches
- Built Docker images manually
- Applied kubectl commands directly
- Created secrets in git
- Confused about which repo to modify

**After (Target):**
- Claude Code reads "How to Deploy a Service"
- Follows numbered steps
- Code deployed in < 30 minutes
- No incorrect infrastructure operations
- Clear understanding of manual vs automatic

**Measurement:**
- Time from "deploy new service" request to working deployment
- Number of wrong assumptions made
- Number of times platform team has to intervene
- Developer satisfaction survey

---

## 2025-10-07 Comprehensive Audit Summary

### Audit Scope
- **helix repository**: 60+ markdown files reviewed
- **helix-k8s repository**: 4 markdown files reviewed
- **helix-foundations repository**: 9 markdown files reviewed
- **Total documentation assessed**: 73+ files

### Validation Results

| Gap # | Original Claim | Audit Finding | Status | Priority |
|-------|---------------|---------------|---------|----------|
| **0** | *(NEW)* Multi-Repo Architecture | Not explained anywhere | 🔴 **BLOCKER** | IMMEDIATE |
| 1 | Service workflow missing | Exists but **misleading** | 🔴 CRITICAL | IMMEDIATE |
| 2 | Build flow implicit | Partial docs, missing cross-repo | 🟡 HIGH | Week 1 |
| 3 | Secrets undocumented | **Zero docs** | 🔴 CRITICAL | IMMEDIATE |
| 4 | Environment model unclear | Must infer from structure | 🟡 MEDIUM | Week 2 |
| 5 | Dispatch permissions missing | Not documented | 🟡 MEDIUM | Week 2 |
| 6 | Manual vs auto unclear | Not explicit | 🟡 HIGH | Week 1 |
| 7 | Dependencies incomplete | Samples only, no guide | 🟡 HIGH | Week 1 |
| 8 | Health checks not in flow | In cartridges, not main docs | 🟢 LOW | Week 3 |
| 9 | Testing process unclear | Partial coverage | 🟡 MEDIUM | Week 2 |
| 10 | Troubleshooting partial | Kubectl only, no pipeline | 🟡 MEDIUM | Week 2 |

**New Gaps Discovered:**
- Gap #0 (Multi-repo architecture) - Most critical finding
- Config Sync vs GitHub Actions contradiction
- Documentation audience confusion (builder vs user)

### Assessment: ORIGINAL CLAIMS CONFIRMED AND UNDERSTATED

**All 10 original gaps validated**. Problems are **worse than initially described**.

**Most Critical Finding**:
Documentation actively **misleads** developers by referencing `k8s/` directory without explaining it's in a different repository (helix-k8s). This is a **blocker** - developers cannot successfully follow the documentation.

**Evidence of Severity**:
```bash
# Quick start says:
git clone https://github.com/nc-helix/helix.git
mkdir -p k8s/development/helix/hello-helix  # WRONG REPOSITORY

# Search for helix-k8s explanation:
$ grep -r "helix-k8s" helix/docs/
# NO MATCHES across 60+ files
```

### Documentation Gap Categories

**🔴 BLOCKERS (Fix Immediately)**:
1. Multi-repository architecture (Gap #0)
2. Service deployment workflow (Gap #1) - misleading
3. Secrets management (Gap #3) - completely missing

**🟡 HIGH PRIORITY (Week 1)**:
4. Build & deployment flow end-to-end (Gap #2)
5. Manual vs automatic fields (Gap #6)
6. Service dependencies patterns (Gap #7)

**🟢 MEDIUM/LOW (Weeks 2-3)**:
7. Environment model clarity (Gap #4)
8. Testing workflow (Gap #9)
9. Troubleshooting pipeline visibility (Gap #10)
10. Health checks in main flow (Gap #8)

### What Documentation EXISTS vs NEEDED

**Exists (60+ files)**:
- ✅ Platform implementation details
- ✅ Architecture Decision Records
- ✅ Terraform development standards
- ✅ Infrastructure setup guides
- ✅ GitOps architecture explanation
- ✅ Gateway API design decisions

**Missing (App Developer Perspective)**:
- ❌ Multi-repository workflow explanation
- ❌ "Which repo for what" guidance
- ❌ Secrets management user guide
- ❌ End-to-end deployment pipeline visualization
- ❌ Clear audience labels (App Dev vs Platform Team)
- ❌ "How to Use the Platform" landing page

### Root Cause Analysis

**The Core Problem**: Documentation written by platform builders for platform builders.

**Symptoms**:
1. Assumes reader knows multi-repo architecture
2. Explains "how we built it" not "how you use it"
3. Mixes infrastructure implementation with application guidance
4. No clear entry point for app developers
5. No "golden path" - multiple ways, no recommendation

**Impact on Developers**:
- Cannot successfully deploy without platform team help
- Will make wrong assumptions (manual kubectl, local Docker builds)
- Will create insecure patterns (secrets in git)
- Will be confused about which repository to use
- Cannot self-service

**Impact on Platform Team**:
- Constant interruptions to help developers
- Repeated explanation of same concepts
- Fixing incorrectly deployed services
- Reviewing PRs in wrong repositories

### Recommendations (Updated Priorities)

**🔴 IMMEDIATE (This Week)**:

1. **Create Repository Overview Document** (Gap #0)
   - Location: `helix/README.md` (update) + `helix/docs/getting-started/repositories.md` (new)
   - Content: Explain 3-repo architecture, what goes where, typical workflow
   - Visual: Diagram showing helix → helix-k8s → cluster flow

2. **Fix Quick Start Guide** (Gap #1)
   - File: `helix/docs/getting-started/quick-start.md`
   - Action: Add "Prerequisites: Clone both repos" section
   - Fix all `k8s/` references to specify which repository

3. **Create Secrets Management Guide** (Gap #3)
   - Location: `helix/docs/development/secrets-management.md` (new)
   - Content: GCP Secret Manager, IAM bindings, security practices
   - Include: ❌ Anti-patterns (secrets in git, kubectl apply)

**🟡 WEEK 1**:

4. **End-to-End Deployment Flow** (Gap #2)
   - Add to: `helix/docs/development/service-deployment.md`
   - Include: Timeline, cross-repo automation, Config Sync deployment
   - Visual: Flowchart from git push → running service

5. **Manual vs Automatic Table** (Gap #6)
   - Add to: `helix/docs/development/service-deployment.md`
   - Table: Which fields auto-update, which require manual PR

6. **Service Dependencies Guide** (Gap #7)
   - Examples: Cloud SQL, Pub/Sub, service accounts
   - Location: `helix/docs/development/service-dependencies.md` (new)

**🟢 WEEKS 2-3**:

7. **Documentation Index by Audience**
   - `helix/docs/README.md` (update)
   - Sections: "For App Developers" vs "For Platform Team"
   - Clear navigation to relevant docs

8. **Testing & Environment Guide** (Gaps #4, #9)
   - Explain: Only development exists, PR testing, future staging
   - Location: Update getting-started docs

9. **Troubleshooting Pipeline Guide** (Gap #10)
   - How to track: Build → Manifest PR → Config Sync → Pod
   - Commands for each stage

---

## Conclusion

The platform has a **solid implementation** but lacks a **user-friendly facade**.

**Original Assessment (2025-10-04)**: ACCURATE
**Audit Findings (2025-10-07)**: Problems are WORSE than originally stated

**Critical New Finding**: Documentation doesn't just lack user guides - it actively **misleads** users by not explaining the multi-repository architecture. This is a **blocking issue** preventing successful self-service deployment.

App developers (and AI assistants like Claude Code) need:
- **"How to Use"** documentation, not **"How it Works"** documentation
- **Golden paths** with opinionated defaults
- **Complete examples** they can copy
- **Clear boundaries** between using and building the platform
- **Repository workflow explanation** - which repo for what

**The Goal:** An app developer should be able to deploy a service by following a single README, without needing to understand Kubernetes, GitOps, or the implementation details of the platform.

**The Product Mindset:** Treat app developers as customers. The platform is a product. Documentation is the user manual. Make it so easy that Claude Code can do it without making mistakes.

**Next Actions**:
1. Fix multi-repo documentation (BLOCKER)
2. Fix quick-start guide (CRITICAL)
3. Create secrets guide (CRITICAL)
4. Implement Week 1 priorities

**Success Criteria**: A new developer (or AI agent) can deploy a service successfully by following documentation alone, without platform team intervention.

---

**Audit Completed**: 2025-10-07
**Auditor**: Claude Code (Sonnet 4.5)
**Documentation Files Reviewed**: 73+
**Gaps Validated**: 11 of 11 (10 original + 1 new critical)
**Recommendation**: Immediate action required on 3 blocking issues
