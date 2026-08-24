"""FR-004: chronic_disease_flag 스키마·가산 규칙 (numpy 없이 검증)."""
from __future__ import annotations

import unittest
from typing import Optional

from src.app.schemas import ScoreRequest
from src.app.services.scoring_baseline import CHRONIC_DISEASE_DELTA


def chronic_health_delta(
  chronic_disease_flag: Optional[bool],
  health_flags_delta: float = 0.0,
) -> float:
  """scoring_service와 동일한 만성질환 가산 (단위 테스트용 순수 함수)."""
  extra = CHRONIC_DISEASE_DELTA if chronic_disease_flag is True else 0.0
  return health_flags_delta + extra


class ChronicDiseaseContractTest(unittest.TestCase):
  def test_schema_accepts_camel_case_alias(self):
    req = ScoreRequest.model_validate({
      "ageBand": "70-74",
      "region": "서울",
      "jobCategory": "경비",
      "workIntensity": "높음",
      "physicalLevel": 4,
      "chronicDiseaseFlag": True,
    })
    self.assertTrue(req.chronic_disease_flag)

  def test_schema_accepts_snake_case(self):
    req = ScoreRequest(
      age_band="65-69",
      region="기타",
      job_category="사무보조",
      work_intensity="중",
      chronic_disease_flag=True,
    )
    self.assertTrue(req.chronic_disease_flag)

  def test_chronic_delta_applied_only_when_true(self):
    self.assertEqual(chronic_health_delta(True), CHRONIC_DISEASE_DELTA)
    self.assertEqual(chronic_health_delta(False), 0.0)
    self.assertEqual(chronic_health_delta(None), 0.0)
    self.assertEqual(chronic_health_delta(True, health_flags_delta=5.0), 5.0 + CHRONIC_DISEASE_DELTA)


if __name__ == "__main__":
  unittest.main()
