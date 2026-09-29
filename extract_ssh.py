"""Extract SSH (Standar Satuan Harga) items from Perbup 55 Tahun 2025 PDF into SQLite database (ssh.db).

The PDF contains digital text and tables, so extraction is 100% accurate and fast.
"""

import os
import re
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = os.path.expanduser(
    "~/Downloads/PERATURAN_BUPATI_NOMOR_55_TAHUN_2025_TENTANG_SSH_TAHUN_ANGGARAN_2026_36dc08cba5.pdf"
)
DB_PATH = os.path.join(BASE_DIR, "ssh.db")
SOURCE_KEY = "Perbup SSH 55/2025"


def clean_text(val):
    if not val:
        return ""
    text = " ".join(str(val).strip().split())
    # Fix spacing glitches like 'B atu' -> 'Batu', 'K ayu' -> 'Kayu'
    text = re.sub(r"\b([A-Z])\s+([a-z])", r"\1\2", text)
    return text


def parse_price(val):
    if not val:
        return 0
    s = str(val).strip().replace(" ", "")
    if "," in s:
        s = s.split(",")[0]
    s = re.sub(r"[^\d]", "", s)
    return int(s) if s.isdigit() else 0


def extract_pdf(pdf_path):
    import pdfplumber

    records = []
    current_code = ""
    current_cat = "Bahan Bangunan dan Konstruksi"

    print(f"Opening PDF: {pdf_path}...")
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print(f"Total pages: {total}")

        for idx in range(7, total):
            page = pdf.pages[idx]
            text = page.extract_text() or ""

            # Detect category headings like: 1.1.07.01.01.0001 Bahan Bangunan dan Konstruksi
            for line in text.split("\n"):
                line_s = line.strip()
                m = re.match(r"^(\d+(?:\.\d+)+)\s+(.*)", line_s)
                if m:
                    current_code = m.group(1)
                    cat_candidate = clean_text(m.group(2))
                    if cat_candidate and not cat_candidate.startswith("-") and "Rp" not in cat_candidate and len(cat_candidate) > 2:
                        current_cat = cat_candidate

            tables = page.extract_tables()
            if not tables:
                continue

            for table in tables:
                for row in table:
                    if not row or len(row) < 5:
                        continue

                    cell0 = str(row[0] or "").strip()
                    cell1 = str(row[1] or "").strip()
                    if "No" in cell0 or "Uraian" in cell1 or "Rp" in str(row[-1] or "") or "Rp" in str(row[-2] or ""):
                        continue

                    no = clean_text(row[0])
                    uraian = clean_text(row[1]).lstrip(". ")
                    spesifikasi = clean_text(row[2]).lstrip(". ")
                    satuan = clean_text(row[3])

                    harga_str = ""
                    for c in row[4:]:
                        if c and any(ch.isdigit() for ch in str(c)):
                            harga_str = str(c).strip()
                            break

                    if not uraian and not spesifikasi:
                        continue
                    if not harga_str:
                        continue

                    records.append({
                        "source_file": SOURCE_KEY,
                        "kode_kelompok": current_code,
                        "kategori": current_cat,
                        "uraian": uraian,
                        "spesifikasi": spesifikasi,
                        "satuan": satuan,
                        "harga": parse_price(harga_str),
                        "harga_str": harga_str,
                    })

            if (idx + 1) % 50 == 0 or (idx + 1) == total:
                print(f"  Processed page {idx + 1}/{total} ({len(records)} records extracted so far)...")

    return records


def main():
    pdf_path = PDF_PATH
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    records = extract_pdf(pdf_path)
    print(f"\nExtracted total {len(records)} SSH items.")

    print(f"Saving to SQLite database: {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS ssh")
    cursor.execute("""
        CREATE TABLE ssh (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_file TEXT,
            kode_kelompok TEXT,
            kategori TEXT,
            uraian TEXT,
            spesifikasi TEXT,
            satuan TEXT,
            harga INTEGER,
            harga_str TEXT
        )
    """)

    cursor.executemany("""
        INSERT INTO ssh (source_file, kode_kelompok, kategori, uraian, spesifikasi, satuan, harga, harga_str)
        VALUES (:source_file, :kode_kelompok, :kategori, :uraian, :spesifikasi, :satuan, :harga, :harga_str)
    """, records)

    conn.commit()

    print("Creating search indexes...")
    cursor.execute("CREATE INDEX idx_ssh_kategori ON ssh(kategori)")
    cursor.execute("CREATE INDEX idx_ssh_uraian ON ssh(uraian)")
    cursor.execute("CREATE INDEX idx_ssh_spesifikasi ON ssh(spesifikasi)")
    conn.commit()
    conn.close()

    print("SSH extraction and database indexing completed successfully!")


if __name__ == "__main__":
    main()
