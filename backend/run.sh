#!/bin/bash
pip install -r requirements.txt
uvicorn backend.backend.app:app --reload --host 0.0.0.0 --port 8000