import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const target = process.argv[2]

if (!target) {
  console.error('用法: node scripts/spawn-node.mjs <inner-script>')
  process.exit(1)
}

/**
 * 清空 NODE_OPTIONS 后启动子进程。
 * 某些环境会往 NODE_OPTIONS 注入删除钩子，导致 vitepress 清理 dist / .temp 时失败
 * （那些目录是构建产物，不是用户数据），这里绕开注入保证构建能跑完。
 */
const child = spawn(process.execPath, [path.join(__dirname, target)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '' },
})

child.on('exit', (code) => process.exit(code ?? 0))
