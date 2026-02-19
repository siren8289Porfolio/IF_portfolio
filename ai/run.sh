#!/bin/bash
# FastAPI 실행. 최초 1회: python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "가상환경 없음. 먼저 실행하세요:"
  echo "  python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi
. .venv/bin/activate
.venv/bin/python -m uvicorn src.app.main:app --host 0.0.0.0 --port 8000
