FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt is at project root (build context = project root)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY codepop_backend/ .

COPY codepop_backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /data

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
