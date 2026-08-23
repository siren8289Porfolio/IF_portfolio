"""LLM 출력 검증: 금지어, 필수 문구, PII 마스킹, score 변조 필드 차단."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Set

FORBIDDEN_TERMS = [
    "허용", "불허", "적합", "부적합",
    "진단", "처방",
    "위법", "합법",
]

# LLM이 authoritative score를 바꾸려는 필드를 응답에 넣으면 거부
SCORE_MUTATION_FIELDS: Set[str] = {
    "risk_score",
    "riskScore",
    "risk_band",
    "riskBand",
    "risk_grade",
    "riskGrade",
    "total_risk_percent",
    "matching_score",
    "matchingScore",
    "new_score",
    "adjusted_score",
}

ALLOWED_EXPLAIN_KEYS: Set[str] = {
    "summary",
    "factor_explanations",
    "guidance",
    "disclaimer",
}

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


def reject_score_mutation_fields(payload: Dict[str, Any]) -> None:
    """AI-FR-03: score/grade/matching 변경 필드는 출력에서 거부."""
    found = [k for k in payload.keys() if k in SCORE_MUTATION_FIELDS]
    if found:
        raise ValueError(f"score mutation fields forbidden in llm payload: {found}")


def strip_unknown_explain_keys(payload: Dict[str, Any]) -> Dict[str, Any]:
    """스키마 외 필드는 폐기 (AI-FR-02)."""
    return {k: v for k, v in payload.items() if k in ALLOWED_EXPLAIN_KEYS}


def validate_explain_payload(payload: Dict[str, Any]) -> None:
    reject_score_mutation_fields(payload)

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
