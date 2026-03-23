# 剪口播工作流

口播剪辑默认分为 3 段：转录、分析、审核。

## 准备变量

先确定：

- `SKILL_DIR`：当前 skill 根目录
- `VIDEO_PATH`：用户给的视频绝对路径
- `VIDEO_STEM`：不带扩展名的视频名
- `OUTPUT_ROOT`：优先取 `.env` 的 `DEFAULT_OUTPUT_DIR`，为空时默认 `$(dirname "$VIDEO_PATH")/output`

推荐写法：

```bash
SKILL_DIR="/absolute/path/to/videocut"
VIDEO_PATH="/absolute/path/to/video.mp4"
VIDEO_FILE="$(basename "$VIDEO_PATH")"
VIDEO_STEM="${VIDEO_FILE%.*}"

OUTPUT_ROOT="$(grep '^DEFAULT_OUTPUT_DIR=' "$SKILL_DIR/.env" | cut -d'=' -f2-)"
if [ -z "$OUTPUT_ROOT" ]; then
  OUTPUT_ROOT="$(dirname "$VIDEO_PATH")/output"
fi

DATE="$(date +%Y-%m-%d)"
BASE_DIR="$OUTPUT_ROOT/${DATE}_${VIDEO_STEM}/剪口播"

mkdir -p "$BASE_DIR/1_转录" "$BASE_DIR/2_分析" "$BASE_DIR/3_审核"
```

## 步骤 1：提取音频

```bash
cd "$BASE_DIR/1_转录"
ffmpeg -i "$VIDEO_PATH" -vn -acodec libmp3lame -y audio.mp3
```

## 步骤 2：转录

读取 `.env` 中的 `ASR_ENGINE`。

- `volcengine`：用火山引擎
- `whisper`：用本地 Whisper
- 为空：先问用户

### 方案 A：火山引擎

1. 上传音频到临时可访问地址：

```bash
curl -s -F "files[]=@audio.mp3" https://uguu.se/upload
```

2. 用 bunded script 转录：

```bash
node "$SKILL_DIR/scripts/volcengine_transcribe.js" "https://example.com/audio.mp3"
node "$SKILL_DIR/scripts/generate_subtitles.js" volcengine_result.json
```

得到：

- `volcengine_result.json`
- `subtitles_words.json`

### 方案 B：Whisper

```bash
python3 "$SKILL_DIR/scripts/whisper_transcribe.py" audio.mp3
```

直接得到：

- `subtitles_words.json`

## 步骤 3：准备分析材料

### 3.1 生成可读稿

```bash
cd "$BASE_DIR/2_分析"
node -e "
const data = require('../1_转录/subtitles_words.json');
let output = [];
data.forEach((w, i) => {
  if (w.isGap) {
    const dur = (w.end - w.start).toFixed(2);
    if (dur >= 0.5) output.push(i + '|[静' + dur + 's]|' + w.start.toFixed(2) + '-' + w.end.toFixed(2));
  } else {
    output.push(i + '|' + w.text + '|' + w.start.toFixed(2) + '-' + w.end.toFixed(2));
  }
});
require('fs').writeFileSync('readable.txt', output.join('\\n'));
"
```

### 3.2 读取规则

剪口播分析前，必须把 `references/user-habits/` 下所有规则文件读完，再开始判断。

### 3.3 先按静音切句

```bash
node -e "
const data = require('../1_转录/subtitles_words.json');
let sentences = [];
let curr = { text: '', startIdx: -1, endIdx: -1 };

data.forEach((w, i) => {
  const isLongGap = w.isGap && (w.end - w.start) >= 0.5;
  if (isLongGap) {
    if (curr.text.length > 0) sentences.push({...curr});
    curr = { text: '', startIdx: -1, endIdx: -1 };
  } else if (!w.isGap) {
    if (curr.startIdx === -1) curr.startIdx = i;
    curr.text += w.text;
    curr.endIdx = i;
  }
});
if (curr.text.length > 0) sentences.push(curr);

sentences.forEach((s, i) => {
  console.log(i + '|' + s.startIdx + '-' + s.endIdx + '|' + s.text);
});
" > sentences.txt
```

### 3.4 先自动标记静音

```bash
node -e "
const words = require('../1_转录/subtitles_words.json');
const selected = [];
words.forEach((w, i) => {
  if (w.isGap && (w.end - w.start) >= 0.5) selected.push(i);
});
require('fs').writeFileSync('auto_selected.json', JSON.stringify(selected, null, 2));
"
```

## 步骤 4：AI 分析口误

在 `readable.txt`、`sentences.txt` 和用户规则基础上，补充口误索引到 `auto_selected.json`，并输出 `口误分析.md`。

优先级：

1. 重复句：相邻句或隔一句重复，删较短或被纠正的整句
2. 残句：说到一半被打断，删整句
3. 句内重复：A + 中间 + A，删前面多余部分
4. 卡顿词：如“那个那个”“就是就是”，删前面重复部分
5. 重说纠正：前面说错，后面立即纠正，删前一段
6. 语气词：默认只标记，不自动大删，除非用户规则明确要求

硬规则：

- 先分句，再比对
- 残句和重复句默认整句删除
- 静音索引必须保留，不能被 AI 结果覆盖
- 最终 `auto_selected.json` 必须是去重、升序的数组

## 步骤 4.5：生成 AI 视频介绍草稿

这一步必须由 Codex 直接完成，不要用本地脚本模板代写。

按 [show-notes.md](show-notes.md) 的要求，基于当前准备保留的内容生成：

```text
../3_审核/视频介绍草稿.md
```

要求：

- 风格像创作者自己会配在视频旁边发出的介绍文案
- 默认包含标题、正文、标签、内容摘要
- 如果当前稿子明显还是半成品，正文也要跟着真实，不要编造视频里没讲过的内容
- 审核页里默认只展示和复制这份草稿，不依赖用户在页面里手工保存

## 步骤 5：生成审核页

```bash
cd "$BASE_DIR/3_审核"
node "$SKILL_DIR/scripts/generate_review.js" \
  "../1_转录/subtitles_words.json" \
  "../2_分析/auto_selected.json" \
  "../1_转录/audio.mp3"
```

产出：

- `review.html`
- `audio.mp3`

## 步骤 6：启动审核服务

把原视频复制或软链到 `3_审核/` 目录，或在启动服务时直接传绝对路径：

```bash
cd "$BASE_DIR/3_审核"
node "$SKILL_DIR/scripts/review_server.js" 8899 "$VIDEO_PATH"
```

告诉用户打开：

- `http://localhost:8899`

到这一步为止，Codex 主流程就应该停住，不要在终端里继续帮用户直接出成片。

硬规则：

- 不要在用户进入审核页之前就生成 `*_cut.mp4`
- 不要在后台替用户调用“执行剪辑”
- 成片只允许由用户在审核页里点击 `执行剪辑` 按钮触发

只有当用户在页面上点“执行剪辑”后，才会生成：

- `delete_segments.json`
- `*_cut.mp4`

审核页里会自动读取已有的 AI 视频介绍草稿，用户可以直接复制：

- `视频介绍草稿.md`

## 执行后的检查

- `1_转录/subtitles_words.json` 存在
- `2_分析/auto_selected.json` 存在
- `3_审核/review.html` 存在
- 如已生成视频介绍草稿，`3_审核/视频介绍草稿.md` 存在
- 只有用户在审核页里手动执行过剪辑时，`3_审核/*_cut.mp4` 才应存在
