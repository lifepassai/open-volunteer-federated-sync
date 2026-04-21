import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCloudEnv } from './load-cloud-env.mjs'

const awsDir = path.dirname(fileURLToPath(import.meta.url))

function sh(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts })
}

function requiredEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name} (set it or add to aws/cloud.env)`)
  return v
}

function optionalEnv(name, fallback) {
  const v = process.env[name]
  return v && v.length > 0 ? v : fallback
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function main() {
  loadCloudEnv()

  const stackName = requiredEnv('STACK_NAME')
  const artifactBucket = requiredEnv('ARTIFACT_BUCKET')
  const googleClientId = requiredEnv('GOOGLE_CLIENT_ID')

  const region = optionalEnv('AWS_REGION', optionalEnv('AWS_DEFAULT_REGION', 'us-east-1'))
  const stageName = optionalEnv('STAGE_NAME', 'prod')
  const allowedOrigins = optionalEnv('ALLOWED_ORIGINS', '*')
  const accountsTableName = optionalEnv('ACCOUNTS_TABLE_NAME', `${stackName}-accounts`)

  const artifactPrefix = optionalEnv('ARTIFACT_PREFIX', `${stackName}/`)
  const artifactKey = `${artifactPrefix}lambda-${timestamp()}.zip`

  const zipPath = execFileSync('node', [path.join(awsDir, 'package-lambda.mjs')], {
    encoding: 'utf8',
  }).trim()

  sh('aws', ['s3', 'cp', zipPath, `s3://${artifactBucket}/${artifactKey}`, '--region', region])

  sh('aws', [
    'cloudformation',
    'deploy',
    '--stack-name',
    stackName,
    '--template-file',
    path.join(awsDir, 'production.yaml'),
    '--capabilities',
    'CAPABILITY_NAMED_IAM',
    '--region',
    region,
    '--parameter-overrides',
    `ArtifactBucket=${artifactBucket}`,
    `ArtifactKey=${artifactKey}`,
    `StageName=${stageName}`,
    `AllowedOrigins=${allowedOrigins}`,
    `AccountsTableName=${accountsTableName}`,
    `GoogleClientId=${googleClientId}`,
  ])

  sh('aws', [
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    stackName,
    '--region',
    region,
    '--query',
    'Stacks[0].Outputs',
    '--output',
    'table',
  ])
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
