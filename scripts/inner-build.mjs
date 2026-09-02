import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vitepress'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs')

await import('./build-banks.mjs')
await build(root)

console.log('\n构建完成，产物在 docs/.vitepress/dist')
