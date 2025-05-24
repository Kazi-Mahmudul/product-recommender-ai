web: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4 --timeout-keep-alive 60
release: python -m alembic upgrade head