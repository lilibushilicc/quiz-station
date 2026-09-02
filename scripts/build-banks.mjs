import fs from 'node:fs'
import path from 'node:path'
import { DOCS_DIR, PUBLIC_DIR, ROOT, loadAllBanks } from './lib/banks.mjs'

const { categories, banks } = loadAllBanks()

fs.mkdirSync(PUBLIC_DIR, { recursive: true })

const index = {
  version: 1,
  updatedAt: new Date().toISOString(),
  categories: categories.map((c) => ({
    id: c.id,
    title: c.title,
    desc: c.desc,
    accent: c.accent,
    link: `/${c.id}/`,
    banks: c.banks,
  })),
  banks: Object.fromEntries(
    banks.map((b) => [
      b.id,
      {
        id: b.id,
        slug: b.slug,
        category: b.category,
        title: b.title,
        source: b.source,
        questions: b.questions,
      },
    ])
  ),
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'banks.json'), JSON.stringify(index), 'utf8')

const GEN_DIR = path.join(DOCS_DIR, '.vitepress', 'generated')
for (const c of categories) {
  const dir = path.join(DOCS_DIR, c.id)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  for (const b of c.banks) {
    const md = [
      '---',
      `title: ${b.title}`,
      'aside: false',
      'outline: false',
      '---',
      '',
      `<ClientOnly><QuizPage id="${b.id}" /></ClientOnly>`,
      '',
    ].join('\n')
    fs.writeFileSync(path.join(dir, `${b.slug}.md`), md, 'utf8')
  }
}

fs.mkdirSync(GEN_DIR, { recursive: true })
const sidebar = {}
for (const c of categories) {
  sidebar[`/${c.id}/`] = [
    {
      text: c.title,
      collapsed: false,
      items: [
        { text: '总览', link: `/${c.id}/`, docFooterText: '分类总览' },
        ...c.banks.map((b) => ({
          text: b.title,
          link: `/${c.id}/${b.slug}`,
          docFooterText: b.title,
        })),
      ],
    },
  ]
}
fs.writeFileSync(
  path.join(GEN_DIR, 'sidebar.mjs'),
  `export const sidebar = ${JSON.stringify(sidebar, null, 2)}\n`,
  'utf8'
)

const totalQ = banks.reduce((s, b) => s + b.questions.length, 0)
console.log(`题库构建完成：${categories.length} 个分类 / ${banks.length} 个题库 / ${totalQ} 道题`)
console.log(`  数据 → ${path.relative(ROOT, path.join(PUBLIC_DIR, 'banks.json'))}`)
