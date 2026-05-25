// State Management
const state = {
    searchQuery: '',
    sourceFilter: '',
    categoryFilter: '',
    limit: 50,
    offset: 0,
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    products: [],
    bulkResults: []
};

// DOM Elements
const DOM = {
    globalSearchInput: document.getElementById('globalSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    sourceFilter: document.getElementById('sourceFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    productsTableBody: document.getElementById('productsTableBody'),
    emptyState: document.getElementById('emptyState'),
    displayedCount: document.getElementById('displayedCount'),
    totalCount: document.getElementById('totalCount'),
    limitSelect: document.getElementById('limitSelect'),
    currentPage: document.getElementById('currentPage'),
    totalPages: document.getElementById('totalPages'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageNumbersContainer: document.getElementById('pageNumbersContainer'),
    detailDrawer: document.getElementById('detailDrawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    drawerBody: document.getElementById('drawerBody'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    toastNotification: document.getElementById('toastNotification'),
    toastMessage: document.getElementById('toastMessage'),
    
    // Bulk Search elements
    bulkSearchModalBtn: document.getElementById('bulkSearchModalBtn'),
    bulkSearchModal: document.getElementById('bulkSearchModal'),
    closeBulkModalBtn: document.getElementById('closeBulkModalBtn'),
    bulkModalOverlay: document.getElementById('bulkModalOverlay'),
    bulkPasteTextarea: document.getElementById('bulkPasteTextarea'),
    processBulkBtn: document.getElementById('processBulkBtn'),
    clearBulkTextBtn: document.getElementById('clearBulkTextBtn'),
    bulkResultSection: document.getElementById('bulkResultSection'),
    bulkResultsTableBody: document.getElementById('bulkResultsTableBody'),
    exportBulkCsvBtn: document.getElementById('exportBulkCsvBtn')
};

// Debounce Timer for Search Input
let debounceTimer;

// Init Function
async function init() {
    setupEventListeners();
    initTheme();
    await fetchSources();
    await fetchCategories();
    await fetchProducts();
}

// Set up Event Listeners
function setupEventListeners() {
    // Search input with debouncing
    DOM.globalSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.offset = 0;
        state.currentPage = 1;
        
        // Show/hide clear button
        DOM.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchProducts, 300);
    });

    // Clear search button
    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.globalSearchInput.value = '';
        state.searchQuery = '';
        state.offset = 0;
        state.currentPage = 1;
        DOM.clearSearchBtn.style.display = 'none';
        fetchProducts();
    });

    // Source Filter Change
    DOM.sourceFilter.addEventListener('change', async (e) => {
        state.sourceFilter = e.target.value;
        state.categoryFilter = ''; // Reset category filter
        state.offset = 0;
        state.currentPage = 1;
        
        // Re-fetch categories to filter by source
        await fetchCategories();
        await fetchProducts();
    });

    // Category Filter Change
    DOM.categoryFilter.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        state.offset = 0;
        state.currentPage = 1;
        fetchProducts();
    });

    // Rows limit select change
    DOM.limitSelect.addEventListener('change', (e) => {
        state.limit = parseInt(e.target.value);
        state.offset = 0;
        state.currentPage = 1;
        fetchProducts();
    });

    // Pagination buttons
    DOM.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            state.offset = (state.currentPage - 1) * state.limit;
            fetchProducts();
        }
    });

    DOM.nextPageBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            state.offset = (state.currentPage - 1) * state.limit;
            fetchProducts();
        }
    });

    // Reset Filters
    DOM.resetFiltersBtn.addEventListener('click', () => {
        DOM.globalSearchInput.value = '';
        DOM.clearSearchBtn.style.display = 'none';
        DOM.sourceFilter.value = '';
        DOM.categoryFilter.value = '';
        state.searchQuery = '';
        state.sourceFilter = '';
        state.categoryFilter = '';
        state.offset = 0;
        state.currentPage = 1;
        fetchCategories();
        fetchProducts();
    });

    // Export CSV
    DOM.exportCsvBtn.addEventListener('click', () => {
        const queryParams = new URLSearchParams();
        if (state.searchQuery) queryParams.append('q', state.searchQuery);
        if (state.sourceFilter) queryParams.append('source', state.sourceFilter);
        if (state.categoryFilter) queryParams.append('category', state.categoryFilter);
        
        window.location.href = `/api/export?${queryParams.toString()}`;
    });

    // Drawer closing
    DOM.closeDrawerBtn.addEventListener('click', closeDrawer);
    DOM.drawerOverlay.addEventListener('click', closeDrawer);
    
    // Theme toggle button
    DOM.themeToggleBtn.addEventListener('click', toggleTheme);

    // Bulk Search Show Modal
    DOM.bulkSearchModalBtn.addEventListener('click', () => {
        DOM.bulkSearchModal.classList.add('active');
        DOM.bulkPasteTextarea.focus();
    });

    // Bulk Search Close Modal
    DOM.closeBulkModalBtn.addEventListener('click', closeBulkModal);
    DOM.bulkModalOverlay.addEventListener('click', closeBulkModal);

    // Clear Bulk search input
    DOM.clearBulkTextBtn.addEventListener('click', () => {
        DOM.bulkPasteTextarea.value = '';
        DOM.bulkResultSection.style.display = 'none';
        state.bulkResults = [];
    });

    // Process Bulk Search
    DOM.processBulkBtn.addEventListener('click', processBulkSearch);

    // Export Bulk CSV
    DOM.exportBulkCsvBtn.addEventListener('click', exportBulkResultsCsv);
}

// Init theme from localStorage
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

// Toggle light/dark theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = DOM.themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// Fetch and populate list of sources (PDFs)
async function fetchSources() {
    try {
        const res = await fetch('/api/sources');
        const data = await res.json();
        
        // Populate select
        DOM.sourceFilter.innerHTML = '<option value="">Semua Bidang</option>';
        data.sources.forEach(src => {
            const opt = document.createElement('option');
            opt.value = src;
            opt.textContent = src;
            DOM.sourceFilter.appendChild(opt);
        });
    } catch (err) {
        console.error('Error fetching sources:', err);
    }
}

// Fetch and populate list of categories
async function fetchCategories() {
    try {
        const url = state.sourceFilter 
            ? `/api/categories?source=${encodeURIComponent(state.sourceFilter)}`
            : '/api/categories';
            
        const res = await fetch(url);
        const data = await res.json();
        
        // Keep selection if it still exists
        const oldVal = state.categoryFilter;
        
        DOM.categoryFilter.innerHTML = '<option value="">Semua Kategori Utama</option>';
        data.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            DOM.categoryFilter.appendChild(opt);
        });
        
        if (data.categories.includes(oldVal)) {
            DOM.categoryFilter.value = oldVal;
            state.categoryFilter = oldVal;
        } else {
            state.categoryFilter = '';
        }
    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

// Fetch products based on state
async function fetchProducts() {
    // Show loading spinner in table body
    DOM.productsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-state">
                <div class="spinner"></div>
                <p>Mencari data master...</p>
            </td>
        </tr>
    `;
    DOM.emptyState.style.display = 'none';

    try {
        const queryParams = new URLSearchParams({
            limit: state.limit,
            offset: state.offset
        });
        
        if (state.searchQuery) queryParams.append('q', state.searchQuery);
        if (state.sourceFilter) queryParams.append('source', state.sourceFilter);
        if (state.categoryFilter) queryParams.append('category', state.categoryFilter);

        const res = await fetch(`/api/search?${queryParams.toString()}`);
        if (!res.ok) throw new Error('API query returned an error status');
        
        const data = await res.json();
        
        state.products = data.results;
        state.totalCount = data.total;
        state.totalPages = Math.ceil(data.total / state.limit) || 1;
        
        renderProducts();
        renderPagination();
    } catch (err) {
        console.error('Error fetching products:', err);
        DOM.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: var(--danger-color); margin-bottom: 0.5rem;"></i>
                    <p style="color: var(--danger-color);">Gagal memuat data dari server. Pastikan server API berjalan.</p>
                </td>
            </tr>
        `;
    }
}

// Dynamic highlighting function
function highlight(text, query) {
    if (!query) return text;
    const terms = query.strip ? query.strip().split(/\s+/) : query.trim().split(/\s+/);
    let highlightedText = text;
    
    // Sort terms by length descending to avoid nested highlights issues
    const uniqueTerms = [...new Set(terms)].filter(t => t.length > 0).sort((a, b) => b.length - a.length);
    
    uniqueTerms.forEach(term => {
        const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
}

// Get appropriate badge class based on Source File
function getSourceBadgeClass(source) {
    const s = source.toLowerCase();
    if (s.includes('bina marga') || s.includes('bm')) return 'badge-bm';
    if (s.includes('cipta karya') || s.includes('ck')) return 'badge-ck';
    if (s.includes('sumber daya') || s.includes('sda')) return 'badge-sda';
    if (s.includes('smkk')) return 'badge-smkk';
    return 'badge-umum';
}

// Render product list to the DOM table
function renderProducts() {
    DOM.productsTableBody.innerHTML = '';
    
    const countOnPage = state.products.length;
    DOM.displayedCount.textContent = countOnPage;
    DOM.totalCount.textContent = state.totalCount;
    
    if (countOnPage === 0) {
        DOM.emptyState.style.display = 'flex';
        return;
    }
    
    state.products.forEach((prod, index) => {
        const row = document.createElement('tr');
        
        // Row Numbering
        const rowNum = state.offset + index + 1;
        
        // Highlight terms
        const highlightedDesc = highlight(prod.level_4, state.searchQuery);
        const highlightedCode = highlight(prod.kode, state.searchQuery);
        
        // Bidang Badge
        const badgeClass = getSourceBadgeClass(prod.source_file);
        
        row.innerHTML = `
            <td class="col-num">${rowNum}</td>
            <td class="col-source">
                <span class="badge ${badgeClass} badge-source">${prod.source_file.replace(' (BM)', '').replace(' (CK)', '').replace(' (SDA)', '')}</span>
            </td>
            <td class="col-cat">
                <div class="cat-tag">
                    <strong>${prod.kategori_1}</strong>
                    <span class="sub-cat">${prod.kategori_2} &bull; ${prod.kategori_3}</span>
                </div>
            </td>
            <td class="col-desc">${highlightedDesc}</td>
            <td class="col-unit" style="text-align: center;">${prod.satuan || '-'}</td>
            <td class="col-code"><span class="value-code-badge" style="font-family: monospace; font-weight: bold;">${highlightedCode}</span></td>
            <td class="col-actions">
                <button class="btn-action view-btn" data-id="${prod.id}" title="Lihat detail lengkap">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
        
        // Attach click listener for the view details button
        row.querySelector('.view-btn').addEventListener('click', () => {
            openDrawer(prod);
        });
        
        DOM.productsTableBody.appendChild(row);
    });
}

// Render pagination dynamic layout
function renderPagination() {
    DOM.currentPage.textContent = state.currentPage;
    DOM.totalPages.textContent = state.totalPages;
    
    DOM.prevPageBtn.disabled = state.currentPage === 1;
    DOM.nextPageBtn.disabled = state.currentPage === state.totalPages;
    
    DOM.pageNumbersContainer.innerHTML = '';
    
    // Logic for page numbers display (centered around currentPage)
    const range = 2; // how many pages to show before and after
    let startPage = Math.max(1, state.currentPage - range);
    let endPage = Math.min(state.totalPages, state.currentPage + range);
    
    if (startPage > 1) {
        addPageBtn(1);
        if (startPage > 2) {
            const sep = document.createElement('span');
            sep.textContent = '...';
            sep.style.alignSelf = 'center';
            sep.style.color = 'var(--text-muted)';
            DOM.pageNumbersContainer.appendChild(sep);
        }
    }
    
    for (let p = startPage; p <= endPage; p++) {
        addPageBtn(p);
    }
    
    if (endPage < state.totalPages) {
        if (endPage < state.totalPages - 1) {
            const sep = document.createElement('span');
            sep.textContent = '...';
            sep.style.alignSelf = 'center';
            sep.style.color = 'var(--text-muted)';
            DOM.pageNumbersContainer.appendChild(sep);
        }
        addPageBtn(state.totalPages);
    }
}

function addPageBtn(pageNum) {
    const btn = document.createElement('button');
    btn.className = `page-num-btn ${state.currentPage === pageNum ? 'active' : ''}`;
    btn.textContent = pageNum;
    btn.addEventListener('click', () => {
        state.currentPage = pageNum;
        state.offset = (pageNum - 1) * state.limit;
        fetchProducts();
    });
    DOM.pageNumbersContainer.appendChild(btn);
}

// Open details slide-out drawer
function openDrawer(prod) {
    DOM.detailDrawer.classList.add('active');
    
    const badgeClass = getSourceBadgeClass(prod.source_file);
    const highlightedScope = highlight(prod.lingkup || 'Tidak ada keterangan ruang lingkup kegiatan dalam dokumen ini.', state.searchQuery);
    
    DOM.drawerBody.innerHTML = `
        <div class="drawer-section">
            <label>Bidang/Sumber</label>
            <div class="value">
                <span class="badge ${badgeClass} badge-source" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">${prod.source_file}</span>
            </div>
        </div>

        <div class="drawer-section">
            <label>Kode Item Pekerjaan</label>
            <div class="value">
                <span class="value-code">${prod.kode}</span>
            </div>
        </div>

        <div class="drawer-section">
            <label>Klasifikasi Kategori</label>
            <div class="drawer-breadcrumbs">
                <span>${prod.kategori_1}</span>
                <i class="fa-solid fa-chevron-right"></i>
                <span>${prod.kategori_2}</span>
                <i class="fa-solid fa-chevron-right"></i>
                <span>${prod.kategori_3}</span>
            </div>
        </div>

        <div class="drawer-section">
            <label>Nama Item / Produk Tayang (LEVEL 4)</label>
            <div class="value value-desc">${prod.level_4}</div>
        </div>

        <div class="drawer-section">
            <label>Satuan Pengukuran</label>
            <div class="value"><strong>${prod.satuan || 'Tidak ada satuan'}</strong></div>
        </div>

        <div class="drawer-section">
            <label>Lingkup Kegiatan / Deskripsi Teknis</label>
            <div class="value value-scope">${highlightedScope}</div>
        </div>

        <div class="drawer-actions">
            <button class="btn-drawer-action" id="copyCodeBtn">
                <i class="fa-solid fa-copy"></i> Salin Kode
            </button>
            <button class="btn-drawer-action btn-primary" id="copyDescBtn">
                <i class="fa-solid fa-file-text"></i> Salin Deskripsi Item
            </button>
        </div>
    `;

    // Attach copy actions
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
        copyToClipboard(prod.kode, 'Kode produk berhasil disalin!');
    });
    
    document.getElementById('copyDescBtn').addEventListener('click', () => {
        copyToClipboard(prod.level_4, 'Deskripsi item pekerjaan berhasil disalin!');
    });
}

// Close drawer
function closeDrawer() {
    DOM.detailDrawer.classList.remove('active');
}

// Clipboard copy helper
function copyToClipboard(text, message) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(message);
    }).catch(err => {
        console.error('Failed to copy text:', err);
    });
}

// Show feedback Toast notification
function showToast(message) {
    DOM.toastMessage.textContent = message;
    DOM.toastNotification.classList.add('show');
    
    setTimeout(() => {
        DOM.toastNotification.classList.remove('show');
    }, 2500);
}

// Run app init
window.addEventListener('DOMContentLoaded', init);

// Close Bulk Search Modal
function closeBulkModal() {
    DOM.bulkSearchModal.classList.remove('active');
}

// Process Paste Search
async function processBulkSearch() {
    const text = DOM.bulkPasteTextarea.value.trim();
    if (!text) {
        showToast('Tempelkan teks terlebih dahulu!');
        return;
    }

    DOM.processBulkBtn.disabled = true;
    DOM.processBulkBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menganalisis...';
    DOM.bulkResultSection.style.display = 'block';
    DOM.bulkResultsTableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 2rem;">
                <div class="spinner" style="width: 30px; height: 30px;"></div>
                <p style="margin-top: 0.5rem; color: var(--text-secondary);">Sedang menganalisis baris teks Anda...</p>
            </td>
        </tr>
    `;

    try {
        const res = await fetch('/api/bulk_search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        
        if (!res.ok) throw new Error('Bulk search failed');
        const data = await res.json();
        
        state.bulkResults = data.results;
        renderBulkResults();
    } catch (err) {
        console.error('Error in bulk search:', err);
        DOM.bulkResultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--danger-color);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                    <p>Gagal menganalisis data. Pastikan koneksi ke server berjalan.</p>
                </td>
            </tr>
        `;
    } finally {
        DOM.processBulkBtn.disabled = false;
        DOM.processBulkBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analisis & Cocokkan Data';
    }
}

// Render parsed bulk search items to modal results table
function renderBulkResults() {
    DOM.bulkResultsTableBody.innerHTML = '';
    
    if (state.bulkResults.length === 0) {
        DOM.bulkResultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
                    Tidak ada baris teks valid yang terdeteksi.
                </td>
            </tr>
        `;
        return;
    }
    
    state.bulkResults.forEach(r => {
        const tr = document.createElement('tr');
        
        let statusBadge = '';
        let matchDetail = '';
        
        if (r.found_by === 'code') {
            statusBadge = '<span class="status-badge status-exact"><i class="fa-solid fa-circle-check"></i> Cocok (Kode)</span>';
            const m = r.match;
            matchDetail = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem;">
                    <span class="badge ${getSourceBadgeClass(m.source_file)}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${m.source_file.split(' ')[0]}</span>
                    <span style="font-family: monospace; font-weight: bold; margin-left: 0.25rem;">${m.kode}</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--text-secondary);">${m.level_4}</div>
            `;
        } else if (r.found_by === 'description') {
            statusBadge = '<span class="status-badge status-partial"><i class="fa-solid fa-magnifying-glass"></i> Cocok (Deskripsi)</span>';
            const m = r.match;
            matchDetail = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.2rem;">
                    <span class="badge ${getSourceBadgeClass(m.source_file)}" style="font-size: 0.7rem; padding: 0.1rem 0.4rem;">${m.source_file.split(' ')[0]}</span>
                    <span style="font-family: monospace; font-weight: bold; margin-left: 0.25rem;">${m.kode}</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--text-secondary);">${m.level_4}</div>
            `;
        } else {
            statusBadge = '<span class="status-badge status-none"><i class="fa-solid fa-circle-xmark"></i> Tidak Cocok</span>';
            matchDetail = '<div style="color: var(--text-muted); font-style: italic;">Tidak ditemukan kecocokan di database master</div>';
        }
        
        // Highlight matched strings
        const displayLine = r.raw_line.trim().length > 100 ? r.raw_line.trim().slice(0, 100) + '...' : r.raw_line.trim();
        const displayCodeBadge = r.parsed_code ? `<span class="value-code-badge">${r.parsed_code}</span>` : '<span style="color: var(--text-muted); font-size: 0.8rem;">-</span>';
        
        tr.innerHTML = `
            <td style="font-size: 0.85rem; color: var(--text-secondary); word-break: break-word;">${displayLine}</td>
            <td style="text-align: center; vertical-align: middle;">${displayCodeBadge}</td>
            <td>${matchDetail}</td>
            <td style="text-align: center; vertical-align: middle;">${statusBadge}</td>
        `;
        
        DOM.bulkResultsTableBody.appendChild(tr);
    });
}

// Client-side CSV generation and download
function exportBulkResultsCsv() {
    if (!state.bulkResults || state.bulkResults.length === 0) {
        showToast('Belum ada data hasil analisis untuk diekspor!');
        return;
    }
    
    const headers = ["No", "Baris Input Asli", "Kode Terdeteksi", "Status Cocok", "Kode Master", "Item Pekerjaan Master", "Satuan", "Sumber Master Bidang"];
    const rows = [headers];
    
    state.bulkResults.forEach(r => {
        const m = r.match || {};
        rows.push([
            r.no,
            r.raw_line.trim(),
            r.parsed_code,
            r.found_by ? (r.found_by === 'code' ? 'Cocok (Kode)' : 'Cocok (Deskripsi)') : 'Tidak Cocok',
            m.kode || '',
            m.level_4 || '',
            m.satuan || '',
            m.source_file || ''
        ]);
    });
    
    const csvContent = rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "hasil_analisis_massal_produk.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Hasil analisis massal berhasil diekspor ke CSV!');
}
