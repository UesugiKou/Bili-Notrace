<<<<<<< HEAD
// ==UserScript==
// @name         Bilibili NoTrace - 分享链接去追踪
// @namespace    https://github.com/bili-notrace
// @version      0.0.1
// @description  自动移除Bilibili分享链接中的用户追踪信息，保护隐私
// @author       Bili-Notrace
// @match        *://*.bilibili.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 配置区 ====================
    const CONFIG = {
        // 需要移除的追踪参数列表（支持精确匹配和前缀匹配）
        TRACKING_PARAMS: [
            // UTM 系列
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
            // 分享来源
            'share_from', 'share_medium', 'share_platform', 'share_tag', 'share_source',
            // bilibili 自有追踪
            'bilifrom', 'from', 'from_spm_id', 'bsource', 'source', 'sourceFrom', 'refer_from',
            // 会话/用户标识
            'session_id', 'csrf', 'csrf_token', 'buvid', 'buvid3', 'buvid4',
            'unique_k', 'unique_id', 'mid', 'up_id',
            // 跳转/推荐追踪
            'spm_id', 'spm_id_from', 'vd_source', 'rt', 'gofrom', 'bbid',
            // 时间戳（有时用于追踪）
            'ts', 'mtime', 'timestamp',
            // 其他追踪
            'refresh', 'appnews', 'hotRank', 's_locale', 'from_sources',
            'track_id', 'click_id', 'impr_id', 'pbj_source'
        ],
        // 前缀匹配的参数（带这些前缀的都会被移除）
        TRACKING_PREFIXES: [
            'utm_', 'spm_', 'buvid', 'share_', 'track_', 'click_', 'impr_'
        ],
        // 调试模式
        DEBUG: false,
        // 是否在清理后显示提示
        SHOW_NOTICE: true,
        // 提示持续时间（毫秒）
        NOTICE_DURATION: 2000
    };

    // ==================== 工具函数 ====================
    const log = {
        debug: (...args) => CONFIG.DEBUG && console.log('[Bili-NoTrace DEBUG]', ...args),
        info: (...args) => console.log('[Bili-NoTrace]', ...args),
        warn: (...args) => console.warn('[Bili-NoTrace WARN]', ...args),
        error: (...args) => console.error('[Bili-NoTrace ERROR]', ...args)
    };

    /**
     * 检查参数名是否是追踪参数
     */
    function isTrackingParam(paramName) {
        const name = paramName.toLowerCase();
        // 精确匹配
        if (CONFIG.TRACKING_PARAMS.some(p => p.toLowerCase() === name)) {
            return true;
        }
        // 前缀匹配
        if (CONFIG.TRACKING_PREFIXES.some(prefix => name.startsWith(prefix.toLowerCase()))) {
            return true;
        }
        return false;
    }

    /**
     * 清理URL中的追踪参数
     * @param {string} url - 原始URL
     * @returns {string} - 清理后的URL
     */
    function cleanUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        // 如果不是URL（纯文本等），直接返回
        if (!/^https?:\/\//i.test(url)) {
            // 尝试提取URL
            const urlMatch = url.match(/https?:\/\/[^\s]+/i);
            if (urlMatch) {
                const extractedUrl = urlMatch[0];
                const cleanedExtracted = cleanUrl(extractedUrl);
                return url.replace(extractedUrl, cleanedExtracted);
            }
            return url;
        }

        try {
            const urlObj = new URL(url);
            const paramsToRemove = [];

            // 遍历搜索参数，标记需要删除的追踪参数
            urlObj.searchParams.forEach((value, key) => {
                if (isTrackingParam(key)) {
                    paramsToRemove.push(key);
                }
            });

            // 删除标记的参数
            paramsToRemove.forEach(key => {
                urlObj.searchParams.delete(key);
            });

            let cleanedUrl = urlObj.toString();

            // 清理 hash 中的追踪参数（B站有时会把追踪参数放在 hash 里）
            if (cleanedUrl.includes('#')) {
                const hashParts = cleanedUrl.split('#');
                const hash = hashParts.slice(1).join('#');
                if (hash.includes('?') || hash.includes('&')) {
                    // hash 中也有参数，尝试清理
                    const [hashBase, ...hashQueryParts] = hash.split('?');
                    if (hashQueryParts.length > 0) {
                        const hashQuery = hashQueryParts.join('?');
                        try {
                            const tempUrl = new URL('http://placeholder?' + hashQuery);
                            const hashParamsToRemove = [];
                            tempUrl.searchParams.forEach((value, key) => {
                                if (isTrackingParam(key)) {
                                    hashParamsToRemove.push(key);
                                }
                            });
                            hashParamsToRemove.forEach(key => {
                                tempUrl.searchParams.delete(key);
                            });
                            const cleanedHashQuery = tempUrl.search.slice(1); // 去掉开头的 ?
                            if (cleanedHashQuery) {
                                cleanedUrl = hashParts[0] + '#' + hashBase + '?' + cleanedHashQuery;
                            } else {
                                cleanedUrl = hashParts[0] + '#' + hashBase;
                            }
                        } catch (e) {
                            log.warn('解析 hash 参数失败', e);
                        }
                    }
                }
            }

            // 移除末尾多余的 ? 或 &
            cleanedUrl = cleanedUrl.replace(/[?&]$/, '');

            if (cleanedUrl !== url) {
                log.debug('URL已清理:', { original: url, cleaned: cleanedUrl });
            }

            return cleanedUrl;
        } catch (e) {
            log.error('URL解析失败:', url, e);
            return url;
        }
    }

    /**
     * 显示操作提示
     */
    function showNotice(message) {
        if (!CONFIG.SHOW_NOTICE) return;

        // 移除旧提示
        const oldNotice = document.getElementById('bili-notrace-notice');
        if (oldNotice) oldNotice.remove();

        const notice = document.createElement('div');
        notice.id = 'bili-notrace-notice';
        notice.textContent = message;
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            background: rgba(0, 161, 214, 0.95);
            color: white;
            padding: 10px 18px;
            border-radius: 6px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: bili-notrace-slideIn 0.3s ease-out;
            backdrop-filter: blur(8px);
        `;

        document.body.appendChild(notice);

        setTimeout(() => {
            notice.style.animation = 'bili-notrace-slideOut 0.3s ease-out forwards';
            setTimeout(() => notice.remove(), 300);
        }, CONFIG.NOTICE_DURATION);
    }

    // 添加提示动画样式
    GM_addStyle(`
        @keyframes bili-notrace-slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bili-notrace-slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `);

    // ==================== 剪贴板拦截 ====================
    /**
     * 拦截 copy 事件，清理剪贴板内容
     */
    function handleCopyEvent(e) {
        // 尝试从事件中获取数据
        let text = '';
        if (e.clipboardData) {
            text = e.clipboardData.getData('text') || '';
        }
        
        // 如果事件中没数据，尝试从选区获取
        if (!text && window.getSelection) {
            text = window.getSelection().toString() || '';
        }

        if (!text) return;

        const cleanedText = cleanUrl(text);
        if (cleanedText !== text) {
            log.info('拦截到复制操作，已清理追踪参数');
            if (e.clipboardData) {
                e.preventDefault();
                e.clipboardData.setData('text/plain', cleanedText);
                e.clipboardData.setData('text/html', cleanedText);
            } else {
                // 兼容处理：使用 GM_setClipboard
                try {
                    e.preventDefault();
                    GM_setClipboard(cleanedText, 'text');
                } catch (err) {
                    log.warn('GM_setClipboard 失败，尝试备用方案', err);
                }
            }
            showNotice('✓ 分享链接已去追踪');
        }
    }

    /**
     * 重写 document.execCommand 以拦截 'copy' 和 'cut'
     */
    function hijackExecCommand() {
        const originalExecCommand = Document.prototype.execCommand;
        Document.prototype.execCommand = function (command, ...args) {
            const result = originalExecCommand.apply(this, args);
            
            if (command === 'copy' || command === 'cut') {
                // 读取剪贴板并清理
                navigator.clipboard.readText().then(clipText => {
                    const cleaned = cleanUrl(clipText);
                    if (cleaned !== clipText) {
                        log.info('拦截到 execCommand 复制，已清理追踪参数');
                        navigator.clipboard.writeText(cleaned).then(() => {
                            showNotice('✓ 分享链接已去追踪');
                        }).catch(err => {
                            log.warn('写入剪贴板失败', err);
                            try {
                                GM_setClipboard(cleaned, 'text');
                                showNotice('✓ 分享链接已去追踪');
                            } catch (e) {
                                log.error('所有剪贴板写入方式失败', e);
                            }
                        });
                    }
                }).catch(err => {
                    log.debug('读取剪贴板失败（可能是权限问题）', err);
                });
            }
            return result;
        };
        log.debug('已劫持 document.execCommand');
    }

    /**
     * 重写 navigator.clipboard.writeText
     */
    function hijackClipboardWriteText() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = function (data) {
                const cleaned = cleanUrl(data);
                if (cleaned !== data) {
                    log.info('拦截到 Clipboard API 写入，已清理追踪参数');
                    showNotice('✓ 分享链接已去追踪');
                }
                return originalWriteText(cleaned);
            };
            log.debug('已劫持 navigator.clipboard.writeText');
        }
    }

    // ==================== DOM 元素处理 ====================
    /**
     * 清理输入框/文本域中的URL
     */
    function cleanInputElement(input) {
        if (!input || !input.value) return;
        const cleaned = cleanUrl(input.value);
        if (cleaned !== input.value) {
            input.value = cleaned;
            // 触发 input 事件，让页面知道值变了
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            log.debug('已清理输入框内容');
            showNotice('✓ 分享链接已去追踪');
        }
    }

    /**
     * 查找并处理分享弹窗中的链接输入框
     */
    function processShareDialog() {
        // 常见的分享弹窗选择器
        const selectors = [
            // 新版B站
            '.share-modal input',
            '.share-modal textarea',
            '.bili-modal input[value*="http"]',
            '.bili-modal textarea',
            '.video-share input',
            '.video-share textarea',
            // 通用：所有看起来像分享链接的输入框
            'input[placeholder*="链接"]',
            'input[placeholder*="分享"]',
            'textarea[placeholder*="链接"]',
            'textarea[placeholder*="分享"]',
            // 包含URL的输入框
            'input[class*="share"]',
            'textarea[class*="share"]',
            'input[class*="link"]',
            'textarea[class*="link"]'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    // 如果看起来包含URL
                    if (/https?:\/\//i.test(el.value)) {
                        cleanInputElement(el);
                    }
                    // 添加事件监听，防止后续被填充
                    el.addEventListener('input', () => cleanInputElement(el), { once: false });
                    el.addEventListener('change', () => cleanInputElement(el), { once: false });
                }
            });
        });

        // 查找分享弹窗中的"复制链接"按钮
        const copyButtons = document.querySelectorAll([
            'button[class*="copy"]',
            '.bili-modal button',
            '.share-modal button',
            '.video-share button'
        ].join(','));

        copyButtons.forEach(btn => {
            if (btn.dataset.notraceBound) return;
            btn.dataset.notraceBound = '1';
            // 在点击事件之前捕获（捕获阶段）
            btn.addEventListener('click', () => {
                // 先清理一下输入框
                setTimeout(() => processShareDialog(), 50);
                setTimeout(() => processShareDialog(), 200);
            }, true);
        });
    }

    /**
     * 处理分享按钮点击
     */
    function bindShareButtons() {
        const shareBtnSelectors = [
            'button[class*="share"]',
            'span[class*="share"]',
            'div[class*="share"]',
            'svg[class*="share"]',
            'i[class*="share"]',
            '[aria-label*="分享"]',
            '[title*="分享"]',
            '.video-toolbar-share',
            '.toolbar-left-item-share',
            '.ops-share'
        ];

        document.querySelectorAll(shareBtnSelectors.join(',')).forEach(btn => {
            if (btn.dataset.notraceBound) return;
            btn.dataset.notraceBound = '1';

            // 点击分享按钮后，弹窗出现需要时间，所以延迟检查
            btn.addEventListener('click', () => {
                log.debug('检测到分享按钮点击，等待弹窗...');
                [50, 150, 300, 500, 800, 1200].forEach(delay => {
                    setTimeout(processShareDialog, delay);
                });
            }, true);
        });
    }

    // ==================== MutationObserver ====================
    /**
     * 初始化 MutationObserver 监听 DOM 变化
     */
    function initMutationObserver() {
        const observer = new MutationObserver(mutations => {
            let shouldProcess = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // 检查是否有我们关心的元素被添加
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node;
                            // 检查元素本身或后代是否有分享相关类名
                            const hasShare = el.classList && (
                                Array.from(el.classList).some(c => 
                                    /share|modal|copy/i.test(c)
                                ) || el.querySelector('[class*="share"], [class*="modal"], [class*="copy"]')
                            );
                            if (hasShare) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldProcess) break;
            }
            if (shouldProcess) {
                // 立即 + 延迟处理
                bindShareButtons();
                processShareDialog();
                setTimeout(bindShareButtons, 100);
                setTimeout(processShareDialog, 100);
                setTimeout(processShareDialog, 300);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log.debug('MutationObserver 已启动');
    }

    // ==================== 初始化 ====================
    function init() {
        log.info('Bilibili NoTrace 已加载 v' + GM.info.script.version);

        // 1. 监听复制事件
        document.addEventListener('copy', handleCopyEvent, true);
        document.addEventListener('cut', handleCopyEvent, true);

        // 2. 劫持剪贴板 API
        hijackClipboardWriteText();
        hijackExecCommand();

        // 3. 初始扫描页面元素
        bindShareButtons();
        processShareDialog();

        // 4. 启动 DOM 监听
        if (document.body) {
            initMutationObserver();
        } else {
            window.addEventListener('DOMContentLoaded', initMutationObserver, { once: true });
        }

        // 5. 页面加载完成后再次扫描（处理 SPA）
        window.addEventListener('load', () => {
            setTimeout(bindShareButtons, 500);
            setTimeout(processShareDialog, 500);
        });

        // 6. 处理 SPA 路由变化（pushState/popstate）
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            const result = originalPushState.apply(this, args);
            setTimeout(bindShareButtons, 200);
            setTimeout(processShareDialog, 200);
            return result;
        };

        window.addEventListener('popstate', () => {
            setTimeout(bindShareButtons, 200);
            setTimeout(processShareDialog, 200);
        });
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
=======
// ==UserScript==
// @name         Bilibili NoTrace - 分享链接去追踪
// @namespace    https://github.com/bili-notrace
// @version      0.0.1
// @description  自动移除Bilibili分享链接中的用户追踪信息，保护隐私
// @author       Bili-Notrace
// @match        *://*.bilibili.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // ==================== 配置区 ====================
    const CONFIG = {
        // 需要移除的追踪参数列表（支持精确匹配和前缀匹配）
        TRACKING_PARAMS: [
            // UTM 系列
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
            // 分享来源
            'share_from', 'share_medium', 'share_platform', 'share_tag', 'share_source',
            // bilibili 自有追踪
            'bilifrom', 'from', 'from_spm_id', 'bsource', 'source', 'sourceFrom', 'refer_from',
            // 会话/用户标识
            'session_id', 'csrf', 'csrf_token', 'buvid', 'buvid3', 'buvid4',
            'unique_k', 'unique_id', 'mid', 'up_id',
            // 跳转/推荐追踪
            'spm_id', 'spm_id_from', 'vd_source', 'rt', 'gofrom', 'bbid',
            // 时间戳（有时用于追踪）
            'ts', 'mtime', 'timestamp',
            // 其他追踪
            'refresh', 'appnews', 'hotRank', 's_locale', 'from_sources',
            'track_id', 'click_id', 'impr_id', 'pbj_source'
        ],
        // 前缀匹配的参数（带这些前缀的都会被移除）
        TRACKING_PREFIXES: [
            'utm_', 'spm_', 'buvid', 'share_', 'track_', 'click_', 'impr_'
        ],
        // 调试模式
        DEBUG: false,
        // 是否在清理后显示提示
        SHOW_NOTICE: true,
        // 提示持续时间（毫秒）
        NOTICE_DURATION: 2000
    };

    // ==================== 工具函数 ====================
    const log = {
        debug: (...args) => CONFIG.DEBUG && console.log('[Bili-NoTrace DEBUG]', ...args),
        info: (...args) => console.log('[Bili-NoTrace]', ...args),
        warn: (...args) => console.warn('[Bili-NoTrace WARN]', ...args),
        error: (...args) => console.error('[Bili-NoTrace ERROR]', ...args)
    };

    /**
     * 检查参数名是否是追踪参数
     */
    function isTrackingParam(paramName) {
        const name = paramName.toLowerCase();
        // 精确匹配
        if (CONFIG.TRACKING_PARAMS.some(p => p.toLowerCase() === name)) {
            return true;
        }
        // 前缀匹配
        if (CONFIG.TRACKING_PREFIXES.some(prefix => name.startsWith(prefix.toLowerCase()))) {
            return true;
        }
        return false;
    }

    /**
     * 清理URL中的追踪参数
     * @param {string} url - 原始URL
     * @returns {string} - 清理后的URL
     */
    function cleanUrl(url) {
        if (!url || typeof url !== 'string') return url;
        
        // 如果不是URL（纯文本等），直接返回
        if (!/^https?:\/\//i.test(url)) {
            // 尝试提取URL
            const urlMatch = url.match(/https?:\/\/[^\s]+/i);
            if (urlMatch) {
                const extractedUrl = urlMatch[0];
                const cleanedExtracted = cleanUrl(extractedUrl);
                return url.replace(extractedUrl, cleanedExtracted);
            }
            return url;
        }

        try {
            const urlObj = new URL(url);
            const paramsToRemove = [];

            // 遍历搜索参数，标记需要删除的追踪参数
            urlObj.searchParams.forEach((value, key) => {
                if (isTrackingParam(key)) {
                    paramsToRemove.push(key);
                }
            });

            // 删除标记的参数
            paramsToRemove.forEach(key => {
                urlObj.searchParams.delete(key);
            });

            let cleanedUrl = urlObj.toString();

            // 清理 hash 中的追踪参数（B站有时会把追踪参数放在 hash 里）
            if (cleanedUrl.includes('#')) {
                const hashParts = cleanedUrl.split('#');
                const hash = hashParts.slice(1).join('#');
                if (hash.includes('?') || hash.includes('&')) {
                    // hash 中也有参数，尝试清理
                    const [hashBase, ...hashQueryParts] = hash.split('?');
                    if (hashQueryParts.length > 0) {
                        const hashQuery = hashQueryParts.join('?');
                        try {
                            const tempUrl = new URL('http://placeholder?' + hashQuery);
                            const hashParamsToRemove = [];
                            tempUrl.searchParams.forEach((value, key) => {
                                if (isTrackingParam(key)) {
                                    hashParamsToRemove.push(key);
                                }
                            });
                            hashParamsToRemove.forEach(key => {
                                tempUrl.searchParams.delete(key);
                            });
                            const cleanedHashQuery = tempUrl.search.slice(1); // 去掉开头的 ?
                            if (cleanedHashQuery) {
                                cleanedUrl = hashParts[0] + '#' + hashBase + '?' + cleanedHashQuery;
                            } else {
                                cleanedUrl = hashParts[0] + '#' + hashBase;
                            }
                        } catch (e) {
                            log.warn('解析 hash 参数失败', e);
                        }
                    }
                }
            }

            // 移除末尾多余的 ? 或 &
            cleanedUrl = cleanedUrl.replace(/[?&]$/, '');

            if (cleanedUrl !== url) {
                log.debug('URL已清理:', { original: url, cleaned: cleanedUrl });
            }

            return cleanedUrl;
        } catch (e) {
            log.error('URL解析失败:', url, e);
            return url;
        }
    }

    /**
     * 显示操作提示
     */
    function showNotice(message) {
        if (!CONFIG.SHOW_NOTICE) return;

        // 移除旧提示
        const oldNotice = document.getElementById('bili-notrace-notice');
        if (oldNotice) oldNotice.remove();

        const notice = document.createElement('div');
        notice.id = 'bili-notrace-notice';
        notice.textContent = message;
        notice.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            background: rgba(0, 161, 214, 0.95);
            color: white;
            padding: 10px 18px;
            border-radius: 6px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: bili-notrace-slideIn 0.3s ease-out;
            backdrop-filter: blur(8px);
        `;

        document.body.appendChild(notice);

        setTimeout(() => {
            notice.style.animation = 'bili-notrace-slideOut 0.3s ease-out forwards';
            setTimeout(() => notice.remove(), 300);
        }, CONFIG.NOTICE_DURATION);
    }

    // 添加提示动画样式
    GM_addStyle(`
        @keyframes bili-notrace-slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes bili-notrace-slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `);

    // ==================== 剪贴板拦截 ====================
    /**
     * 拦截 copy 事件，清理剪贴板内容
     */
    function handleCopyEvent(e) {
        // 尝试从事件中获取数据
        let text = '';
        if (e.clipboardData) {
            text = e.clipboardData.getData('text') || '';
        }
        
        // 如果事件中没数据，尝试从选区获取
        if (!text && window.getSelection) {
            text = window.getSelection().toString() || '';
        }

        if (!text) return;

        const cleanedText = cleanUrl(text);
        if (cleanedText !== text) {
            log.info('拦截到复制操作，已清理追踪参数');
            if (e.clipboardData) {
                e.preventDefault();
                e.clipboardData.setData('text/plain', cleanedText);
                e.clipboardData.setData('text/html', cleanedText);
            } else {
                // 兼容处理：使用 GM_setClipboard
                try {
                    e.preventDefault();
                    GM_setClipboard(cleanedText, 'text');
                } catch (err) {
                    log.warn('GM_setClipboard 失败，尝试备用方案', err);
                }
            }
            showNotice('✓ 分享链接已去追踪');
        }
    }

    /**
     * 重写 document.execCommand 以拦截 'copy' 和 'cut'
     */
    function hijackExecCommand() {
        const originalExecCommand = Document.prototype.execCommand;
        Document.prototype.execCommand = function (command, ...args) {
            const result = originalExecCommand.apply(this, args);
            
            if (command === 'copy' || command === 'cut') {
                // 读取剪贴板并清理
                navigator.clipboard.readText().then(clipText => {
                    const cleaned = cleanUrl(clipText);
                    if (cleaned !== clipText) {
                        log.info('拦截到 execCommand 复制，已清理追踪参数');
                        navigator.clipboard.writeText(cleaned).then(() => {
                            showNotice('✓ 分享链接已去追踪');
                        }).catch(err => {
                            log.warn('写入剪贴板失败', err);
                            try {
                                GM_setClipboard(cleaned, 'text');
                                showNotice('✓ 分享链接已去追踪');
                            } catch (e) {
                                log.error('所有剪贴板写入方式失败', e);
                            }
                        });
                    }
                }).catch(err => {
                    log.debug('读取剪贴板失败（可能是权限问题）', err);
                });
            }
            return result;
        };
        log.debug('已劫持 document.execCommand');
    }

    /**
     * 重写 navigator.clipboard.writeText
     */
    function hijackClipboardWriteText() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = function (data) {
                const cleaned = cleanUrl(data);
                if (cleaned !== data) {
                    log.info('拦截到 Clipboard API 写入，已清理追踪参数');
                    showNotice('✓ 分享链接已去追踪');
                }
                return originalWriteText(cleaned);
            };
            log.debug('已劫持 navigator.clipboard.writeText');
        }
    }

    // ==================== DOM 元素处理 ====================
    /**
     * 清理输入框/文本域中的URL
     */
    function cleanInputElement(input) {
        if (!input || !input.value) return;
        const cleaned = cleanUrl(input.value);
        if (cleaned !== input.value) {
            input.value = cleaned;
            // 触发 input 事件，让页面知道值变了
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            log.debug('已清理输入框内容');
            showNotice('✓ 分享链接已去追踪');
        }
    }

    /**
     * 查找并处理分享弹窗中的链接输入框
     */
    function processShareDialog() {
        // 常见的分享弹窗选择器
        const selectors = [
            // 新版B站
            '.share-modal input',
            '.share-modal textarea',
            '.bili-modal input[value*="http"]',
            '.bili-modal textarea',
            '.video-share input',
            '.video-share textarea',
            // 通用：所有看起来像分享链接的输入框
            'input[placeholder*="链接"]',
            'input[placeholder*="分享"]',
            'textarea[placeholder*="链接"]',
            'textarea[placeholder*="分享"]',
            // 包含URL的输入框
            'input[class*="share"]',
            'textarea[class*="share"]',
            'input[class*="link"]',
            'textarea[class*="link"]'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    // 如果看起来包含URL
                    if (/https?:\/\//i.test(el.value)) {
                        cleanInputElement(el);
                    }
                    // 添加事件监听，防止后续被填充
                    el.addEventListener('input', () => cleanInputElement(el), { once: false });
                    el.addEventListener('change', () => cleanInputElement(el), { once: false });
                }
            });
        });

        // 查找分享弹窗中的"复制链接"按钮
        const copyButtons = document.querySelectorAll([
            'button[class*="copy"]',
            '.bili-modal button',
            '.share-modal button',
            '.video-share button'
        ].join(','));

        copyButtons.forEach(btn => {
            if (btn.dataset.notraceBound) return;
            btn.dataset.notraceBound = '1';
            // 在点击事件之前捕获（捕获阶段）
            btn.addEventListener('click', () => {
                // 先清理一下输入框
                setTimeout(() => processShareDialog(), 50);
                setTimeout(() => processShareDialog(), 200);
            }, true);
        });
    }

    /**
     * 处理分享按钮点击
     */
    function bindShareButtons() {
        const shareBtnSelectors = [
            'button[class*="share"]',
            'span[class*="share"]',
            'div[class*="share"]',
            'svg[class*="share"]',
            'i[class*="share"]',
            '[aria-label*="分享"]',
            '[title*="分享"]',
            '.video-toolbar-share',
            '.toolbar-left-item-share',
            '.ops-share'
        ];

        document.querySelectorAll(shareBtnSelectors.join(',')).forEach(btn => {
            if (btn.dataset.notraceBound) return;
            btn.dataset.notraceBound = '1';

            // 点击分享按钮后，弹窗出现需要时间，所以延迟检查
            btn.addEventListener('click', () => {
                log.debug('检测到分享按钮点击，等待弹窗...');
                [50, 150, 300, 500, 800, 1200].forEach(delay => {
                    setTimeout(processShareDialog, delay);
                });
            }, true);
        });
    }

    // ==================== MutationObserver ====================
    /**
     * 初始化 MutationObserver 监听 DOM 变化
     */
    function initMutationObserver() {
        const observer = new MutationObserver(mutations => {
            let shouldProcess = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    // 检查是否有我们关心的元素被添加
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node;
                            // 检查元素本身或后代是否有分享相关类名
                            const hasShare = el.classList && (
                                Array.from(el.classList).some(c => 
                                    /share|modal|copy/i.test(c)
                                ) || el.querySelector('[class*="share"], [class*="modal"], [class*="copy"]')
                            );
                            if (hasShare) {
                                shouldProcess = true;
                                break;
                            }
                        }
                    }
                }
                if (shouldProcess) break;
            }
            if (shouldProcess) {
                // 立即 + 延迟处理
                bindShareButtons();
                processShareDialog();
                setTimeout(bindShareButtons, 100);
                setTimeout(processShareDialog, 100);
                setTimeout(processShareDialog, 300);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log.debug('MutationObserver 已启动');
    }

    // ==================== 初始化 ====================
    function init() {
        log.info('Bilibili NoTrace 已加载 v' + GM.info.script.version);

        // 1. 监听复制事件
        document.addEventListener('copy', handleCopyEvent, true);
        document.addEventListener('cut', handleCopyEvent, true);

        // 2. 劫持剪贴板 API
        hijackClipboardWriteText();
        hijackExecCommand();

        // 3. 初始扫描页面元素
        bindShareButtons();
        processShareDialog();

        // 4. 启动 DOM 监听
        if (document.body) {
            initMutationObserver();
        } else {
            window.addEventListener('DOMContentLoaded', initMutationObserver, { once: true });
        }

        // 5. 页面加载完成后再次扫描（处理 SPA）
        window.addEventListener('load', () => {
            setTimeout(bindShareButtons, 500);
            setTimeout(processShareDialog, 500);
        });

        // 6. 处理 SPA 路由变化（pushState/popstate）
        const originalPushState = history.pushState;
        history.pushState = function (...args) {
            const result = originalPushState.apply(this, args);
            setTimeout(bindShareButtons, 200);
            setTimeout(processShareDialog, 200);
            return result;
        };

        window.addEventListener('popstate', () => {
            setTimeout(bindShareButtons, 200);
            setTimeout(processShareDialog, 200);
        });
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
>>>>>>> 80b80d70f6d6cdb6e1c2f719112c55031f85c8a8
