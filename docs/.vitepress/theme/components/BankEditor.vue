<script setup>
import { computed, ref, watch } from 'vue'
import { useBanks } from '../composables/useBanks.js'

const { data, loading, error } = useBanks()

const catId = ref('')
const bankId = ref('')
const draft = ref(null)
const editing = ref(-1)
const msg = ref('')

const categories = computed(() => data.value?.categories || [])
const banksInCat = computed(() => categories.value.find((c) => c.id === catId.value)?.banks || [])

watch(categories, (list) => {
  if (!catId.value && list.length) {
    catId.value = list[0].id
    bankId.value = list[0].banks[0]?.id || ''
  }
})

watch(bankId, (id) => {
  const b = data.value?.banks?.[id]
  draft.value = b ? JSON.parse(JSON.stringify(b)) : null
  editing.value = -1
})

const blankToken = '{{blank}}'

const TYPES = [
  { v: 'single', t: '单选' },
  { v: 'multiple', t: '多选' },
  { v: 'boolean', t: '判断' },
  { v: 'fill', t: '填空' },
  { v: 'code', t: '代码填空' },
]

function ensureOptions(q) {
  if (!q.options) q.options = [{ text: '' }, { text: '' }]
  if (!Array.isArray(q.answer)) q.answer = []
}
function ensureBlanks(q) {
  if (!Array.isArray(q.blanks)) q.blanks = ['']
}

function onTypeChange(q) {
  if (['single', 'multiple', 'boolean'].includes(q.type)) {
    ensureOptions(q)
    if (q.type === 'boolean' && q.options.length !== 2) {
      q.options = [{ text: '正确' }, { text: '错误' }]
    }
    delete q.blanks
    delete q.template
  } else {
    ensureBlanks(q)
    if (!q.template) q.template = ''
    delete q.options
    delete q.answer
  }
}

function nextQid() {
  const qs = draft.value?.questions || []
  const prefix = (draft.value?.id || 'q') + '-'
  let max = 0
  for (const q of qs) {
    const m = String(q.qid || '').match(/(\d+)[a-z]?$/)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return prefix + String(max + 1).padStart(3, '0')
}

function addQuestion() {
  const q = {
    qid: nextQid(),
    type: 'single',
    stem: '',
    options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
    answer: [0],
    explain: '',
    tags: [],
    difficulty: 2,
  }
  draft.value.questions.push(q)
  editing.value = draft.value.questions.length - 1
  flash('已新增一题，填写内容后记得导出')
}

function removeAt(i) {
  const q = draft.value.questions[i]
  if (!confirm(`确定删除 ${q.qid}？删除后该 qid 的答题记录会成为孤儿数据（不影响其他题）。`)) return
  draft.value.questions.splice(i, 1)
  if (editing.value === i) editing.value = -1
  else if (editing.value > i) editing.value -= 1
}

function move(i, d) {
  const list = draft.value.questions
  const j = i + d
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
  if (editing.value === i) editing.value = j
  else if (editing.value === j) editing.value = i
}

function reset() {
  const b = data.value?.banks?.[bankId.value]
  draft.value = b ? JSON.parse(JSON.stringify(b)) : null
  editing.value = -1
  flash('已还原为线上版本')
}

function flash(t) {
  msg.value = t
  setTimeout(() => (msg.value = ''), 3000)
}

/* ---------- YAML 序列化 ---------- */
const NEED_QUOTE = /^\s|\s$|:|#|\{|}|\[|,|&|\*|\?|\||>|%|@|`|!|'|"|\\/ 

function y(v) {
  const s = String(v ?? '')
  if (s === '') return '""'
  if (NEED_QUOTE.test(s)) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
  }
  return s
}

function toYaml(bank) {
  const L = []
  L.push('meta:')
  L.push(`  id: ${y(bank.id)}`)
  L.push(`  title: ${y(bank.title)}`)
  if (bank.source) L.push(`  source: ${y(bank.source)}`)
  L.push('questions:')
  for (const q of bank.questions) {
    L.push(`  - qid: ${y(q.qid)}`)
    L.push(`    type: ${y(q.type)}`)
    L.push(`    stem: ${y(q.stem)}`)
    if (['single', 'multiple', 'boolean'].includes(q.type)) {
      L.push('    options:')
      for (const o of q.options || []) L.push(`      - text: ${y(o.text)}`)
      L.push(`    answer: [${(q.answer || []).join(', ')}]`)
    } else {
      if (q.template) {
        L.push('    template: |-')
        for (const line of String(q.template).split('\n')) L.push(`      ${line}`)
      }
      L.push('    blanks:')
      for (const b of q.blanks || []) L.push(`      - ${y(b)}`)
    }
    L.push(`    explain: ${y(q.explain)}`)
    if (q.tags?.length) L.push(`    tags: [${q.tags.join(', ')}]`)
    L.push(`    difficulty: ${q.difficulty || 2}`)
  }
  return L.join('\n') + '\n'
}

const yamlText = computed(() => (draft.value ? toYaml(draft.value) : ''))

function download() {
  const blob = new Blob([yamlText.value], { type: 'text/yaml;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${draft.value.slug}.yaml`
  a.click()
  URL.revokeObjectURL(a.href)
  flash(`已下载 ${draft.value.slug}.yaml`)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(yamlText.value)
    flash('YAML 已复制到剪贴板')
  } catch {
    flash('复制失败，请手动选中复制')
  }
}

const targetPath = computed(() => {
  const cat = catId.value
  return `data/banks/${cat}/${draft.value?.slug || ''}.yaml`
})

function toggleAnswer(q, i) {
  const arr = Array.isArray(q.answer) ? [...q.answer] : []
  if (q.type === 'single' || q.type === 'boolean') {
    q.answer = [i]
  } else if (arr.includes(i)) {
    q.answer = arr.filter((x) => x !== i).sort((a, b) => a - b)
  } else {
    q.answer = [...arr, i].sort((a, b) => a - b)
  }
}
</script>

<template>
  <div class="ed">
    <header class="ed-head">
      <h1>题目编辑器</h1>
      <p>在这里改题、加题，完成后导出 YAML 覆盖回仓库再同步即可。题目 id（qid）不变，已记录的进度不会丢。</p>
    </header>

    <div v-if="loading" class="ed-empty">正在加载题库…</div>
    <div v-else-if="error" class="ed-empty err">{{ error }}</div>

    <template v-else>
      <div class="ed-picker">
        <label>
          <span>分类</span>
          <select v-model="catId" @change="bankId = banksInCat[0]?.id || ''">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.title }}</option>
          </select>
        </label>
        <label>
          <span>题库文件</span>
          <select v-model="bankId">
            <option v-for="b in banksInCat" :key="b.id" :value="b.id">{{ b.title }}（{{ b.count }} 题）</option>
          </select>
        </label>
        <div class="ed-picker-right">
          <button class="ed-btn" @click="addQuestion">+ 新增题目</button>
          <button class="ed-btn" @click="reset">还原</button>
        </div>
      </div>

      <div v-if="draft" class="ed-body">
        <div v-for="(q, i) in draft.questions" :key="q.qid" class="ed-item" :class="{ open: editing === i }">
          <div class="ed-row">
            <span class="ed-qid">{{ q.qid }}</span>
            <select v-model="q.type" class="ed-mini" @change="onTypeChange(q)">
              <option v-for="t in TYPES" :key="t.v" :value="t.v">{{ t.t }}</option>
            </select>
            <span class="ed-stem">{{ q.stem || '（未填写题干）' }}</span>
            <div class="ed-ops">
              <button title="上移" @click="move(i, -1)">↑</button>
              <button title="下移" @click="move(i, 1)">↓</button>
              <button title="删除" class="danger" @click="removeAt(i)">×</button>
              <button class="ed-toggle" @click="editing = editing === i ? -1 : i">
                {{ editing === i ? '收起' : '编辑' }}
              </button>
            </div>
          </div>

          <div v-if="editing === i" class="ed-form">
            <label class="ed-field">
              <span>题干</span>
              <textarea v-model="q.stem" rows="2"></textarea>
            </label>

            <div v-if="['single', 'multiple', 'boolean'].includes(q.type)" class="ed-field">
              <span>选项（点击左侧圆点标记正确答案）</span>
              <div class="ed-options">
                <div v-for="(o, k) in q.options" :key="k" class="ed-option">
                  <button
                    class="ed-dot"
                    :class="{ on: (q.answer || []).includes(k) }"
                    @click="toggleAnswer(q, k)"
                  ></button>
                  <input v-model="o.text" />
                  <button class="ed-del" @click="q.options.splice(k, 1)">×</button>
                </div>
              </div>
              <button class="ed-btn sm" @click="q.options.push({ text: '' })">+ 选项</button>
            </div>

            <div v-else class="ed-field">
              <span>代码模板（用 <code>{{ blankToken }}</code> 占位）</span>
              <textarea v-model="q.template" rows="5" class="mono"></textarea>
              <span class="ed-hint">每个空对应下面一个答案</span>
              <div class="ed-blanks">
                <input v-for="(b, k) in q.blanks" :key="k" v-model="q.blanks[k]" placeholder="该空的答案" />
              </div>
              <button class="ed-btn sm" @click="q.blanks.push('')">+ 空</button>
            </div>

            <label class="ed-field">
              <span>解析</span>
              <textarea v-model="q.explain" rows="3"></textarea>
            </label>

            <div class="ed-field line">
              <label>
                <span>标签（逗号分隔）</span>
                <input :value="(q.tags || []).join(' , ')" @change="q.tags = String($event.target.value).split(/[,，]/).map(s => s.trim()).filter(Boolean)" />
              </label>
              <label>
                <span>难度</span>
                <select v-model.number="q.difficulty">
                  <option :value="1">1 简单</option>
                  <option :value="2">2 中等</option>
                  <option :value="3">3 困难</option>
                </select>
              </label>
              <label>
                <span>qid</span>
                <input v-model="q.qid" class="mono" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <section class="ed-export">
        <div class="ed-export-head">
          <h2>导出</h2>
          <div class="ed-export-ops">
            <button class="ed-btn primary" @click="download">下载 YAML</button>
            <button class="ed-btn" @click="copy">复制 YAML</button>
          </div>
        </div>
        <p class="ed-path">覆盖到：<code>{{ targetPath }}</code>，然后跑 <code>pnpm sync</code></p>
        <details>
          <summary>预览</summary>
          <pre class="ed-preview">{{ yamlText }}</pre>
        </details>
      </section>

      <p v-if="msg" class="ed-msg">{{ msg }}</p>
    </template>
  </div>
</template>

<style scoped>
.ed {
  max-width: 900px;
}
.ed-head h1 {
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
}
.ed-head p {
  margin: 0 0 22px;
  font-size: 13.5px;
  color: var(--q-text-faint);
  line-height: 1.7;
  max-width: 620px;
}

.ed-picker {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
  padding: 14px 16px;
  border: 1px solid var(--q-border);
  border-radius: var(--q-radius);
  background: var(--q-surface);
  margin-bottom: 16px;
}
.ed-picker label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--q-text-faint);
}
.ed-picker select {
  font-size: 13px;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--q-border);
  background: var(--q-bg, transparent);
  color: var(--q-text);
  min-width: 180px;
}
.ed-picker-right {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.ed-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}
.ed-item {
  border: 1px solid var(--q-border);
  border-radius: 12px;
  background: var(--q-surface);
  overflow: hidden;
}
.ed-item.open {
  border-color: var(--q-accent);
}
.ed-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
}
.ed-qid {
  font-family: var(--vp-font-family-mono);
  font-size: 11.5px;
  color: var(--q-text-faint);
  flex: none;
}
.ed-mini {
  font-size: 11.5px;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid var(--q-border);
  background: transparent;
  color: var(--q-text-soft);
  flex: none;
}
.ed-stem {
  flex: 1;
  font-size: 13.5px;
  color: var(--q-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ed-ops {
  display: flex;
  gap: 4px;
  flex: none;
}
.ed-ops button {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid var(--q-border);
  background: transparent;
  color: var(--q-text-soft);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
}
.ed-ops button:hover {
  border-color: var(--q-border-strong);
  color: var(--q-text);
}
.ed-ops .danger:hover {
  border-color: var(--q-bad);
  color: var(--q-bad);
}
.ed-toggle {
  width: auto !important;
  padding: 0 10px;
  font-size: 12px !important;
}

.ed-form {
  padding: 4px 14px 16px;
  border-top: 1px dashed var(--q-border);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.ed-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
  color: var(--q-text-faint);
}
.ed-field.line {
  flex-direction: row;
  gap: 14px;
  flex-wrap: wrap;
}
.ed-field.line label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 150px;
}
.ed-field textarea,
.ed-field input {
  font-size: 13px;
  font-family: inherit;
  color: var(--q-text);
  background: var(--q-surface-2);
  border: 1px solid var(--q-border);
  border-radius: 8px;
  padding: 8px 10px;
  width: 100%;
  resize: vertical;
}
.ed-field textarea:focus,
.ed-field input:focus {
  outline: none;
  border-color: var(--q-accent);
}
.ed-field .mono {
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}
.ed-hint {
  font-size: 11.5px;
  opacity: 0.8;
}
.ed-options,
.ed-blanks {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 4px;
}
.ed-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ed-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--q-border-strong);
  background: transparent;
  cursor: pointer;
  flex: none;
}
.ed-dot.on {
  background: var(--q-ok);
  border-color: var(--q-ok);
}
.ed-del {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--q-border);
  background: transparent;
  color: var(--q-text-faint);
  cursor: pointer;
  flex: none;
}
.ed-del:hover {
  color: var(--q-bad);
  border-color: var(--q-bad);
}

.ed-btn {
  font-size: 13px;
  padding: 8px 15px;
  border-radius: 9px;
  border: 1px solid var(--q-border);
  background: var(--q-surface);
  color: var(--q-text-soft);
  cursor: pointer;
}
.ed-btn:hover {
  border-color: var(--q-accent);
  color: var(--q-accent);
}
.ed-btn.primary {
  background: var(--q-accent);
  border-color: var(--q-accent);
  color: #fff;
}
.ed-btn.sm {
  align-self: flex-start;
  font-size: 12px;
  padding: 5px 11px;
}

.ed-export {
  border: 1px solid var(--q-border);
  border-radius: var(--q-radius);
  background: var(--q-surface);
  padding: 16px 18px;
}
.ed-export-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.ed-export h2 {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}
.ed-export-ops {
  display: flex;
  gap: 8px;
}
.ed-path {
  font-size: 12.5px;
  color: var(--q-text-faint);
  margin: 10px 0 8px;
}
.ed-path code {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  background: var(--q-surface-2);
  border: 1px solid var(--q-border);
  border-radius: 5px;
  padding: 1px 5px;
  color: var(--q-text-soft);
}
.ed-export summary {
  font-size: 12.5px;
  color: var(--q-text-soft);
  cursor: pointer;
}
.ed-preview {
  max-height: 320px;
  overflow: auto;
  background: var(--q-surface-2);
  border: 1px solid var(--q-border);
  border-radius: 10px;
  padding: 12px 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.7;
  margin-top: 10px;
}

.ed-msg {
  margin-top: 14px;
  font-size: 13px;
  color: var(--q-ok);
}
.ed-empty {
  padding: 30px;
  text-align: center;
  color: var(--q-text-faint);
  border: 1px dashed var(--q-border);
  border-radius: var(--q-radius);
}
.ed-empty.err {
  color: var(--q-bad);
}
</style>
