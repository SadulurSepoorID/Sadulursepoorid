let currentUser = JSON.parse(localStorage.getItem('user_session'));
let cart = JSON.parse(localStorage.getItem('sadulur_cart')) || [];
let products = [];
let cropper = null; 
let html5QrcodeScanner = null;
let pendingOrderIdForScan = null;

// --- GLOBAL VARS UNTUK MULTI-UPLOAD ---
let activeSlotIndex = null;
let tempImages = [null, null, null];
let deletedIndexes = [];

// --- SIDEBAR & NAV ---
function toggleSidebar() {
    const sidebar = document.getElementById('mySidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden', 'opacity-0'); overlay.classList.add('opacity-100');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.remove('opacity-100'); overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}
function logoutLocal() { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); }

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Validasi Role
    const allowedRoles = ['ketua', 'pengurus', 'bendahara', 'wakil', 'sdm'];
    const userRole = (currentUser.jabatan || "").toLowerCase();
    const isAdmin = currentUser.nia === 'SS-0098' || allowedRoles.some(r => userRole.includes(r));

    if(isAdmin) document.getElementById('admin-sidebar-links').classList.remove('hidden');

    renderSkeleton();
    fetchProducts();
    updateCartUI(); 
});

// --- CORE UTILS ---
function saveCart() { localStorage.setItem('sadulur_cart', JSON.stringify(cart)); updateCartUI(); }
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    let bgClass = 'bg-white text-slate-700 border-slate-200'; 
    let icon = 'fa-circle-info text-brand-600';
    
    if(type === 'success') { bgClass = 'bg-slate-900 text-white border-transparent'; icon = 'fa-circle-check text-green-400'; }
    if(type === 'error') { bgClass = 'bg-white text-red-600 border-red-100'; icon = 'fa-circle-exclamation'; }

    toast.className = `px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 transform transition-all duration-500 translate-x-10 opacity-0 mb-2 ${bgClass}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span class="font-bold text-xs">${message}</span>`;
    container.appendChild(toast);
    
    requestAnimationFrame(() => toast.classList.remove('translate-x-10', 'opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0', 'translate-x-10'); setTimeout(()=>toast.remove(), 500); }, 3000);
}

function switchTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(el => { el.classList.add('hidden'); el.classList.remove('animate-fade-up'); });
    
    // Reset active nav state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active-tab'));
    
    const target = document.getElementById('view-' + tabName);
    if(target) { target.classList.remove('hidden'); void target.offsetWidth; target.classList.add('animate-fade-up'); }
    
    // Update Header Text
    const titleEl = document.getElementById('page-title'); const subEl = document.getElementById('page-subtitle');
    if(tabName === 'catalog') { titleEl.innerText = 'Katalog Terbaru'; subEl.innerText = 'Koleksi eksklusif merchandise Sadulur Sepoor.'; }
    else if(tabName === 'my-orders') { titleEl.innerText = 'Riwayat Pesanan'; subEl.innerText = 'Pantau status pembayaran dan pengiriman Anda.'; fetchMyOrders(); }
    else if(tabName === 'admin-product') { titleEl.innerText = 'Kelola Produk'; subEl.innerText = 'Manajemen inventaris toko.'; }
    else if(tabName === 'admin-orders') { titleEl.innerText = 'Pesanan Masuk'; subEl.innerText = 'Verifikasi pembayaran dan update resi.'; fetchAdminOrders(); }
}

function renderSkeleton() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = Array(4).fill(0).map(() => `
        <div class="bg-white rounded-[24px] p-3 shadow-sm border border-slate-100">
            <div class="aspect-square bg-slate-100 rounded-[20px] animate-pulse mb-4"></div>
            <div class="space-y-2 px-1">
                <div class="h-4 bg-slate-100 rounded w-3/4 animate-pulse"></div>
                <div class="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div>
            </div>
        </div>`).join('');
}

// --- CATALOG ---
async function fetchProducts() {
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_get_products' }) });
        const data = await res.json();
        if(data.status) {
            products = data.products;
            renderProducts(products);
            renderAdminProductList(products);
        }
    } catch(e) { console.error(e); }
}

function renderProducts(list) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = "";
    if(list.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Belum ada produk tersedia.</div>'; return; }
    
    list.forEach((p, index) => {
        const isPO = p.tipe_stok === 'PO';
        const isHabis = !isPO && p.stok <= 0;
        const harga = parseInt(p.harga);
        const diskon = parseInt(p.diskon || 0);
        
        // Multi Image Logic
        let images = [];
        if (Array.isArray(p.gambar)) { images = p.gambar.filter(x => x); } 
        else if (typeof p.gambar === 'string' && p.gambar) { images = [p.gambar]; }
        if(images.length === 0) images = ['https://placehold.co/400x400/f1f5f9/94a3b8?text=No+Image'];

        // Slider Logic
        let sliderHtml = '';
        if (images.length > 1) {
            const slides = images.map(src => `<div class="snap-center shrink-0 w-full h-full"><img src="${src}" loading="lazy" class="w-full h-full object-cover"></div>`).join('');
            const dots = images.map((_, i) => `<div class="img-dot ${i===0?'active':''}" id="dot-${p.id}-${i}"></div>`).join('');
            sliderHtml = `<div class="flex overflow-x-auto snap-x scrollbar-hide w-full h-full relative z-10" onscroll="updateDots(this, '${p.id}', ${images.length})">${slides}</div><div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">${dots}</div>`;
        } else {
            sliderHtml = `<img src="${images[0]}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">`;
        }

        let priceHtml = `<span class="font-bold text-slate-900 text-lg">Rp ${harga.toLocaleString('id-ID')}</span>`;
        if(diskon > 0) priceHtml = `<div class="flex flex-col leading-tight"><span class="text-[10px] text-slate-400 line-through">Rp ${(harga + diskon).toLocaleString('id-ID')}</span><span class="font-bold text-red-500 text-lg">Rp ${harga.toLocaleString('id-ID')}</span></div>`;
        
        let badge = isPO ? `<span class="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur text-brand-600 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">Pre-Order</span>` : `<span class="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur text-slate-600 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">Ready</span>`;
        if(isHabis) badge = `<span class="absolute top-3 left-3 z-30 bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">Sold Out</span>`;
        
        let varianObj = {sizes:[]}; try { varianObj = typeof p.varian === 'string' ? JSON.parse(p.varian) : p.varian; } catch(e){}
        let selectHtml = (varianObj && varianObj.sizes && varianObj.sizes.length > 0) ? `<select class="size-select-${p.id} w-full mt-3 p-2 text-xs bg-slate-50 border-none rounded-lg font-medium text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors">${varianObj.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}</select>` : `<input type="hidden" class="size-select-${p.id}" value="All Size"><div class="mt-3"></div>`;

        grid.innerHTML += `
            <div class="group bg-white rounded-[24px] p-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative flex flex-col border border-slate-50 stagger-${(index%3)+1} animate-fade-up">
                <div class="relative aspect-[4/5] rounded-[20px] overflow-hidden bg-slate-100 mb-3 isolate">
                    ${badge}
                    ${sliderHtml}
                </div>
                
                <div class="px-1 pb-1 flex-1 flex flex-col">
                    <h3 class="font-serif font-bold text-slate-900 text-lg leading-snug line-clamp-2 mb-1 group-hover:text-brand-600 transition-colors">${p.nama}</h3>
                    <div class="mb-1">${priceHtml}</div>
                    
                    <div class="mt-auto">
                        ${selectHtml}
                        <div class="flex gap-2 mt-2">
                            <button onclick="addToCart('${p.id}')" ${isHabis?'disabled':''} class="w-10 h-10 bg-slate-50 text-slate-600 hover:bg-brand-50 hover:text-brand-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center active:scale-95 ${isHabis ? 'opacity-50 cursor-not-allowed':''}"><i class="fa-solid fa-cart-plus"></i></button>
                            <button onclick="buyNow('${p.id}')" ${isHabis?'disabled':''} class="flex-1 h-10 bg-slate-900 text-white hover:bg-brand-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 ${isHabis ? 'bg-slate-300 shadow-none cursor-not-allowed':''}">${isHabis ? 'Habis' : 'Beli'}</button>
                        </div>
                    </div>
                </div>
            </div>`;
    });
}

function updateDots(el, id, count) {
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    for(let i=0; i<count; i++) {
        const dot = document.getElementById(`dot-${id}-${i}`);
        if(dot) i === index ? dot.classList.add('active') : dot.classList.remove('active');
    }
}

function addToCart(id) {
    const prod = products.find(p => p.id == id); 
    if (!prod) return;
    const size = document.querySelector(`.size-select-${id}`)?.value || "All Size";
    const existing = cart.find(c => c.id == id && c.size == size);
    let firstImg = Array.isArray(prod.gambar) ? (prod.gambar[0] || 'https://placehold.co/100') : prod.gambar;
    
    if (existing) { 
        if(prod.tipe_stok === 'Ready' && existing.qty >= prod.stok) return showToast("Stok maksimal tercapai!", "error"); 
        existing.qty++; 
        existing.checked = true; // Tambahkan ini
    } else { 
        cart.push({ ...prod, qty: 1, size: size, gambar: firstImg, checked: true }); // Tambahkan checked: true
    }
    saveCart(); 
    showToast("Produk ditambahkan ke keranjang", "success");
}

function buyNow(id) {
    const prod = products.find(p => p.id == id); 
    if (!prod) return;
    
    // Ambil data ukuran & gambar
    const size = document.querySelector(`.size-select-${id}`)?.value || "All Size";
    let firstImg = Array.isArray(prod.gambar) ? (prod.gambar[0] || 'https://placehold.co/100') : prod.gambar;

    // Buat Objek Sementara (Tidak disimpan ke localStorage)
    const tempItem = {
        ...prod,
        qty: 1,
        size: size,
        gambar: firstImg,
        checked: true
    };
    
    // Panggil form checkout dengan mode Direct Buy
    openCheckoutForm(tempItem);
}

function updateCartUI() { 
    const count = cart.reduce((a,b)=>a+b.qty, 0); 
    const badge = document.getElementById('cart-count'); 
    badge.innerText = count; 
    badge.classList.remove('scale-0'); badge.classList.add('scale-100'); 
    setTimeout(() => badge.classList.remove('scale-100'), 200); 
}

function toggleCart() { 
    const modal = document.getElementById('cart-modal'); 
    if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); renderCartItems(); } 
    else { modal.classList.add('hidden'); } 
}

// --- UPDATE CART LOGIC (CHECKLIST) ---
function renderCartItems() {
    const container = document.getElementById('cart-items'); 
    container.innerHTML = ""; 
    
    if(cart.length === 0) { 
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-slate-300"><i class="fa-solid fa-basket-shopping text-4xl mb-3 opacity-30"></i><p class="text-sm font-medium">Keranjang kosong</p></div>`; 
        document.getElementById('cart-total').innerText = "Rp 0"; 
        return; 
    }
    
    // LOGIKA BARU: Cek apakah semua item statusnya checked
    const allChecked = cart.length > 0 && cart.every(item => item.checked);

    // Header Select All (Perhatikan penambahan ${allChecked ? 'checked' : ''})
    container.innerHTML += `
    <div class="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100">
        <input type="checkbox" id="check-all" onchange="toggleSelectAll(this)" ${allChecked ? 'checked' : ''} class="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-gray-300 cursor-pointer">
        <label for="check-all" class="text-xs font-bold text-slate-500 cursor-pointer">Pilih Semua</label>
    </div>`;

    cart.forEach((item, index) => { 
        if(item.checked === undefined) item.checked = true;

        container.innerHTML += `
        <div class="flex gap-3 items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-3 group">
            <input type="checkbox" onchange="updateItemCheck(${index}, this)" ${item.checked ? 'checked' : ''} class="cart-checkbox w-5 h-5 rounded-md text-brand-600 focus:ring-brand-500 border-slate-300 cursor-pointer">
            <img src="${item.gambar}" class="w-16 h-16 rounded-xl object-cover bg-slate-100 border border-slate-50">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-slate-800 text-sm truncate">${item.nama}</h4>
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wide mt-0.5 mb-1">${item.size}</div>
                <div class="flex items-center justify-between">
                    <span class="text-brand-600 font-bold text-sm">Rp ${item.harga.toLocaleString()}</span>
                    <div class="flex items-center gap-2 bg-slate-50 rounded-lg px-2 py-1">
                        <span class="text-xs text-slate-500 font-bold">x${item.qty}</span>
                    </div>
                </div>
            </div>
            <button class="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" onclick="removeItem(${index})"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>`; 
    }); 
    
    recalculateCartTotal();
}

function updateItemCheck(index, el) {
    cart[index].checked = el.checked;
    saveCart(); // Simpan state checked ke localstorage
    recalculateCartTotal();
}

function toggleSelectAll(el) {
    const isChecked = el.checked;
    cart.forEach(item => item.checked = isChecked);
    saveCart();
    renderCartItems(); // Re-render untuk update checkbox individu
}

function recalculateCartTotal() {
    let total = 0;
    cart.forEach(item => {
        if(item.checked) total += item.harga * item.qty;
    });
    document.getElementById('cart-total').innerText = "Rp " + total.toLocaleString('id-ID');
}
function removeItem(idx) { cart.splice(idx, 1); saveCart(); renderCartItems(); }

// --- ADMIN UPLOAD LOGIC ---
function triggerUpload(index) {
    if(tempImages[index] && tempImages[index] !== "EXISTING") return; 
    activeSlotIndex = index;
    document.getElementById('hidden-file-input').value = "";
    document.getElementById('hidden-file-input').click();
}
function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('cropper-wrapper').classList.remove('hidden');
            const image = document.getElementById('cropper-img');
            image.src = e.target.result;
            if(cropper) cropper.destroy();
            cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 1 });
        };
        reader.readAsDataURL(input.files[0]);
    }
}
function cancelCrop() {
    document.getElementById('cropper-wrapper').classList.add('hidden');
    if(cropper) { cropper.destroy(); cropper = null; }
    activeSlotIndex = null;
}
function applyCrop() {
    if(!cropper || activeSlotIndex === null) return;
    const base64 = cropper.getCroppedCanvas({ width: 600, height: 600, fillColor: '#fff' }).toDataURL('image/jpeg', 0.85);
    tempImages[activeSlotIndex] = base64;
    
    const slot = document.getElementById(`slot-${activeSlotIndex}`);
    slot.style.backgroundImage = `url(${base64})`;
    slot.classList.add('filled');
    slot.querySelector('.slot-placeholder').classList.add('hidden');
    slot.querySelector('.btn-remove').classList.remove('hidden');
    cancelCrop();
}
function removeImage(e, index) {
    e.stopPropagation();
    tempImages[index] = null;
    if(document.getElementById('prod-is-edit').value === "true") { if(!deletedIndexes.includes(index)) deletedIndexes.push(index); }
    const slot = document.getElementById(`slot-${index}`);
    slot.style.backgroundImage = '';
    slot.classList.remove('filled');
    slot.querySelector('.slot-placeholder').classList.remove('hidden');
    slot.querySelector('.btn-remove').classList.add('hidden');
}

// --- ADMIN PRODUCTS ---
function renderAdminProductList(list) {
    const tbody = document.getElementById('admin-product-list'); if(!tbody) return; tbody.innerHTML = "";
    list.forEach(p => { 
        let img = Array.isArray(p.gambar) ? (p.gambar[0] || 'https://placehold.co/100') : p.gambar;
        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="p-5 pl-8">
                <div class="flex items-center gap-4">
                    <img src="${img}" class="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200" onerror="this.src='https://placehold.co/100'">
                    <div>
                        <div class="font-bold text-slate-800 text-sm">${p.nama}</div>
                        <small class="text-slate-400 text-[10px] uppercase font-bold tracking-wide">${p.tipe_stok}</small>
                    </div>
                </div>
            </td>
            <td class="p-5 font-mono text-sm font-bold text-slate-700">Rp ${parseInt(p.harga).toLocaleString()}</td>
            <td class="p-5 text-center">
                <span class="${p.stok > 0 ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'} px-2.5 py-1 rounded-lg text-xs font-bold border">${p.stok}</span>
            </td>
            <td class="p-5 pr-8 text-right">
                <button onclick="openEditProduct('${p.id}')" class="text-slate-400 hover:text-brand-600 w-8 h-8 rounded-full hover:bg-brand-50 mr-1 transition-colors"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="deleteProduct('${p.id}')" class="text-slate-400 hover:text-red-600 w-8 h-8 rounded-full hover:bg-red-50 transition-colors"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>`; 
    });
}
function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = "";
    document.getElementById('prod-is-edit').value = "false";
    document.getElementById('modal-title').innerText = "Tambah Produk";
    document.getElementById('btn-save-prod').innerText = "Simpan Produk";
    tempImages = [null, null, null]; deletedIndexes = [];
    document.getElementById('cropper-wrapper').classList.add('hidden');
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.style.backgroundImage = ''; slot.classList.remove('filled');
        slot.querySelector('.slot-placeholder').classList.remove('hidden');
        slot.querySelector('.btn-remove').classList.add('hidden');
    }
    document.getElementById('product-modal').classList.remove('hidden');
}
function openEditProduct(id) {
    const p = products.find(x => x.id == id); if(!p) return;
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-is-edit').value = "true";
    document.getElementById('prod-name').value = p.nama;
    document.getElementById('prod-price').value = p.harga;
    document.getElementById('prod-disc').value = p.diskon || 0;
    document.getElementById('prod-type').value = p.tipe_stok;
    document.getElementById('prod-stock').value = p.stok;
    let sizes = ""; try { const v = JSON.parse(p.varian); if(v.sizes) sizes = v.sizes.join(", "); } catch(e){} document.getElementById('prod-sizes').value = sizes;
    toggleStockInput();
    document.getElementById('modal-title').innerText = "Edit Produk";
    tempImages = [null, null, null]; deletedIndexes = [];
    document.getElementById('cropper-wrapper').classList.add('hidden');
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`slot-${i}`);
        slot.style.backgroundImage = ''; slot.classList.remove('filled');
        slot.querySelector('.slot-placeholder').classList.remove('hidden');
        slot.querySelector('.btn-remove').classList.add('hidden');
    }
    let currentImages = Array.isArray(p.gambar) ? p.gambar : [p.gambar];
    currentImages.forEach((url, i) => {
        if(i < 3 && url) {
            tempImages[i] = "EXISTING";
            const slot = document.getElementById(`slot-${i}`);
            slot.style.backgroundImage = `url(${url})`;
            slot.classList.add('filled');
            slot.querySelector('.slot-placeholder').classList.add('hidden');
            slot.querySelector('.btn-remove').classList.remove('hidden');
        }
    });
    document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); if(cropper) { cropper.destroy(); cropper = null; } }
function toggleStockInput() { document.getElementById('stok-group').style.display = document.getElementById('prod-type').value === 'Ready' ? 'block' : 'none'; }
async function saveProduct(e) {
    e.preventDefault(); const btn = document.getElementById('btn-save-prod'); const ot = btn.innerText; btn.innerText = "Mengupload..."; btn.disabled = true;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s=>s.trim()).filter(s=>s);
    const isEdit = document.getElementById('prod-is-edit').value === "true";
    const newImages = [];
    tempImages.forEach((img, idx) => { if(img && img !== "EXISTING" && img.startsWith('data:image')) newImages.push({ index: idx, base64: img }); });
    
    const payload = { action: 'shop_save_product', id: document.getElementById('prod-id').value, nama: document.getElementById('prod-name').value, harga: document.getElementById('prod-price').value, diskon: document.getElementById('prod-disc').value, tipe_stok: document.getElementById('prod-type').value, stok: document.getElementById('prod-stock').value, varian: { sizes: sizes }, new_images: newImages, deleted_indexes: deletedIndexes, is_edit: isEdit };
    try { await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); closeProductModal(); fetchProducts(); showToast(isEdit ? "Produk diperbarui" : "Produk disimpan", "success"); } catch(err) { showToast("Gagal menyimpan", "error"); }
    btn.innerText = ot; btn.disabled = false;
}
async function deleteProduct(id) { if(!confirm("Hapus produk ini permanen?")) return; await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_delete_product', id: id }) }); fetchProducts(); showToast("Produk dihapus", "info"); }

// --- CHECKOUT LOGIC (SELECTED ITEMS ONLY) ---
let checkoutItems = []; // Variabel global sementara

function openCheckoutForm(directItem = null) { 
    
    // 1. SET DATA ITEM (Cepat, Sync)
    if (directItem) {
        isDirectBuy = true;
        checkoutItems = [directItem];
    } else {
        isDirectBuy = false;
        checkoutItems = cart.filter(item => item.checked);
    }

    if(!isDirectBuy && checkoutItems.length === 0) {
        return showToast("Pilih minimal 1 barang untuk checkout", "error"); 
    }
    
    // 2. RESET FORM & UI (Cepat, Sync)
    document.getElementById('checkout-form').reset();
    document.getElementById('payment-info-container').innerHTML = ''; 
    document.getElementById('payment-info-container').classList.add('hidden');
    document.getElementById('cicilan-group').classList.add('hidden');
    
    // 3. RENDER SUMMARY ITEM (Cepat, Sync)
    const summaryList = document.getElementById('checkout-summary-list');
    summaryList.innerHTML = '';
    let totalCheckout = 0;
    
    checkoutItems.forEach(item => {
        totalCheckout += item.harga * item.qty;
        summaryList.innerHTML += `
        <div class="flex justify-between text-xs text-slate-600 border-b border-dashed border-slate-100 pb-1 last:border-0">
            <span class="truncate max-w-[200px]">${item.nama} <span class="text-slate-400">(${item.size})</span></span>
            <span class="font-bold">x${item.qty}</span>
        </div>`;
    });
    document.getElementById('checkout-final-total').innerText = "Rp " + totalCheckout.toLocaleString('id-ID');

    // Reset Style Pembayaran
    document.querySelectorAll('.pay-option').forEach(el => {
        el.classList.remove('border-brand-500', 'bg-brand-50', 'ring-1', 'ring-brand-500');
        el.querySelector('.check-circle').classList.remove('bg-brand-500', 'border-brand-500');
        el.querySelector('.check-circle i').classList.add('opacity-0');
    });

    // 4. SETUP LOGIKA CICILAN (TAMPILKAN LOADING DULU)
    const radioCicil = document.querySelector('input[value="cicil"]');
    const containerCicil = document.getElementById('div-cicilan');
    const labelCicil = document.getElementById('label-cicilan');

    // Default: Disable dulu & Tampilkan Loading
    disableCicilanOption(radioCicil, containerCicil, "Memuat status...");
    containerCicil.querySelector('span').innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Cek Status...`;

    // Pastikan Opsi Lunas Tercentang Awal
    document.querySelector('input[value="full"]').checked = true;
    toggleCicilanInput();

    // 5. TAMPILKAN MODAL LANGSUNG (Instant Feedback)
    document.getElementById('cart-modal').classList.add('hidden'); 
    document.getElementById('checkout-modal').classList.remove('hidden'); 

    // 6. JALANKAN PENGECEKAN DI BACKGROUND (Async)
    runCicilanCheck(checkoutItems, radioCicil, containerCicil, labelCicil);
}

// FUNGSI BARU: Pengecekan Terpisah
async function runCicilanCheck(items, radio, div, label) {
    // Cek 1: Jumlah Barang
    if (items.length > 1) {
        return disableCicilanOption(radio, div, "Hanya untuk 1 barang");
    } 
    // Cek 2: Qty Barang
    if (items[0].qty > 1) {
        return disableCicilanOption(radio, div, "Maksimal Qty 1");
    }

    // Cek 3: Hutang ke Server (Ini yang bikin lama)
    try {
        const hasDebt = await checkUserDebt();
        
        if (hasDebt) {
            disableCicilanOption(radio, div, "Lunasi tagihan lama");
        } else {
            // JIKA LOLOS SEMUA SYARAT -> ENABLE TOMBOL
            enableCicilanOption(radio, div, label);
        }
    } catch (e) {
        // Jika error koneksi/server, aman-nya disable saja atau allow (tergantung kebijakan)
        // Disini kita allow saja agar user tidak macet
        enableCicilanOption(radio, div, label);
    }
}

// HELPER: Mengaktifkan Kembali Tombol Cicilan
function enableCicilanOption(inputEl, divEl, labelEl) {
    inputEl.disabled = false;
    
    if(labelEl) labelEl.classList.remove('pointer-events-none', 'opacity-60');

    divEl.classList.remove('bg-slate-100', 'border-slate-200', 'text-slate-400');
    // Tambahkan class hover dan style aktif
    divEl.classList.add('bg-white', 'hover:border-orange-300', 'hover:bg-orange-50', 'hover:shadow-md'); 
    
    divEl.querySelector('span').innerHTML = `<i class="fa-solid fa-clock mr-1"></i> Cicilan / DP`;
}

function disableCicilanOption(inputEl, divEl, reason) {
    inputEl.disabled = true;
    
    // Matikan interaksi pada label pembungkusnya agar tidak bisa di-klik/hover
    const labelParent = inputEl.closest('label');
    if(labelParent) {
        labelParent.classList.add('pointer-events-none', 'opacity-60'); // Tambahkan pointer-events-none
    }

    // Ubah visual div bagian dalam
    divEl.classList.add('bg-slate-100', 'border-slate-200', 'text-slate-400');
    divEl.classList.remove('hover:border-orange-300', 'hover:bg-orange-50', 'hover:shadow-md', 'bg-white'); // Hapus class hover
    
    // Ubah text
    divEl.querySelector('span').innerHTML = `<i class="fa-solid fa-lock mr-1"></i> ${reason}`;
}
// Fungsi Helper Cek Hutang ke API
async function checkUserDebt() {
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: JSON.stringify({ 
                action: 'shop_get_orders', 
                nia: currentUser.nia, 
                is_admin: false, 
                _ts: new Date().getTime() 
            }) 
        });
        const data = await res.json();
        if(data.status && data.orders) {
            // Cek apakah ada order yang status bayarnya BUKAN 'Lunas'
            const unpaidOrder = data.orders.find(o => o.status_bayar !== 'Lunas');
            return !!unpaidOrder; // Return true jika ada yang belum lunas
        }
    } catch(e) { return false; }
    return false;
}
function closeCheckoutForm() { document.getElementById('checkout-modal').classList.add('hidden'); }
function updatePaymentInfo() {
    const method = document.getElementById('pay-method').value;
    const container = document.getElementById('payment-info-container');
    container.classList.remove('hidden');
    let content = "";
    if (method === 'QRIS') content = `<div class="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm"><div class="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 mb-3"><i class="fa-solid fa-qrcode"></i> Scan QRIS</div><img src="https://drive.google.com/thumbnail?sz=w1000&id=1ag2in9KvkPRHK0SwFuDoLBpxCY9WK8L8" class="mx-auto w-40 rounded-lg cursor-zoom-in hover:scale-105 transition-transform" onclick="window.open(this.src)"></div>`;
    else if (method === 'Transfer Bank BTN') content = `<div class="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center gap-4"><div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm"><i class="fa-solid fa-building-columns"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank BTN</p><p class="font-mono text-lg font-bold text-slate-800 cursor-pointer hover:text-brand-600 transition-colors" onclick="navigator.clipboard.writeText('2410-1610-2455-77');showToast('Disalin!')">2410-1610-2455-77 <i class="fa-regular fa-copy text-xs ml-1 opacity-50"></i></p><p class="text-xs text-slate-500">a.n Fathir Ahmad Maulana</p></div></div>`;
    else if (method === 'Gopay') content = `<div class="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center gap-4"><div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm"><i class="fa-solid fa-wallet"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gopay / Dana</p><p class="font-mono text-lg font-bold text-slate-800 cursor-pointer hover:text-brand-600 transition-colors" onclick="navigator.clipboard.writeText('082112964343');showToast('Disalin!')">082112964343 <i class="fa-regular fa-copy text-xs ml-1 opacity-50"></i></p><p class="text-xs text-slate-500">a.n Fathir Ahmad Maulana</p></div></div>`;
    container.innerHTML = content;
}
function toggleCicilanInput() { document.getElementById('cicilan-group').classList.toggle('hidden', document.querySelector('input[name="pay-type"]:checked').value !== 'cicil'); }
function previewFile() { const input = document.getElementById('pay-proof'); if(input.files && input.files[0]) document.getElementById('drop-content-text').innerHTML = `<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-500"><i class="fa-solid fa-check"></i></div><p class="text-xs font-bold text-slate-700 truncate max-w-[150px] mx-auto">${input.files[0].name}</p>`; }
function toBase64(file) { return new Promise((r, j) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result); reader.onerror = error => j(error); }); }
async function handleCheckout(e) {
    e.preventDefault(); 
    const btn = document.getElementById('btn-confirm-pay'); 
    const ot = btn.innerHTML; 
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memproses...'; 
    btn.disabled = true;

    const method = document.getElementById('pay-method').value; 
    if(!method) { showToast("Pilih metode pembayaran", "error"); btn.disabled=false; btn.innerHTML=ot; return; }
    
    const totalTagihan = checkoutItems.reduce((a,b)=>a+(b.harga*b.qty), 0); 
    const tipeBayar = document.querySelector('input[name="pay-type"]:checked').value; 
    let bayarAwal = totalTagihan;

    if (tipeBayar === 'cicil') { 
        bayarAwal = parseInt(document.getElementById('pay-nominal-input').value) || 0; 
        if(bayarAwal <= 0) { showToast("Masukkan nominal DP", "error"); btn.disabled=false; btn.innerHTML=ot; return; } 
    }
    
    const fileInput = document.getElementById('pay-proof'); 
    if (fileInput.files.length === 0) { showToast("Mohon upload bukti transfer", "error"); btn.disabled=false; btn.innerHTML=ot; return; }
    
    try {
        const base64 = await toBase64(fileInput.files[0]);
        const payload = { 
            action: 'shop_checkout', 
            nia: currentUser.nia, 
            nama: currentUser.nama, 
            items: checkoutItems.map(c => ({ id: c.id, nama: c.nama, qty: c.qty, size: c.size, harga: c.harga, gambar: c.gambar })), // Kirim gambar juga utk history
            total_tagihan: totalTagihan, 
            bayar_awal: bayarAwal, 
            metode: method, 
            bukti_base64: base64 
        };
        
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        const data = await res.json();
        
       if(data.status) { 
    showToast("Pesanan Berhasil!", "success"); 

    if (!isDirectBuy) {
        cart = cart.filter(item => !item.checked); // Hapus item yang dibeli dari keranjang
        saveCart(); // Simpan keranjang sisa
    }

    closeCheckoutForm(); 
    setTimeout(() => switchTab('my-orders'), 1000);
        } else { 
            showToast(data.message, "error"); 
        }
    } catch(err) { showToast("Koneksi gagal", "error"); }
    btn.innerHTML = ot; btn.disabled = false;
}

// --- UPDATE ORDER HISTORY (WITH IMAGES) ---
async function fetchMyOrders() {
    const container = document.getElementById('my-orders-list'); 
    container.innerHTML = '<div class="text-center py-20 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><p>Memuat riwayat...</p></div>';
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_get_orders', nia: currentUser.nia, is_admin: false, _ts: new Date().getTime() }) });
        const data = await res.json();
        if(data.status) {
            container.innerHTML = ""; 
            if(data.orders.length === 0) { container.innerHTML = '<div class="text-center py-10"><p class="text-slate-400 text-sm">Belum ada riwayat pesanan.</p></div>'; return; }
            
            data.orders.reverse().forEach((o, index) => {
                const sisa = o.total - o.terbayar; 
                const isLunas = o.status_bayar === 'Lunas'; 
                const logistik = (o.status_logistik || 'Menunggu').trim();
                const itemsJson = encodeURIComponent(JSON.stringify(o.items));
                
                // Button Cicilan Logic
                let btnCicilanHtml = '';
                if (!isLunas && sisa > 0) {
                    btnCicilanHtml = `<button onclick="openInstallmentModal('${o.id}', ${sisa})" class="w-full mt-3 py-2.5 rounded-xl bg-orange-50 text-orange-600 font-bold text-xs border border-orange-200 hover:bg-orange-100 transition-all flex items-center justify-center gap-2"><i class="fa-solid fa-wallet"></i> Bayar Sisa Tagihan (Rp ${sisa.toLocaleString()})</button>`;
                }

                container.innerHTML += `
                <div class="bg-white border border-slate-100 rounded-[20px] p-5 shadow-sm hover:shadow-md transition-all duration-300 stagger-${(index%3)+1} animate-fade-up">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><i class="fa-solid fa-bag-shopping"></i></div>
                            <div>
                                <div class="flex items-center gap-2 mb-0.5"><span class="font-mono text-xs font-bold text-slate-400">#${o.id.substr(-6)}</span><span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">${logistik}</span></div>
                                <div class="text-[10px] text-slate-400 font-medium">${o.tanggal}</div>
                            </div>
                        </div>
                        <button onclick="openReceipt('${o.id}', '${itemsJson}', '${o.status_bayar}', '${parseInt(o.total)}', '${o.tanggal}', '${o.metode}', '${o.nama}')" class="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all text-xs font-bold border border-slate-200 hover:border-slate-900">Nota</button>
                    </div>
                    
                    <div class="space-y-3 mb-4">
                         ${o.items.map(i => `
                         <div class="flex gap-3 items-center">
                            <img src="${i.gambar || 'https://placehold.co/100'}" class="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-50" onerror="this.src='https://placehold.co/100'">
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-slate-700 truncate">${i.nama}</p>
                                <p class="text-[10px] text-slate-400">${i.size ? 'Size: '+i.size : 'All Size'}</p>
                            </div>
                            <span class="font-bold text-slate-800 text-xs">x${i.qty}</span>
                         </div>
                         `).join('')}
                    </div>

                    <div class="pt-3 border-t border-dashed border-slate-100">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total</span>
                            <span class="font-serif font-bold text-slate-900 text-lg">Rp ${parseInt(o.total).toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] text-slate-400">Status Bayar</span>
                            <span class="text-[9px] font-bold uppercase tracking-widest ${isLunas ? 'text-green-600 bg-green-50 border-green-100' : 'text-orange-600 bg-orange-50 border-orange-100'} px-2 py-0.5 rounded border">${isLunas ? 'Lunas' : 'Cicilan'}</span>
                        </div>
                        ${btnCicilanHtml}
                    </div>
                </div>`;
            });
        }
    } catch(e) { container.innerHTML = "Gagal memuat."; }
}

// === FUNGSI OPEN RECEIPT (FIXED HEIGHT & SCROLL) ===
function openReceipt(id, itemsJson, status, total, date, method, name) {
    document.getElementById('receipt-modal').classList.remove('hidden');
    
    // Set Data Teks
    document.getElementById('receipt-id').innerText = id;
    document.getElementById('receipt-date').innerText = date;
    document.getElementById('receipt-method').innerText = method;
    document.getElementById('receipt-name').innerText = name || currentUser.nama;
    document.getElementById('receipt-total').innerText = "Rp " + parseInt(total).toLocaleString('id-ID');
    
    // Status Badge Logic
    const stEl = document.getElementById('receipt-status'); 
    stEl.innerText = status;
    stEl.className = "inline-block mb-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border";
    
    if(status === 'Lunas') { 
        stEl.classList.add("bg-green-50", "text-green-600", "border-green-200"); 
    } else { 
        stEl.classList.add("bg-orange-50", "text-orange-600", "border-orange-200"); 
    }

    // Render Items
    const items = JSON.parse(decodeURIComponent(itemsJson));
    document.getElementById('receipt-details').innerHTML = items.map(i => `
        <div class="flex justify-between items-start text-[10px] border-b border-dashed border-slate-200 last:border-0 pb-1.5 last:pb-0">
            <div class="flex-1 pr-2">
                <p class="font-bold text-slate-700 leading-tight line-clamp-2">${i.nama}</p>
                <p class="text-[9px] text-slate-400 mt-0.5">${i.size ? 'Size: '+i.size : 'All Size'}</p>
            </div>
            <div class="text-right whitespace-nowrap">
                <span class="font-bold text-slate-900">x${i.qty}</span>
            </div>
        </div>
    `).join('');

    // Generate QR Code (Ukuran Pas: 70px)
  const container = document.getElementById("barcode-display"); 
    container.innerHTML = ""; 
    
    setTimeout(() => { 
        new QRCode(container, { 
            text: id, 
            width: 256,  // Render Resolusi Tinggi (256px)
            height: 256, 
            colorDark : "#000000", // Hitam pekat agar kontras tajam
            colorLight : "#ffffff", 
            correctLevel : QRCode.CorrectLevel.H // Level 'H' (High) agar lebih detail & padat
        }); 
    }, 100);
}

function closeReceiptModal() { document.getElementById('receipt-modal').classList.add('hidden'); }
async function fetchAdminOrders() {
    const container = document.getElementById('admin-orders-list'); if(!container) return; container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mb-2"></i> Loading...</div>';
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_get_orders', nia: currentUser.nia, is_admin: true, _ts: new Date().getTime() }) }); const data = await res.json();
        if(data.status) {
            container.innerHTML = ""; if(data.orders.length === 0) { container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">Belum ada pesanan masuk.</div>'; return; }
            data.orders.forEach(o => {
                const sisa = o.total - o.terbayar; const log = (o.status_logistik || 'Menunggu').trim();
                const opts = ['Menunggu', 'Diproses', 'Dalam Perjalanan', 'Selesai', 'Dibatalkan'].map(st => `<option value="${st}" ${st === log ? 'selected' : ''}>${st}</option>`).join('');
                container.innerHTML += `
                <div class="bg-white border border-slate-100 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-all">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-mono text-xs font-bold text-brand-600">#${o.id.substr(-6)}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 font-bold text-slate-500">${o.status_bayar}</span>
                            </div>
                            <h4 class="font-bold text-slate-800 text-sm">${o.nama}</h4>
                        </div>
                        <select onchange="handleStatusChange(this, '${o.id}', '${o.nama}', '${o.no_hp}')" class="text-[10px] font-bold uppercase p-2 pl-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 focus:border-brand-500 outline-none cursor-pointer hover:bg-white transition-colors">
                            ${opts}
                        </select>
                    </div>
                    
                    <div class="bg-slate-50/50 rounded-xl p-3 mb-4 text-xs space-y-1 border border-slate-50">
                        ${o.items.map(i => `<div class="text-slate-600 flex justify-between"><span>${i.nama}</span> <span class="font-bold">x${i.qty}</span></div>`).join('')}
                    </div>
                    
                    <div class="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                        <div class="${sisa <= 0 ? 'text-green-600' : 'text-orange-600'} font-bold text-xs">
                            ${sisa <= 0 ? '<i class="fa-solid fa-check-double mr-1"></i> LUNAS' : 'Sisa: Rp ' + sisa.toLocaleString()}
                        </div>
                        <div class="flex gap-2">
                            ${o.bukti ? `<a href="${o.bukti}" target="_blank" class="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50">Bukti</a>` : ''}
                            <button onclick="window.open('https://wa.me/${formatWA(o.no_hp)}')" class="text-slate-400 hover:text-green-600 px-2 transition-colors"><i class="fa-brands fa-whatsapp text-lg"></i></button>
                        </div>
                    </div>
                </div>`;
            });
        }
    } catch(e) { container.innerHTML = "Gagal memuat."; }
}
function handleStatusChange(selectEl, orderId, name, phone) {
    const val = selectEl.value;
    if (val === 'Diproses') { window.open(`https://wa.me/${formatWA(phone)}?text=${encodeURIComponent("Halo " + name + ", pesanan ID *" + orderId + "* sedang kami PROSES. Mohon ditunggu ya!")}`, '_blank'); updateStatusApi(orderId, val); }
    else if (val === 'Dalam Perjalanan') { window.open(`https://wa.me/${formatWA(phone)}?text=${encodeURIComponent("Halo " + name + ", pesanan *" + orderId + "* sudah DIKIRIM / Siap Diambil.")}`, '_blank'); updateStatusApi(orderId, val); }
    else if (val === 'Selesai') { pendingOrderIdForScan = orderId; openScannerModal(orderId); }
    else { if(confirm(`Ubah status menjadi ${val}?`)) updateStatusApi(orderId, val); else fetchAdminOrders(); }
}
async function updateStatusApi(id, status) { await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_update_status', id_transaksi: id, status_baru: status, admin_nia: currentUser.nia }) }); fetchAdminOrders(); }
function formatWA(num) { if(!num) return ""; num = num.toString().replace(/[^0-9]/g, ""); if(num.startsWith('0')) return '62'+num.substring(1); return num; }
function openScannerModal(expectedId) {
    document.getElementById('scanner-modal').classList.remove('hidden');
    document.getElementById('btn-manual-confirm').onclick = function() {
        if(confirm("Selesaikan tanpa scan?")) { closeScannerModal(); updateStatusApi(expectedId, 'Selesai'); }
    };
    if(html5QrcodeScanner) html5QrcodeScanner.clear();
    html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
    html5QrcodeScanner.render((decodedText) => {
        if(decodedText === expectedId) {
            showToast("Pesanan Tervalidasi!", "success");
            html5QrcodeScanner.clear(); closeScannerModal(); updateStatusApi(expectedId, 'Selesai');
        } else { showToast("QR Code tidak cocok!", "error"); }
    });
}
function closeScannerModal() { document.getElementById('scanner-modal').classList.add('hidden'); if(html5QrcodeScanner) html5QrcodeScanner.clear(); pendingOrderIdForScan = null; fetchAdminOrders(); }

// --- CICILAN HANDLER ---
function openInstallmentModal(orderId, sisa) {
    document.getElementById('installment-modal').classList.remove('hidden');
    document.getElementById('inst-order-id').innerText = "#" + orderId;
    document.getElementById('inst-id-hidden').value = orderId;
    document.getElementById('inst-sisa-tagihan').innerText = "Rp " + parseInt(sisa).toLocaleString('id-ID');
    document.getElementById('inst-nominal').value = ""; // Reset input
    document.getElementById('inst-proof').value = ""; // Reset file
    document.getElementById('inst-drop-text').innerHTML = `<i class="fa-solid fa-camera text-xl text-slate-300 group-hover:text-brand-500 mb-1 transition-colors"></i><p class="text-[10px] font-bold text-slate-400">Upload Bukti</p>`;
}

function closeInstallmentModal() {
    document.getElementById('installment-modal').classList.add('hidden');
}

function previewInstFile() {
    const input = document.getElementById('inst-proof');
    if(input.files && input.files[0]) {
        document.getElementById('inst-drop-text').innerHTML = `<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1 text-green-500"><i class="fa-solid fa-check"></i></div><p class="text-[9px] font-bold text-slate-700 truncate max-w-[100px] mx-auto">${input.files[0].name}</p>`;
    }
}

async function submitInstallment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-inst');
    const ot = btn.innerText;
    btn.innerText = "Mengirim..."; 
    btn.disabled = true;

    const id = document.getElementById('inst-id-hidden').value;
    const nominal = parseInt(document.getElementById('inst-nominal').value);
    const fileInput = document.getElementById('inst-proof');

    if (!nominal || nominal <= 0) { 
        showToast("Masukkan nominal pembayaran", "error"); 
        btn.disabled = false; btn.innerText = ot; return; 
    }
    if (fileInput.files.length === 0) { 
        showToast("Upload bukti transfer", "error"); 
        btn.disabled = false; btn.innerText = ot; return; 
    }

    try {
        const base64 = await toBase64(fileInput.files[0]);
        const payload = {
            action: 'shop_pay_installment',
            id_transaksi: id,
            nominal: nominal,
            bukti_base64: base64
        };

        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        const data = await res.json();

        if (data.status) {
            showToast("Pembayaran cicilan berhasil!", "success");
            closeInstallmentModal();
            fetchMyOrders(); // Refresh list
        } else {
            showToast(data.message, "error");
        }
    } catch (err) {
        showToast("Koneksi gagal", "error");
    }

    btn.innerText = ot;
    btn.disabled = false;
}

function selectPaymentMethod(value, el) {
    document.getElementById('pay-method').value = value;
    
    // Reset All Visuals
    document.querySelectorAll('.pay-option').forEach(opt => {
        opt.classList.remove('border-brand-500', 'bg-brand-50', 'ring-1', 'ring-brand-500');
        opt.querySelector('.check-circle').classList.remove('bg-brand-500', 'border-brand-500');
        opt.querySelector('.check-circle i').classList.add('opacity-0');
    });

    // Set Active Visual
    el.classList.add('border-brand-500', 'bg-brand-50', 'ring-1', 'ring-brand-500');
    el.querySelector('.check-circle').classList.add('bg-brand-500', 'border-brand-500');
    el.querySelector('.check-circle i').classList.remove('opacity-0');

    updatePaymentInfo();
}