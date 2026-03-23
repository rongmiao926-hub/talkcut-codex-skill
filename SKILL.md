---
name: videocut
description: Use when the user wants to install or run the local AI-assisted talking-head video workflow: configure ASR, cut oral videos by reviewing silence/fillers/repeats, generate or burn subtitles, or update the review rules. Typical requests include “剪口播”, “处理这个视频”, “给这个视频加字幕”, “安装 videocut 环境”, and “记住这个规则”.
---

# Videocut

全程使用中文。

这个 skill 用于本地 `videocut` 工作流，核心能力是：

- 安装和检查依赖
- 转录口播视频并生成网页审核页
- 在审核页里根据人工确认执行剪辑
- 生成、校对、烧录字幕
- 在审核页里生成发布正文草稿
- 记录新的审核规则和用户偏好

优先复用本 skill 自带脚本，不要临时重写整条处理链路，除非用户明确要求。

## 何时读哪些文件

- 安装、初始化、修环境问题：读 [references/install.md](references/install.md)
- 剪口播：先读 [references/cut-workflow.md](references/cut-workflow.md)，再读 `references/user-habits/` 下全部规则文件
- 写小红书正文草稿：读 [references/show-notes.md](references/show-notes.md)
- 加字幕、校对字幕、烧录字幕：读 [references/subtitle-workflow.md](references/subtitle-workflow.md)
- 用户要求“记住这个问题”“更新规则”：读 [references/self-improve.md](references/self-improve.md)

## 工作规则

- 所有配置都放在 skill 根目录 `.env`，从 `.env.example` 复制开始。
- 绝不提交 `.env`、API Key、证书或其他敏感信息。
- 所有脚本和参考文件都按 skill 根目录相对寻址。
- 有已有日期输出目录就复用，没有再新建。
- 如果 `DEFAULT_OUTPUT_DIR` 为空，优先询问用户；如果没有明确要求，默认放到源视频同级的 `output/` 目录。
- 剪口播主流程默认停在网页审核页和正文草稿，不要在用户进入审核页之前就直接产出 `*_cut.mp4`。
- 成片只能由用户在审核页里点击 `执行剪辑` 按钮触发；不要在终端里替用户预先调用这一步。
- 启动本地审核服务后，要明确告诉用户访问 URL、当前输出目录和已生成文件。
- 只有在目标文件真实写到磁盘后，才能向用户汇报成功。
- 一旦依赖、端口、上传、API Key 或脚本执行失败，要直接指出具体阻塞点和下一步动作。

## 默认输出结构

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

## 资源位置

- 转录与剪辑脚本：`scripts/`
- 口误规则：`references/user-habits/`
- 字幕热词词典：`references/subtitle-dictionary.txt`
