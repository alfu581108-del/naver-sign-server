#!/usr/bin/env python3
"""3자회의 — GPT 집필 호출 (OpenAI Responses API, 표준 라이브러리만 사용).

사용: python ask_gpt.py <프롬프트 파일> [출력 파일]
환경변수: OPENAI_API_KEY (필수, 값은 출력하지 않음), GPT_MODEL (선택)
"""
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_MODEL = "gpt-5"  # 최신 모델로 바꿀 때는 GPT_MODEL 환경변수 사용


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 64
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        print("OPENAI_API_KEY 없음 — 3자회의 GPT 경로 불가", file=sys.stderr)
        return 3
    model = os.environ.get("GPT_MODEL", DEFAULT_MODEL)
    prompt = open(sys.argv[1], encoding="utf-8").read()
    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps({"model": model, "input": prompt}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"OpenAI 오류 {e.code}: {e.read().decode()[:500]}", file=sys.stderr)
        return 4
    text = "".join(
        c.get("text", "")
        for item in data.get("output", [])
        if item.get("type") == "message"
        for c in item.get("content", [])
        if c.get("type") == "output_text"
    )
    out = sys.argv[2] if len(sys.argv) > 2 else None
    if out:
        open(out, "w", encoding="utf-8").write(text)
    else:
        print(text)
    print(f"[model={data.get('model', model)}]", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
