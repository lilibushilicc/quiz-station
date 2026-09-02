import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, env: process.env })
  if (r.status !== 0) {
    console.error(`${label} 失败（退出码 ${r.status ?? '未知'}）`)
    process.exit(r.status ?? 1)
  }
}

// 1) 构建静态站点（会顺带重新生成题库与页面）
run('构建站点', process.execPath, [path.join(root, 'scripts', 'inner-build.mjs')])

// 2) 上传题库 JSON 到 R2（页面运行时优先拉这一份，实现改题热更新）
run('上传题库到 R2', 'npx', [
  '--yes',
  'wrangler',
  'r2',
  'object',
  'put',
  'noteandblog/quiz/banks.json',
  '--file',
  'docs/public/banks.json',
  '--remote',
])

// 3) 部署静态站点到 Cloudflare Pages
run('部署 Pages', 'npx', [
  '--yes',
  'wrangler',
  'pages',
  'deploy',
  'docs/.vitepress/dist',
  '--project-name',
  'quiz-station',
  '--branch',
  'main',
])

console.log('\n部署完成。记得在 Cloudflare Pages 绑定自定义域 quiz.270312.xyz。')
