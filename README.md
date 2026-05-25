# Master Product Search Dashboard (SE DJBK 47 TAHUN 2026)

Aplikasi pencarian master data produk pekerjaan umum berbasis web (Single Page Application) yang modern, cepat, dan interaktif menggunakan FastAPI (Python) dan SQLite.

---

## Fitur Utama

1. **Pencarian Instan (Sub-Millisecond Search)**: Cari kata kunci pekerjaan (misal: "tanah", "bouwplank", "pagar") secara as-you-type di database terindeks berisi **6.190 item master**.
2. **Pencarian Massal (Bulk Clipboard Search)**: Tempelkan (Paste) daftar nama item/RAB dari clipboard Anda secara langsung. Sistem secara cerdas akan mendeteksi kode, mencari kecocokan deskripsi di database secara otomatis, dan menyajikan status kecocokan beserta opsi ekspor hasil pencariannya.
3. **Ekspor CSV**: Download hasil pencarian tunggal atau analisis massal langsung ke format Excel/CSV dengan sekali klik.
4. **Slide-Out Detail Panel**: Tinjau klasifikasi lengkap bidang, unit pengukuran, dan lingkup deskripsi teknis secara detail.

---

## Cara Menjalankan Aplikasi (Running Guide)

Ikuti langkah-langkah mudah berikut untuk menjalankan server secara lokal di komputer Anda:

### 1. Masuk ke Direktori Kerja
Buka terminal Anda dan masuk ke folder project ini:
```bash
cd /home/ams/Documents/master_produk
```

### 2. Aktifkan Python Virtual Environment (venv)
Aktifkan lingkungan virtual Python yang sudah dibuat:
```bash
source ./venv/bin/activate
```
*(Setelah aktif, Anda akan melihat tanda `(venv)` di sebelah kiri prompt terminal Anda)*

### 3. Jalankan Server Web
Jalankan server FastAPI menggunakan `uvicorn` dengan perintah berikut:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Buka Aplikasi di Browser
Buka browser favorit Anda (Chrome, Edge, Firefox, dll) lalu ketikkan alamat berikut di address bar:

👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## Fitur Tambahan (Opsional)

### A. Ekstraksi Ulang Data PDF
Jika di kemudian hari file-file PDF master data Anda diperbarui atau diganti, Anda dapat mengekstrak ulang datanya dengan menjalankan:
1. Pastikan Virtual Environment aktif (`source ./venv/bin/activate`).
2. Jalankan perintah:
   ```bash
   python extract_data.py
   ```
   Script akan memproses semua PDF secara otomatis dan memperbarui database `master_produk.db`.

### B. Menonaktifkan Virtual Environment
Jika Anda sudah selesai menggunakan aplikasi dan ingin menonaktifkan lingkungan virtual di terminal Anda, cukup ketik:
```bash
deactivate
```
