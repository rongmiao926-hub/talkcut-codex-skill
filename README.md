# TalkCut for Codex — 口播快剪

> 一个帮你自动剪掉口播视频中“说错的部分”的 Codex Skill。

你录了一段口播视频，中间卡壳了、说重复了、嗯嗯啊啊了，以前得自己一帧帧去找、去剪。现在可以直接把视频路径交给 Codex，它会按 TalkCut 的流程完成转录、分析、生成审核页，你确认一下，再执行剪辑。

## 它能做什么？

| 问题 | TalkCut 怎么处理 |
|------|-----------------|
| 说了两遍一样的话 | 自动识别重复句，保留更完整的那一遍 |
| 话说到一半卡住了 | 识别残句，整句标记删除 |
| “那个”“就是”“嗯”太多 | 标记卡顿词和语气词 |
| 说错了重新说 | 识别纠正重说，删掉前面说错的部分 |
| 中间停顿太久 | 自动检测静音段（≥ 0.5 秒） |
| 还想自己再检查一遍 | 生成网页审核页，手动调整后再剪 |

## 跨平台支持

TalkCut 对 macOS 和 Windows 都做了兼容处理：

- 核心脚本用 Node.js 实现，不依赖 bash 环境
- FFmpeg 调用兼容 macOS 和 Windows 的路径差异
- 自动检测可用编码器：macOS 优先 VideoToolbox，Windows 优先 NVENC / QSV / AMF，找不到则回退到软件编码
- 本地 Whisper 是唯一例外：依赖 Apple Silicon 的 MLX，仅适用于苹果芯片 Mac

## 在开始之前

你需要准备好这些东西：

- 一台电脑（macOS / Windows / Linux）
- Codex
- 一段口播视频（`.mp4` / `.mov` / `.m4v`）

TalkCut 不是一个独立 App，而是一个 Codex Skill。你只需要把它放到 Codex 的 skill 目录里，然后用自然语言说“帮我剪这个视频”。

## 安装

### 第 1 步：下载 TalkCut

```bash
git clone https://github.com/rongmiao926-hub/talkcut-codex-skill.git ~/.codex/skills/videocut
```

### 第 2 步：初始化环境

打开 Codex，输入：

```text
使用 $videocut，帮我初始化
```

初始化时会检查依赖，并完成默认输出目录和转录方案配置。

## 转录方案

初始化过程中会让你在这两个方案里选一个：

| 方案 | 优点 | 缺点 |
|------|------|------|
| 火山引擎 API | 速度快，识别通常更稳；有免费 20 小时额度；支持苹果电脑和 Windows | 需要联网，需要 API Key |
| Whisper 本地 | 完全免费，不需要云 API | 更慢；首次下载模型较大；仅支持 Apple Silicon |

如果你选火山引擎，可参考：

- 控制台：[火山引擎语音识别](https://console.volcengine.com/speech/new/experience/asr?projectName=default)
- 图文说明：[Feishu 指南](https://my.feishu.cn/wiki/Gh0MwxHePidsYfkIx7zcvJQynqc?from=from_copylink)

## 使用方法

### 剪口播

把视频绝对路径告诉 Codex：

```text
使用 $videocut，帮我剪这个口播视频 /Users/你的用户名/Downloads/视频.mp4
```

接下来 Codex 会自动：

1. 提取音频
2. 把语音转成带时间戳的文字
3. 分析重复句、残句、卡顿词、静音段
4. 生成网页审核页

### 审核页怎么用？

浏览器会打开一个审核页面，你会看到视频里的文字和停顿块：

- 橙色底色：AI 预选为建议删除
- 红色底色加删除线：当前确认删除
- 正常文字：保留

常用操作：

| 操作 | 效果 |
|------|------|
| 单击某个字 | 跳到那个位置播放 |
| 双击某个字 | 选中或取消这一个字 |
| 拖动鼠标框选一段 | 批量选中或取消 |
| 双击灰色停顿块 | 删除或恢复这个停顿 |
| 空格键 | 播放 / 暂停 |
| 左右方向键 | 前后跳 1 秒 |

确认无误后，点击页面里的 `执行剪辑`，就会生成剪好的视频。

审核页和终端都会明确显示“本次成片输出目录”，不用再自己回忆默认目录配到了哪里。

## 工作原理

```text
你的口播视频
    ↓
① 提取音频（FFmpeg）
    ↓
② 语音转文字（火山引擎 API 或本地 Whisper）
    ↓
③ AI 分析哪些内容应该删
    ↓
④ 生成审核网页，你在浏览器里确认
    ↓
⑤ 执行剪辑，输出成片（FFmpeg）
```

## 目录结构

```text
~/.codex/skills/videocut/
├── SKILL.md
├── agents/
├── references/
│   ├── install.md
│   ├── cut-workflow.md
│   ├── subtitle-workflow.md
│   ├── show-notes.md
│   └── user-habits/
└── scripts/
    ├── volcengine_transcribe.js
    ├── whisper_transcribe.py
    ├── generate_subtitles.js
    ├── generate_review.js
    ├── review_server.js
    ├── cut_video.js
    └── subtitle_server.js
```

## 输出目录

默认输出结构如下：

```text
{DEFAULT_OUTPUT_DIR}/YYYY-MM-DD_视频名/
├── 剪口播/
│   ├── 1_转录/
│   ├── 2_分析/
│   └── 3_审核/
└── 字幕/
    ├── 1_转录/
    ├── 2_校对/
    └── 3_输出/
```

如果没有配置 `DEFAULT_OUTPUT_DIR`，默认会放到源视频同级的 `output/` 目录。

最终剪好的成片 `*_cut.mp4` 会直接放在 `DEFAULT_OUTPUT_DIR` 根目录，不会继续放在 `3_审核/` 里面；审核页、删除列表、视频介绍草稿这些中间文件仍然保留原来的嵌套目录。

## 常见问题

### Q: 可以在 Windows 上用吗？

可以。建议优先使用火山引擎方案。Whisper 本地模型只支持 Apple Silicon。

### Q: 剪完后有时会吞掉一点句尾怎么办？

当前默认会按你在审核页里选中的范围精确删除，并且会尽量把保留片段开头和结尾的实际静音收紧掉，不再额外偷偷放回一大段边界内容。只有在确实遇到“词尾被吞掉”时，才建议把 `.env` 里的 `CUT_KEEP_PADDING_MS` 调大，例如 `300` 或 `500`。

### Q: 审核页打不开怎么办？

默认端口是 `8899`。如果被占用，先检查端口占用情况，再重新启动审核服务。

### Q: 免费吗？

Skill 本身是开源的。实际费用取决于你选的转录方案：

- Whisper 本地：免费
- 火山引擎：有 20 小时免费额度，超出后按量计费

## 致谢

- 原作：成峰（公众号「AI 产品自由」）的 videocut 思路
- Claude 版参考仓库：[talkcut-claude-skill](https://github.com/rongmiao926-hub/talkcut-claude-skill)
