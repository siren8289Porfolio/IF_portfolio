"""ML baseline (rule_stat) unit checks — no pandas/numpy required."""
from __future__ import annotations

import unittest

from src.app.services.scoring_baseline import (
  BASELINE_KIND,
  BASELINE_VERSION,
  SCORING_ENGINE,
  band_from_score,
)


class ScoringBaselineTest(unittest.TestCase):
  def test_baseline_is_rule_stat_not_ml(self):
    self.assertEqual(BASELINE_KIND, "rule_stat")
    self.assertEqual(BASELINE_VERSION, "rule_stat_v1")
    self.assertEqual(SCORING_ENGINE, "authoritative_baseline")

  def test_band_boundaries(self):
    self.assertEqual(band_from_score(0), "낮음")
    self.assertEqual(band_from_score(39.9), "낮음")
    self.assertEqual(band_from_score(40), "보통")
    self.assertEqual(band_from_score(59.9), "보통")
    self.assertEqual(band_from_score(60), "높음")
    self.assertEqual(band_from_score(79.9), "높음")
    self.assertEqual(band_from_score(80), "매우 높음")
    self.assertEqual(band_from_score(100), "매우 높음")


if __name__ == "__main__":
  unittest.main()
