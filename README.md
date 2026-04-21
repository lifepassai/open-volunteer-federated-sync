# open-volunteer-federated-sync
Service for synchronizing a federation of open volunteer databases

## Local development

Run the API (file-backed storage by default):

```bash
pnpm -F server dev
```

Run the webapp (proxies `/api` and `/google-login` to the server):

```bash
pnpm -F webapp dev
```

## Storage backends

- **Local**: `STORAGE_BACKEND=file` (default). Each account is a JSON file under `./data/accounts/` named `encodeURIComponent(email).json` (derived from `ACCOUNTS_FILE`, default `./data/accounts.json`). Set `DATA_DIR` / `ACCOUNTS_FILE` to change the path. Legacy monolithic `accounts.json` and older per-uid files are migrated on first access.
- **AWS**: `STORAGE_BACKEND=dynamodb` with `ACCOUNTS_TABLE_NAME`.

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
