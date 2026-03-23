# 字幕工作流

字幕流程默认是：转录 -> 人工校对 -> 网页审核 -> 烧录。

## 输出目录

```text
{DEFAULT_OUTPUT_DIR}/YYYY-MM-DD_视频名/字幕/
├── 1_转录/
├── 2_校对/
└── 3_输出/
```

## 步骤 1：转录

建议优先使用火山引擎，因为脚本会自动加载热词词典 `references/subtitle-dictionary.txt`。

```bash
cd "$BASE_DIR/1_转录"
ffmpeg -i "$VIDEO_PATH" -vn -acodec libmp3lame -y audio.mp3
curl -s -F "files[]=@audio.mp3" https://uguu.se/upload
node "$SKILL_DIR/scripts/volcengine_transcribe.js" "https://example.com/audio.mp3"
```

## 步骤 2：生成带时间戳字幕

在 `2_校对/` 中生成：

```bash
cd "$BASE_DIR/2_校对"
node -e "
const fs = require('fs');
const result = JSON.parse(fs.readFileSync('../1_转录/volcengine_result.json', 'utf8'));
const subtitles = result.utterances.map((u, i) => ({
  id: i + 1,
  text: u.text,
  start: u.start_time / 1000,
  end: u.end_time / 1000
}));
fs.writeFileSync('subtitles_with_time.json', JSON.stringify(subtitles, null, 2));
"
```

## 步骤 3：人工校对规则

校对时默认要人工逐条阅读，不能直接把 ASR 结果原样交给用户。

重点看：

- 专有名词是否被热词纠正
- 同音字误识别
- 漏字、少字、语气不顺
- 是否和用户原稿冲突

如果用户提供原稿，只把它当参考，不要做机械逐字匹配。

## 步骤 4：启动字幕审核页

```bash
cd "$BASE_DIR/2_校对"
node "$SKILL_DIR/scripts/subtitle_server.js" 8898 "$VIDEO_PATH"
```

告诉用户打开：

- `http://localhost:8898`

页面支持：

- 编辑字幕文本
- 保存 JSON
- 导出 SRT
- 直接烧录字幕

## 步骤 5：烧录输出

审核页烧录后，默认输出到 `3_输出/`：

- `视频名.srt`
- `视频名_字幕稿.md`
- `视频名_字幕.mp4`

默认字幕样式：

- 字号：22
- 字体：`PingFang SC`
- 粗体
- 颜色：金黄 `#ffde00`
- 黑色描边：2px
- 底部居中

## 检查项

- `2_校对/subtitles_with_time.json` 存在
- `3_输出/*.srt` 存在
- 如已烧录，`3_输出/*_字幕.mp4` 存在
- 如果用户要求术语纠错，确认 `references/subtitle-dictionary.txt` 已被加载

