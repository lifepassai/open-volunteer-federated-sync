import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const distDir = path.join(root, 'dist')
const deployDir = path.join(distDir, 'server-deploy')
const zipPath = path.join(distDir, 'lambda.zip')

async function rm(p) {
  await fs.rm(p, { recursive: true, force: true })
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

function sh(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...opts })
}

async function main() {
  await ensureDir(distDir)
  await rm(deployDir)
  await rm(zipPath)

  // Ensure workspace tooling (like `tsc`) is available.
  sh('pnpm', ['install'])

  sh('pnpm', ['-F', 'webapp', 'build'])
  sh('pnpm', ['-F', 'server', 'deploy', '--prod', '--legacy', deployDir])

  const webDist = path.join(root, 'webapp', 'dist')
  const publicDir = path.join(deployDir, 'public')
  await rm(publicDir)
  await ensureDir(publicDir)
  await fs.cp(webDist, publicDir, { recursive: true })

  // Create zip of the deployed server package (includes node_modules)
  sh('zip', ['-qr', zipPath, '.'], { cwd: deployDir })

  process.stdout.write(`${zipPath}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
