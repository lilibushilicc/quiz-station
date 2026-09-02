import { reactive, watch } from 'vue'

const KEY = 'quiz:progress:v1'
const BANK_KEY = 'quiz:bankmeta:v1'

function readJSON(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/** 每道题的作答状态：{ attempts, wrong, mastered, lastOk, updatedAt } */
export const progress = reactive(readJSON(KEY, {}))

/** 每个题库的统计快照：{ [bankId]: { done, correct, updatedAt } } */
export const bankStats = reactive(readJSON(BANK_KEY, {}))

if (typeof localStorage !== 'undefined') {
  let t = null
  const persist = () => {
    clearTimeout(t)
    t = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(progress))
        localStorage.setItem(BANK_KEY, JSON.stringify(bankStats))
      } catch {
        /* 配额满时静默 */
      }
    }, 120)
  }
  watch(progress, persist, { deep: true })
  watch(bankStats, persist, { deep: true })
}

export function record(qid, ok) {
  const p = progress[qid] || { attempts: 0, wrong: 0, mastered: false, lastOk: false }
  p.attempts += 1
  if (!ok) p.wrong += 1
  p.lastOk = ok
  p.updatedAt = Date.now()
  progress[qid] = p
}

export function setMastered(qid, v) {
  const p = progress[qid] || { attempts: 0, wrong: 0, mastered: false, lastOk: false }
  p.mastered = v
  p.updatedAt = Date.now()
  progress[qid] = p
}

export function resetOne(qid) {
  delete progress[qid]
}

export function resetBank(ids) {
  for (const id of ids) delete progress[id]
}

export function statOf(qid) {
  return progress[qid] || null
}

export function isMastered(qid) {
  return Boolean(progress[qid]?.mastered)
}

export function exportProgress() {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), progress, bankStats }, null, 2)
}

export function importProgress(text) {
  const obj = JSON.parse(text)
  if (!obj || typeof obj.progress !== 'object') throw new Error('文件格式不正确')
  for (const k of Object.keys(progress)) delete progress[k]
  Object.assign(progress, obj.progress)
  for (const k of Object.keys(bankStats)) delete bankStats[k]
  if (obj.bankStats) Object.assign(bankStats, obj.bankStats)
}
