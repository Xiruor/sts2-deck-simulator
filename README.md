# 杀戮尖塔2 牌组模拟器（STS2 Deck Simulator）

> 面向 Slay the Spire 2 的非官方粉丝工具：覆盖 5 大角色 567+ 张卡牌的筛选、拖拽组牌、统计分析、存档分享与单局战斗模拟，从构组到验算一站式完成。

![logo](public/images/sts2/logo.png)

# 项目网站 :link: https://sts2deck.ccwu.cc/
## ✨ 功能特性

### 卡牌总览
- 覆盖 5 大角色（铁甲战士 / 静默猎手 / 故障机器人 / 亡灵契约师 / 储君）567+ 张卡牌
- 多维筛选：角色、类型、稀有度、能耗（0/1/2/3/4+/X）、升级前后
- 支持按卡牌名称即时搜索（防抖 + 中文输入法组合输入支持）
- 筛选状态同步到 URL，可分享、可回溯

### 组牌工作台
- 拖拽组牌：从卡池拖拽卡牌构筑牌组，同名卡可多张（1~5）
- 牌组信息：总卡数、平均费用、升级卡数、平均费伤比 / 费防比、循环周期，随牌组变动实时重绘
- 存档与分享：登录后可保存牌组到云端，并生成分享链接（`/d/[code]`）一键载入

### 战斗模拟
- 回合制战斗引擎：抽牌、出牌、格挡结算、消耗牌堆，自动攻击循环
- 参数可随时修改：HP 即时生效；每回合攻击 / 格挡 / 抽牌 / 能量下一回合生效
- 牌组数据与组牌工作台实时同步（Zustand 持久化），无需重复配置

### 用户系统与管理
- 注册 / 登录 / 登出（NextAuth + bcrypt 密码哈希）
- 我的牌组：云端保存、加载、删除
- 管理后台：卡牌 / 遗物数据维护（管理员角色）

## 🛠 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端框架 | [Next.js](https://nextjs.org) 15（App Router + Turbopack）、[React](https://react.dev) 19 |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| 数据库 | Prisma 7 + MySQL / MariaDB |
| 认证 | NextAuth v5（beta） |
| 状态管理 | Zustand（持久化，组牌工作台与战斗模拟共享牌组数据） |
| 拖拽 | @dnd-kit |
| 图表 | ECharts |
| 包管理 | pnpm |


## 📁 项目结构

```
src/
├── app/                 # 页面与 API 路由（App Router）
│   ├── page.tsx         # 首页
│   ├── cards/           # 卡牌总览
│   ├── deck/            # 组牌工作台
│   ├── battle/          # 战斗模拟
│   ├── decks/           # 我的牌组
│   ├── d/[code]/        # 分享牌组载入页
│   ├── admin/           # 管理后台
│   └── api/             # API 路由（cards / decks / auth）
├── components/          # 组件（卡牌、牌组、战斗、导航等）
├── data/                # 角色与卡牌种子数据
├── hooks/               # 自定义 Hooks
├── lib/                 # 工具库（战斗引擎、筛选、认证等）
├── store/               # Zustand 状态管理
└── types/               # TypeScript 类型定义
prisma/                  # Prisma Schema、迁移与种子脚本
```

## ⚠️ 免责声明

本项目为非官方粉丝工具，与 Mega Crit, LLC 无任何关联。卡牌图片版权归 Mega Crit, LLC 所有，图片来源于公开 Wiki，仅用于信息参考，如有侵犯请联系移除。
