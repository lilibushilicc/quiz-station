import { INBOX_DIR, TYPES, collectYaml, loadAllBanks, readBank } from './lib/banks.mjs'

const errors = []
const warns = []
const seenQid = new Map()

function checkQuestion(q, bankId, file) {
  const at = `${bankId} / ${q.qid}`
  if (!TYPES.includes(q.type)) errors.push(`${file} · ${at}: 未知题型 "${q.type}"`)
  if (!q.stem) errors.push(`${file} · ${at}: 题干为空`)

  if (q.type === 'single' || q.type === 'multiple' || q.type === 'boolean') {
    if (!q.options?.length) errors.push(`${file} · ${at}: 缺少选项`)
    if (!q.answer.length) errors.push(`${file} · ${at}: 缺少答案`)
    if (q.type === 'single' && q.answer.length > 1) errors.push(`${file} · ${at}: 单选题有多个答案`)
    if (q.type === 'multiple' && q.answer.length < 2) warns.push(`${file} · ${at}: 多选题只有 ${q.answer.length} 个答案`)
    for (const i of q.answer) {
      if (!Number.isInteger(i) || i < 0 || i >= (q.options?.length ?? 0)) {
        errors.push(`${file} · ${at}: 答案下标 ${i} 越界（共 ${q.options?.length ?? 0} 个选项）`)
      }
    }
    const texts = (q.options || []).map((o) => o.text)
    if (new Set(texts).size !== texts.length) warns.push(`${file} · ${at}: 存在重复选项`)
  } else {
    if (!q.blanks.length) errors.push(`${file} · ${at}: 填空题缺少 blanks`)
    if (q.template) {
      const holes = (q.template.match(/\{\{\s*blank\s*\}\}/g) || []).length
      const n = q.template ? holes : 0
      if (q.template && n !== q.blanks.length) {
        errors.push(`${file} · ${at}: 模板有 ${n} 个空，blanks 有 ${q.blanks.length} 个`)
      }
    }
  }
  if (!q.explain) warns.push(`${file} · ${at}: 没有解析`)

  if (seenQid.has(q.qid)) errors.push(`${file} · ${at}: qid 与 ${seenQid.get(q.qid)} 重复`)
  else seenQid.set(q.qid, bankId)
}

const { banks, categories } = loadAllBanks()
for (const b of banks) {
  const file = b.slug + '.yaml'
  if (!b.questions.length) warns.push(`${file}: 题库为空`)
  for (const q of b.questions) checkQuestion(q, b.id, file)
}

const inbox = collectYaml(INBOX_DIR).map((f) => ({ file: f, doc: readBank(f) }))
const inboxCount = inbox.reduce((s, x) => s + (x.doc.questions?.length || 0), 0)

const total = banks.reduce((s, b) => s + b.questions.length, 0)
const byType = {}
for (const b of banks) for (const q of b.questions) byType[q.type] = (byType[q.type] || 0) + 1

console.log('题库校验')
console.log(`  分类 ${categories.length} 个，题库文件 ${banks.length} 个，正式题目 ${total} 道`)
console.log(`  待审草稿区：${inbox.length} 个文件 / ${inboxCount} 道题（不进线上）`)
console.log(`  题型分布：${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join('  ') || '—'}`)
if (warns.length) {
  console.log(`\n警告 ${warns.length} 条`)
  for (const w of warns.slice(0, 30)) console.log('  ! ' + w)
  if (warns.length > 30) console.log(`  ... 还有 ${warns.length - 30} 条`)
}
if (errors.length) {
  console.log(`\n错误 ${errors.length} 条`)
  for (const e of errors.slice(0, 50)) console.log('  x ' + e)
  process.exit(1)
}
console.log('\n校验通过')
