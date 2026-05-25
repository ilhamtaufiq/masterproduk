import os
import sqlite3
import csv
import io
import re
from fastapi import FastAPI, Query, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from typing import Optional, List
from pydantic import BaseModel

app = FastAPI(
    title="Master Product Search API",
    description="API for high-performance searching and filtering of Master Product SE 47 2026 data",
    version="1.0.0"
)

DB_PATH = "/home/ams/Documents/master_produk/master_produk.db"

# Ensure the database exists
def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(
            status_code=500,
            detail="Database file not found. Please run the extract_data.py script first."
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/sources")
def get_sources():
    """Retrieve all unique data sources (PDFs) available in the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT source_file FROM products ORDER BY source_file")
        sources = [row["source_file"] for row in cursor.fetchall()]
        conn.close()
        return {"sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/categories")
def get_categories(source: Optional[str] = None):
    """Retrieve all unique Kategori Tingkat 1, optionally filtered by source."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        if source:
            cursor.execute(
                "SELECT DISTINCT kategori_1 FROM products WHERE source_file = ? ORDER BY kategori_1",
                (source,)
            )
        else:
            cursor.execute("SELECT DISTINCT kategori_1 FROM products ORDER BY kategori_1")
        categories = [row["kategori_1"] for row in cursor.fetchall() if row["kategori_1"]]
        conn.close()
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def build_search_query(
    q: Optional[str] = None,
    source: Optional[str] = None,
    category: Optional[str] = None
):
    """Constructs the SQL query and parameters for search and export."""
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    
    if source:
        query += " AND source_file = ?"
        params.append(source)
        
    if category:
        query += " AND kategori_1 = ?"
        params.append(category)
        
    if q:
        terms = q.strip().split()
        for term in terms:
            term_pattern = f"%{term}%"
            query += """ AND (
                kode LIKE ? OR 
                level_4 LIKE ? OR 
                kategori_1 LIKE ? OR 
                kategori_2 LIKE ? OR 
                kategori_3 LIKE ? OR 
                lingkup LIKE ?
            )"""
            params.extend([term_pattern] * 6)
            
    return query, params

@app.get("/api/search")
def search_products(
    q: Optional[str] = Query(None, description="Search terms"),
    source: Optional[str] = Query(None, description="Filter by source file"),
    category: Optional[str] = Query(None, description="Filter by Kategori Tingkat 1"),
    limit: int = Query(100, ge=1, le=1000, description="Max results returned"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    """Search products using keyword terms and category filters."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query
        base_query, params = build_search_query(q, source, category)
        
        # Get total count first
        count_query = f"SELECT COUNT(*) as total FROM ({base_query})"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()["total"]
        
        # Execute search query with limit and offset
        search_query = f"{base_query} ORDER BY source_file, kode LIMIT ? OFFSET ?"
        cursor.execute(search_query, params + [limit, offset])
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "source_file": r["source_file"],
                "kategori_1": r["kategori_1"],
                "kategori_2": r["kategori_2"],
                "kategori_3": r["kategori_3"],
                "level_4": r["level_4"],
                "satuan": r["satuan"],
                "kode": r["kode"],
                "lingkup": r["lingkup"]
            })
            
        conn.close()
        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/export")
def export_products(
    q: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None)
):
    """Export search results to a CSV file."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        base_query, params = build_search_query(q, source, category)
        export_query = f"{base_query} ORDER BY source_file, kode"
        cursor.execute(export_query, params)
        rows = cursor.fetchall()
        
        # Generate CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header row
        writer.writerow([
            "No", "Sumber File", "Kategori Tingkat 1", "Kategori Tingkat 2", 
            "Kategori Tingkat 3", "Level 4 (Item Pekerjaan)", "Satuan", "Kode Produk", "Lingkup Kegiatan"
        ])
        
        for idx, r in enumerate(rows):
            writer.writerow([
                idx + 1,
                r["source_file"],
                r["kategori_1"],
                r["kategori_2"],
                r["kategori_3"],
                r["level_4"],
                r["satuan"],
                r["kode"],
                r["lingkup"]
            ])
            
        conn.close()
        
        # Return CSV response
        output.seek(0)
        response = StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = "attachment; filename=master_produk_export.csv"
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class BulkSearchRequest(BaseModel):
    text: str

@app.post("/api/bulk_search")
def bulk_search(request: BulkSearchRequest):
    """Parses a pasted block of text line by line and matches each item in the database."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        lines = request.text.split("\n")
        results = []
        
        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                continue
                
            # Parse line into description and code candidates
            parts = re.split(r'\t+| {2,}', line)
            parts = [p.strip() for p in parts if p.strip()]
            
            if not parts:
                continue
                
            extracted_code = ""
            description = parts[0]
            
            if len(parts) > 1:
                last_part = parts[-1]
                # If last part contains alphanumeric and has dots or starts with 'komp'
                if re.search(r'[A-Za-z0-9]', last_part) and ('.' in last_part or '(' in last_part or last_part.lower().startswith('komp')):
                    extracted_code = last_part
                    description = " ".join(parts[:-1]).strip()
            
            # Match finding
            match = None
            found_by = None
            
            # 1. Search by extracted code
            if extracted_code:
                cursor.execute(
                    "SELECT * FROM products WHERE kode = ? OR kode LIKE ? LIMIT 1",
                    (extracted_code, f"%{extracted_code}%")
                )
                row = cursor.fetchone()
                if row:
                    match = row
                    found_by = "code"
                    
            # 2. Search by description if no exact code match
            if not match and description:
                # Split description into word list (filtering out short/meaningless words)
                words = [w for w in re.split(r'\W+', description) if len(w) > 2]
                if words:
                    where_clauses = ["level_4 LIKE ?"] * len(words)
                    query = f"SELECT * FROM products WHERE {' AND '.join(where_clauses)} LIMIT 1"
                    params = [f"%{w}%" for w in words]
                    cursor.execute(query, params)
                    row = cursor.fetchone()
                    if row:
                        match = row
                        found_by = "description"
            
            match_dict = None
            if match:
                match_dict = {
                    "id": match["id"],
                    "source_file": match["source_file"],
                    "kategori_1": match["kategori_1"],
                    "kategori_2": match["kategori_2"],
                    "kategori_3": match["kategori_3"],
                    "level_4": match["level_4"],
                    "satuan": match["satuan"],
                    "kode": match["kode"],
                    "lingkup": match["lingkup"]
                }
                
            results.append({
                "no": len(results) + 1,
                "raw_line": raw_line,
                "parsed_desc": description,
                "parsed_code": extracted_code,
                "match": match_dict,
                "found_by": found_by
            })
            
        conn.close()
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Serve Frontend SPA
@app.get("/")
def read_root():
    return FileResponse("/home/ams/Documents/master_produk/static/index.html")

# Serve the static files directory
app.mount("/static", StaticFiles(directory="/home/ams/Documents/master_produk/static"), name="static")
