# Gunakan base image Python yang ringan
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Tentukan working directory di dalam container
WORKDIR /app

# Install dependensi sistem yang mungkin diperlukan
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Salin file requirements.txt ke dalam container
COPY requirements.txt .

# Install dependensi Python
RUN pip install --no-cache-dir -r requirements.txt

# Salin kode aplikasi dan static assets ke dalam container
COPY app.py .
COPY static/ ./static/

# Salin database SQLite yang sudah terbentuk agar container langsung siap jalan
COPY master_produk.db .

# Expose port 8000 untuk FastAPI
EXPOSE 8000

# Jalankan server uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
