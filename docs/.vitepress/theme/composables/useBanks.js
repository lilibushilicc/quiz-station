import { ref, shallowRef } from 'vue'
import { useData } from 'vitepress'

let cache = null

/** 加载题库索引：优先远程（热更新），失败回退本地打包的 banks.json */
export function useBanks() {
  const data = shallowRef(null)
  const loading = ref(true)
  const error = ref('')

  async function run() {
    if (cache) {
      data.value = cache
      loading.value = false
      return
    }
    const { theme } = useData()
    const base = import.meta.env.BASE_URL || '/'
    const remote = theme.value?.quiz?.banksUrl
    const urls = [remote, `${base}banks.json`.replace('//', '/')].filter(Boolean)

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) continue
        const json = await res.json()
        cache = json
        data.value = json
        loading.value = false
        return
      } catch (e) {
        /* 尝试下一个源 */
      }
    }
    error.value = '题库加载失败，检查 banks.json 是否存在'
    loading.value = false
  }

  run()
  return { data, loading, error }
}
