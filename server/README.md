# Server (Express + Lambda)

## Local development (file store)

```bash
pnpm -F server dev
```

Environment variables:
- `PORT` (default: `3001`)
- `STORAGE_BACKEND` (default: `file`)
- `DATA_DIR` (default: `./data`) or `ACCOUNTS_FILE` (default: `./data/accounts.json`)

Example:

```bash
STORAGE_BACKEND=file DATA_DIR=server/data PORT=3001 pnpm -F server dev
```

## API

- `POST /google-login` → `{ "success": true }`
- `GET /api/accounts`
- `GET /api/accounts/:uid`
- `POST /api/accounts`
- `PATCH /api/accounts/:uid`
- `DELETE /api/accounts/:uid`

## AWS (DynamoDB store)

When deployed via the provided CloudFormation template, Lambda runs with:
- `STORAGE_BACKEND=dynamodb`
- `ACCOUNTS_TABLE_NAME=<created table>`

