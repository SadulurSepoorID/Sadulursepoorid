let currentUser = JSON.parse(localStorage.getItem('user_session'));
let cart = [];
let products = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. SECURITY & ROLE CHECK
    const allowedRoles = ['ketua', 'pengurus', 'bendahara', 'wakil', 'sdm'];
    const userRole = (currentUser.jabatan || "").toLowerCase();
    
    // Logic Admin: NIA spesifik Fathir atau jabatan tertentu
    const isAdmin = currentUser.nia === 'SS-0098' || allowedRoles.some(r => userRole.includes(r));

    if (isAdmin) {
        document.getElementById('admin-tabs').classList.remove('hidden');
    } else {
        ['view-admin-product', 'view-admin-orders', 'admin-tabs'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.remove();
        });
    }
    
    // 2. Load Products with Skeleton Effect
    renderSkeleton();
    fetchProducts();
});

// --- UI UTILS ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-circle-info';
    let color = 'var(--primary)';
    
    if(type === 'success') { icon = 'fa-circle-check'; color = 'var(--success)'; }
    if(type === 'error') { icon = 'fa-circle-exclamation'; color = 'var(--danger)'; }

    toast.style.borderLeftColor = color;
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${color}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 3000);
}

function renderSkeleton() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = Array(4).fill(0).map(() => `
        <div class="product-card">
            <div class="card-img-wrap skeleton"></div>
            <div class="card-details">
                <div class="skeleton" style="height:20px; width:80%; margin-bottom:10px;"></div>
                <div class="skeleton" style="height:20px; width:40%;"></div>
            </div>
        </div>
    `).join('');
}

function switchTab(tabName) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-pill').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById('view-' + tabName);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
    event.currentTarget.classList.add('active');

    if(tabName === 'admin-orders') fetchAdminOrders();
}

// --- PRODUCT LOGIC ---
async function fetchProducts() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'shop_get_products' })
        });
        const data = await res.json();
        
        if(data.status) {
            products = data.products;
            renderProducts(products);
            if(document.getElementById('admin-product-list')) renderAdminProductList(products);
        }
    } catch(e) { 
        console.error(e);
        showToast("Gagal memuat data produk", "error");
    }
}

function renderProducts(list) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = "";

    if(list.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;">Belum ada produk.</div>';
        return;
    }

    list.forEach(p => {
        const isPO = p.tipe_stok === 'PO';
        const isHabis = !isPO && p.stok <= 0;
        const harga = parseInt(p.harga);
        const diskon = parseInt(p.diskon || 0);
        
        let priceHtml = `Rp ${harga.toLocaleString('id-ID')}`;
        if(diskon > 0) {
            priceHtml = `<span class="price-cut">Rp ${(harga + diskon).toLocaleString('id-ID')}</span> Rp ${harga.toLocaleString('id-ID')}`;
        }
        
        let badgeHtml = isPO ? '<span class="badge po">Pre-Order</span>' : '<span class="badge ready">Ready</span>';
        if(isHabis) badgeHtml = '<span class="badge" style="background:#64748b; color:white;">Sold Out</span>';

        // Parse Varian
        let varianHtml = "";
        let varianObj = {sizes:[]};
        try { varianObj = JSON.parse(p.varian); } catch(e){}
        
        let selectHtml = "";
        if(varianObj.sizes && varianObj.sizes.length > 0) {
            selectHtml = `
            <div class="select-wrapper">
                <select class="variant-select size-select-${p.id}">
                    ${varianObj.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
            </div>`;
        } else {
            selectHtml = `<input type="hidden" class="size-select-${p.id}" value="All Size">`;
        }

        const btnState = isHabis ? 'disabled' : '';
        const btnText = isHabis ? 'Stok Habis' : 'Add to Bag';

        grid.innerHTML += `
            <div class="product-card">
                <div class="card-img-wrap">
                    <div class="card-badges">${badgeHtml}</div>
                    <img src="${p.gambar || 'https://placehold.co/400x400/e2e8f0/1e293b?text=No+Image'}" loading="lazy" alt="${p.nama}">
                </div>
                <div class="card-details">
                    <div class="card-name">${p.nama}</div>
                    <div class="card-price">${priceHtml}</div>
                    ${selectHtml}
                    <button class="btn-add" onclick="addToCart('${p.id}')" ${btnState}>
                        <i class="fa-solid fa-bag-shopping"></i> ${btnText}
                    </button>
                </div>
            </div>
        `;
    });
}

// --- CART LOGIC ---
function addToCart(id) {
    const prod = products.find(p => p.id == id);
    if (!prod) return;

    const sizeEl = document.querySelector(`.size-select-${id}`);
    const size = sizeEl ? sizeEl.value : "All Size";

    const existing = cart.find(c => c.id == id && c.size == size);
    if (existing) {
        if(prod.tipe_stok === 'Ready' && existing.qty >= prod.stok) {
            showToast("Stok maksimal tercapai!", "error"); return;
        }
        existing.qty++;
    } else {
        cart.push({ ...prod, qty: 1, size: size });
    }
    updateCartUI();
    showToast("Produk masuk keranjang", "success");
}

function updateCartUI() {
    const count = cart.reduce((a,b)=>a+b.qty, 0);
    const badge = document.getElementById('cart-count');
    badge.innerText = count;
    badge.style.transform = "scale(1.2)";
    setTimeout(() => badge.style.transform = "scale(1)", 200);
}

function toggleCart() {
    const modal = document.getElementById('cart-modal');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        renderCartItems();
    } else {
        modal.classList.add('hidden');
    }
}

function renderCartItems() {
    const container = document.getElementById('cart-items');
    container.innerHTML = "";
    let total = 0;
    
    if(cart.length === 0) {
        container.innerHTML = "<div style='text-align:center; color:#94a3b8; padding:40px;'><i class='fa-solid fa-basket-shopping' style='font-size:3rem; margin-bottom:10px; display:block;'></i>Keranjang Kosong</div>";
        document.getElementById('cart-total').innerText = "Rp 0";
        return;
    }

    cart.forEach((item, index) => {
        total += item.harga * item.qty;
        container.innerHTML += `
            <div class="cart-item-row">
                <img src="${item.gambar}" class="cart-thumb">
                <div class="cart-info">
                    <h4>${item.nama}</h4>
                    <div class="cart-meta">${item.size} • Rp ${item.harga.toLocaleString()} x ${item.qty}</div>
                </div>
                <button class="btn-remove" onclick="removeItem(${index})"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    document.getElementById('cart-total').innerText = "Rp " + total.toLocaleString('id-ID');
}

function removeItem(idx) { cart.splice(idx, 1); renderCartItems(); updateCartUI(); }

// --- CHECKOUT LOGIC ---
function openCheckoutForm() {
    if(cart.length === 0) return showToast("Keranjang masih kosong", "error");
    document.getElementById('cart-modal').classList.add('hidden');
    document.getElementById('checkout-modal').classList.remove('hidden');
}
function closeCheckoutForm() { document.getElementById('checkout-modal').classList.add('hidden'); }

function toggleCicilanInput() {
    const type = document.getElementById('pay-type').value;
    const group = document.getElementById('cicilan-group');
    if(type === 'cicil') {
        group.classList.remove('hidden');
    } else {
        group.classList.add('hidden');
    }
}

function previewFile() {
    const input = document.getElementById('pay-proof');
    const text = document.getElementById('drop-content-text');
    if(input.files && input.files[0]) {
        text.innerHTML = `<i class="fa-solid fa-check-circle" style="color:green; font-size:1.5rem;"></i><span>${input.files[0].name}</span>`;
    }
}

async function handleCheckout(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-confirm-pay');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memproses...'; btn.disabled = true;

    const totalTagihan = cart.reduce((a,b)=>a+(b.harga*b.qty), 0);
    const tipeBayar = document.getElementById('pay-type').value;
    let bayarAwal = totalTagihan;
    
    if (tipeBayar === 'cicil') {
        bayarAwal = parseInt(document.getElementById('pay-nominal-input').value) || 0;
        if(bayarAwal <= 0) { 
            showToast("Masukkan nominal DP", "error"); 
            btn.disabled=false; btn.innerHTML=originalText; return; 
        }
    }

    const fileInput = document.getElementById('pay-proof');
    if (fileInput.files.length === 0) {
        showToast("Wajib upload bukti transfer", "error");
        btn.disabled=false; btn.innerHTML=originalText; return;
    }

    try {
        const base64 = await toBase64(fileInput.files[0]);
        const payload = {
            action: 'shop_checkout',
            nia: currentUser.nia,
            nama: currentUser.nama,
            items: cart.map(c => ({ id: c.id, nama: c.nama, qty: c.qty, size: c.size, harga: c.harga })),
            total_tagihan: totalTagihan,
            bayar_awal: bayarAwal,
            metode: document.getElementById('pay-method').value,
            bukti_base64: base64
        };

        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();
        
        if(data.status) {
            showToast("Pesanan Berhasil!", "success");
            cart = []; updateCartUI();
            closeCheckoutForm();
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(data.message, "error");
        }
    } catch(err) { showToast("Gagal terhubung ke server", "error"); }
    
    btn.innerHTML = originalText; btn.disabled = false;
}

// --- ADMIN FUNCTIONS ---
function renderAdminProductList(list) {
    const tbody = document.getElementById('admin-product-list');
    if(!tbody) return;
    tbody.innerHTML = "";
    list.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center;">
                        <img src="${p.gambar}" onerror="this.src='https://placehold.co/100'">
                        <div>
                            <div style="font-weight:600;">${p.nama}</div>
                            <small style="color:#64748b;">${p.tipe_stok}</small>
                        </div>
                    </div>
                </td>
                <td>Rp ${parseInt(p.harga).toLocaleString()}</td>
                <td>${p.stok}</td>
                <td style="text-align:right;">
                    <button onclick="deleteProduct('${p.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

async function fetchAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if(!container) return;
    container.innerHTML = '<div style="text-align:center; padding:20px;">Loading...</div>';
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'shop_get_orders', nia: currentUser.nia, is_admin: true })
        });
        const data = await res.json();
        if(data.status) {
            container.innerHTML = "";
            if(data.orders.length === 0) {
                container.innerHTML = '<div style="text-align:center; color:#94a3b8;">Belum ada pesanan.</div>';
                return;
            }
            data.orders.forEach(o => {
                let statusClass = o.status === 'Lunas' ? 'pill-lunas' : (o.status === 'Cicilan' ? 'pill-cicil' : '');
                let waLink = `https://wa.me/${formatWA(o.no_hp)}?text=Halo ${o.nama}, mengenai pesanan ID ${o.id}...`;
                let buktiBtn = o.bukti ? `<a href="${o.bukti}" target="_blank" class="btn-primary" style="background:#e0f2fe; color:#0284c7; text-decoration:none; padding:6px 12px; font-size:0.8rem;">Bukti</a>` : '';

                container.innerHTML += `
                    <div class="order-card-new">
                        <div class="order-header">
                            <span>ID: #${o.id} • ${o.tanggal}</span>
                            <span class="status-pill ${statusClass}">${o.status}</span>
                        </div>
                        <h4 style="margin-bottom:8px;">${o.nama} <span style="font-weight:400; color:#64748b;">(${o.nia})</span></h4>
                        <div style="font-size:0.9rem; color:#475569; margin-bottom:12px;">
                            ${o.items.map(i => `<div>• ${i.nama} (${i.size}) x${i.qty}</div>`).join('')}
                        </div>
                        <div style="background:#f1f5f9; padding:10px; border-radius:8px; font-size:0.85rem; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between;"><span>Tagihan:</span> <strong>Rp ${parseInt(o.total).toLocaleString()}</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Dibayar:</span> <span>Rp ${parseInt(o.terbayar).toLocaleString()}</span></div>
                            <div style="display:flex; justify-content:space-between; margin-top:4px; color:${o.total > o.terbayar ? '#c2410c' : 'green'};">
                                <span>Sisa:</span> <strong>Rp ${(o.total - o.terbayar).toLocaleString()}</strong>
                            </div>
                        </div>
                        <div class="order-actions">
                             ${buktiBtn}
                             <button onclick="updateStatus('${o.id}', 'Lunas')" class="btn-primary" style="background:#dcfce7; color:#15803d;">Lunas</button>
                             <button onclick="window.open('${waLink}')" class="btn-primary" style="background:var(--primary); color:white;"><i class="fa-brands fa-whatsapp"></i> Chat</button>
                        </div>
                    </div>
                `;
            });
        }
    } catch(e) { container.innerHTML = "Gagal memuat."; }
}

// --- UTILS ---
async function updateStatus(id, st) {
    if(!confirm("Ubah status jadi " + st + "?")) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_update_status', id_transaksi: id, status_baru: st, admin_nia: currentUser.nia }) });
    fetchAdminOrders();
    showToast("Status diperbarui", "success");
}

async function deleteProduct(id) {
    if(!confirm("Hapus produk ini?")) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_delete_product', id: id }) });
    fetchProducts();
    showToast("Produk dihapus", "info");
}

function toBase64(file) {
    return new Promise((r, j) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => r(reader.result);
        reader.onerror = error => j(error);
    });
}
function formatWA(num) {
    if(!num) return "";
    num = num.toString().replace(/[^0-9]/g, "");
    if(num.startsWith('0')) return '62'+num.substring(1);
    return num;
}

// Modal Helpers
function openProductModal() { document.getElementById('product-modal').classList.remove('hidden'); }
function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); }
function toggleStockInput() {
    const type = document.getElementById('prod-type').value;
    document.getElementById('stok-group').style.display = type === 'Ready' ? 'block' : 'none';
}

async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-prod');
    btn.innerText = "Processing..."; btn.disabled = true;
    
    const file = document.getElementById('prod-img').files[0];
    let b64 = "";
    if(file) b64 = await toBase64(file);

    const sizes = document.getElementById('prod-sizes').value.split(',').map(s=>s.trim()).filter(s=>s);

    const payload = {
        action: 'shop_save_product',
        nama: document.getElementById('prod-name').value,
        harga: document.getElementById('prod-price').value,
        diskon: document.getElementById('prod-disc').value,
        tipe_stok: document.getElementById('prod-type').value,
        stok: document.getElementById('prod-stock').value,
        varian: { sizes: sizes },
        gambar_base64: b64,
        is_edit: false
    };

    await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    closeProductModal();
    fetchProducts();
    showToast("Produk berhasil disimpan", "success");
    btn.innerText = "Simpan Perubahan"; btn.disabled = false;
}