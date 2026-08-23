"""Authoritative rule/stat scoring baseline (MVP). ML serving is not active."""
from __future__ import annotations

# MVP authoritative engine — do not replace with ML without approval gate (see ML.md).
BASELINE_KIND = "rule_stat"
BASELINE_VERSION = "rule_stat_v1"
# Gemini prompt versions live in llm_gemini_service.PROMPT_VERSION — keep separate.
SCORING_ENGINE = "authoritative_baseline"


def band_from_score(score: float) -> str:
  """구간: 낮음(0~39), 보통(40~59), 높음(60~79), 매우 높음(80~100)."""
  if score < 40:
    return "낮음"
  if score < 60:
    return "보통"
  if score < 80:
    return "높음"
  return "매우 높음"
