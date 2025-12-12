# LLM 标题生成器（Obsidian 插件）

通过调用 **OpenAI Chat Completions 兼容接口**，根据笔记内容生成标题，并把标题用于 **重命名 Markdown 文件**。

## 功能

- 单文件：为当前文件生成标题并重命名
- 单文件（文件列表右键）：为指定文件生成标题并重命名
- 多选批量（文件列表多选右键）：批量生成标题并重命名
- 全库批量：对整个仓库的 Markdown 文件批量生成标题并重命名

默认每个笔记只发送前 3000 个字符（可在设置里调整）。

## 使用

1) 安装依赖：`npm install`
2) 开发（watch）：`npm run dev`
3) 生产构建：`npm run build`

## 在 Obsidian 中安装（手动）

把 `main.js`、`manifest.json`、`styles.css` 复制到：

`<Vault>/.obsidian/plugins/llm-title-generator/`

然后在 Obsidian 里 **Settings → Community plugins** 启用插件。

## 命令与菜单

- **命令面板**：
  - `LLM：生成标题并重命名（当前文件）`
  - `LLM：批量生成标题并重命名（整个仓库）`
- **文件列表右键**：`LLM：生成标题并重命名`
- **文件列表多选右键**：`LLM：批量生成标题并重命名`

## 设置

- `Base URL`：例如 `https://api.openai.com/v1`（也可填自建/第三方 OpenAI 兼容网关）
- `API key`：以 `Bearer` 方式发送
- `Model`：`chat/completions` 的 `model` 字段
- `最大输入字符数`：默认 3000
- 批量策略：批量前确认、请求间隔、全库处理上限等

## 隐私与安全说明

该插件会把笔记内容片段发送到你配置的接口用于生成标题；请只在你信任的服务上使用，并谨慎设置批量操作与速率。
