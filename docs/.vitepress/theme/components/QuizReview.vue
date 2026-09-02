<script setup>
import { computed, ref } from 'vue'
import { useBanks } from '../composables/useBanks.js'
import { progress, resetBank } from '../composables/progress.js'
import { isWrong } from '../composables/stats.js'
import QuizCard from './QuizCard.vue'

const { data, loading, error } = useBanks()
const groupByBank = ref(true)
const nonces = ref(0)

const wrongGroups = computed(() => {
  const banks = data.value?.banks || {}
  const groups = []
  for (const [id, b] of Object.entries(banks)) {
    const qs = b.questions.filter((q) => isWrong(q.qid))
    if (qs.length) groups.push({ id, title: b.title, category: b.category, questions: qs })
  }
  groups.sort((a, b) => b.questions.length - a.questions.length)
  return groups
})

const flat = computed(() => wrongGroups.value.flatMap((g) => g.questions))
const total = computed(() => flat.value.length)

function clearAll() {
  resetBank(flat.value.map((q) => q.qid))
  nonces.value++
}
</script>

<template>
  <div class="rv">
    <header class="rv-head">
      <h1>错题本</h1>
      <p>汇总所有分类里答错过、且还没标记为「已掌握」的题目。</p>
    </header>

    <div v-if="loading" class="rv-empty">正在加载题库…</div>
    <div v-else-if="error" class="rv-empty err">{{ error }}</div>
    <div v-else-if="!total" class="rv-empty">暂时没有错题，去<router-link to="/"> 分类练习 </router-link>刷几套吧。</div>

    <template v-else>
      <div class="rv-tools">
        <span>共 {{ total }} 道待复习，分布在 {{ wrongGroups.length }} 个文件</span>
        <div class="rv-right">
          <button class="rv-chip" :class="{ on: groupByBank }" @click="groupByBank = true">按文件分组</button>
          <button class="rv-chip" :class="{ on: !groupByBank }" @click="groupByBank = false">混合刷</button>
          <button class="rv-chip" @click="clearAll">清空错题记录</button>
        </div>
      </div>

      <template v-if="groupByBank">
        <section v-for="g in wrongGroups" :key="g.id" class="rv-group">
          <h2>
            <a :href="`/${g.category}/${(data.banks[g.id] || {}).slug}`">{{ g.title }}</a>
            <em>{{ g.questions.length }} 题</em>
          </h2>
          <div class="rv-list">
            <QuizCard v-for="(q, i) in g.questions" :key="q.qid + '-' + nonces" :q="q" :index="i" />
          </div>
        </section>
      </template>
      <div v-else class="rv-list">
        <QuizCard v-for="(q, i) in flat" :key="q.qid + '-' + nonces" :q="q" :index="i" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.rv {
  max-width: 820px;
}
.rv-head h1 {
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -0.01em;
  margin: 0 0 6px;
}
.rv-head p {
  margin: 0 0 22px;
  font-size: 13.5px;
  color: var(--q-text-faint);
}
.rv-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--q-text-soft);
}
.rv-right {
  display: flex;
  gap: 8px;
}
.rv-chip {
  font-size: 12.5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--q-border);
  background: var(--q-surface);
  color: var(--q-text-soft);
  cursor: pointer;
}
.rv-chip.on {
  border-color: var(--q-accent);
  color: var(--q-accent);
  background: var(--q-accent-soft);
}
.rv-group {
  margin-bottom: 32px;
}
.rv-group h2 {
  display: flex;
  align-items: baseline;
  gap: 9px;
  font-size: 15px;
  font-weight: 500;
  margin: 0 0 12px;
}
.rv-group h2 a {
  color: var(--q-text);
}
.rv-group h2 a:hover {
  color: var(--q-accent);
}
.rv-group h2 em {
  font-style: normal;
  font-size: 12px;
  color: var(--q-text-faint);
}
.rv-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.rv-empty {
  padding: 34px;
  text-align: center;
  font-size: 13.5px;
  color: var(--q-text-faint);
  border: 1px dashed var(--q-border);
  border-radius: var(--q-radius);
}
.rv-empty.err {
  color: var(--q-bad);
}
</style>
