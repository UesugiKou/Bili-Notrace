# Bilibili NoTrace - 分享链接去追踪

一个轻量级的 [篡改猴 (Tampermonkey)](https://www.tampermonkey.net/) 用户脚本，自动移除 Bilibili（哔哩哔哩）分享链接中的用户追踪参数，保护隐私。

## ✨ 功能特性

- 🔒 **多层剪贴板拦截**：监听 copy/cut 事件、劫持 Clipboard API 和 execCommand，全方位拦截复制操作
- 🧹 **智能 URL 清理**：支持移除 30+ 种常见追踪参数（UTM 系列、分享来源、spm_id、buvid、vd_source 等）
- 🖱️ **分享弹窗自动处理**：识别 B 站新旧版分享弹窗，自动清理输入框内的链接
- 🔄 **动态内容响应**：通过 MutationObserver 和 SPA 路由监听，兼容页面异步加载
- 💡 **清理成功提示**：右上角显示可视化提示横幅，直观反馈清理状态

## 🚀 安装方式

> ⚠️ 前置要求：已安装 [Tampermonkey 浏览器扩展](https://www.tampermonkey.net/)（支持 Chrome / Edge / Firefox / Safari 等主流浏览器）

### 方式一：一键安装（推荐，自动识别新版本）

<a href="https://UesugiKou.github.io/Bili-Notrace/bili-notrace.user.js">
  <img src="https://img.shields.io/badge/%E7%82%B9%E5%87%BB%E5%AE%89%E8%A3%85-%E7%AB%99%E5%A4%96%E7%89%88%E6%9C%AC%E4%B8%8B%E8%BD%BD-FB7299?style=for-the-badge&logo=tampermonkey&logoColor=white" alt="点击一键安装" style="height: 50px;"/>
</a>

<br/>
<br/>

或者直接点击这个链接：[https://UesugiKou.github.io/Bili-Notrace/bili-notrace.user.js](https://UesugiKou.github.io/Bili-Notrace/bili-notrace.user.js)
> 篡改猴会自动识别 `.user.js` 后缀并弹出安装窗口，点击「安装」即可。

### 方式二：手动安装
1. 安装 Tampermonkey 扩展
2. 打开脚本源码：[bili-notrace.user.js](bili-notrace.user.js)
3. 复制全部代码
4. 点击浏览器右上角 Tampermonkey 图标 → 添加新脚本 → 粘贴代码 → Ctrl+S 保存

## 📋 支持的页面

- ✅ B 站视频页 `bilibili.com/video/BVxxx`
- ✅ 番剧/影视页 `bilibili.com/bangumi/play/epxxx`
- ✅ 动态页 `t.bilibili.com/xxxxx`
- ✅ 专栏/阅读页 `bilibili.com/read/cvxxx`
- ✅ 用户空间页 `space.bilibili.com/xxxx`
- ✅ 其他所有 `*.bilibili.com` 子域名页面

## 🧹 清理的追踪参数（部分）

| 分类 | 参数示例 |
|------|----------|
| UTM 系列 | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` 等 |
| 分享来源 | `share_from`, `share_medium`, `share_platform`, `bilifrom`, `from` 等 |
| B站自有追踪 | `spm_id`, `spm_id_from`, `vd_source`, `from_spm_id`, `bsource`, `rt` 等 |
| 用户/会话标识 | `buvid`, `buvid3`, `buvid4`, `session_id`, `csrf`, `unique_k` 等 |
| 前缀匹配 | 所有以 `utm_` / `spm_` / `buvid` / `share_` 开头的参数 |
| Hash 参数 | 自动清理 URL hash 片段中携带的追踪参数 |

## 🎯 使用方式

脚本安装后**自动运行**，无需任何手动操作：
1. 点击视频/动态下方的「分享」按钮
2. 在弹出的分享窗口中，链接已自动去追踪
3. 点击「复制链接」或手动选中复制，剪贴板中的内容均为清理后的纯净链接
4. 右上角出现 `✓ 分享链接已去追踪` 提示即表示生效

## ⚙️ 自定义配置

打开脚本源码，修改顶部的 `CONFIG` 对象即可自定义行为：

```javascript
const CONFIG = {
    DEBUG: false,              // 是否开启调试日志（true/false）
    SHOW_NOTICE: true,         // 是否显示清理成功提示
    NOTICE_DURATION: 2000,     // 提示持续时间（毫秒）
    TRACKING_PARAMS: [ ... ],  // 要移除的追踪参数列表
    TRACKING_PREFIXES: [ ... ] // 要移除的参数前缀列表
};
```

## 🔧 调试

将 `CONFIG.DEBUG` 改为 `true` 后，按 F12 打开浏览器开发者工具 → Console（控制台），可以看到详细的清理日志，方便排查问题。

## 📄 许可证

[MIT License](LICENSE)
