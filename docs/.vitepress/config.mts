import { defineConfig } from 'vitepress'
import { sidebar } from './generated/sidebar.mjs'
import { loadAllBanks } from '../../scripts/lib/banks.mjs'

const { categories } = loadAllBanks()

const nav = [
  { text: '知识点掌握巩固', link: '/' },
  {
    text: '分类练习',
    items: categories.map((c) => ({
      text: c.title,
      link: c.banks[0] ? `/${c.id}/${c.banks[0].slug}` : `/${c.id}/`,
    })),
  },
  { text: '错题本', link: '/review' },
  { text: '题目编辑器', link: '/editor' },
]

export default defineConfig({
  base: '/quiz-station/',
  lang: 'zh-CN',
  title: '知识点掌握巩固',
  description: '把笔记变成题目，随学随练',
  cleanUrls: true,
  head: [['meta', { name: 'theme-color', content: '#5b6cff' }]],
  themeConfig: {
    nav,
    sidebar,
    outline: false,
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索题目', buttonAriaLabel: '搜索题目' },
              modal: {
                noResultsText: '没有找到相关内容',
                resetButtonTitle: '清除',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
    docFooter: { prev: '上一节', next: '下一节' },
    lastUpdated: { text: '题库更新于' },
    footer: { message: '随学随练 · 进度保存在本地浏览器', copyright: '' },
    externalLinkIcon: true,
  },
})
