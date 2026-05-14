FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    build-essential

WORKDIR /app

# ---------- FRONTEND ----------
COPY frontend/package*.json ./frontend/

WORKDIR /app/frontend

RUN npm install

COPY frontend .

RUN npm run build

# ---------- BACKEND ----------
WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY sample_logs ./sample_logs

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]