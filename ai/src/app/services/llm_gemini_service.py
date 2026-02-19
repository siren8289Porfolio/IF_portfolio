"""Gemini로 위험도 설명/리포트 문구만 생성. 점수·결정은 하지 않음."""
from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict

from ..schemas import ExplainRequest, ExplainResponse, FactorExplanation
from .guardrails import mask_pii, validate_explain_payload

logger = logging.getLogger(__name__)

# GEMINI_MODEL 미설정 시 기본값 (gemini-1.5-flash가 안정적)
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY not set; explain will use fallback.")
            return None
        try:
            from google import genai
            _client = genai.Client(api_key=api_key)
        except Exception as e:
            logger.warning("Gemini client init failed: %s", e)
            return None
    return _client


SYSTEM_INSTRUCTION = [
    "당신은 고령자 일자리 위험도 분석 시스템의 설명 전용 도우미입니다.",
    "당신은 새로운 위험도 점수를 계산하거나 기존 점수를 변경해서는 안 됩니다.",
    "위험도 점수(risk_score)와 구간(risk_band), 주요 요인(top_factors)만을 해석해야 합니다.",
    "새로운 의학적/법률적 판단(진단, 처방, 위법/합법 등)을 해서는 안 됩니다.",
    "허용/불허/적합/부적합 등 최종 결정을 암시하는 표현을 사용해서는 안 됩니다.",
    "출력은 반드시 JSON 형식으로만 응답해야 하며, 추가 설명 문장은 절대 포함하지 마십시오.",
    "JSON 최상위 키는 summary, factor_explanations, guidance, disclaimer 네 개만 사용하십시오.",
]


def _build_user_prompt(req: ExplainRequest) -> str:
    lines = []
    for f in req.top_factors:
        lines.append(f"- name: {f.name}, value: {f.value:.3f}, weight: {f.weight:.3f}, description: {f.description or ''}")
    safe_summary = mask_pii(req.case_summary)
    return f"""
다음 입력 정보를 기반으로 JSON 설명을 생성해 주세요.

[입력 데이터]
- 위험도 점수(risk_score): {req.risk_score:.1f}
- 위험도 구간(risk_band): {req.risk_band}
- 주요 기여 요인(Top N):
{os.linesep.join(lines) or "- (요인 없음)"}
- 케이스 요약(비식별): {safe_summary}

[출력 요구사항]
- 반드시 아래 JSON 스키마를 따르십시오. JSON 외의 다른 텍스트는 포함하지 마십시오.

{{
  "summary": "string, 총 위험도에 대한 1개 단락 요약",
  "factor_explanations": [{{ "name": "string", "text": "string, 해당 요인 1~2문장 설명" }}],
  "guidance": "string, 위험도 구간에 따른 해석 가이드",
  "disclaimer": "string, 반드시 다음 문장을 그대로 포함: '본 결과는 판단 보조 자료일 뿐이며, 최종 판단과 책임은 담당자에게 있습니다.'"
}}
""".strip()


def _extract_json(raw: str) -> Dict[str, Any]:
    """응답에서 JSON 블록만 추출 (마크다운 ```json ... ``` 허용)."""
    raw = (raw or "").strip()
    # ```json ... ``` 또는 ``` ... ``` 제거
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        raw = m.group(1).strip()
    return json.loads(raw)


def generate_explanation(req: ExplainRequest) -> ExplainResponse:
    client = _get_client()
    if not client:
        logger.info("explain: no Gemini client, returning fallback")
        return _fallback_response(req)

    prompt = _build_user_prompt(req)
    try:
        from google.genai.types import GenerateContentConfig
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2,
                max_output_tokens=512,
            ),
        )
        raw = (resp.text or "").strip()
        if not raw:
            logger.warning("explain: Gemini returned empty text")
            return _fallback_response(req)
        data = _extract_json(raw)
        validate_explain_payload(data)
        factor_explanations = [
            FactorExplanation(name=fe.get("name", ""), text=fe.get("text", ""))
            for fe in data.get("factor_explanations", [])
        ]
        return ExplainResponse(
            summary=mask_pii(str(data.get("summary", ""))),
            factor_explanations=factor_explanations,
            guidance=mask_pii(str(data.get("guidance", ""))),
            disclaimer=mask_pii(str(data.get("disclaimer", ""))),
        )
    except json.JSONDecodeError as e:
        logger.warning("explain: JSON parse error: %s", e)
        return _fallback_response(req)
    except ValueError as e:
        logger.warning("explain: validation error: %s", e)
        return _fallback_response(req)
    except Exception as e:
        logger.warning("explain: Gemini API error: %s", e)
        return _fallback_response(req)


def _fallback_response(req: ExplainRequest) -> ExplainResponse:
    return ExplainResponse(
        summary=f"위험도 점수 {req.risk_score:.1f}% ({req.risk_band})에 대한 자동 설명 생성에 실패했습니다.",
        factor_explanations=[],
        guidance="시스템 또는 모델 규정 위반으로 상세 해석을 제공하지 못했습니다. 점수와 주요 요인을 직접 검토해 주세요.",
        disclaimer="본 결과는 판단 보조 자료일 뿐이며, 최종 판단과 책임은 담당자에게 있습니다.",
    )
