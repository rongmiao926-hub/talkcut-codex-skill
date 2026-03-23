# 安装与环境初始化

首次使用或环境异常时，按这个流程处理。

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

### 方案 A：火山引擎

优点：速度快，识别准，全平台可用。  
缺点：需要 API Key。

获取 API Key：

- 控制台：[火山引擎语音识别](https://console.volcengine.com/speech/new/experience/asr?projectName=default)
- 图文参考：[Feishu 指南](https://my.feishu.cn/wiki/Gh0MwxHePidsYfkIx7zcvJQynqc?from=from_copylink)

写入 `.env`：

```bash
VOLCENGINE_API_KEY=your_api_key_here
ASR_ENGINE=volcengine
```

### 方案 B：Whisper 本地

优点：完全免费。  
缺点：仅 Apple Silicon 可用，首次下载模型约 1.5GB。

```bash
pip3 install mlx-whisper
```

写入 `.env`：

```bash
ASR_ENGINE=whisper
```

## 配置默认输出目录

如果用户没有明确指定，默认使用源视频同级的 `output/` 子目录。

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

