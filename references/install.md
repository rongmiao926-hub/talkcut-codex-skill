# 安装与环境初始化

首次使用或环境异常时，按这个流程处理。

## 初始化必问项

当用户说“安装 videocut 环境”“初始化一下”这类话时，先不要静默选默认值，必须按下面顺序确认：

1. 输出目录想放在哪里
2. 语音转录方案选 `火山引擎` 还是 `Whisper`
3. 如果选火山引擎，是否已经有 API Key

硬规则：

- 不要因为当前机器能装 `mlx-whisper`，就直接替用户选 `whisper`
- 不要跳过优缺点说明
- 如果用户要配火山引擎，或者当前 `VOLCENGINE_API_KEY` 为空，必须把下面这个详细说明地址直接发给用户，而不是只说“去控制台看”：
  `https://my.feishu.cn/wiki/Gh0MwxHePidsYfkIx7zcvJQynqc?from=from_copylink`
- 初始化结束后，要把用户最终选择写回 `.env`

## 依赖

- Node.js 18+
- FFmpeg
- `curl`
- 可选：`mlx-whisper`（仅 Apple Silicon 上的本地 Whisper）

## 配置文件

skill 根目录下使用 `.env`：

```bash
ASR_ENGINE=
VOLCENGINE_API_KEY=
DEFAULT_OUTPUT_DIR=
REVIEW_PORT=8899
SUBTITLE_PORT=8898
```

规则：

- `ASR_ENGINE=volcengine`：默认走火山引擎
- `ASR_ENGINE=whisper`：默认走本地 Whisper
- `ASR_ENGINE=`：每次执行时询问用户

## 安装步骤

### macOS

```bash
brew install node ffmpeg
```

### Windows

```bash
winget install OpenJS.NodeJS
winget install Gyan.FFmpeg
```

## 配置转录方案

初始化时先把下面这段差异解释给用户，再让用户选：

| 方案 | 优点 | 缺点 | 适用情况 |
|------|------|------|----------|
| 火山引擎 API | 速度快，识别通常更稳；有免费 20 小时额度；同时支持苹果电脑和 Windows 电脑 | 需要联网，需要 API Key | 想省时间、跨平台、优先稳定性 |
| Whisper 本地 | 完全免费，不需要云 API | 只适合 Apple Silicon；首次下载模型约 1.5GB；速度通常慢一些；Windows 和 Intel Mac 不适用 | 不想配 API Key，且本机是 Apple Silicon |

推荐问法：

```text
现在转录方案有两个：
1. 火山引擎：速度更快，识别通常更稳，有免费 20 小时额度，同时支持苹果电脑和 Windows，但需要 API Key
2. Whisper：本地免费，不需要云 API，但通常更慢，而且只支持苹果 Apple 芯片

你想默认用哪一个？我会把它写进 .env。
```

### 方案 A：火山引擎

优点：

- 速度快，识别通常更稳
- 有免费 20 小时额度，前期体验成本低
- 同时支持苹果电脑和 Windows 电脑

缺点：

- 需要联网
- 需要先配置 API Key

获取 API Key：

- 控制台：[火山引擎语音识别](https://console.volcengine.com/speech/new/experience/asr?projectName=default)
- 图文参考：[Feishu 指南](https://my.feishu.cn/wiki/Gh0MwxHePidsYfkIx7zcvJQynqc?from=from_copylink)

建议给用户的说明：

1. 打开火山引擎控制台
2. 开通语音识别相关服务
3. 获取 API Key
4. 把 key 填进 `.env` 的 `VOLCENGINE_API_KEY`

首次配置时，建议直接这样发给用户：

```text
如果你要走火山引擎，这里是 API Key 的详细获取说明：
https://my.feishu.cn/wiki/Gh0MwxHePidsYfkIx7zcvJQynqc?from=from_copylink

控制台入口：
https://console.volcengine.com/speech/new/experience/asr?projectName=default
```

写入 `.env`：

```bash
VOLCENGINE_API_KEY=your_api_key_here
ASR_ENGINE=volcengine
```

### 方案 B：Whisper 本地

优点：

- 完全免费
- 不需要云 API Key
- 音频不需要上传到第三方云端

缺点：

- 仅 Apple Silicon 可用
- Windows 和 Intel Mac 不适用
- 首次下载模型约 1.5GB
- 通常比火山引擎更慢一些

```bash
pip3 install mlx-whisper
```

写入 `.env`：

```bash
ASR_ENGINE=whisper
```

## 配置默认输出目录

初始化时，必须先问用户结果想放哪里，再写入 `.env`。

推荐问法：

```text
我后续生成的审核页、正文草稿和剪辑成片，要默认放到哪个目录？
如果你不指定，我会默认放到源视频同级的 output/ 目录。
```

如果用户没有明确指定，才默认使用源视频同级的 `output/` 子目录。

```bash
DEFAULT_OUTPUT_DIR=/Users/xxx/Videos/output
```

## 验证

```bash
node -v
ffmpeg -version
python3 --version
```

如果选火山引擎，再检查：

```bash
grep '^VOLCENGINE_API_KEY=' .env
grep '^ASR_ENGINE=' .env
```

如果选 Whisper，再检查：

```bash
python3 -c "import mlx_whisper; print('mlx-whisper OK')"
```

## 失败处理

- `ffmpeg: command not found`：重新安装 FFmpeg，并确认在 PATH 中
- `node: command not found`：重新安装 Node.js，并重开终端
- Whisper 导入失败：确认当前机器是 Apple Silicon，再执行 `pip3 install mlx-whisper`
- `.env` 缺项：直接指出缺少哪一个键，不要笼统说“配置错误”
