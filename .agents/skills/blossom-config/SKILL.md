---
name: blossom-config
description: Blossom Local 仓库（Electron 28 + Vue 3 + electron-vite 的本地 Markdown 编辑器）设置功能.
---

# Blossom Local 设置功能指南

## 设置功能入口

- 页面写在`src\renderer\src\views\index\setting\ThemeSetting.vue`
- 通过`src\renderer\src\stores\config.ts`管理配置状态, 并同步给各模块使用.
- 注入 css 的样式, 应通过`src\renderer\src\scripts\global-theme.ts`实现.

## 设置功能分类

由 tabs 分类，每个 tab 对应一个设置功能。

| 分类   | 功能                                                          |
| :----- | :------------------------------------------------------------ |
| 外观   | 设置软件的外观主题, 配置, 功能开关                            |
| 编辑器 | 文章编辑器相关设置,主入口在`ArticleIndex.vue`,如字体,背景色等 |
| 图片   | 图片管理相关设置, 主入口在`PictureIndex.vue`                  |
| 天气   | 天气相关设置, 功能实现在`Weather.vue`                         |
| 其他   | 其他功能                                                      |
