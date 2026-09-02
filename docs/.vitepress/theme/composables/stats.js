import { progress } from './progress.js'

export function isWrong(qid) {
  const p = progress[qid]
  return Boolean(p && p.wrong > 0 && !p.mastered)
}

export function isDone(qid) {
  return Boolean(progress[qid]?.attempts > 0)
}

export function isMastered(qid) {
  return Boolean(progress[qid]?.mastered)
}

export function bankSummary(bank) {
  const ids = (bank?.questions || []).map((q) => q.qid)
  let done = 0
  let mastered = 0
  let wrong = 0
  let correctAttempts = 0
  let totalAttempts = 0
  for (const id of ids) {
    const p = progress[id]
    if (!p) continue
    if (p.attempts > 0) done += 1
    if (p.mastered) mastered += 1
    if (p.wrong > 0 && !p.mastered) wrong += 1
    totalAttempts += p.attempts
    correctAttempts += Math.max(0, p.attempts - p.wrong)
  }
  return {
    total: ids.length,
    done,
    mastered,
    wrong,
    accuracy: totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
    rate: ids.length ? Math.round((mastered / ids.length) * 100) : 0,
  }
}

export function categorySummary(banks) {
  const acc = { total: 0, done: 0, mastered: 0, wrong: 0, correctAttempts: 0, totalAttempts: 0 }
  for (const b of banks || []) {
    const s = bankSummary(b)
    acc.total += s.total
    acc.done += s.done
    acc.mastered += s.mastered
    acc.wrong += s.wrong
  }
  return { ...acc, rate: acc.total ? Math.round((acc.mastered / acc.total) * 100) : 0 }
}
