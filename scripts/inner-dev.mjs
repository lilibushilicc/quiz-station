import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vitepress'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs')

await import('./build-banks.mjs')

const server = await createServer(root)
await server.listen()
server.printUrls()
