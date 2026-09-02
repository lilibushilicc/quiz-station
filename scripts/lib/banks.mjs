import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..', '..')
export const BANKS_DIR = path.join(ROOT, 'data', 'banks')
export const INBOX_DIR = path.join(ROOT, 'data', '_inbox')
export const DOCS_DIR = path.join(ROOT, 'docs')
export const PUBLIC_DIR = path.join(DOCS_DIR, 'public')

export const TYPES = ['single', 'multiple', 'boolean', 'fill', 'code']

/** 递归收集目录下所有 yaml 文件 */
export function collectYaml(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectYaml(full))
    else if (/\.(ya?ml)$/i.test(entry.name)) out.push(full)
  }
  return out.sort()
}

export function readBank(file) {
  const raw = fs.readFileSync(file, 'utf8')
  const doc = yaml.load(raw)
  if (!doc || typeof doc !== 'object') throw new Error(`${file}: 内容为空或不是对象`)
  return doc
}

/** 分类目录名 → 分类 id */
export function categoryOf(file) {
  return path.basename(path.dirname(file))
}

/** 文件名去掉扩展名 → slug（保留中文，作为路由片段） */
export function slugOf(file) {
  return path.basename(file).replace(/\.(ya?ml)$/i, '')
}

const CATEGORY_META = {
  python: { title: 'Python 知识体系', desc: '语法、数据结构、函数、面向对象到并发与工程化', accent: 'py' },
  langchain: { title: 'LangChain', desc: '模型、链、记忆、检索与 Agent 实战', accent: 'lc' },
  langgraph: { title: 'LangGraph', desc: '状态图、节点、条件边与多智能体编排', accent: 'lg' },
  typescript: { title: 'TypeScript', desc: '类型系统、泛型、工程配置与实战', accent: 'ts' },
  redis: { title: 'Redis', desc: '数据结构、持久化、缓存策略与分布式锁', accent: 'rd' },
  vue: { title: 'Vue 生态', desc: '响应式、组件、路由、状态管理与工程化', accent: 'vu' },
  springboot: { title: 'Spring Boot', desc: '自动配置、Web、数据访问与安全', accent: 'sb' },
  auth: { title: '身份认证', desc: 'Session、JWT、OAuth2 与权限模型', accent: 'au' },
  java: { title: 'Java 并发与 JVM', desc: '线程模型、锁、内存与调优', accent: 'jv' },
  net: { title: '网络传输', desc: '协议栈、HTTP、TLS 与常见排查', accent: 'nt' },
  crypto: { title: '加密与安全', desc: '对称/非对称、摘要、签名与常见陷阱', accent: 'cr' },
  database: { title: '数据库', desc: '索引、事务、SQL 优化与建模', accent: 'db' },
}

export function categoryMeta(id) {
  return CATEGORY_META[id] || { title: id, desc: '', accent: 'default' }
}

/** 把单个题库文件整理成统一结构 */
export function normalizeBank(doc, file) {
  const meta = doc.meta || {}
  const slug = slugOf(file)
  const cat = categoryOf(file)
  const id = meta.id || `${cat}-${slug.replace(/^\d+[-_]?/, '') || slug}`
  return {
    id,
    slug,
    category: cat,
    title: meta.title || slug,
    source: meta.source || '',
    order: typeof meta.order === 'number' ? meta.order : Number(slug.match(/^\d+/)?.[0] ?? 999),
    questions: (doc.questions || []).map((q, i) => normalizeQuestion(q, id, i)),
  }
}

function normalizeQuestion(q, bankId, index) {
  const type = q.type || 'single'
  const item = {
    qid: q.qid || `${bankId}-${String(index + 1).padStart(3, '0')}`,
    type,
    stem: String(q.stem ?? '').trim(),
    explain: String(q.explain ?? '').trim(),
    tags: Array.isArray(q.tags) ? q.tags.map(String) : [],
    difficulty: Number.isInteger(q.difficulty) ? q.difficulty : 2,
  }
  if (type === 'single' || type === 'multiple') {
    item.options = (q.options || []).map((o) => (typeof o === 'string' ? { text: o } : { text: String(o.text ?? '') }))
    item.answer = toIndexArray(q.answer)
  } else if (type === 'boolean') {
    item.options = q.options?.length
      ? q.options.map((o) => (typeof o === 'string' ? { text: o } : { text: String(o.text ?? '') }))
      : [{ text: '正确' }, { text: '错误' }]
    item.answer = toIndexArray(q.answer)
  } else {
    item.template = String(q.template ?? '').trim()
    item.blanks = Array.isArray(q.blanks) ? q.blanks.map(String) : []
    item.caseSensitive = Boolean(q.caseSensitive)
  }
  return item
}

function toIndexArray(v) {
  if (Array.isArray(v)) return v.map(Number)
  if (typeof v === 'number') return [v]
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d+$/.test(s)) return [Number(s)]
    return s.split(/[,，\s]+/).filter(Boolean).map(Number)
  }
  return []
}

/** 汇总所有正式题库 */
export function loadAllBanks() {
  const files = collectYaml(BANKS_DIR)
  const banks = files.map((f) => normalizeBank(readBank(f), f))
  const categories = []
  const byCat = new Map()
  for (const b of banks) {
    if (!byCat.has(b.category)) byCat.set(b.category, [])
    byCat.get(b.category).push(b)
  }
  for (const [id, list] of byCat) {
    list.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug, 'zh'))
    const m = categoryMeta(id)
    categories.push({
      id,
      title: m.title,
      desc: m.desc,
      accent: m.accent,
      banks: list.map((b) => ({
        id: b.id,
        slug: b.slug,
        title: b.title,
        source: b.source,
        count: b.questions.length,
      })),
    })
  }
  categories.sort((a, b) => b.banks.reduce((s, x) => s + x.count, 0) - a.banks.reduce((s, x) => s + x.count, 0))
  return { categories, banks }
}
