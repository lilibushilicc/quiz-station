<script setup>
import { computed, ref } from 'vue'
import { useBanks } from '../composables/useBanks.js'
import { progress, resetBank } from '../composables/progress.js'
import { bankSummary, isMastered, isWrong } from '../composables/stats.js'
import QuizCard from './QuizCard.vue'

const props = defineProps({ id: { type: String, required: true } })

const { data, loading, error } = useBanks()
const filter = ref('all')
const shuffle = ref(false)
const nonces = ref(0)

const bank = computed(() => data.value?.banks?.[props.id] || null)
const category = computed(() => data.value?.categories?.find((c) => c.id === bank.value?.category) || null)
const summary = computed(() => bankSummary(bank.value))
const nextLink = computed(() => {
  const list = category.value?.banks || []
  const i = list.findIndex((b) => b.id === props.id)
  return i >= 0 ? list[i + 1] : null
})

const shown = computed(() => {
  const qs = bank.value?.questions || []
  if (filter.value === 'todo') return qs.filter((q) => !isMastered(q.qid))
  if (filter.value === 'wrong') return qs.filter((q) => isWrong(q.qid))
  return qs
})

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'todo', label: '未掌握' },
  { key: 'wrong', label: '错题' },
]

function resetAll() {
  if (!bank.value) return
  resetBank(bank.value.questions.map((q) => q.qid))
  nonces.value++
}
</script>

<template>
  <div class="qp">
    <div v-if="loading" class="qp-empty">正在加载题库…</div>
    <div v-else-if="error" class="qp-empty err">{{ error }}</div>
    <div v-else-if="!bank" class="qp-empty err">找不到题库「{{ id }}」</div>

    <template v-else>
      <header class="qp-head">
        <div class="qp-crumb">
          <a href="/">知识点掌握巩固</a>
          <span>/</span>
          <a v-if="category" :href="`/${category.id}/${category.banks[0].slug}`">{{ category.title }}</a>
        </div>
        <h1>{{ bank.title }}</h1>
        <div class="qp-meta">
          <span>{{ summary.total }} 题</span>
          <span>已做 {{ summary.done }}</span>
          <span>已掌握 {{ summary.mastered }}</span>
          <span v-if="summary.wrong" class="warn">待复习 {{ summary.wrong }}</span>
          <span v-if="summary.done">正确率 {{ summary.accuracy }}%</span>
        </div>
        <div class="qp-bar"><i :style="{ width: summary.rate + '%' }"></i></div>
      </header>

      <div class="qp-tools">
        <div class="qp-seg">
          <button
            v-for="f in FILTERS"
            :key="f.key"
            :class="{ on: filter === f.key }"
            @click="filter = f.key"
          >
            {{ f.label }}
            <em v-if="f.key === 'wrong' && summary.wrong">{{ summary.wrong }}</em>
          </button>
        </div>
        <div class="qp-right">
          <button class="qp-chip" :class="{ on: shuffle }" @click="shuffle = !shuffle">乱序</button>
          <button class="qp-chip" @click="resetAll">重置本套</button>
        </div>
      </div>

      <div class="qp-list">
        <QuizCard
          v-for="(q, i) in shown"
          :key="q.qid + '-' + nonces"
          :q="q"
          :index="i"
          :shuffle="shuffle"
        />
        <p v-if="!shown.length" class="qp-empty">
          {{ filter === 'wrong' ? '这一套还没有错题' : '这一套已经全部掌握了' }}
        </p>
      </div>

      <footer v-if="nextLink" class="qp-next">
        <span>下一篇</span>
        <a :href="`/${bank.category}/${nextLink.slug}`">{{ nextLink.title }} →</a>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.qp {
  max-width: 820px;
}
.qp-head {
  margin-bottom: 20px;
}
.qp-crumb {
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  color: var(--q-text-faint);
  margin-bottom: 8px;
}
.qp-crumb a {
  color: var(--q-text-soft);
}
.qp-crumb a:hover {
  color: var(--q-accent);
}
.qp-head h1 {
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 10px;
}
.qp-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--q-text-soft);
  margin-bottom: 10px;
}
.qp-meta .warn {
  color: var(--q-bad);
}
.qp-bar {
  height: 4px;
  border-radius: 99px;
  background: var(--q-surface-3);
  overflow: hidden;
}
.qp-bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--q-accent), var(--q-ok));
  border-radius: 99px;
  transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.qp-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.qp-seg {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--q-border);
  border-radius: 10px;
  background: var(--q-surface-2);
}
.qp-seg button.on {
  box-shadow: var(--q-shadow-sm);
}
.qp-seg button {
  border: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--q-text-soft);
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.qp-seg button.on {
  background: var(--q-accent-soft);
  color: var(--q-accent);
}
.qp-seg em {
  font-style: normal;
  font-size: 11px;
  opacity: 0.8;
}
.qp-right {
  display: flex;
  gap: 8px;
}
.qp-chip {
  font-size: 12.5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--q-border);
  background: var(--q-surface);
  color: var(--q-text-soft);
  cursor: pointer;
}
.qp-chip:hover {
  border-color: var(--q-border-strong);
  color: var(--q-text);
}
.qp-chip.on {
  border-color: var(--q-accent);
  color: var(--q-accent);
  background: var(--q-accent-soft);
}

.qp-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qp-empty {
  padding: 28px;
  text-align: center;
  font-size: 13.5px;
  color: var(--q-text-faint);
  border: 1px dashed var(--q-border);
  border-radius: var(--q-radius);
}
.qp-empty.err {
  color: var(--q-bad);
  border-color: var(--q-bad-soft);
}

.qp-next {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid var(--q-border);
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}
.qp-next span {
  color: var(--q-text-faint);
}
.qp-next a {
  color: var(--q-accent);
}
</style>
