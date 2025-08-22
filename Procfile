web: gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8080 --timeout-keep-alive 60
release: python -m alembic upgrade head