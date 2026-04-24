# open-volunteer-federated-sync
Service for synchronizing a federation of open volunteer datasets (currently focused on `volunteer`).

### Project layout

- **`server/`**: Express API server (also packaged for AWS Lambda in production)
  - **`server/src/routers/webapp-api/`**: Webapp-facing CRUD + admin APIs
  - **`server/src/routers/sync-api/`**: Dataset sync API (pull/push) used by external subscribers
  - **`server/src/stores/`**: Storage layer (Store abstractions + implementations)
- **`webapp/`**: Vite + React UI (proxies API calls to the local server in dev)
- **`aws/`**: Deployment templates/scripts (CloudFormation + packaging utilities)

### Quickstart (local dev, file store)

Prereqs: Node.js + `pnpm`.

1) Install dependencies:

```bash
pnpm install
```

2) Configure Google OAuth client IDs (required to log in):

- **Webapp**: create `webapp/.env` (copy from `webapp/.env.example`) and set:
  - `VITE_GOOGLE_CLIENT_ID=...`
- **Server**: set `GOOGLE_CLIENT_ID` in the server environment (must match the same Google “Web client” ID used by the webapp).
  - Easiest local approach:

```bash
export GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

3) Run the server (defaults to file-backed stores):

```bash
pnpm -F server dev
```

4) Run the webapp:

```bash
pnpm -F webapp dev
```

Notes:
- The webapp proxies **`/api`** and **`/google-login`** to the local server during development.
- The server uses a **file-based Volunteer store by default** (`VOLUNTEER_STORAGE_BACKEND` / `STORAGE_BACKEND` default to `file`).

### Storage layer: Store abstractions + implementations

The server code is written against Store interfaces so we can swap persistence without changing router logic:

- **`CrudStore`**: webapp-facing CRUD APIs (list/create/read/update/delete).
- **`SyncronizingStore`**: dataset sync APIs (snapshot/updates/batch-read + push updates).
- **Dataset-specific Store (example)**: `VolunteerStore` extends both `CrudStore` and `SyncronizingStore`.

Current implementation:
- **File store (default)**: `FileVolunteerStore` stores records as JSON files under `./.data/volunteers/` by default (overridable via `DATA_DIR`). Files are named `encodeURIComponent(uri).json`.

Planned / supported-by-design (via the same Store abstraction):
- **MySQL**, **DynamoDB**, **Firestore** (implement the same Store interfaces and update the corresponding `resolve*Store()` factory).

### Sync API overview (`server/src/routers/sync-api/dataset.ts`)

The Sync API is dataset-scoped and is designed for **pull-based replication** plus an optional **push updates** endpoint.

Routes are mounted per dataset type (e.g. `volunteer`) and operate on a common set of payloads:

- **Pull updates since a timestamp**
  - `GET /sync-api/<dataset>/updates?since=<isoTimestamp>[&cursor=...&limit=...]`
  - Returns `{ updates: T[], deleted: uri[], cursor? }`
- **Snapshot (enumerate all record URIs)**
  - `GET /sync-api/<dataset>/snapshot?[cursor=...&limit=...]`
  - Returns `{ uris: uri[], cursor?, batchSize? }`
- **Batch read a set of records**
  - `PUT /sync-api/<dataset>/batch-read`
  - Body: `{ uris: uri[] }`
  - Returns `{ records: T[], deleted?: uri[] }`
- **Push updates into the dataset (admin-only on the server)**
  - `PUT /sync-api/<dataset>/updates`
  - Body: `{ updates: T[], deletes: uri[] }`
  - Returns `{ updated: uri[], deleted: uri[], ignored: uri[], batchSize? }`

Auth model (high level):
- Pull endpoints require a **dataset subscriber** credential for that dataset type.
- Push updates currently require an **admin** user.

## Production deployment (single Lambda + HTTP API + DynamoDB)

Templates and scripts live under `aws/`. The CloudFormation template is `aws/production.yaml`; it expects a Lambda zip artifact in S3.

Configure deploy-time variables in `aws/cloud.env` (copy from `aws/cloud.env.example`) or export them in the shell. The deploy script loads `aws/cloud.env` before reading the environment.

### 1) Create an artifact bucket (one-time)

```bash
export ARTIFACT_BUCKET=your-unique-bucket-name
export AWS_REGION=us-east-1
pnpm bootstrap:artifact-bucket
```

### 2) Deploy

```bash
cp aws/cloud.env.example aws/cloud.env
# Edit aws/cloud.env: set GOOGLE_CLIENT_ID (same Web client ID as `VITE_GOOGLE_CLIENT_ID` in the webapp)

export STACK_NAME=ovfs-prod
export ARTIFACT_BUCKET=your-unique-bucket-name
export AWS_REGION=us-east-1
pnpm deploy:prod
```

Required for deploy:
- `GOOGLE_CLIENT_ID` — passed through CloudFormation into Lambda as `GOOGLE_CLIENT_ID` (Google Sign-In token verification).

Optional env vars (shell or `aws/cloud.env`):
- `STAGE_NAME` (default: `prod`)
- `ALLOWED_ORIGINS` (default: `*`, comma-separated)
- `ACCOUNTS_TABLE_NAME` (default: `${STACK_NAME}-accounts`)
- `ARTIFACT_PREFIX` (default: `${STACK_NAME}/`)
