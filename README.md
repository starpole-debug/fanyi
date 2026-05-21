# Translator Control Center

> 触发一次部署校验：文档微调，不影响功能。

这是把旧 Flask 翻译小工具重构成的一个更适合 Vercel 的版本。

## 这次重构解决了什么

- 不再需要进代码改 AI 提供商或模型。
- 后台页面可以直接切换当前提供商、翻译模型、润色模型、评分模型和系统提示词。
- 支持第三方 OpenAI 兼容接口，自定义 `Base URL` 和 API Key 环境变量名。
- 前台翻译页和后台管理页分离，适合你自己长期维护。
- 部署目标改成 Vercel，生产环境建议接 `Vercel Postgres` 做持久化。

## 技术方案

- 前端和服务端：Next.js App Router
- AI 调用：OpenAI SDK，兼容 OpenAI / OpenRouter / DeepSeek
- 存储：
  - 本地开发：`.data/translator-db.json`
  - 生产部署：`POSTGRES_URL` 指向的 Postgres

## 需要的环境变量

至少配置这些：

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请改成你自己的强密码
ADMIN_SESSION_SECRET=随便生成一串长一点的随机字符串
```

AI 提供商按你启用哪个就配哪个：

```bash
OPENAI_API_KEY=
OPENROUTER_API_KEY=
DEEPSEEK_API_KEY=
CUSTOM_AI_API_KEY=
```

Vercel 生产环境建议再加：

```bash
POSTGRES_URL=
```

## 本地启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

- 前台：`/`
- 后台：`/admin`

## Vercel 部署建议

1. 把项目推到 GitHub。
2. 在 Vercel 导入仓库。
3. 在 Vercel 项目里添加环境变量。
4. 在 Vercel 里创建 Postgres，把 `POSTGRES_URL` 注入项目。
5. 首次访问时应用会自动初始化表。

## 第三方 URL 怎么配

1. 在 Vercel 环境变量里填你自己的密钥，例如 `CUSTOM_AI_API_KEY`。
2. 登录后台 `/admin`。
3. 把当前提供商切到 `custom`。
4. 填入第三方平台给你的 `Base URL`，例如 `https://xxx.com/v1`。
5. 把“自定义 API Key 环境变量名”填成 `CUSTOM_AI_API_KEY`。
6. 保存后，前台和后台评分/润色都会走这套配置。

## 为什么不继续用 Flask + sqlite

因为你要的是：

- 能部署在 Vercel
- 能后台直接改 AI 选择
- 配置和记录能持久化

而不是“服务器本地一个 sqlite 文件加手改配置”。Vercel 是无状态环境，这种老结构越修越别扭，所以这次直接换成更合适的架构。
