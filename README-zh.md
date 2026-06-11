# Skill Hub

一个开放的 AI Agent 技能分享与管理平台。

## 功能特性

- 🔐 **用户认证** — 注册、登录，基于 JWT + HttpOnly Cookie
- 📦 **技能管理** — 上传（ZIP）、创建、编辑、删除技能
- 🏷️ **版本历史** — 每次上传 ZIP 自动生成语义化版本（semver）快照；可浏览或下载任意历史版本
- 🔍 **搜索与过滤** — 全文搜索，按分类/作者过滤，按时间/收藏排序
- ⭐ **收藏系统** — 收藏喜欢的技能（乐观更新）
- 📄 **README 渲染** — 完整 Markdown 渲染，支持语法高亮
- 📁 **文件浏览器** — 在线浏览和编辑最新版文件；历史版本只读浏览
- 📥 **下载** — 下载最新版或任意历史版本的 ZIP 包
- 🏷️ **分类管理** — 创建和管理技能分类
- 🌐 **国际化** — 支持中文/英文，自动检测语言，可手动切换
- 📱 **响应式** — 适配桌面、平板和移动端

## 技术栈

- **框架**: Next.js 16（App Router）
- **语言**: TypeScript
- **数据库**: PostgreSQL 15 + Drizzle ORM
- **认证**: JWT（jose）+ HttpOnly Cookie
- **样式**: Tailwind CSS 4 + Radix UI
- **国际化**: next-intl

## 快速开始

### 前置要求

- Node.js 20+
- PostgreSQL 15+

### 安装步骤

1. **克隆并安装依赖：**
   ```bash
   git clone https://github.com/cymoo/skill-hub.git
   cd skill-hub
   npm install
   ```

2. **配置环境变量：**
   ```bash
   cp .env.example .env.local
   ```
   
   编辑 `.env.local`，填入 PostgreSQL 连接串和 JWT 密钥：
   ```env
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/skillhub
   JWT_SECRET=your-secret-key-here-at-least-32-characters
   UPLOAD_DIR=./data/skills
   MAX_ZIP_SIZE_MB=50
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
   认证 Cookie 的 `secure` 标志解析优先级：`x-forwarded-proto`（代理）→ 当前请求协议 → `NEXT_PUBLIC_APP_URL` 协议 → `NODE_ENV` 兜底。`NEXT_PUBLIC_APP_URL` 以 `https://` 开头时启用 `secure`，以 `http://` 开头时禁用。

3. **创建数据库：**

   `createdb` 是 PostgreSQL 自带的命令行工具，**不是** npm 包，请勿使用 `npx` 运行。
   ```bash
   createdb skillhub
   ```
   如果 `createdb` 不在 PATH 中，可改用 `psql`：
   ```bash
   psql -U postgres -c "CREATE DATABASE skillhub;"
   ```
   也可以使用 pgAdmin、TablePlus 等图形界面工具创建。数据库名须与 `DATABASE_URL` 中一致。

4. **执行迁移：**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   > `drizzle-kit` 不会自动读取 Next.js 的 `.env.local`。项目的 `drizzle.config.ts` 已处理该问题，只要 `DATABASE_URL` 配置在 `.env.local` 或 `.env` 中，无需额外操作。

5. **填充演示数据（可选）：**
   ```bash
   npm run db:seed
   ```
   会创建示例分类、演示用户（`demo@skillhub.dev` / `demo1234`）和示例技能。

6. **启动开发服务器：**
   ```bash
   npm run dev
   ```
   
   访问 [http://localhost:3000](http://localhost:3000)。

### 生产部署

```bash
npm run build
npm start
```

应用使用 `output: "standalone"` 支持自托管，`.next/standalone` 可独立部署。

## 版本管理

每个技能支持完整的版本历史。版本**只能通过上传 ZIP 创建**——在线编辑文件不会产生新版本。

### 上传新版本

在控制台上传 ZIP 时需填写：

| 字段 | 必填 | 说明 |
|------|------|------|
| `version` | ✅ | 语义化版本号，如 `1.0.0`、`2.1.0-beta.1` |
| `changelog` | — | 可选，描述本次版本的主要变更 |

规则：
- 版本号必须符合 [semver](https://semver.org/) 规范（`主版本.次版本.修订号[-预发布][+构建元数据]`）。
- 同一技能的版本号不可重复——重复上传同一版本号会返回冲突错误。
- 上传新版本会替换技能的工作目录（最新文件）并保存不可变的文件快照。

### 存储结构

```
data/skills/
├── {userId}/{skillName}/               ← 最新工作文件（可在线编辑）
└── __skill_versions/{skillId}/
    ├── 1.0.0/                          ← 版本快照（只读）
    └── 1.1.0/
```

### 删除版本

- **最新版本**不可删除。如需删除，请先上传更新的版本。
- 技能的**唯一版本**不可删除，应删除整个技能。
- 删除技能时，所有版本快照会自动清理。

## 项目结构

```
src/
├── app/
│   ├── [locale]/                  # 国际化路由组
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 首页
│   │   ├── auth/                  # 登录 & 注册
│   │   ├── dashboard/             # 控制台（上传表单含版本号/更新说明）
│   │   └── skills/[id]/           # 技能详情（说明文档 / 文件 / 版本历史 / 作者 Tab）
│   └── api/                       # API 路由
│       ├── auth/                  # 认证接口
│       ├── categories/            # 分类 CRUD
│       ├── skills/
│       │   ├── [id]/
│       │   │   ├── versions/      # 版本列表
│       │   │   │   └── [version]/ # 版本删除、下载、只读文件浏览
│       │   │   ├── files/         # 最新文件树及读写
│       │   │   ├── star/          # 收藏/取消收藏
│       │   │   ├── download/      # 下载最新 ZIP
│       │   │   └── author-skills/ # 同作者其他技能
│       │   ├── create/            # 从模板创建技能
│       │   └── upload/            # 上传 ZIP（需要版本号和更新说明）
│       └── dashboard/             # 控制台统计
├── components/
│   ├── ui/                        # 基础 UI 组件
│   └── layout/                    # Header、Footer、语言切换
├── db/
│   ├── schema.ts                  # Drizzle ORM 数据模型（skills + skill_versions + stars）
│   ├── index.ts                   # 数据库客户端
│   └── seed.ts                    # 种子脚本
├── i18n/                          # 国际化配置
├── lib/                           # 工具函数（auth、storage、validators 等）
└── middleware.ts                  # 国际化中间件
messages/
├── en.json                        # 英文翻译
└── zh.json                        # 中文翻译
```

## API 参考

### 认证

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 注册新用户 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/logout` | POST | 退出登录 |
| `/api/auth/me` | GET | 获取当前用户信息 |

### 分类

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/categories` | GET/POST | 列出/创建分类 |
| `/api/categories/[id]` | PATCH/DELETE | 更新/删除分类 |

### 技能

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/skills` | GET | 列出技能（支持搜索、过滤、排序、分页） |
| `/api/skills/create` | POST | 从模板创建技能 |
| `/api/skills/upload` | POST | 上传 ZIP（需传 `version` 字段，semver 格式） |
| `/api/skills/[id]` | GET/PATCH/DELETE | 获取/更新/删除技能 |
| `/api/skills/[id]/star` | POST/DELETE | 收藏/取消收藏 |
| `/api/skills/[id]/download` | GET | 下载最新版 ZIP |
| `/api/skills/[id]/files` | GET/POST | 列出文件树 / 创建文件或目录 |
| `/api/skills/[id]/files/[...path]` | GET/PUT/PATCH/DELETE | 读取/写入/重命名/删除文件 |
| `/api/skills/[id]/author-skills` | GET | 同作者的其他技能 |

### 版本

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/skills/[id]/versions` | GET | 列出所有版本（时间倒序） |
| `/api/skills/[id]/versions/[version]` | DELETE | 删除指定版本（非最新、非唯一） |
| `/api/skills/[id]/versions/[version]/download` | GET | 下载指定版本 ZIP |
| `/api/skills/[id]/versions/[version]/files` | GET | 获取历史版本文件树（只读） |
| `/api/skills/[id]/versions/[version]/files/[...path]` | GET | 读取历史版本文件内容（只读） |

### 控制台

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/dashboard/stats` | GET | 控制台统计数据 |

## 许可证

MIT
