#!/usr/bin/env node
/**
 * 根据删除列表剪辑视频（filter_complex 精确剪辑）— 跨平台 Node.js 版本
 *
 * 用法: node cut_video.js <input.mp4> <delete_segments.json> [output.mp4]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INPUT = process.argv[2];
const DELETE_JSON = process.argv[3];
const OUTPUT = process.argv[4] || 'output_cut.mp4';

if (!INPUT || !DELETE_JSON) {
  console.error('❌ 用法: node cut_video.js <input.mp4> <delete_segments.json> [output.mp4]');
  process.exit(1);
}
if (!fs.existsSync(INPUT)) {
  console.error(`❌ 找不到输入文件: ${INPUT}`);
  process.exit(1);
}
if (!fs.existsSync(DELETE_JSON)) {
  console.error(`❌ 找不到删除列表: ${DELETE_JSON}`);
  process.exit(1);
}

// file: 前缀：macOS/Linux 文件名可能含冒号，Windows 不需要
function fileArg(p) {
  return process.platform === 'win32' ? p : `file:${p}`;
}

function readEnvConfig() {
  const envFile = path.join(__dirname, '..', '.env');
  const config = {};
  if (!fs.existsSync(envFile)) return config;

  const content = fs.readFileSync(envFile, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    config[key] = value;
  }
  return config;
}

function parseMs(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildAdjustedDeleteSegments(deleteSegs, options) {
  const adjusted = [];
  for (const seg of deleteSegs) {
    const rawStart = Math.max(0, seg.start - options.audioOffset);
    const rawEnd = Math.min(options.duration, seg.end - options.audioOffset);
    const rawDuration = Math.max(0, rawEnd - rawStart);
    if (rawDuration <= 0) continue;

    const maxKeepSec = Math.max(0, (rawDuration - options.minDeleteSec) / 2);
    const effectiveKeepSec = Math.min(options.keepPaddingSec, maxKeepSec);
    const start = Math.max(0, rawStart + effectiveKeepSec - options.expandSec);
    const end = Math.min(options.duration, rawEnd - effectiveKeepSec + options.expandSec);

    if (end > start) {
      adjusted.push({ start, end });
    }
  }
  return adjusted;
}

function findAudioReferencePath() {
  const deleteDir = path.dirname(path.resolve(DELETE_JSON));
  const candidates = [
    path.join(deleteDir, 'audio.mp3'),
    path.join(process.cwd(), 'audio.mp3'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function probeMediaStartTime(mediaPath) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=start_time -of csv=p=0 "${fileArg(mediaPath)}"`,
      { encoding: 'utf8' }
    ).trim();
    return parseFloat(output) || 0;
  } catch (e) {
    return 0;
  }
}

function buildAudioFilter(seg, index, totalSegments, fadeSec) {
  const segDuration = Math.max(0, seg.end - seg.start);
  const maxFadeSec = Math.max(0, segDuration / 2 - 0.001);
  const effectiveFadeSec = Math.min(fadeSec, maxFadeSec);

  let filter = `[0:a]atrim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},asetpts=PTS-STARTPTS`;

  if (effectiveFadeSec > 0 && totalSegments > 1) {
    if (index > 0) {
      filter += `,afade=t=in:st=0:d=${effectiveFadeSec.toFixed(3)}`;
    }
    if (index < totalSegments - 1) {
      const fadeOutStart = Math.max(0, segDuration - effectiveFadeSec);
      filter += `,afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${effectiveFadeSec.toFixed(3)}`;
    }
  }

  return `${filter}[a${index}]`;
}

// 获取视频时长
const duration = parseFloat(
  execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${fileArg(INPUT)}"`, { encoding: 'utf8' }).trim()
);
console.log(`📹 视频时长: ${duration}s`);

// 配置参数
const envConfig = readEnvConfig();
const CUT_EXPAND_MS = parseMs(envConfig.CUT_EXPAND_MS, 0);
const CUT_KEEP_PADDING_MS = parseMs(envConfig.CUT_KEEP_PADDING_MS, 500);
const CUT_MIN_DELETE_MS = parseMs(envConfig.CUT_MIN_DELETE_MS, 120);
const CROSSFADE_MS = parseMs(envConfig.CROSSFADE_MS, 30);
const expandSec = CUT_EXPAND_MS / 1000;
const keepPaddingSec = CUT_KEEP_PADDING_MS / 1000;
const minDeleteSec = CUT_MIN_DELETE_MS / 1000;
const crossfadeSec = CROSSFADE_MS / 1000;

console.log(`⚙️ 优化参数: 边界保留=${CUT_KEEP_PADDING_MS}ms, 最小删除=${CUT_MIN_DELETE_MS}ms, 额外扩展=${CUT_EXPAND_MS}ms, 音频接缝淡化=${CROSSFADE_MS}ms`);

// 读取并处理删除片段
const deleteSegs = JSON.parse(fs.readFileSync(DELETE_JSON, 'utf8'));
deleteSegs.sort((a, b) => a.start - b.start);

const audioReference = findAudioReferencePath();
const audioOffset = audioReference ? probeMediaStartTime(audioReference) : 0;
if (audioReference && audioOffset > 0) {
  console.log(`🔧 检测到审核音频偏移: ${audioOffset.toFixed(3)}s，导出时自动补偿`);
}

// 收缩删除范围，尽量多保留边界附近的正常文字
const adjustedSegs = buildAdjustedDeleteSegments(deleteSegs, {
  audioOffset,
  duration,
  expandSec,
  keepPaddingSec,
  minDeleteSec,
});

if (adjustedSegs.length === 0 && deleteSegs.length > 0) {
  console.log('⚠️ 当前删除片段都很短，按保留策略收缩后没有可执行的删除范围');
}

// 合并重叠的删除段
const mergedSegs = [];
for (const seg of adjustedSegs) {
  if (mergedSegs.length === 0 || seg.start > mergedSegs[mergedSegs.length - 1].end) {
    mergedSegs.push({ ...seg });
  } else {
    mergedSegs[mergedSegs.length - 1].end = Math.max(mergedSegs[mergedSegs.length - 1].end, seg.end);
  }
}

// 计算保留片段
const keepSegs = [];
let cursor = 0;
for (const del of mergedSegs) {
  if (del.start > cursor) {
    keepSegs.push({ start: cursor, end: del.start });
  }
  cursor = del.end;
}
if (cursor < duration) {
  keepSegs.push({ start: cursor, end: duration });
}

console.log(`保留片段数: ${keepSegs.length}`);
console.log(`删除片段数: ${mergedSegs.length}`);

let deletedTime = 0;
for (const seg of mergedSegs) deletedTime += seg.end - seg.start;
console.log(`删除总时长: ${deletedTime.toFixed(2)}s`);

// 生成 filter_complex
const filters = [];
let vconcat = '';
const aLabels = [];

for (let i = 0; i < keepSegs.length; i++) {
  const seg = keepSegs[i];
  filters.push(`[0:v]trim=start=${seg.start.toFixed(3)}:end=${seg.end.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`);
  filters.push(buildAudioFilter(seg, i, keepSegs.length, crossfadeSec));
  vconcat += `[v${i}]`;
  aLabels.push(`a${i}`);
}

filters.push(`${vconcat}concat=n=${keepSegs.length}:v=1:a=0[outv]`);

if (keepSegs.length === 1) {
  filters.push('[a0]anull[outa]');
} else {
  filters.push(`${aLabels.map(label => `[${label}]`).join('')}concat=n=${keepSegs.length}:v=0:a=1[outa]`);
}

const filterCmd = filters.join(';');

console.log('\n✂️ 执行 FFmpeg 精确剪辑...');

try {
  execSync(
    `ffmpeg -y -i "${fileArg(INPUT)}" -filter_complex "${filterCmd}" -map "[outv]" -map "[outa]" -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${fileArg(OUTPUT)}"`,
    { stdio: 'inherit' }
  );

  const newDuration = parseFloat(
    execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${fileArg(OUTPUT)}"`, { encoding: 'utf8' }).trim()
  );
  console.log(`✅ 已保存: ${OUTPUT}`);
  console.log(`📹 新时长: ${newDuration}s`);
} catch (e) {
  console.error('❌ 剪辑失败');
  process.exit(1);
}
