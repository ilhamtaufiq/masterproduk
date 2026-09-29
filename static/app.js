// State Management
const state = {
    mode: 'produk', // 'produk' or 'ssh'
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
    tabMasterProduk: document.getElementById('tabMasterProduk'),
    tabSshBupati: document.getElementById('tabSshBupati'),
    heroTitle: document.getElementById('heroTitle'),
    heroDesc: document.getElementById('heroDesc'),

    globalSearchInput: document.getElementById('globalSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    sourceFilter: document.getElementById('sourceFilter'),
    categoryFilter: document.getElementById('categoryFilter'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    productsTable: document.getElementById('productsTable'),
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
    await fetchData();
}

// Set up Event Listeners
function setupEventListeners() {
    // Mode Switcher Tabs
    DOM.tabMasterProduk.addEventListener('click', () => switchMode('produk'));
    DOM.tabSshBupati.addEventListener('click', () => switchMode('ssh'));

    // Search input with debouncing
    DOM.globalSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        state.offset = 0;
        state.currentPage = 1;

        DOM.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchData, 300);
    });

    // Clear search button
    DOM.clearSearchBtn.addEventListener('click', () => {
        DOM.globalSearchInput.value = '';
        state.searchQuery = '';
        state.offset = 0;
        state.currentPage = 1;
        DOM.clearSearchBtn.style.display = 'none';
        fetchData();
    });

    // Source Filter Change
    DOM.sourceFilter.addEventListener('change', async (e) => {
        state.sourceFilter = e.target.value;
        state.categoryFilter = '';
        state.offset = 0;
        state.currentPage = 1;

        await fetchCategories();
        await fetchData();
    });

    // Category Filter Change
    DOM.categoryFilter.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        state.offset = 0;
        state.currentPage = 1;
        fetchData();
    });

    // Rows limit select change
    DOM.limitSelect.addEventListener('change', (e) => {
        state.limit = parseInt(e.target.value);
        state.offset = 0;
        state.currentPage = 1;
        fetchData();
    });

    // Pagination buttons
    DOM.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            state.offset = (state.currentPage - 1) * state.limit;
            fetchData();
            scrollToTable();
        }
    });

    DOM.nextPageBtn.addEventListener('click', () => {
        if (state.currentPage < state.totalPages) {
            state.currentPage++;
            state.offset = (state.currentPage - 1) * state.limit;
            fetchData();
            scrollToTable();
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
        fetchData();
    });

    // Export CSV
    DOM.exportCsvBtn.addEventListener('click', () => {
        const queryParams = new URLSearchParams();
        if (state.searchQuery) queryParams.append('q', state.searchQuery);
        if (state.categoryFilter) queryParams.append('category', state.categoryFilter);

        if (state.mode === 'ssh') {
            window.location.href = `/api/ssh/export?${queryParams.toString()}`;
        } else {
            if (state.sourceFilter) queryParams.append('source', state.sourceFilter);
            window.location.href = `/api/export?${queryParams.toString()}`;
        }
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

    // Global Keyboard Shortcuts (/ to search, Esc to close modals/drawers)
    window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement !== DOM.globalSearchInput && document.activeElement !== DOM.bulkPasteTextarea) {
            e.preventDefault();
            DOM.globalSearchInput.focus();
            DOM.globalSearchInput.select();
        } else if (e.key === 'Escape') {
            closeDrawer();
            closeBulkModal();
        }
    });
}

// Switch between Master Data Produk and SSH Bupati
async function switchMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    state.searchQuery = '';
    state.sourceFilter = '';
    state.categoryFilter = '';
    state.offset = 0;
    state.currentPage = 1;

    DOM.globalSearchInput.value = '';
    DOM.clearSearchBtn.style.display = 'none';

    if (mode === 'ssh') {
        DOM.tabMasterProduk.classList.remove('active');
        DOM.tabSshBupati.classList.add('active');
        DOM.heroTitle.textContent = 'Cari & Kelola Harga Standar Bupati (Perbup 55/2025)';
        DOM.heroDesc.textContent = 'Akses cepat data Standar Satuan Harga (SSH) Kabupaten Cianjur Tahun Anggaran 2026 berdasarkan Peraturan Bupati No. 55 Tahun 2025.';

        DOM.sourceFilter.parentElement.style.display = 'none';
    } else {
        DOM.tabSshBupati.classList.remove('active');
        DOM.tabMasterProduk.classList.add('active');
        DOM.heroTitle.textContent = 'Cari & Kelola Master Data Pekerjaan';
        DOM.heroDesc.textContent = 'Akses cepat data spesifikasi teknis, satuan, kode produk, dan ruang lingkup kegiatan PUPR (Bina Marga, Cipta Karya, Sumber Daya Air, SMKK, dan Umum) secara instan.';

        DOM.sourceFilter.parentElement.style.display = 'flex';
    }

    updateTableHeader();
    await fetchCategories();
    await fetchData();
}

function updateTableHeader() {
    const thead = DOM.productsTable.querySelector('thead');
    if (state.mode === 'ssh') {
        thead.innerHTML = `
            <tr>
                <th class="col-num">No</th>
                <th class="col-cat">Kategori</th>
                <th class="col-desc">Uraian Barang & Spesifikasi</th>
                <th class="col-unit" style="text-align: center;">Satuan</th>
                <th class="col-price" style="text-align: right;">Harga Satuan (Rp)</th>
                <th class="col-code">Kode Kelompok</th>
                <th class="col-actions">Detail</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th class="col-num">No</th>
                <th class="col-source">Bidang</th>
                <th class="col-cat">Kategori</th>
                <th class="col-desc">Nama Item / Produk Tayang</th>
                <th class="col-unit">Satuan</th>
                <th class="col-code">Kode Produk</th>
                <th class="col-actions">Detail</th>
            </tr>
        `;
    }
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
        let url;
        if (state.mode === 'ssh') {
            url = '/api/ssh/categories';
        } else {
            url = state.sourceFilter
                ? `/api/categories?source=${encodeURIComponent(state.sourceFilter)}`
                : '/api/categories';
        }

        const res = await fetch(url);
        const data = await res.json();

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

// Main fetch dispatcher based on state.mode
async function fetchData() {
    if (state.mode === 'ssh') {
        await fetchSsh();
    } else {
        await fetchProducts();
    }
}

function renderSkeletonRows() {
    let rowsHtml = '';
    for (let i = 0; i < 5; i++) {
        rowsHtml += `
            <tr class="skeleton-row">
                <td><div class="skeleton-bar" style="width: 24px;"></div></td>
                <td><div class="skeleton-bar" style="width: 80px;"></div></td>
                <td><div class="skeleton-bar" style="width: 140px;"></div></td>
                <td><div class="skeleton-bar" style="width: 90%;"></div></td>
                <td><div class="skeleton-bar" style="width: 40px; margin: 0 auto;"></div></td>
                <td><div class="skeleton-bar" style="width: 90px;"></div></td>
                <td><div class="skeleton-bar" style="width: 32px; margin: 0 auto;"></div></td>
            </tr>
        `;
    }
    DOM.productsTableBody.innerHTML = rowsHtml;
}

// Fetch products based on state
async function fetchProducts() {
    renderSkeletonRows();
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

// Fetch SSH items based on state
async function fetchSsh() {
    renderSkeletonRows();
    DOM.emptyState.style.display = 'none';

    try {
        const queryParams = new URLSearchParams({
            limit: state.limit,
            offset: state.offset
        });

        if (state.searchQuery) queryParams.append('q', state.searchQuery);
        if (state.categoryFilter) queryParams.append('category', state.categoryFilter);

        const res = await fetch(`/api/ssh/search?${queryParams.toString()}`);
        if (!res.ok) throw new Error('SSH API query returned an error status');

        const data = await res.json();

        state.products = data.results;
        state.totalCount = data.total;
        state.totalPages = Math.ceil(data.total / state.limit) || 1;

        renderSsh();
        renderPagination();
    } catch (err) {
        console.error('Error fetching SSH:', err);
        DOM.productsTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; color: var(--danger-color); margin-bottom: 0.5rem;"></i>
                    <p style="color: var(--danger-color);">Gagal memuat data SSH dari server. Pastikan database SSH sudah dibuat.</p>
                </td>
            </tr>
        `;
    }
}

// Dynamic highlighting function
function highlight(text, query) {
    if (!text) return '';
    if (!query) return text;
    const terms = query.strip ? query.strip().split(/\s+/) : query.trim().split(/\s+/);
    let highlightedText = text;

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
    if (s.includes('ssh') || s.includes('perbup')) return 'badge-ssh';
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
        const rowNum = state.offset + index + 1;

        const highlightedDesc = highlight(prod.level_4, state.searchQuery);
        const highlightedCode = highlight(prod.kode, state.searchQuery);
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
            <td class="col-code">
                <span class="copyable-badge copy-code-btn" data-code="${prod.kode}" title="Klik untuk menyalin kode">
                    ${highlightedCode} <i class="fa-regular fa-copy"></i>
                </span>
            </td>
            <td class="col-actions">
                <button class="btn-action view-btn" data-id="${prod.id}" title="Lihat detail lengkap">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;

        row.querySelector('.copy-code-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(prod.kode, `Kode ${prod.kode} berhasil disalin!`);
        });

        row.querySelector('.view-btn').addEventListener('click', () => {
            openDrawer(prod);
        });

        DOM.productsTableBody.appendChild(row);
    });
}

// Render SSH list to the DOM table
function renderSsh() {
    DOM.productsTableBody.innerHTML = '';

    const countOnPage = state.products.length;
    DOM.displayedCount.textContent = countOnPage;
    DOM.totalCount.textContent = state.totalCount;

    if (countOnPage === 0) {
        DOM.emptyState.style.display = 'flex';
        return;
    }

    state.products.forEach((item, index) => {
        const row = document.createElement('tr');
        const rowNum = state.offset + index + 1;

        const highlightedUraian = highlight(item.uraian, state.searchQuery);
        const highlightedSpesifikasi = highlight(item.spesifikasi, state.searchQuery);
        const highlightedCode = highlight(item.kode_kelompok, state.searchQuery);

        const fullDesc = item.spesifikasi
            ? `${highlightedUraian} <br><small style="color: var(--text-secondary);">${highlightedSpesifikasi}</small>`
            : highlightedUraian;

        row.innerHTML = `
            <td class="col-num">${rowNum}</td>
            <td class="col-cat">
                <div class="cat-tag">
                    <strong>${item.kategori}</strong>
                </div>
            </td>
            <td class="col-desc">${fullDesc}</td>
            <td class="col-unit" style="text-align: center;">${item.satuan || '-'}</td>
            <td class="col-price" style="text-align: right;"><span class="price-tag">Rp ${item.harga_str}</span></td>
            <td class="col-code">
                ${item.kode_kelompok ? `<span class="copyable-badge copy-ssh-code-btn" title="Klik untuk menyalin kode">${highlightedCode} <i class="fa-regular fa-copy"></i></span>` : '-'}
            </td>
            <td class="col-actions">
                <button class="btn-action view-btn" data-id="${item.id}" title="Lihat detail lengkap">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;

        if (item.kode_kelompok) {
            row.querySelector('.copy-ssh-code-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(item.kode_kelompok, `Kode ${item.kode_kelompok} berhasil disalin!`);
            });
        }

        row.querySelector('.view-btn').addEventListener('click', () => {
            openSshDrawer(item);
        });

        DOM.productsTableBody.appendChild(row);
    });
}

function scrollToTable() {
    DOM.productsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render pagination dynamic layout
function renderPagination() {
    if (state.currentPage > state.totalPages) {
        state.currentPage = Math.max(1, state.totalPages);
        state.offset = (state.currentPage - 1) * state.limit;
    }

    DOM.currentPage.textContent = state.currentPage;
    DOM.totalPages.textContent = state.totalPages;

    DOM.prevPageBtn.disabled = state.currentPage <= 1;
    DOM.nextPageBtn.disabled = state.currentPage >= state.totalPages;

    DOM.pageNumbersContainer.innerHTML = '';

    const range = 2;
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
        if (state.currentPage !== pageNum) {
            state.currentPage = pageNum;
            state.offset = (pageNum - 1) * state.limit;
            fetchData();
            scrollToTable();
        }
    });
    DOM.pageNumbersContainer.appendChild(btn);
}

// Open details slide-out drawer for Master Data Produk
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

    document.getElementById('copyCodeBtn').addEventListener('click', () => {
        copyToClipboard(prod.kode, 'Kode produk berhasil disalin!');
    });

    document.getElementById('copyDescBtn').addEventListener('click', () => {
        copyToClipboard(prod.level_4, 'Deskripsi item pekerjaan berhasil disalin!');
    });
}

// Open details slide-out drawer for SSH Bupati
function openSshDrawer(item) {
    DOM.detailDrawer.classList.add('active');

    DOM.drawerBody.innerHTML = `
        <div class="drawer-section">
            <label>Sumber Regulasi</label>
            <div class="value">
                <span class="badge badge-ssh badge-source" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">${item.source_file}</span>
            </div>
        </div>

        <div class="drawer-section">
            <label>Kode Kelompok Barang</label>
            <div class="value">
                <span class="value-code">${item.kode_kelompok || '-'}</span>
            </div>
        </div>

        <div class="drawer-section">
            <label>Kategori Utama</label>
            <div class="value"><strong>${item.kategori}</strong></div>
        </div>

        <div class="drawer-section">
            <label>Uraian Barang</label>
            <div class="value value-desc">${item.uraian}</div>
        </div>

        <div class="drawer-section">
            <label>Spesifikasi Teknis</label>
            <div class="value">${item.spesifikasi || '-'}</div>
        </div>

        <div class="drawer-section">
            <label>Satuan Pengukuran</label>
            <div class="value"><strong>${item.satuan || 'Tidak ada satuan'}</strong></div>
        </div>

        <div class="drawer-section">
            <label>Harga Satuan Standar (Rp)</label>
            <div class="value" style="font-size: 1.2rem; font-weight: 700; color: #34d399; font-family: monospace;">Rp ${item.harga_str}</div>
        </div>

        <div class="drawer-actions">
            <button class="btn-drawer-action" id="copySshCodeBtn">
                <i class="fa-solid fa-copy"></i> Salin Kode
            </button>
            <button class="btn-drawer-action btn-primary" id="copySshPriceBtn">
                <i class="fa-solid fa-coins"></i> Salin Harga
            </button>
        </div>
    `;

    document.getElementById('copySshCodeBtn').addEventListener('click', () => {
        copyToClipboard(item.kode_kelompok, 'Kode kelompok barang berhasil disalin!');
    });

    document.getElementById('copySshPriceBtn').addEventListener('click', () => {
        copyToClipboard(`Rp ${item.harga_str}`, 'Harga satuan berhasil disalin!');
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
