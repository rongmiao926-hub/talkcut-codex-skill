#!/usr/bin/env python3
"""
Whisper 本地转录 → subtitles_words.json

用法: python3 whisper_transcribe.py <audio_file>
输出: subtitles_words.json（当前目录）

依赖: pip3 install mlx-whisper
模型: mlx-community/whisper-large-v3-turbo（首次运行自动下载，约 1.5GB）
"""

import sys
import json
import math
import re
import subprocess

MODEL = "mlx-community/whisper-large-v3-turbo"

def transcribe(audio_path):
    """调用 mlx_whisper 转录，返回 segments with word timestamps."""
    import mlx_whisper
    print(f"🎙️  正在转录: {audio_path}")
    print(f"📦  模型: {MODEL}")
    result = mlx_whisper.transcribe(
        audio_path,
        path_or_hf_repo=MODEL,
        language="zh",
        word_timestamps=True,
        verbose=False,
    )
    return result

def file_arg(path):
    return path if sys.platform == "win32" else f"file:{path}"

def probe_float(command):
    output = subprocess.check_output(
        command,
        shell=True,
        text=True,
        stderr=subprocess.DEVNULL,
    ).strip()
    if not output or output == "N/A":
        return 0.0
    return float(output)

def probe_audio_duration(audio_path):
    return probe_float(
        f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{file_arg(audio_path)}"'
    )

def probe_trailing_silence_start(audio_path, min_duration=0.8):
    duration = probe_audio_duration(audio_path)
    if duration <= 0:
        return None

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-i",
        file_arg(audio_path),
        "-af",
        f"silencedetect=noise=-35dB:d={min_duration}",
        "-f",
        "null",
        "-",
    ]
    result = subprocess.run(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )

    last_start = None
    last_end = None
    last_duration = 0.0

    for line in result.stderr.splitlines():
        match_start = re.search(r"silence_start:\s*([0-9.]+)", line)
        if match_start:
            last_start = float(match_start.group(1))
            continue

        match_end = re.search(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)", line)
        if match_end:
            last_end = float(match_end.group(1))
            last_duration = float(match_end.group(2))

    if last_start is None or last_end is None:
        return None

    if last_duration < min_duration:
        return None

    if duration - last_end > 0.15:
        return None

    return last_start

def strip_trailing_silence_words(all_words, audio_path):
    trailing_silence_start = probe_trailing_silence_start(audio_path)
    if trailing_silence_start is None:
        return all_words

    filtered = [word for word in all_words if word["start"] < trailing_silence_start]
    removed = len(all_words) - len(filtered)
    if removed > 0:
        print(f"🧹 已移除尾部静音中的幻觉词: {removed} 个（静音起点 {trailing_silence_start:.2f}s）")
    return filtered

def strip_suspicious_tail_burst(all_words):
    if len(all_words) < 8:
        return all_words

    end_time = all_words[-1]["end"]
    burst_start = len(all_words) - 1
    while burst_start > 0 and end_time - all_words[burst_start - 1]["start"] <= 0.6:
        burst_start -= 1

    suffix = all_words[burst_start:]
    if len(suffix) < 8:
        return all_words

    tiny_duration_count = sum(1 for word in suffix if (word["end"] - word["start"]) <= 0.02)
    unique_texts = {word["text"] for word in suffix}
    max_repeat = max(sum(1 for candidate in suffix if candidate["text"] == text) for text in unique_texts)

    if tiny_duration_count / len(suffix) < 0.8:
        return all_words

    if len(unique_texts) > 2:
        return all_words

    if max_repeat < 6:
        return all_words

    print(f"🧹 已移除尾部重复幻觉词: {len(suffix)} 个")
    return all_words[:burst_start]

def to_subtitles_words(result, audio_path):
    """将 whisper 结果转换为 subtitles_words.json 格式。

    Gap 检测逻辑与 generate_subtitles.js 保持一致：
    - >0.1s 插入 gap
    - 长静音整段保留，不按 1s 拆分
    """
    # 提取所有字级别时间戳
    all_words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            text = w["word"].strip()
            if not text:
                continue
            all_words.append({
                "text": text,
                "start": float(w["start"]),
                "end": float(w["end"]),
            })

    if not all_words:
        print("⚠️  未检测到任何文字")
        return []

    raw_word_count = len(all_words)
    all_words = strip_trailing_silence_words(all_words, audio_path)
    all_words = strip_suspicious_tail_burst(all_words)

    if not all_words:
        print("⚠️  清洗尾部幻觉词后没有剩余文字")
        return []

    print(f"原始字数: {raw_word_count}")
    print(f"清洗后字数: {len(all_words)}")

    # 添加 gap 标记
    words_with_gaps = []
    last_end = 0.0

    for word in all_words:
        gap_duration = word["start"] - last_end

        if gap_duration > 0.1:
            words_with_gaps.append({
                "text": "",
                "start": round(last_end, 2),
                "end": round(word["start"], 2),
                "isGap": True,
            })

        words_with_gaps.append({
            "text": word["text"],
            "start": round(word["start"], 2),
            "end": round(word["end"], 2),
            "isGap": False,
        })
        last_end = word["end"]

    gaps = [w for w in words_with_gaps if w["isGap"]]
    print(f"总元素数: {len(words_with_gaps)}")
    print(f"空白段数: {len(gaps)}")

    return words_with_gaps


def main():
    if len(sys.argv) < 2:
        print("用法: python3 whisper_transcribe.py <audio_file>")
        sys.exit(1)

    audio_path = sys.argv[1]

    result = transcribe(audio_path)
    words = to_subtitles_words(result, audio_path)

    output_file = "subtitles_words.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"✅ 已保存 {output_file}")


if __name__ == "__main__":
    main()
