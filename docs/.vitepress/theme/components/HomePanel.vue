<script setup>
import { computed, ref } from 'vue'
import { useBanks } from '../composables/useBanks.js'
import { bankStats, exportProgress, importProgress } from '../composables/progress.js'
import { bankSummary } from '../composables/stats.js'
import QuizState from './QuizState.vue'

const { data, loading, error } = useBanks()
const msg = ref('')

const totals = computed(() => {
  const banks = Object.values(data.value?.banks || {})
  const s = { files: banks.length, total: 0, mastered: 0, wrong: 0 }
  for (const b of banks) {
    const x = bankSummary(b)
    s.total += x.total
    s.mastered += x.mastered
    s.wrong += x.wrong
  }
  s.rate = s.total ? Math.round((s.mastered / s.total) * 100) : 0
  return s
})

const recent = computed(() => {
  const entries = Object.entries(bankStats.value || {}).filter(([, v]) => v?.updatedAt)
  entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
  return entries.slice(0, 3).map(([id, v]) => {
    const bank = data.value?.banks?.[id]
    return bank ? { id, title: bank.title, category: bank.category, ...v } : null
  }).filter(Boolean)
})

/* 按分类 id 记忆化统计：进度(bankStats)或题库(data)变化时只重算一次，
   避免模板里每张卡片重复遍历全题库 */
const catStatsMap = computed(() => {
  const map = {}
  const banks = data.value?.banks || {}
  for (const c of data.value?.categories || []) {
    let total = 0
    let mastered = 0
    let wrong = 0
    for (const b of c.banks) {
      const bank = banks[b.id]
      if (!bank) continue
      const s = bankSummary(bank)
      total += s.total
      mastered += s.mastered
      wrong += s.wrong
    }
    map[c.id] = { total, mastered, wrong, rate: total ? Math.round((mastered / total) * 100) : 0 }
  }
  return map
})

function ring(rate) {
  const r = 15
  const c = 2 * Math.PI * r
  return { dash: `${(c * rate) / 100} ${c}`, r, c }
}

function download() {
  const blob = new Blob([exportProgress()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `quiz-progress-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function onImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    importProgress(await file.text())
    msg.value = '进度已导入'
  } catch (err) {
    msg.value = '导入失败：' + err.message
  }
  setTimeout(() => (msg.value = ''), 2600)
  e.target.value = ''
}
</script>

<template>
  <div class="hp">
    <QuizState :loading="loading" :error="error">
      <section class="hp-hero">
      <p class="hp-kicker">QUIZ STATION</p>
      <h1>知识点掌握巩固</h1>
      <p class="hp-sub">把笔记变成题目，随时检验自己到底掌握了多少。进度保存在本地浏览器。</p>
      <div v-if="!loading" class="hp-stats">
        <div><b>{{ totals.total }}</b><span>题目</span></div>
        <div><b>{{ totals.files }}</b><span>题库文件</span></div>
        <div><b>{{ totals.mastered }}</b><span>已掌握</span></div>
        <div :class="{ warn: totals.wrong }"><b>{{ totals.wrong }}</b><span>待复习</span></div>
      </div>
    </section>

      <section v-if="recent.length" class="hp-recent">
        <h2>继续上次</h2>
        <div class="hp-recent-list">
          <a v-for="r in recent" :key="r.id" :href="`/${r.category}/${(data.banks[r.id] || {}).slug}`">
            {{ r.title }}
            <em>{{ r.mastered }}/{{ r.total }}</em>
          </a>
        </div>
      </section>

      <section class="hp-cats">
        <h2>选择分类</h2>
        <div class="hp-grid">
          <a
            v-for="c in data.categories"
            :key="c.id"
            class="hp-card"
            :href="`/${c.id}/${c.banks[0].slug}`"
          >
            <div class="hp-card-top">
              <div>
                <h3>{{ c.title }}</h3>
                <p>{{ c.desc }}</p>
              </div>
              <svg class="hp-ring" viewBox="0 0 36 36" width="42" height="42">
                <circle cx="18" cy="18" :r="ring(catStatsMap[c.id].rate).r" fill="none" stroke="var(--q-border)" stroke-width="3" />
                <circle
                  cx="18" cy="18"
                  :r="ring(catStatsMap[c.id].rate).r"
                  fill="none"
                  stroke="var(--q-ok)"
                  stroke-width="3"
                  stroke-linecap="round"
                  :stroke-dasharray="ring(catStatsMap[c.id].rate).dash"
                  transform="rotate(-90 18 18)"
                />
              </svg>
            </div>
            <div class="hp-card-foot">
              <span>{{ c.banks.length }} 个文件 · {{ catStatsMap[c.id].total }} 题</span>
              <span v-if="catStatsMap[c.id].wrong" class="warn">{{ catStatsMap[c.id].wrong }} 待复习</span>
              <span v-else class="dim">{{ catStatsMap[c.id].rate }}% 掌握</span>
            </div>
          </a>
        </div>
      </section>

      <section class="hp-tools">
        <h2>进度管理</h2>
        <div class="hp-tools-row">
          <button class="hp-btn" @click="download">导出进度备份</button>
          <label class="hp-btn">
            导入进度备份
            <input type="file" accept="application/json" hidden @change="onImport" />
          </label>
          <a class="hp-btn" href="/review">查看错题本</a>
          <a class="hp-btn" href="/editor">题目编辑器</a>
          <span v-if="msg" class="hp-msg">{{ msg }}</span>
        </div>
        <p class="hp-note">进度以题目 id 为键保存，改题、加题都不会清空已记录的进度。</p>
      </section>
    </QuizState>
  </div>
</template>

<style scoped>
.hp {
  max-width: 1000px;
}
.hp-hero {
  padding: 22px 0 30px;
}
.hp-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--q-text-faint);
  margin: 0 0 10px;
}
.hp-hero h1 {
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  background: var(--q-accent-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hp-sub {
  font-size: 14.5px;
  color: var(--q-text-soft);
  margin: 0;
  max-width: 560px;
  line-height: 1.7;
}
.hp-stats {
  display: flex;
  gap: 10px;
  margin-top: 22px;
  flex-wrap: wrap;
}
.hp-stats > div {
  background: var(--q-surface);
  border: 1px solid var(--q-border);
  border-radius: 10px;
  padding: 10px 16px;
  min-width: 92px;
}
.hp-stats b {
  display: block;
  font-size: 21px;
  font-weight: 500;
  line-height: 1.2;
}
.hp-stats span {
  font-size: 12px;
  color: var(--q-text-faint);
}
.hp-stats .warn b {
  color: var(--q-bad);
}

.hp h2 {
  font-size: 13px;
  font-weight: 500;
  color: var(--q-text-faint);
  margin: 0 0 12px;
  letter-spacing: 0.02em;
}

.hp-recent {
  margin-bottom: 30px;
}
.hp-recent-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.hp-recent-list a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 7px 13px;
  border: 1px solid var(--q-border);
  border-radius: 9px;
  background: var(--q-surface);
  color: var(--q-text);
}
.hp-recent-list a:hover {
  border-color: var(--q-accent);
  color: var(--q-accent);
}
.hp-recent-list em {
  font-style: normal;
  font-size: 11.5px;
  color: var(--q-text-faint);
}

.hp-cats {
  margin-bottom: 34px;
}
.hp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
  gap: 12px;
}
.hp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 16px;
  border: 1px solid var(--q-border);
  border-radius: var(--q-radius);
  background: var(--q-surface);
  color: var(--q-text);
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.hp-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--q-accent-grad);
  opacity: 0;
  transition: opacity 0.2s ease;
}
.hp-card:hover {
  transform: translateY(-3px);
  border-color: transparent;
  box-shadow: var(--q-shadow-accent);
}
.hp-card:hover::before {
  opacity: 1;
}
.hp-card-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.hp-card h3 {
  font-size: 15.5px;
  font-weight: 500;
  margin: 0 0 6px;
}
.hp-card p {
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--q-text-faint);
  margin: 0;
}
.hp-card-foot {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--q-text-soft);
  padding-top: 12px;
  border-top: 1px solid var(--q-border);
}
.hp-card-foot .warn {
  color: var(--q-bad);
}
.hp-card-foot .dim {
  color: var(--q-text-faint);
}

.hp-tools {
  margin-bottom: 30px;
}
.hp-tools-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.hp-btn {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  padding: 8px 15px;
  border-radius: 9px;
  border: 1px solid var(--q-border);
  background: var(--q-surface);
  color: var(--q-text-soft);
  cursor: pointer;
}
.hp-btn:hover {
  border-color: var(--q-accent);
  color: var(--q-accent);
}
.hp-msg {
  font-size: 12.5px;
  color: var(--q-ok);
}
.hp-note {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--q-text-faint);
}
</style>
