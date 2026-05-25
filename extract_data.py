import os
import sqlite3
import json
import pdfplumber

def clean_text(val):
    if val is None:
        return ""
    # Strip whitespace and normalize spaces/newlines
    cleaned = str(val).strip()
    # Replace multiple spaces/newlines with a single space
    cleaned = " ".join(cleaned.split())
    return cleaned

def is_header_row(row):
    # If the row is empty or too short, it's not a valid data row
    if not row or len(row) < 5:
        return True
    
    # Check if the first cell contains "kategori tingkat" (characteristic of header row 1)
    first_cell = str(row[0] or "").lower()
    if "kategori tingkat" in first_cell:
        return True
        
    # Check if it's the title block row (e.g., Row 0 of the table)
    # These usually have only 1 non-empty cell (e.g., ['MASTER PRODUK BIDANG...', None, None...])
    non_empty = [c for c in row if c is not None and str(c).strip()]
    if len(non_empty) < 3:
        return True
        
    return False

def parse_pdf(file_path, source_key):
    import gc
    print(f"Parsing {file_path}...")
    records = []
    
    # First, get the total number of pages
    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        
    for page_idx in range(total_pages):
        with pdfplumber.open(file_path) as pdf:
            page = pdf.pages[page_idx]
            tables = page.extract_tables()
            if tables:
                for table in tables:
                    for row in table:
                        # Skip empty rows
                        if not row or all(cell is None for cell in row):
                            continue
                        
                        # Skip headers
                        if is_header_row(row):
                            continue
                        
                        # Map to the unified schema
                        # Schema: source_file, kategori_1, kategori_2, kategori_3, level_4, satuan, kode, lingkup
                        kategori_1 = clean_text(row[0]) if len(row) > 0 else ""
                        kategori_2 = clean_text(row[1]) if len(row) > 1 else ""
                        kategori_3 = clean_text(row[2]) if len(row) > 2 else ""
                        level_4 = clean_text(row[3]) if len(row) > 3 else ""
                        satuan = clean_text(row[4]) if len(row) > 4 else ""
                        kode = clean_text(row[5]) if len(row) > 5 else ""
                        
                        # 7th column for scope of work if exists
                        lingkup = clean_text(row[6]) if len(row) > 6 else ""
                        
                        # Safety check: if code and description are both empty, it's not a valid data row
                        if not level_4 and not kode:
                            continue
                            
                        records.append({
                            "source_file": source_key,
                            "kategori_1": kategori_1,
                            "kategori_2": kategori_2,
                            "kategori_3": kategori_3,
                            "level_4": level_4,
                            "satuan": satuan,
                            "kode": kode,
                            "lingkup": lingkup
                        })
            page.flush_cache()
            
        # Collect garbage periodically or every page
        gc.collect()
        
        if (page_idx + 1) % 20 == 0 or (page_idx + 1) == total_pages:
            print(f"  Processed page {page_idx + 1}/{total_pages}...")
                
    print(f"Extracted {len(records)} records from {os.path.basename(file_path)}")
    return records

def main():
    pdf_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_files = {
        "MASTER PRODUCT SE 47 2026 - BM 2025.pdf": "Bina Marga (BM)",
        "MASTER PRODUCT SE 47 2026 - CK.pdf": "Cipta Karya (CK)",
        "MASTER PRODUCT SE 47 2026 - SDA.pdf": "Sumber Daya Air (SDA)",
        "MASTER PRODUCT SE 47 2026 - SMKK.pdf": "SMKK",
        "MASTER PRODUCT SE 47 2026 - UMUM.pdf": "Umum"
    }
    
    all_records = []
    
    for filename, source_key in pdf_files.items():
        file_path = os.path.join(pdf_dir, filename)
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            continue
        try:
            records = parse_pdf(file_path, source_key)
            all_records.extend(records)
        except Exception as e:
            print(f"Error parsing {filename}: {e}")
            
    print(f"\nTotal records extracted: {len(all_records)}")
    
    # Save to SQLite database
    db_path = os.path.join(pdf_dir, "master_produk.db")
    print(f"Saving records to SQLite database: {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Drop existing table if any
    cursor.execute("DROP TABLE IF EXISTS products")
    
    # Create table
    cursor.execute("""
    CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file TEXT,
        kategori_1 TEXT,
        kategori_2 TEXT,
        kategori_3 TEXT,
        level_4 TEXT,
        satuan TEXT,
        kode TEXT,
        lingkup TEXT
    )
    """)
    
    # Insert data
    cursor.executemany("""
    INSERT INTO products (source_file, kategori_1, kategori_2, kategori_3, level_4, satuan, kode, lingkup)
    VALUES (:source_file, :kategori_1, :kategori_2, :kategori_3, :level_4, :satuan, :kode, :lingkup)
    """, all_records)
    
    conn.commit()
    
    # Create indexes for super-fast searches
    print("Creating search indexes...")
    cursor.execute("CREATE INDEX idx_products_source ON products(source_file)")
    cursor.execute("CREATE INDEX idx_products_kode ON products(kode)")
    conn.commit()
    conn.close()
    
    # Save to JSON file as a cache
    json_path = os.path.join(pdf_dir, "master_produk.json")
    print(f"Saving cache to JSON file: {json_path}...")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=2, ensure_ascii=False)
        
    print("Data extraction completed successfully!")

if __name__ == "__main__":
    main()
