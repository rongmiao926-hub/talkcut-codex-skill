# TalkCut for Codex — 口播快剪 🎬

> **让 AI 帮你自动剪掉口播视频中的“说错部分”**
> 不用再手动一帧帧找错词。
> AI 自动识别，你确认一下就搞定。

---

## 你好，创作者

你是不是也遇到过这些问题：

- 录了 10 分钟口播，中间卡壳了好几次
- 说了两遍一样的话，不知道该保留哪个
- “那个”“就是”“嗯”太多，看着很乱
- 说错了重新说，前面说错的部分还得手动剪掉

现在有 TalkCut 帮你解决。

> 只需 3 步，10 分钟视频通常几分钟内就能处理完。

说明：

- `TalkCut` 是这个项目的名字
- `$videocut` 是你在 Codex 里实际调用它时用的 skill 名
- 所以下面凡是“你要对 Codex 说的话”，我都会统一写成 `使用 $videocut，...`

## 核心功能

| 问题 | TalkCut 怎么处理 |
|------|-----------------|
| 说了两遍一样的话 | 自动识别重复句，保留更完整的那一遍 |
| 话说到一半卡住了 | 识别残句，整句标记删除 |
| “那个”“就是”“嗯”太多 | 标记卡顿词和语气词 |
| 说错了重新说 | 识别纠正重说，删掉前面说错的部分 |
| 中间停顿太久 | 自动检测静音段（默认从 `0.5` 秒开始重点处理） |
| 想顺手配一段发布文案 | 自动生成视频介绍草稿（标题 + 正文 + 标签 + 摘要） |

## 特色功能

### 自定义词典支持

- 可以维护自己的术语、人名、品牌名、英文词
- 火山引擎转录会自动把词典作为热词加载
- 字幕审核页也会读取这个词典，方便人工校对时直接复用

### 自进化机制

- 可以把你的剪辑偏好真正沉淀进 skill 文件
- 适合长期固定静音阈值、残句处理、重复句处理、导出偏好这类规则
- 当前版本是“明确要求后写回文件”，不是“审核页点击自动学习”

### 完整工作流

- 转录：火山引擎 API 或本地 Whisper
- 分析：识别重复句、残句、卡顿词、静音段
- 审核：网页逐字检查、调整删除范围
- 剪辑：输出成片视频
- 字幕：可继续校对和烧录字幕
- 文案：自动生成视频介绍草稿

## 快速开始（5 分钟搞定）

### 第一步：安装 TalkCut（只需一次）

选择任意一种方法下载：

当前 Codex 版 GitHub 仓库地址：

```text
https://github.com/rongmiao926-hub/talkcut-codex-skill
```

---

#### 方法一：下载 ZIP（最简单，推荐新手）

1. 点击这个页面的绿色 `Code` 按钮
2. 在弹出的菜单中选择 `Download ZIP`
3. 等待下载完成并解压

解压后，你会得到一个名为 `talkcut-codex-skill-main` 的文件夹。

然后直接告诉 Codex：

```text
使用 $videocut，请把 talkcut-codex-skill-main 文件夹移动到 ~/.codex/skills/videocut
```

Codex 可以帮你：

- 创建 `~/.codex/skills/videocut`
- 把文件移动到正确位置
- 清理临时文件

---

#### 方法二：使用 Git 命令

如果你已经安装了 Git，也可以直接告诉 Codex：

```text
使用 $videocut，请用 Git 克隆 https://github.com/rongmiao926-hub/talkcut-codex-skill.git 到 ~/.codex/skills/videocut
```

或者你手动执行：

```bash
git clone https://github.com/rongmiao926-hub/talkcut-codex-skill.git ~/.codex/skills/videocut
```

### 第二步：安装依赖

打开 Codex，输入：

```text
使用 $videocut，帮我初始化
```

Codex 会自动：

- 检查依赖
- 配置默认输出目录
- 让你在火山引擎和 Whisper 之间二选一

### 第三步：选择语音方案

初始化过程中，Codex 会问你用哪种语音识别方案：

| 方案 | 优点 | 缺点 |
|------|------|------|
| 火山引擎 API | 速度快，识别通常更稳，全平台可用 | 需要联网，需要 API Key |
| Whisper 本地模型 | 完全免费，不需要云 API | 更慢，首次下载模型较大，仅支持 Apple Silicon |

如果选火山引擎，需要获取 API Key：

1. 打开火山引擎控制台：https://console.volcengine.com/speech/new/setting/activate
2. 开通“音视频字幕生成”服务
3. 获取 API Key

详细图文说明：
[Feishu 指南](https://my.feishu.cn/wiki/Gh0MwxHePidsYfkIx7zcvJQynqc?from=from_copylink)

如果选 Whisper，Codex 会按本机条件帮你检查并配置。

---

## 第四步：开始使用

### 剪辑口播视频

告诉 Codex：

```text
使用 $videocut，帮我剪这个口播视频 /Users/你的名字/Downloads/我的视频.mp4
```

### 添加字幕（可选）

告诉 Codex：

```text
使用 $videocut，给我的视频添加字幕
```

### 触发自进化（记住你的偏好）

这一步说的就是上面提到的“自进化”。
它不是自动学习，而是你明确告诉 Codex：把某条经验正式写回 TalkCut 的规则文件。

告诉 Codex：

```text
使用 $videocut，记住这个规则：小于 0.5 秒的停顿，如果前后都是待删片段，也默认删掉
```

比如：

- “静音阈值改成 1 秒”
- “保留适量‘嗯’作为过渡”
- “如果两个待删片段中间只有很短停顿，也一起删掉”

## 词典与自进化

TalkCut 目前有两类可以持续积累的“记忆”：

- 热词词典：解决专有名词、品牌名、英文词、术语容易识别错的问题
- 用户偏好规则：解决“你就是喜欢怎么剪”的问题，比如静音阈值、残句处理、重复句处理习惯

### 词典文件在哪里？

词典文件路径是：

```text
references/subtitle-dictionary.txt
```

这个文件是一行一个词，例如：

```text
Whisper
Claude
GitHub
剪映
```

修改规则：

- 一行只写一个词或短语
- 不要在同一行里写解释
- 保存后，下次使用火山引擎转录时会自动作为热词加载
- 字幕审核页也会读取这个词典，方便人工校对时直接复用
- 当前 Whisper 转录脚本不会直接加载这个词典，所以如果你主要用 Whisper，这个词典更偏向“字幕校对辅助”，不是“Whisper 前置热词”

如果你想让 Codex 直接帮你改词典，可以直接说：

```text
使用 $videocut，把 “Whisper”、“mlx-whisper”、“OpenAI” 加进词典
```

### 自进化是什么意思？

当前 TalkCut 支持的是“显式写回文件”的自进化，不是“你点了几次审核页，它就默默自动学会”。

也就是说，当你发现：

- 某类口误总是被错判
- 某个停顿规则想长期固定
- 某个术语总是识别错
- 某种导出或审核习惯以后都想默认遵守

你需要明确告诉 Codex，把这个经验写回 skill。

例如你可以直接说：

```text
使用 $videocut，记住这个规则：小于 0.5 秒的停顿，如果前后都是待删片段，也默认删掉
```

或者：

```text
使用 $videocut，把 “Agentx100” 加进词典，以后转字幕优先按这个识别
```

### 如果想让它真的“进化”，你需要做什么？

你需要做 3 件事：

1. 在发现问题后，明确对 Codex 说“记住这个问题”或“以后按这个规则来”
2. 让 Codex 把规则真正写回 skill 文件，而不是只在对话里口头说明
3. 如果你希望换机器后也保留这些规则，把本地 skill 提交并推到你自己的 GitHub 仓库

规则通常会写到这些地方：

- 剪口播偏好：`references/user-habits/`
- 术语词典：`references/subtitle-dictionary.txt`
- 流程级经验：`SKILL.md` 或 `references/*-workflow.md`

当前版本的边界也要说明白：

- 支持把经验沉淀成文件，下一次运行直接生效
- 不支持自动统计你在审核页的每一次点击并自行改规则
- 如果你想增加“审核页操作自动学习”的能力，需要后续单独开发这一层

## AI 视频介绍草稿

审核页下方会自动显示一份 AI 视频介绍草稿，包含：

- 标题：吸引眼球的钩子
- 正文：围绕核心观点展开
- 标签：4-6 个相关标签
- 摘要：3-5 点核心内容

特点：

- 不是机械摘要，而是像创作者自己发的帖子
- 直接复制使用，无需二次编辑
- 根据保留内容生成，尽量贴近原口播内容

## 工作原理

```text
你的口播视频
    ↓
① 提取音频（FFmpeg）
    ↓
② 语音转文字（火山引擎 API 或本地 Whisper）
    ↓
③ AI 分析：哪些是口误？哪些是重复？（Codex）
    ↓
④ 生成审核网页 + AI 视频介绍草稿
    ↓
⑤ 用户在网页里执行剪辑，输出成片视频（FFmpeg）
    ↓
⑥ 可选：生成字幕（带词典辅助校对）
```

整个过程中，真正需要你手动确认的核心环节只有审核页。

## 目录结构

```text
~/.codex/skills/videocut/
├── SKILL.md
├── agents/
├── references/
│   ├── install.md
│   ├── cut-workflow.md
│   ├── self-improve.md
│   ├── subtitle-workflow.md
│   ├── subtitle-dictionary.txt
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

## 如何查找和编辑文件

### 查看文件路径的方法

你可以直接这样问 Codex：

1. 查看词典位置：

```text
使用 $videocut，词典文件在哪里？
```

2. 查看用户习惯目录：

```text
使用 $videocut，用户习惯文件在哪里？
```

3. 查看所有配置文件：

```text
使用 $videocut，这个 skill 的配置文件有哪些？
```

### 编辑文件的步骤

1. 让 Codex 帮你打开或修改文件：

```text
使用 $videocut，请在词典里添加这些词：Claude Code、AI 剪辑、口播技巧
```

2. 如果你想改规则，也可以直接说：

```text
使用 $videocut，请把“两个待删片段中间的小停顿也默认删掉”写进规则
```

### 常用文件位置速查

| 功能 | 文件路径 | 用途 |
|------|---------|------|
| 自定义词典 | `references/subtitle-dictionary.txt` | 提高语音识别准确率 |
| 审核规则 | `references/user-habits/` | 自定义 AI 审核偏好 |
| 文案规则 | `references/show-notes.md` | 视频介绍草稿生成规则 |
| 自进化说明 | `references/self-improve.md` | 经验如何回写到 skill |

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

### Q: 我不会用终端怎么办？

没关系。日常使用时，你通常只需要在 Codex 里和它说话，例如：

```text
使用 $videocut，帮我剪这个视频 /Users/你的名字/Downloads/视频.mp4
```

只有在你自己想手动执行 Git 或 FFmpeg 命令时，才需要碰终端。

### Q: 视频很长，会不会很慢？

转录速度取决于你选的方案：

- 火山引擎：通常几分钟内完成
- Whisper 本地：大约是视频时长的 1-3 倍，取决于机器性能

剪辑本身通常是几秒到几十秒。

### Q: 审核页面打不开怎么办？

默认端口是 `8899`。可以按这个顺序排查：

1. 刷新页面
2. 换个浏览器
3. 检查是否有其他程序占用了 `8899`
4. 重新启动审核服务

### Q: 可以在 Windows 上用吗？

可以。建议优先使用火山引擎方案。Whisper 本地模型只支持 Apple Silicon。

### Q: Linux 支持吗？

支持核心流程，但更推荐配合火山引擎使用。Whisper 本地模型不支持 Linux 这条本地 MLX 链路。

### Q: 免费吗？

TalkCut 本身是开源的。实际费用取决于你选的方案：

- Whisper 本地：免费
- 火山引擎：有 20 小时免费额度，超出后按量计费
- Codex / OpenAI 本身的使用成本：取决于你当前的产品或账号方案

### Q: 我想长期记住自己的剪辑偏好，应该怎么做？

直接对 Codex 明说“记住这个规则”或“以后按这个规则来”。TalkCut 当前不会自动从审核页点击里偷偷学习，但会在你明确要求时，把规则写回 `references/user-habits/`、`references/subtitle-dictionary.txt` 或对应 workflow 文件。

### Q: 我想自己改词典，改哪个文件？

改 `references/subtitle-dictionary.txt`。一行一个词，保存后下次火山引擎转录会自动加载；如果你想跨设备保留，记得把修改提交到 Git。

## 技术架构

TalkCut 采用模块化设计，各组件相互独立：

- 转录引擎：火山引擎 API + Whisper
- 分析引擎：Codex 结合规则文件做审核判断
- 审核界面：Web 审核页
- 剪辑引擎：FFmpeg
- 字幕系统：支持词典辅助校对
- 进化系统：把用户偏好写回 skill 文件

## 贡献

欢迎提交 Issue 和 Pull Request。

当前 Codex 版仓库：
[talkcut-codex-skill](https://github.com/rongmiao926-hub/talkcut-codex-skill)

## 致谢

- 原作：成峰（公众号“AI 产品自由”）的 videocut 思路
- Claude 版参考仓库：[talkcut-claude-skill](https://github.com/rongmiao926-hub/talkcut-claude-skill)

## License

MIT License
