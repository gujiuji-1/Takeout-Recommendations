# 外卖推荐小程序

基于微信小程序和大模型的智能点餐推荐系统。

## 功能特性

- **用户偏好收集**：选择口味标签和喜欢的菜品
- **智能推荐**：根据预算和口味偏好，通过大模型生成个性化推荐菜单
- **点餐与历史记录**：模拟下单，自动记录历史订单
- **个人中心**：查看历史订单、编辑口味偏好

## 技术架构

### 文件结构

```
├── miniprogram/                 # 小程序前端
│   ├── app.js                   # 入口文件
│   ├── app.json                 # 配置文件
│   ├── app.wxss                 # 全局样式
│   ├── pages/
│   │   ├── index/               # 首页（推荐入口）
│   │   ├── preferences/         # 口味偏好选择页
│   │   └── mine/                # 我的页面
│   ├── utils/
│   │   └── index.js             # 工具函数
│   └── images/                  # 图标资源（需自行添加）
├── cloudfunctions/              # 云函数
│   ├── initUser/                # 初始化用户
│   ├── addOrder/                # 下单记录
│   └── getRecommendation/       # 智能推荐（核心）
├── database/
│   └── init.js                  # 数据库初始化脚本
└── project.config.json          # 项目配置
```

### 云数据库集合设计

| 集合 | 字段 | 说明 |
|------|------|------|
| `users` | openid, preferenceTags[], favoredDishes[], historyOrders[], createdAt | 用户数据 |
| `shops` | name, description, tags[], createdAt | 店铺数据 |
| `dishes` | name, shopId, price, tags[], description, createdAt | 菜品数据 |

### 云函数列表

| 云函数 | 功能 |
|--------|------|
| `initUser` | 初始化/更新用户信息 |
| `addOrder` | 下单并记录历史 |
| `getRecommendation` | 智能推荐核心逻辑 |

## 部署说明

### 1. 配置微信小程序项目

1. 在微信开发者工具中导入项目
2. 配置 `project.config.json` 中的 `appid`
3. 在 `miniprogram/app.js` 中配置云开发环境ID

### 2. 配置云函数环境变量

在云函数 `getRecommendation` 中配置以下环境变量：

| 变量名 | 值 |
|--------|------|
| `MODEL_API_URL` | 大模型API地址（默认：DeepSeek） |
| `MODEL_API_KEY` | 大模型API密钥 |

### 3. 初始化数据库

1. 创建云数据库集合：`users`, `shops`, `dishes`
2. 设置 `users` 集合权限为"仅创建者可读写"
3. 运行 `database/init.js` 初始化店铺和菜品数据

### 4. 添加图标资源

在 `miniprogram/images/` 目录下添加以下图标文件：
- `home.png` - 首页图标
- `home-active.png` - 首页选中图标
- `mine.png` - 我的图标
- `mine-active.png` - 我的选中图标

## 使用说明

1. **首次使用**：进入"我的"页面，设置口味偏好（选择口味标签和至少3道喜欢的菜品）
2. **获取推荐**：在首页输入预算金额，点击"帮我推荐"
3. **下单**：点击推荐菜品右侧的"点单"按钮
4. **查看历史**：在"我的"页面查看历史订单

## 核心推荐流程

1. 用户输入预期价格 → 点击"帮我推荐"
2. 云函数获取用户画像（偏好标签、历史订单）
3. 云数据库筛选候选菜品（价格±30% + 口味匹配）
4. 调用大模型生成推荐（3-5道菜+理由）
5. 大模型失败则回退到规则排序推荐

## 注意事项

- 本小程序为模拟下单，不接入实际支付
- 大模型调用有8秒超时，超时后自动降级为规则推荐
- 所有用户操作均需校验身份（通过 `wx-server-sdk` 获取 openid）

## 开发者

基于微信小程序原生框架 + 微信云开发 + DeepSeek API