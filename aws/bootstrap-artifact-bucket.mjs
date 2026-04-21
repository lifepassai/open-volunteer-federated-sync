import { execFileSync } from 'node:child_process'
import { loadCloudEnv } from './load-cloud-env.mjs'

function sh(cmd, args) {
  execFileSync(cmd, args, { stdio: 'inherit' })
}

function requiredEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function optionalEnv(name, fallback) {
  const v = process.env[name]
  return v && v.length > 0 ? v : fallback
}

async function main() {
  loadCloudEnv()
  const bucket = requiredEnv('ARTIFACT_BUCKET')
  const region = optionalEnv('AWS_REGION', optionalEnv('AWS_DEFAULT_REGION', 'us-east-1'))

  try {
    sh('aws', ['s3api', 'head-bucket', '--bucket', bucket])
    return
  } catch {
    // fall through
  }

  const args = ['s3api', 'create-bucket', '--bucket', bucket, '--region', region]
  if (region !== 'us-east-1') {
    args.push('--create-bucket-configuration', `LocationConstraint=${region}`)
  }
  sh('aws', args)

  sh('aws', [
    's3api',
    'put-bucket-encryption',
    '--bucket',
    bucket,
    '--server-side-encryption-configuration',
    JSON.stringify({
      Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
    }),
  ])

  sh('aws', [
    's3api',
    'put-public-access-block',
    '--bucket',
    bucket,
    '--public-access-block-configuration',
    JSON.stringify({
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    }),
  ])
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
