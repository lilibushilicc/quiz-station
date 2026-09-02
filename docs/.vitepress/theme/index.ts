import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'

import QuizCard from './components/QuizCard.vue'
import QuizPage from './components/QuizPage.vue'
import HomePanel from './components/HomePanel.vue'
import QuizReview from './components/QuizReview.vue'
import QuizState from './components/QuizState.vue'
import BankEditor from './components/BankEditor.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('QuizCard', QuizCard)
    app.component('QuizPage', QuizPage)
    app.component('HomePanel', HomePanel)
    app.component('QuizReview', QuizReview)
    app.component('QuizState', QuizState)
    app.component('BankEditor', BankEditor)
  },
} satisfies Theme
