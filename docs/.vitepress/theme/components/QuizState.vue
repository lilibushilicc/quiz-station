<script setup>
defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无内容' },
})
</script>

<template>
  <div v-if="loading" class="qs-state">正在加载题库…</div>
  <div v-else-if="error" class="qs-state qs-err">{{ error }}</div>
  <div v-else-if="empty" class="qs-state"><slot name="empty">{{ emptyText }}</slot></div>
  <template v-else><slot /></template>
</template>

<style scoped>
.qs-state {
  padding: 34px;
  text-align: center;
  font-size: 13.5px;
  color: var(--q-text-faint);
  border: 1px dashed var(--q-border);
  border-radius: var(--q-radius);
}
.qs-err {
  color: var(--q-bad);
  border-color: var(--q-bad-soft);
}
</style>
