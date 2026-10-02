#!/usr/bin/env python3
"""발행 직전 금기어·사실 가드 스캔.

사용: python taboo_scan.py <본문 파일> [<본문 파일> ...]
종료 코드: 0 = 통과, 1 = 금기(❌) 발견, 2 = 경고(⚠️)만 발견
기준: references/fact-guard.md B절 + brand-voice-editor 금기 목록.
"""
import re
import sys

# (패턴, 이유) — 발견되면 해당 채널 발행 중단
BLOCK = [
    (r"싸다|싼 가격|저렴|가성비", "가격 어휘 금기"),
    (r"할인|세일|특가|최저가|파격", "할인 어휘 채널 불문 금기"),
    (r"무조건", "절대 표현 금지"),
    (r"100\s*%\s*(안전|무해|천연)", "100% 절대 표현 (→ '100% 무해함을 목표로')"),
    (r"특허", "근거 없는 특허 표현"),
    (r"세계\s*최초|세계에서\s*유일|전\s*세계\s*유일|국내\s*유일|세계\s*최고\s*난도", "최상급 표현 — 표시광고법 위험"),
    (r"완치|치료\s*효과|의학적으로\s*입증", "의학적 효능 금지"),
    (r"장안동", "공장 지명 전면 삭제(9/29)"),
    (r"11년째\s*거래|거래한\s*지\s*1[12]년", "공장 거래 기간 금지(9/29)"),
    (r"2대째\s*가업|가업을\s*잇", "'2대 모녀'로 표기"),
    (r"GOTS\s*6\.0", "GOTS 7.0으로 표기"),
    (r"Eight\s+Certifications", "'여덟 가지 검증'으로 표기"),
    (r"Belief\s*Angel", "잘못된 브랜드 표기"),
    (r"폐수\s*\d+\s*%", "확정 데이터 없는 환경 수치"),
    (r"세탁\s*후\s*(교환|반품)\s*불가", "공감안심 동행제와 모순"),
]

# 사람이 문맥을 봐야 하는 것 — 경고만
WARN = [
    (r"100\s*%", "100% 표현 — 소재 표기(면 100%)인지 확인"),
    (r"OEKO[-\s]?TEX", "인증 주체 귀속 확인(원단 공급사 인증, fact-guard C)"),
    (r"(?<!중국 )OEM|(?<![가-힣])중국(?!\s*OEM)", "원산지는 '중국 OEM'으로"),
    (r"커머스", "브랜드 문구는 '유아동 패션'"),
    (r"\d+\s*년\s*(차|째|간|동안)", "기간 표현 — 근거 확인"),
    (r"연구에\s*따르면|논문|study|research shows", "연구 인용 — 제미나이 근거 URL 확인"),
    (r"ZDHC|유니세프|UNICEF", "근거 미확보 항목(fact-guard D)"),
    (r"제로다이(?!잉)", "라인 표기 혼용 확인"),
]


def scan(path):
    text = open(path, encoding="utf-8").read()
    found = {"block": [], "warn": []}
    for kind, rules in (("block", BLOCK), ("warn", WARN)):
        for pat, why in rules:
            for m in re.finditer(pat, text, flags=re.IGNORECASE):
                line_no = text.count("\n", 0, m.start()) + 1
                line = text.splitlines()[line_no - 1].strip()
                found[kind].append((line_no, m.group(0), why, line[:120]))
    return found


def main(paths):
    worst = 0
    for p in paths:
        r = scan(p)
        print(f"== {p}")
        for ln, hit, why, line in r["block"]:
            print(f"  ❌ L{ln} '{hit}' — {why}\n     {line}")
        for ln, hit, why, line in r["warn"]:
            print(f"  ⚠️ L{ln} '{hit}' — {why}\n     {line}")
        if r["block"]:
            worst = 1
        elif r["warn"] and worst == 0:
            worst = 2
        if not r["block"] and not r["warn"]:
            print("  ✅ 통과")
    return worst


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(64)
    sys.exit(main(sys.argv[1:]))
