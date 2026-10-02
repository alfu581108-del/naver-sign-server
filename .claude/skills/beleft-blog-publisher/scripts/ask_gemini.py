#!/usr/bin/env python3
"""3자회의 — 제미나이 정보탐색·검증 호출 (Google 검색 그라운딩 사용).

사용: python ask_gemini.py <프롬프트 파일> [출력 파일]
환경변수: GEMINI_API_KEY (필수, 값은 출력하지 않음), GEMINI_MODEL (선택)
출력: 답변 본문 + 맨 아래 "## 근거" 에 그라운딩 출처 URL 목록
"""
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_MODEL = "gemini-2.5-pro"  # 최신 모델로 바꿀 때는 GEMINI_MODEL 환경변수 사용


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 64
    # 클라우드 환경의 API credentials를 쓰면 프록시가 헤더를 주입하므로 세션엔 키가 없다.
    key = os.environ.get("GEMINI_API_KEY", "injected-by-proxy")
    model = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    prompt = open(sys.argv[1], encoding="utf-8").read()
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"google_search": {}}],
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        data=json.dumps(body).encode(),
        headers={"x-goog-api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print(f"인증 실패 {e.code} — 키 미설정이거나 네트워크/credential 미등록. 3자회의 경로 불가로 보고", file=sys.stderr)
            return 3
        detail = e.read().decode()
        if "API_KEY_INVALID" in detail:
            print("Gemini 키 없음/무효 — 3자회의 제미나이 경로 불가로 보고", file=sys.stderr)
            return 3
        print(f"Gemini 오류 {e.code}: {detail[:500]}", file=sys.stderr)
        return 4
    except urllib.error.URLError as e:
        print(f"연결 실패 — 네트워크 허용 목록 확인: {e.reason}", file=sys.stderr)
        return 3
    cand = (data.get("candidates") or [{}])[0]
    text = "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", []))
    chunks = cand.get("groundingMetadata", {}).get("groundingChunks", [])
    sources = [f"- {c['web'].get('title', '')}: {c['web'].get('uri', '')}" for c in chunks if "web" in c]
    result = text + ("\n\n## 근거\n" + "\n".join(sources) if sources else "\n\n## 근거\n(그라운딩 출처 없음 — 판정 신뢰 낮음)")
    out = sys.argv[2] if len(sys.argv) > 2 else None
    if out:
        open(out, "w", encoding="utf-8").write(result)
    else:
        print(result)
    print(f"[model={model}]", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
