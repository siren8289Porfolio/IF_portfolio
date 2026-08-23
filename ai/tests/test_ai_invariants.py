"""AI GenAI invariants: score 불변, guardrails, fallback."""
from __future__ import annotations

import os
import unittest
from unittest import mock

from src.app.schemas import ExplainRequest, ScoreFactor
from src.app.services import guardrails, llm_gemini_service


class GuardrailsTest(unittest.TestCase):
  def test_rejects_score_mutation_fields(self):
    with self.assertRaises(ValueError):
      guardrails.validate_explain_payload({
        "summary": "ok",
        "factor_explanations": [],
        "guidance": "ok",
        "disclaimer": "본 결과는 판단 보조 자료일 뿐이며, 최종 판단과 책임은 담당자에게 있습니다.",
        "risk_score": 99.0,
      })

  def test_strips_unknown_keys(self):
    cleaned = guardrails.strip_unknown_explain_keys({
      "summary": "a",
      "guidance": "b",
      "disclaimer": "c",
      "factor_explanations": [],
      "extra": "drop-me",
    })
    self.assertNotIn("extra", cleaned)
    self.assertIn("summary", cleaned)

  def test_masks_pii(self):
    self.assertIn("[MASKED]", guardrails.mask_pii("연락처 010-1234-5678"))

  def test_forbidden_decision_terms(self):
    with self.assertRaises(ValueError):
      guardrails.validate_explain_payload({
        "summary": "이 지원자는 허용입니다",
        "factor_explanations": [],
        "guidance": "ok",
        "disclaimer": "본 결과는 판단 보조 자료일 뿐이며, 최종 판단과 책임은 담당자에게 있습니다.",
      })


class ScoreInvariantTest(unittest.TestCase):
  """Critical invariant: explain은 authoritative score/band를 변경하지 않는다."""

  def test_explain_fallback_preserves_input_score(self):
    score = 72.5
    band = "높음"
    explain_req = ExplainRequest(
      risk_score=score,
      risk_band=band,
      top_factors=[
        ScoreFactor(name="region", value=0.5, weight=0.4, description="지역"),
      ],
      case_summary="비식별 요약",
      result_id="test-1",
    )
    with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False):
      llm_gemini_service._client = None
      explanation = llm_gemini_service.generate_explanation(explain_req)

    # 요청 스냅샷 불변
    self.assertEqual(explain_req.risk_score, score)
    self.assertEqual(explain_req.risk_band, band)
    # 응답에 새 점수 필드 없음 (스키마)
    self.assertFalse(hasattr(explanation, "risk_score") and explanation.model_dump().get("risk_score"))
    payload = explanation.model_dump()
    self.assertNotIn("risk_score", payload)
    self.assertNotIn("risk_band", payload)
    self.assertTrue(explanation.fallback)
    self.assertEqual(explanation.prompt_version, llm_gemini_service.PROMPT_VERSION)
    self.assertIn(f"{score:.1f}", explanation.summary)
    self.assertIn(band, explanation.summary)


class PromptContractTest(unittest.TestCase):
  def test_system_instruction_forbids_score_change(self):
    joined = "\n".join(llm_gemini_service.SYSTEM_INSTRUCTION)
    self.assertIn("변경", joined)
    self.assertIn("허용/불허", joined)
    self.assertEqual(llm_gemini_service.PROMPT_VERSION, "prompt_v1")


if __name__ == "__main__":
  unittest.main()
