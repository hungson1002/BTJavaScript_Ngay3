// API URL
const API_URL = 'https://api.escuelajs.co/api/v1/products';

// State
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let pageSize = 10;
let sortField = null;
let sortOrder = 'asc';

// DOM Elements
const productTableBody = document.getElementById('productTableBody');
const loadingSpinner = document.getElementById('loadingSpinner');
const tableContainer = document.getElementById('tableContainer');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const totalProductsEl = document.getElementById('totalProducts');
const totalCategoriesEl = document.getElementById('totalCategories');
const avgPriceEl = document.getElementById('avgPrice');
const searchInput = document.getElementById('searchInput');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const showingInfo = document.getElementById('showingInfo');
const pagination = document.getElementById('pagination');

// Modals
let detailModal, createModal;

// Init
document.addEventListener('DOMContentLoaded', () => {
    detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    createModal = new bootstrap.Modal(document.getElementById('createModal'));
    loadProducts();
});

// Fetch products
async function loadProducts() {
    showLoading(true);
    hideError();
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allProducts = await response.json();
        filteredProducts = [...allProducts];
        updateStats(allProducts);
        currentPage = 1;
        applyFiltersAndRender();
        showLoading(false);
    } catch (error) {
        console.error('Error:', error);
        showError('Không thể tải dữ liệu. Vui lòng thử lại.');
        showLoading(false);
    }
}

// Update stats
function updateStats(products) {
    totalProductsEl.textContent = products.length;
    const categories = new Set(products.map(p => p.category?.name || 'Unknown'));
    totalCategoriesEl.textContent = categories.size;
    const totalPrice = products.reduce((sum, p) => sum + (p.price || 0), 0);
    const avgPrice = products.length > 0 ? (totalPrice / products.length).toFixed(2) : 0;
    avgPriceEl.textContent = `$${avgPrice}`;
}

// Search handler
function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    filteredProducts = allProducts.filter(p =>
        p.title.toLowerCase().includes(query)
    );
    currentPage = 1;
    applyFiltersAndRender();
}

// Page size change
function handlePageSizeChange() {
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1;
    applyFiltersAndRender();
}

// Sort handler
function handleSort(field) {
    if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortOrder = 'asc';
    }
    updateSortIcons();
    applyFiltersAndRender();
}

// Update sort icons
function updateSortIcons() {
    const titleIcon = document.getElementById('sortIconTitle');
    const priceIcon = document.getElementById('sortIconPrice');
    titleIcon.className = 'bi bi-arrow-down-up';
    priceIcon.className = 'bi bi-arrow-down-up';
    if (sortField === 'title') {
        titleIcon.className = sortOrder === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
    } else if (sortField === 'price') {
        priceIcon.className = sortOrder === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
    }
}

// Apply filters, sort, and render
function applyFiltersAndRender() {
    let data = [...filteredProducts];

    // Sort
    if (sortField) {
        data.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (sortField === 'title') {
                valA = valA?.toLowerCase() || '';
                valB = valB?.toLowerCase() || '';
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Pagination
    const totalPages = Math.ceil(data.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = data.slice(start, end);

    renderProducts(pageData);
    renderPagination(totalPages);
    updateShowingInfo(start, end, data.length);
}

// Update showing info
function updateShowingInfo(start, end, total) {
    const actualEnd = Math.min(end, total);
    showingInfo.textContent = `Đang hiển thị ${total > 0 ? start + 1 : 0} - ${actualEnd} / ${total}`;
}

// Render pagination
function renderPagination(totalPages) {
    let html = '';

    // Previous
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">«</a>
    </li>`;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Next
    html += `<li class="page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">»</a>
    </li>`;

    pagination.innerHTML = html;
}

// Go to page
function goToPage(page) {
    currentPage = page;
    applyFiltersAndRender();
}

// Render products
function renderProducts(products) {
    let html = '';
    products.forEach(product => {
        const imageUrl = getValidImageUrl(product.images);
        const categoryName = product.category?.name || 'N/A';
        const hasValidImage = imageUrl !== null;
        const description = escapeHtml(product.description || 'Không có mô tả');

        html += `
            <tr class="clickable-row" onclick="openDetailModal(${product.id})" title="📝 ${description}">
                <td><span class="badge bg-primary">${product.id}</span></td>
                <td class="title-cell">${escapeHtml(product.title)}</td>
                <td><span class="badge bg-success">$${product.price}</span></td>
                <td><span class="badge bg-secondary">${escapeHtml(categoryName)}</span></td>
                <td>
                    <div class="img-cell">
                        ${hasValidImage
                ? `<img src="${imageUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                               <span class="no-image" style="display:none;">No img</span>`
                : `<span class="no-image">No img</span>`
            }
                    </div>
                </td>
            </tr>
        `;
    });
    productTableBody.innerHTML = html;
}

// Open detail modal
function openDetailModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;

    document.getElementById('editId').value = product.id;
    document.getElementById('editTitle').value = product.title || '';
    document.getElementById('editPrice').value = product.price || 0;
    document.getElementById('editDescription').value = product.description || '';
    document.getElementById('editCategoryId').value = product.category?.id || 1;
    document.getElementById('editImages').value = (product.images || []).join('\n');
    document.getElementById('detailModalTitle').textContent = `Chi tiết: ${product.title}`;

    detailModal.show();
}

// Update product
async function updateProduct() {
    const id = document.getElementById('editId').value;
    const data = {
        title: document.getElementById('editTitle').value,
        price: parseInt(document.getElementById('editPrice').value),
        description: document.getElementById('editDescription').value,
        categoryId: parseInt(document.getElementById('editCategoryId').value),
        images: document.getElementById('editImages').value.split('\n').filter(url => url.trim())
    };

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Update failed');

        alert('Cập nhật thành công!');
        detailModal.hide();
        loadProducts();
    } catch (error) {
        alert('Lỗi khi cập nhật: ' + error.message);
    }
}

// Open create modal
function openCreateModal() {
    document.getElementById('createForm').reset();
    document.getElementById('createCategoryId').value = 1;
    createModal.show();
}

// Create product
async function createProduct() {
    const data = {
        title: document.getElementById('createTitle').value,
        price: parseInt(document.getElementById('createPrice').value),
        description: document.getElementById('createDescription').value,
        categoryId: parseInt(document.getElementById('createCategoryId').value),
        images: document.getElementById('createImages').value.split('\n').filter(url => url.trim())
    };

    if (!data.title || !data.price || !data.description) {
        alert('Vui lòng điền đầy đủ thông tin!');
        return;
    }

    if (data.images.length === 0) {
        data.images = ['https://placehold.co/600x400'];
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Create failed');

        alert('Tạo sản phẩm thành công!');
        createModal.hide();
        loadProducts();
    } catch (error) {
        alert('Lỗi khi tạo: ' + error.message);
    }
}

// Export to CSV
function exportToCSV() {
    let data = [...filteredProducts];

    // Apply current sort
    if (sortField) {
        data.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];
            if (sortField === 'title') {
                valA = valA?.toLowerCase() || '';
                valB = valB?.toLowerCase() || '';
            }
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Create CSV
    const headers = ['ID', 'Title', 'Price', 'Category', 'Description'];
    const rows = data.map(p => [
        p.id,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        p.price,
        `"${(p.category?.name || '').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

// Helper functions
function getValidImageUrl(images) {
    if (!images || !Array.isArray(images) || images.length === 0) return null;
    let imageUrl = images[0];
    if (typeof imageUrl === 'string') imageUrl = imageUrl.replace(/[\[\]"']/g, '').trim();
    if (!imageUrl || !imageUrl.startsWith('http')) return null;
    return imageUrl;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    loadingSpinner.style.display = show ? 'flex' : 'none';
    tableContainer.style.display = show ? 'none' : 'block';
}

function showError(message) {
    errorAlert.classList.remove('d-none');
    errorMessage.textContent = message;
}

function hideError() {
    errorAlert.classList.add('d-none');
}
