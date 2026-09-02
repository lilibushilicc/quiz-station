# 知识点掌握巩固 · 答题站

把 Obsidian 笔记变成可在线刷题的静态站点。题库与站点解耦：改题加题只动数据，不用碰代码。
当前内置 **Python 系列 21 篇 / 182 道题**，题目素材来自 `相关知识/Python/`。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地预览（默认 http://localhost:5173） |
| `npm run quiz:check` | 校验题库：qid 是否重复、答案是否越界、题型是否合法、查重 |
| `npm run quiz:sync` | 只重新生成题库数据与页面（改完题跑这个，dev 会自动刷新） |
| `npm run build` | 构建静态站点，产物在 `docs/.vitepress/dist` |
| `npm run preview` | 预览构建产物 |

## 改题 / 加题

题目都在 `data/banks/<分类>/<文件名>.yaml`，一个笔记文件对应一个题库文件。

**改题**：直接编辑对应 qid 下的字段（题干、选项、解析随便改）。
**加题**：在 `questions:` 下追加一条，qid 往后排（如 `py-03-011`）。
**删题**：直接删掉该条目。

然后：

```bash
npm run quiz:check   # 校验，有问题会直接报错拦截
npm run quiz:sync    # 重新生成数据
```

关键约定：**qid 一旦上线就不要复用**。答题进度、错题本、掌握度全部以 qid 为键存在浏览器本地，
改题内容不会清空进度，加题也不影响已有题目。

不想改文件的话，也可以打开站点的 `/editor` 页面，可视化增删改后点「下载 YAML」，
覆盖到 `data/banks/<分类>/` 下再跑一次 `quiz:sync`。

## 题目格式

```yaml
meta:
  id: py-03                 # 题库 id，全局唯一
  title: 运算符与流程控制     # 导航里显示的名字
  source: 相关知识/Python/03-运算符与流程控制.md
  order: 3                  # 排序用
questions:
  - qid: py-03-001
    type: single            # single | multiple | boolean | fill | code
    stem: "题干，支持 `行内代码`"
    options:                # single / multiple / boolean 用
      - text: "选项一"
      - text: "选项二"
    answer: [1]             # 正确选项的下标，从 0 开始
    explain: "解析"
    tags: [运算符, 易错]
    difficulty: 2           # 1-3
```

填空题用 `template` + `blanks`，模板里的空位写 `{{blank}}`：

```yaml
  - qid: py-03-008
    type: code
    stem: "补全 for-else 结构"
    template: |
      for item in items:
          if not check(item):
              {{blank}}
      {{blank}}
          print("全部合格")
    blanks: ["break", "else:"]
    explain: "循环的 else 在未遇到 break 时执行。"
```

## 目录结构

```
data/banks/<分类>/*.yaml   正式题库，改题加题就动这里
data/_inbox/               AI 出的草稿，校验时只统计不进线上
scripts/                   题库校验、构建、页面生成
docs/                      VitePress 站点
  public/banks.json        运行时加载的题库索引（自动生成）
  python/*.md              每个题库一个页面（自动生成）
  .vitepress/theme/components/
    QuizCard.vue           单题卡片：判分、解析、标记掌握
    QuizPage.vue           练习页：筛选、乱序、重置、小结
    HomePanel.vue          主页分类卡片与进度统计
    QuizReview.vue         错题本
    BankEditor.vue         题目编辑器
```

## 进度存储

答题进度存在浏览器 localStorage，键为 `quiz:progress:v1`，按 qid 记录。
主页底部可以导出 / 导入 JSON 备份，换设备或清缓存前记得先导出。

## 部署

站点是纯静态的，推到 `main` 分支即触发 GitHub Actions 自动校验、构建并发布到 **GitHub Pages**
（工作流见 `.github/workflows/deploy.yml`）。**无需任何 Cloudflare 凭证 / Token / R2**。

- 站点地址：`https://lilibushilicc.github.io/quiz-station/`
- 自定义域名：在仓库 **Settings → Pages → Custom domain** 填 `quiz.270312.xyz`，
  并在 Cloudflare 加一条 CNAME `quiz` → `lilibushilicc.github.io`（开启代理 / 橙云做 CDN 加速），
  Cloudflare **SSL/TLS 模式设为 `Full`**。`docs/public/CNAME` 已写入该域名，会自动随部署生效。

改题 / 加题的标准流程就是：**编辑 `data/banks/*.yaml` → `git push` → Actions 自动部署**。
因为 qid 稳定，老进度 / 错题 / 掌握度不会丢。

```bash
npm run dev        # 本地预览 http://localhost:5173
npm run build      # 构建产物在 docs/.vitepress/dist（CI 里自动跑）
```

### 改题热更新（可选，需 R2 等可达地址）

默认页面加载随站点一起打包的 `banks.json`。要做成「改题不重新部署站点」，把题库放到
可达地址（如 R2 公开 URL）并在 `docs/.vitepress/config.mts` 的 `themeConfig` 里填：

```ts
themeConfig: {
  quiz: { banksUrl: 'https://pub-xxx.r2.dev/quiz/banks.json' }
}
```

开启后页面优先拉远端题库，只覆盖上传那个 JSON 就生效，站点本身不用重新部署。
（仅用 GitHub Pages 时这一项留空即可，题库随每次 push 自动更新。）
