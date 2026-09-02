<script setup>
import { computed, ref, watch } from 'vue'
import { progress, record, resetOne, setMastered } from '../composables/progress.js'

const props = defineProps({
  q: { type: Object, required: true },
  index: { type: Number, default: 0 },
  shuffle: { type: Boolean, default: false },
})

const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const TYPE_LABEL = {
  single: '单选',
  multiple: '多选',
  boolean: '判断',
  fill: '填空',
  code: '代码填空',
}

/* 选项乱序：保持正确答案映射 */
const order = computed(() => {
  const n = props.q.options?.length || 0
  const idx = Array.from({ length: n }, (_, i) => i)
  if (!props.shuffle) return idx
  let seed = 0
  for (const ch of props.q.qid) seed = (seed * 31 + ch.charCodeAt(0)) % 100000
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    const j = seed % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
})

const shownOptions = computed(() => order.value.map((i) => ({ i, text: props.q.options[i].text })))

const picked = ref([])
const blanks = ref([])
const submitted = ref(false)
const result = ref(null)

const stat = computed(() => progress[props.q.qid] || null)
const everDone = computed(() => Boolean(stat.value && stat.value.attempts > 0))

watch(
  () => props.q.qid,
  () => {
    picked.value = []
    blanks.value = Array(props.q.blanks?.length || 0).fill('')
    submitted.value = false
    result.value = null
  },
  { immediate: true }
)

const canSubmit = computed(() => {
  if (submitted.value) return false
  if (['single', 'multiple', 'boolean'].includes(props.q.type)) return picked.value.length > 0
  return blanks.value.some((v) => String(v).trim() !== '')
})

function toggle(i) {
  if (submitted.value) return
  if (props.q.type === 'single' || props.q.type === 'boolean') {
    picked.value = [i]
  } else if (picked.value.includes(i)) {
    picked.value = picked.value.filter((x) => x !== i)
  } else {
    picked.value = [...picked.value, i].sort()
  }
}

function normalizeAnswer(v, caseSensitive) {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ')
  return caseSensitive ? s : s.toLowerCase()
}

function submit() {
  const q = props.q
  let ok = false
  let detail = null

  if (['single', 'multiple', 'boolean'].includes(q.type)) {
    const mine = [...picked.value].sort((a, b) => a - b)
    const ans = [...q.answer].sort((a, b) => a - b)
    ok = mine.length === ans.length && mine.every((v, i) => v === ans[i])
    detail = { mine: mine.map((i) => letters[i]), right: ans.map((i) => letters[i]) }
  } else {
    ok = q.blanks.every((a, i) => {
      const mine = normalizeAnswer(blanks.value[i], q.caseSensitive)
      return mine !== '' && mine === normalizeAnswer(a, q.caseSensitive)
    })
    detail = { mine: blanks.value.map((v) => String(v ?? '')), right: q.blanks }
  }

  result.value = { ok, detail }
  submitted.value = true
  record(q.qid, ok)
  if (!ok) setMastered(q.qid, false)
}

function again() {
  picked.value = []
  blanks.value = Array(props.q.blanks?.length || 0).fill('')
  submitted.value = false
  result.value = null
}

function markMastered() {
  setMastered(props.q.qid, true)
}

function forget() {
  resetOne(props.q.qid)
  again()
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}
function rich(s) {
  return escapeHtml(s ?? '').replace(/`([^`]+)`/g, '<code class="q-inline-code">$1</code>')
}

const codeParts = computed(() => {
  const t = props.q.template || ''
  return t.split(/\{\{\s*blank\s*\}\}/)
})

function optionState(i) {
  if (!submitted.value) return picked.value.includes(i) ? 'picked' : ''
  const isRight = props.q.answer.includes(i)
  const isPicked = picked.value.includes(i)
  if (isRight) return 'right'
  if (isPicked) return 'wrong'
  return ''
}
</script>

<template>
  <article class="q-card" :class="{ 'is-mastered': stat?.mastered }">
    <header class="q-head">
      <span class="q-no">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="q-type">{{ TYPE_LABEL[q.type] || q.type }}</span>
      <span class="q-diff" :title="'难度 ' + q.difficulty">
        <i v-for="n in 3" :key="n" :class="{ on: n <= q.difficulty }"></i>
      </span>
      <span v-for="t in q.tags" :key="t" class="q-tag">{{ t }}</span>
      <span v-if="stat?.mastered" class="q-mastered">已掌握</span>
      <span v-else-if="everDone" class="q-history">
        做过 {{ stat.attempts }} 次<span v-if="stat.wrong"> · 错 {{ stat.wrong }} 次</span>
      </span>
    </header>

    <div class="q-stem" v-html="rich(q.stem)"></div>

    <div v-if="q.options" class="q-options">
      <button
        v-for="(o, k) in shownOptions"
        :key="o.i"
        class="q-option"
        :class="optionState(o.i)"
        :disabled="submitted"
        @click="toggle(o.i)"
      >
          <span class="q-letter">{{ letters[k] }}</span>
          <span class="q-text" v-html="rich(o.text)"></span>
          <span
            v-if="submitted && (optionState(o.i) === 'right' || optionState(o.i) === 'wrong')"
            class="q-mark"
            :class="optionState(o.i)"
          >
            <svg v-if="optionState(o.i) === 'right'" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
        </button>
    </div>

    <div v-else class="q-code">
      <pre><span v-for="(seg, i) in codeParts" :key="i">{{ seg }}<input
            v-if="i < codeParts.length - 1"
            v-model="blanks[i]"
            class="q-blank"
            :class="{ done: submitted }"
            :style="{ width: Math.max(4, (q.blanks[i] || '').length + 2) + 'ch' }"
            :disabled="submitted"
            spellcheck="false"
            autocomplete="off"
          /></span></pre>
    </div>

    <footer class="q-foot">
      <button v-if="!submitted" class="q-btn primary" :disabled="!canSubmit" @click="submit">提交</button>
      <div v-else class="q-actions">
        <button class="q-btn" @click="again">再做一次</button>
        <button v-if="!stat?.mastered" class="q-btn" @click="markMastered">标记已掌握</button>
        <button v-else class="q-btn" @click="forget">清除记录</button>
      </div>
    </footer>

    <div v-if="submitted" class="q-result" :class="result.ok ? 'ok' : 'bad'">
      <div class="q-verdict">
        <svg v-if="result.ok" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 8.5l3.2 3.2L13 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <strong>{{ result.ok ? '正确' : '不正确' }}</strong>
        <span v-if="!result.ok" class="q-compare">
          你的答案 <b>{{ result.detail.mine.join(' / ') || '空' }}</b>
          <em>→</em>
          正确答案 <b>{{ result.detail.right.join(' / ') }}</b>
        </span>
      </div>
      <div v-if="q.explain" class="q-explain" v-html="rich(q.explain)"></div>
    </div>
  </article>
</template>

<style scoped>
.q-card {
  background: var(--q-surface);
  border: 1px solid var(--q-border);
  border-radius: var(--q-radius);
  padding: 20px 22px 18px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}
.q-card:hover {
  border-color: var(--q-border-strong);
  box-shadow: var(--q-shadow);
}
.q-card.is-mastered {
  border-color: var(--q-ok-soft);
}

.q-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.q-no {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--q-text-faint);
}
.q-type {
  font-size: 11px;
  line-height: 1;
  padding: 4px 7px;
  border-radius: 6px;
  background: var(--q-accent-soft);
  color: var(--q-accent);
}
.q-diff {
  display: inline-flex;
  gap: 3px;
}
.q-diff i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--q-border-strong);
}
.q-diff i.on {
  background: var(--q-accent);
}
.q-tag {
  font-size: 11px;
  color: var(--q-text-faint);
  border: 1px solid var(--q-border);
  border-radius: 6px;
  padding: 3px 6px;
}
.q-mastered {
  margin-left: auto;
  font-size: 11px;
  color: var(--q-ok);
  background: var(--q-ok-soft);
  border-radius: 6px;
  padding: 3px 7px;
}
.q-history {
  margin-left: auto;
  font-size: 11px;
  color: var(--q-text-faint);
}

.q-stem {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--q-text);
  margin-bottom: 14px;
}
.q-stem :deep(.q-inline-code),
.q-explain :deep(.q-inline-code) {
  font-family: var(--vp-font-family-mono);
  font-size: 0.88em;
  background: var(--q-surface-2);
  border: 1px solid var(--q-border);
  border-radius: 5px;
  padding: 1px 5px;
}

.q-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.q-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 11px 13px;
  border: 1px solid var(--q-border);
  border-radius: 10px;
  background: transparent;
  color: var(--q-text);
  font-size: 14px;
  line-height: 1.6;
  cursor: pointer;
  transition: all 0.15s ease;
}
.q-option:hover:not(:disabled) {
  border-color: var(--q-accent);
  background: var(--q-surface-2);
  box-shadow: inset 3px 0 0 var(--q-accent);
  transform: translateX(2px);
}
.q-option:disabled {
  cursor: default;
}
.q-option.picked {
  border-color: var(--q-accent);
  background: var(--q-accent-soft);
}
.q-option.right {
  border-color: var(--q-ok);
  background: var(--q-ok-soft);
}
.q-option.wrong {
  border-color: var(--q-bad);
  background: var(--q-bad-soft);
}
.q-letter {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid var(--q-border);
  display: grid;
  place-items: center;
  font-size: 11px;
  color: var(--q-text-soft);
}
.q-option.picked .q-letter,
.q-option.right .q-letter {
  border-color: transparent;
  color: var(--q-accent);
}
.q-mark {
  margin-left: auto;
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.q-mark.right {
  color: var(--q-ok);
  background: var(--q-ok-soft);
}
.q-mark.wrong {
  color: var(--q-bad);
  background: var(--q-bad-soft);
}

.q-code pre {
  margin: 0;
  padding: 14px 16px;
  background: var(--q-surface-2);
  border: 1px solid var(--q-border);
  border-radius: 10px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 2;
  white-space: pre-wrap;
  word-break: break-word;
}
.q-blank {
  display: inline-block;
  min-width: 40px;
  margin: 0 2px;
  padding: 2px 8px;
  border: none;
  border-bottom: 1.5px solid var(--q-accent);
  background: var(--q-surface);
  color: var(--q-text);
  font: inherit;
  text-align: center;
  border-radius: 4px 4px 0 0;
  outline: none;
}
.q-blank:focus {
  box-shadow: 0 0 0 2px var(--q-accent-soft);
}
.q-blank:disabled {
  color: var(--q-ok);
  background: transparent;
}

.q-foot {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
.q-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.q-btn {
  font-size: 13px;
  padding: 7px 15px;
  border-radius: 8px;
  border: 1px solid var(--q-border);
  background: transparent;
  color: var(--q-text-soft);
  cursor: pointer;
  transition: all 0.15s ease;
}
.q-btn:hover {
  border-color: var(--q-border-strong);
  color: var(--q-text);
}
.q-btn.primary {
  background: var(--q-accent);
  border-color: var(--q-accent);
  color: #fff;
}
.q-btn.primary:hover {
  filter: brightness(1.06);
}
.q-btn.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: none;
}

.q-result {
  margin-top: 14px;
  border-radius: 12px;
  padding: 13px 15px;
  font-size: 13.5px;
  line-height: 1.75;
  border: 1px solid var(--q-border);
  animation: q-fade-up 0.28s ease both;
}
.q-result.ok {
  background: var(--q-ok-soft);
  color: var(--q-ok);
  border-color: var(--q-ok-soft);
}
.q-result.bad {
  background: var(--q-bad-soft);
  color: var(--q-bad);
  border-color: var(--q-bad-soft);
}
.q-verdict strong {
  font-weight: 600;
}
.q-verdict {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.q-verdict strong {
  font-weight: 500;
}
.q-compare {
  color: var(--q-text-soft);
  font-size: 12.5px;
}
.q-compare b {
  font-weight: 500;
  color: var(--q-text);
}
.q-compare em {
  font-style: normal;
  margin: 0 4px;
  opacity: 0.5;
}
.q-explain {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--q-border);
  color: var(--q-text-soft);
}
</style>
