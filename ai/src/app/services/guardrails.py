"""LLM 출력 검증: 금지어, 필수 문구, PII 마스킹."""
from __future__ import annotations

import re
from typing import Any, Dict, List

FORBIDDEN_TERMS = [
    "허용", "불허", "적합", "부적합",
    "진단", "처방",
    "위법", "합법",
]

PII_PATTERNS = [
    r"\d{6}-\d{7}",
    r"\b01[0-9]-?\d{3,4}-?\d{4}\b",
    r"\b\d{2,3}-\d{3,4}-\d{4}\b",
    r"[0-9]{5}",
    r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
]


def mask_pii(text: str) -> str:
    out = text
    for pat in PII_PATTERNS:
        out = re.sub(pat, "[MASKED]", out)
    return out


def contains_forbidden_terms(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in FORBIDDEN_TERMS)


def validate_explain_payload(payload: Dict[str, Any]) -> None:
    required = ["summary", "factor_explanations", "guidance", "disclaimer"]
    for key in required:
        if key not in payload:
            raise ValueError(f"missing key in llm payload: {key}")
    if not isinstance(payload["factor_explanations"], list):
        raise ValueError("factor_explanations must be a list")

    texts: List[str] = [
        str(payload.get("summary", "")),
        str(payload.get("guidance", "")),
        str(payload.get("disclaimer", "")),
    ]
    for fe in payload["factor_explanations"]:
        if not isinstance(fe, dict):
            raise ValueError("factor_explanations item must be an object")
        texts.append(str(fe.get("text", "")))
    if contains_forbidden_terms("\n".join(texts)):
        raise ValueError("forbidden terms detected in llm output")

    disclaimer = str(payload.get("disclaimer", ""))
    if "판단 보조 자료" not in disclaimer or "담당자에게" not in disclaimer:
        raise ValueError("disclaimer missing required phrase")
