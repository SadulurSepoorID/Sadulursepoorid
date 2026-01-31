let currentUser = JSON.parse(localStorage.getItem('user_session'));
let cart = JSON.parse(localStorage.getItem('sadulur_cart')) || [];
let products = [];
let cropper = null; 
let html5QrcodeScanner = null;
let pendingOrderIdForScan = null;

// --- GLOBAL VARS UNTUK MULTI-UPLOAD ADMIN ---
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
        setTimeout(() => overlay.classList.add('hidden'), 500);
    }
}
function logoutLocal() { localStorage.removeItem('user_session'); window.location.replace("../login/index.html"); }

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
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
    let colorClass = 'border-l-4 border-brand-500 text-brand-900'; let icon = 'fa-circle-info';
    if(type === 'success') { colorClass = 'border-l-4 border-green-500 text-green-800'; icon = 'fa-circle-check text-green-500'; }
    if(type === 'error') { colorClass = 'border-l-4 border-red-500 text-red-800'; icon = 'fa-circle-exclamation text-red-500'; }
    toast.className = `bg-white/95 backdrop-blur pl-4 pr-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform transition-all duration-500 translate-x-10 opacity-0 mb-3 ${colorClass}`;
    toast.innerHTML = `<i class="fa-solid ${icon} text-lg"></i> <span class="font-medium text-sm">${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-x-10', 'opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0', 'translate-x-10'); setTimeout(()=>toast.remove(), 500); }, 3000);
}

function switchTab(tabName) {
    document.querySelectorAll('.view-section').forEach(el => { el.classList.add('hidden'); el.classList.remove('animate-fade-up'); });
    const target = document.getElementById('view-' + tabName);
    if(target) { target.classList.remove('hidden'); void target.offsetWidth; target.classList.add('animate-fade-up'); }
    
    const titleEl = document.getElementById('page-title'); const subEl = document.getElementById('page-subtitle');
    if(tabName === 'catalog') { titleEl.innerText = 'Katalog Terbaru'; subEl.innerText = 'Koleksi eksklusif untuk anggota.'; }
    else if(tabName === 'my-orders') { titleEl.innerText = 'Riwayat Pesanan'; subEl.innerText = 'Pantau status dan tagihan Anda.'; fetchMyOrders(); }
    else if(tabName === 'admin-product') { titleEl.innerText = 'Database Produk'; subEl.innerText = 'Manajemen stok dan harga.'; }
    else if(tabName === 'admin-orders') { titleEl.innerText = 'Pesanan Masuk'; subEl.innerText = 'Verifikasi pembayaran member.'; fetchAdminOrders(); }
}

function renderSkeleton() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = Array(4).fill(0).map(() => `<div class="bg-white rounded-[2rem] p-4 border border-slate-100 shadow-sm"><div class="aspect-square bg-slate-100 rounded-2xl animate-pulse mb-4"></div><div class="h-4 bg-slate-100 rounded w-3/4 mb-2 animate-pulse"></div><div class="h-4 bg-slate-100 rounded w-1/2 animate-pulse"></div></div>`).join('');
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
    if(list.length === 0) { grid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Belum ada produk.</div>'; return; }
    
    list.forEach((p, index) => {
        const isPO = p.tipe_stok === 'PO';
        const isHabis = !isPO && p.stok <= 0;
        const harga = parseInt(p.harga);
        const diskon = parseInt(p.diskon || 0);
        
        let images = Array.isArray(p.gambar) ? p.gambar : [p.gambar];
        images = images.filter(x => x); 
        if(images.length === 0) images = ['https://placehold.co/400x400'];

        let sliderHtml = '';
        if (images.length > 1) {
            const slides = images.map(src => `<div class="snap-center shrink-0 w-full h-full"><img src="${src}" loading="lazy" class="w-full h-full object-cover"></div>`).join('');
            const dots = images.map((_, i) => `<div class="img-dot ${i===0?'active':''}" id="dot-${p.id}-${i}"></div>`).join('');
            sliderHtml = `<div class="flex overflow-x-auto snap-x scrollbar-hide w-full h-full relative z-10" onscroll="updateDots(this, '${p.id}', ${images.length})">${slides}</div><div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">${dots}</div>`;
        } else {
            sliderHtml = `<img src="${images[0]}" loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">`;
        }

        let priceHtml = `<span class="font-bold text-slate-900 text-lg">Rp ${harga.toLocaleString('id-ID')}</span>`;
        if(diskon > 0) priceHtml = `<div class="flex flex-col"><span class="text-xs text-slate-400 line-through">Rp ${(harga + diskon).toLocaleString('id-ID')}</span><span class="font-bold text-red-500 text-lg">Rp ${harga.toLocaleString('id-ID')}</span></div>`;
        
        let badge = isPO ? `<span class="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur text-brand-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">Pre-Order</span>` : `<span class="absolute top-4 left-4 z-30 bg-white/90 backdrop-blur text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">Ready Stock</span>`;
        if(isHabis) badge = `<span class="absolute top-4 left-4 z-30 bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wide">Sold Out</span>`;
        
        let varianObj = {sizes:[]}; try { varianObj = JSON.parse(p.varian); } catch(e){}
        let selectHtml = (varianObj.sizes && varianObj.sizes.length > 0) ? `<select class="size-select-${p.id} w-full mb-3 p-2 text-xs bg-slate-50 border-none rounded-lg font-medium text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors">${varianObj.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}</select>` : `<input type="hidden" class="size-select-${p.id}" value="All Size">`;

        grid.innerHTML += `
            <div class="group bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-2xl hover:shadow-brand-900/10 transition-all duration-500 relative flex flex-col border border-slate-50 stagger-${(index%3)+1} animate-fade-up">
                <div class="relative aspect-square rounded-[1.5rem] overflow-hidden bg-slate-100 mb-4 isolate">${badge}${sliderHtml}</div>
                <div class="px-2 pb-2 flex-1 flex flex-col">
                    <h3 class="font-serif font-bold text-slate-800 text-lg leading-snug line-clamp-2 mb-1 group-hover:text-brand-600 transition-colors">${p.nama}</h3>
                    <div class="mb-4">${priceHtml}</div>
                    <div class="mt-auto">
                        ${selectHtml}
                        <div class="flex gap-2">
                            <button onclick="addToCart('${p.id}')" ${isHabis?'disabled':''} class="w-10 h-10 bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center active:scale-95 ${isHabis ? 'opacity-50 cursor-not-allowed':''}"><i class="fa-solid fa-cart-plus"></i></button>
                            <button onclick="buyNow('${p.id}')" ${isHabis?'disabled':''} class="flex-1 h-10 bg-slate-900 text-white hover:bg-brand-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 ${isHabis ? 'bg-slate-300 shadow-none cursor-not-allowed':''}">${isHabis ? 'Habis' : 'Beli Sekarang'}</button>
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
    const prod = products.find(p => p.id == id); if (!prod) return;
    const size = document.querySelector(`.size-select-${id}`)?.value || "All Size";
    const existing = cart.find(c => c.id == id && c.size == size);
    let firstImg = Array.isArray(prod.gambar) ? (prod.gambar[0] || 'https://placehold.co/100') : prod.gambar;
    if (existing) { if(prod.tipe_stok === 'Ready' && existing.qty >= prod.stok) return showToast("Stok maksimal tercapai!", "error"); existing.qty++; } else { cart.push({ ...prod, qty: 1, size: size, gambar: firstImg }); }
    saveCart(); showToast("Produk ditambahkan", "success");
}
function buyNow(id) {
    const prod = products.find(p => p.id == id); if (!prod) return;
    const size = document.querySelector(`.size-select-${id}`)?.value || "All Size";
    const existing = cart.find(c => c.id == id && c.size == size);
    let firstImg = Array.isArray(prod.gambar) ? (prod.gambar[0] || 'https://placehold.co/100') : prod.gambar;
    if (existing) { if(prod.tipe_stok === 'Ready' && existing.qty >= prod.stok) { openCheckoutForm(); return; } existing.qty++; } else { cart.push({ ...prod, qty: 1, size: size, gambar: firstImg }); }
    saveCart(); openCheckoutForm();
}
function updateCartUI() { const count = cart.reduce((a,b)=>a+b.qty, 0); const badge = document.getElementById('cart-count'); badge.innerText = count; badge.classList.remove('scale-0'); badge.classList.add('scale-100'); setTimeout(() => badge.classList.remove('scale-100'), 200); }
function toggleCart() { const modal = document.getElementById('cart-modal'); if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); renderCartItems(); } else { modal.classList.add('hidden'); } }
function renderCartItems() {
    const container = document.getElementById('cart-items'); container.innerHTML = ""; let total = 0;
    if(cart.length === 0) { container.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-slate-300"><i class="fa-solid fa-basket-shopping text-4xl mb-3 opacity-50"></i><p>Keranjang kosong</p></div>`; document.getElementById('cart-total').innerText = "Rp 0"; return; }
    cart.forEach((item, index) => { total += item.harga * item.qty; container.innerHTML += `<div class="flex gap-4 items-center bg-slate-50 p-2 rounded-2xl"><img src="${item.gambar}" class="w-16 h-16 rounded-xl object-cover bg-white shadow-sm"><div class="flex-1"><h4 class="font-bold text-slate-800 text-sm line-clamp-1">${item.nama}</h4><div class="text-xs text-slate-500 mt-0.5 mb-1">${item.size}</div><div class="flex items-center justify-between"><span class="text-brand-900 font-bold text-sm">Rp ${item.harga.toLocaleString()}</span><span class="text-xs bg-white px-2 py-0.5 rounded shadow-sm text-slate-600 font-bold">x${item.qty}</span></div></div><button class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" onclick="removeItem(${index})"><i class="fa-solid fa-trash text-xs"></i></button></div>`; }); document.getElementById('cart-total').innerText = "Rp " + total.toLocaleString('id-ID');
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
    const base64 = cropper.getCroppedCanvas({ width: 600, height: 600, fillColor: '#fff' }).toDataURL('image/jpeg', 0.8);
    tempImages[activeSlotIndex] = base64;
    const slot = document.getElementById(`slot-${activeSlotIndex}`);
    slot.style.backgroundImage = `url(${base64})`;
    slot.classList.add('filled');
    slot.querySelector('.slot-placeholder').classList.add('hidden');
    slot.querySelector('.btn-remove').classList.remove('hidden');
    slot.querySelector('.btn-remove').classList.add('flex');
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
    slot.querySelector('.btn-remove').classList.remove('flex');
}

// --- ADMIN PRODUCTS ---
function renderAdminProductList(list) {
    const tbody = document.getElementById('admin-product-list'); if(!tbody) return; tbody.innerHTML = "";
    list.forEach(p => { 
        let img = Array.isArray(p.gambar) ? (p.gambar[0] || 'https://placehold.co/100') : p.gambar;
        tbody.innerHTML += `<tr class="hover:bg-slate-50 transition-colors"><td class="p-4"><div class="flex items-center gap-3"><img src="${img}" class="w-10 h-10 rounded-lg object-cover bg-slate-200" onerror="this.src='https://placehold.co/100'"><div><div class="font-bold text-slate-800 text-sm">${p.nama}</div><small class="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">${p.tipe_stok}</small></div></div></td><td class="p-4 font-mono text-sm text-slate-600">Rp ${parseInt(p.harga).toLocaleString()}</td><td class="p-4 text-center"><span class="${p.stok > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded text-xs font-bold">${p.stok}</span></td><td class="p-4 text-right"><button onclick="openEditProduct('${p.id}')" class="text-slate-400 hover:text-brand-900 w-8 h-8 rounded-full hover:bg-slate-100 mr-1"><i class="fa-solid fa-pen-to-square"></i></button><button onclick="deleteProduct('${p.id}')" class="text-slate-400 hover:text-red-500 w-8 h-8 rounded-full hover:bg-red-50"><i class="fa-solid fa-trash"></i></button></td></tr>`; 
    });
}
function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = "";
    document.getElementById('prod-is-edit').value = "false";
    document.getElementById('modal-title').innerText = "Tambah Produk";
    document.getElementById('btn-save-prod').innerText = "Simpan";
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
            slot.querySelector('.btn-remove').classList.add('flex');
        }
    });
    document.getElementById('product-modal').classList.remove('hidden');
}
function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); if(cropper) { cropper.destroy(); cropper = null; } }
function toggleStockInput() { document.getElementById('stok-group').style.display = document.getElementById('prod-type').value === 'Ready' ? 'block' : 'none'; }
async function saveProduct(e) {
    e.preventDefault(); const btn = document.getElementById('btn-save-prod'); const ot = btn.innerText; btn.innerText = "Processing..."; btn.disabled = true;
    const sizes = document.getElementById('prod-sizes').value.split(',').map(s=>s.trim()).filter(s=>s);
    const isEdit = document.getElementById('prod-is-edit').value === "true";
    const newImages = [];
    tempImages.forEach((img, idx) => { if(img && img !== "EXISTING" && img.startsWith('data:image')) newImages.push({ index: idx, base64: img }); });
    
    const payload = { action: 'shop_save_product', id: document.getElementById('prod-id').value, nama: document.getElementById('prod-name').value, harga: document.getElementById('prod-price').value, diskon: document.getElementById('prod-disc').value, tipe_stok: document.getElementById('prod-type').value, stok: document.getElementById('prod-stock').value, varian: { sizes: sizes }, new_images: newImages, deleted_indexes: deletedIndexes, is_edit: isEdit };
    try { await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); closeProductModal(); fetchProducts(); showToast(isEdit ? "Updated" : "Saved", "success"); } catch(err) { showToast("Gagal", "error"); }
    btn.innerText = ot; btn.disabled = false;
}
async function deleteProduct(id) { if(!confirm("Hapus produk ini?")) return; await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_delete_product', id: id }) }); fetchProducts(); showToast("Produk dihapus", "info"); }

// --- CHECKOUT & OTHERS ---
function openCheckoutForm() { 
    if(cart.length === 0) return showToast("Keranjang kosong", "error"); 
    document.getElementById('checkout-form').reset();
    document.getElementById('payment-info-container').innerHTML = ''; document.getElementById('payment-info-container').classList.add('hidden');
    document.getElementById('cicilan-group').classList.add('hidden');
    document.getElementById('cart-modal').classList.add('hidden'); document.getElementById('checkout-modal').classList.remove('hidden'); 
}
function closeCheckoutForm() { document.getElementById('checkout-modal').classList.add('hidden'); }
function updatePaymentInfo() {
    const method = document.getElementById('pay-method').value;
    const container = document.getElementById('payment-info-container');
    container.classList.remove('hidden');
    let content = "";
    if (method === 'QRIS') content = `<div class="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm"><div class="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 mb-3"><i class="fa-solid fa-qrcode"></i> Scan QRIS</div><img src="https://drive.google.com/thumbnail?sz=w1000&id=1ag2in9KvkPRHK0SwFuDoLBpxCY9WK8L8" class="mx-auto w-40 rounded-lg cursor-zoom-in hover:scale-105 transition-transform" onclick="window.open(this.src)"></div>`;
    else if (method === 'Transfer Bank BTN') content = `<div class="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center gap-4"><div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm"><i class="fa-solid fa-building-columns"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank BTN</p><p class="font-mono text-lg font-bold text-slate-800 cursor-pointer hover:text-brand-600 transition-colors" onclick="navigator.clipboard.writeText('2410161-245577');showToast('Disalin!')">2410161-245577 <i class="fa-regular fa-copy text-xs ml-1 opacity-50"></i></p><p class="text-xs text-slate-500">a.n Fathir</p></div></div>`;
    else if (method === 'Gopay') content = `<div class="bg-green-50 rounded-2xl p-4 border border-green-100 flex items-center gap-4"><div class="w-12 h-12 bg-white rounded-full flex items-center justify-center text-green-600 shadow-sm"><i class="fa-solid fa-wallet"></i></div><div><p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gopay / Dana</p><p class="font-mono text-lg font-bold text-slate-800 cursor-pointer hover:text-brand-600 transition-colors" onclick="navigator.clipboard.writeText('082112964343');showToast('Disalin!')">082112964343 <i class="fa-regular fa-copy text-xs ml-1 opacity-50"></i></p><p class="text-xs text-slate-500">a.n Fathir</p></div></div>`;
    container.innerHTML = content;
}
function toggleCicilanInput() { document.getElementById('cicilan-group').classList.toggle('hidden', document.querySelector('input[name="pay-type"]:checked').value !== 'cicil'); }
function previewFile() { const input = document.getElementById('pay-proof'); if(input.files && input.files[0]) document.getElementById('drop-content-text').innerHTML = `<div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-500"><i class="fa-solid fa-check"></i></div><p class="text-xs font-bold text-slate-700 truncate max-w-[150px] mx-auto">${input.files[0].name}</p>`; }
function toBase64(file) { return new Promise((r, j) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => r(reader.result); reader.onerror = error => j(error); }); }
async function handleCheckout(e) {
    e.preventDefault(); const btn = document.getElementById('btn-confirm-pay'); const ot = btn.innerHTML; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...'; btn.disabled = true;
    const method = document.getElementById('pay-method').value; if(!method) { showToast("Pilih metode", "error"); btn.disabled=false; btn.innerHTML=ot; return; }
    const totalTagihan = cart.reduce((a,b)=>a+(b.harga*b.qty), 0); const tipeBayar = document.querySelector('input[name="pay-type"]:checked').value; let bayarAwal = totalTagihan;
    if (tipeBayar === 'cicil') { bayarAwal = parseInt(document.getElementById('pay-nominal-input').value) || 0; if(bayarAwal <= 0) { showToast("Masukkan DP", "error"); btn.disabled=false; btn.innerHTML=ot; return; } }
    const fileInput = document.getElementById('pay-proof'); if (fileInput.files.length === 0) { showToast("Upload bukti", "error"); btn.disabled=false; btn.innerHTML=ot; return; }
    try {
        const base64 = await toBase64(fileInput.files[0]);
        const payload = { action: 'shop_checkout', nia: currentUser.nia, nama: currentUser.nama, items: cart.map(c => ({ id: c.id, nama: c.nama, qty: c.qty, size: c.size, harga: c.harga })), total_tagihan: totalTagihan, bayar_awal: bayarAwal, metode: method, bukti_base64: base64 };
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); const data = await res.json();
        if(data.status) { showToast("Pesanan Berhasil!", "success"); cart=[]; saveCart(); closeCheckoutForm(); setTimeout(() => switchTab('my-orders'), 1000); } else { showToast(data.message, "error"); }
    } catch(err) { showToast("Koneksi gagal", "error"); }
    btn.innerHTML = ot; btn.disabled = false;
}
async function fetchMyOrders() {
    const container = document.getElementById('my-orders-list'); container.innerHTML = '<div class="text-center py-20 text-slate-300"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2"></i><p>Memuat riwayat...</p></div>';
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_get_orders', nia: currentUser.nia, is_admin: false, _ts: new Date().getTime() }) });
        const data = await res.json();
        if(data.status) {
            container.innerHTML = ""; if(data.orders.length === 0) { container.innerHTML = '<div class="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl"><p class="text-slate-400">Belum ada riwayat pesanan.</p></div>'; return; }
            data.orders.reverse().forEach((o, index) => {
                const sisa = o.total - o.terbayar; const isLunas = o.status_bayar === 'Lunas'; const logistik = (o.status_logistik || 'Menunggu').trim();
                let statusClass = 'bg-slate-100 text-slate-500'; let icon = 'fa-clock';
                if(logistik === 'Diproses') { statusClass = 'bg-blue-50 text-blue-600 border border-blue-100'; icon = 'fa-box-open'; }
                if(logistik === 'Dalam Perjalanan') { statusClass = 'bg-yellow-50 text-yellow-600 border border-yellow-100'; icon = 'fa-truck-fast'; }
                if(logistik === 'Selesai') { statusClass = 'bg-green-50 text-green-600 border border-green-100'; icon = 'fa-circle-check'; }
                if(logistik === 'Dibatalkan') { statusClass = 'bg-red-50 text-red-600 border border-red-100'; icon = 'fa-ban'; }
                
                const itemsJson = encodeURIComponent(JSON.stringify(o.items));
                
                // --- HTML ITEM DI LIST RIWAYAT ---
                container.innerHTML += `
                <div class="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm hover:shadow-lg transition-all duration-500 stagger-${(index%3)+1} animate-fade-up group">
                    <div class="flex justify-between items-start mb-6">
                        <div class="flex gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 text-xl group-hover:scale-110 transition-transform"><i class="fa-solid fa-bag-shopping"></i></div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="font-mono text-xs font-bold text-slate-400">#${o.id}</span>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${statusClass}"><i class="fa-solid ${icon}"></i> ${logistik}</span>
                                </div>
                                <div class="text-xs text-slate-400 font-medium">${o.tanggal}</div>
                            </div>
                        </div>
                        <button onclick="openReceipt('${o.id}', '${itemsJson}', '${o.status_bayar}', '${parseInt(o.total)}', '${o.tanggal}', '${o.metode}', '${o.nama}')" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shadow-sm active:scale-95"><i class="fa-solid fa-receipt"></i></button>
                    </div>
                    <div class="bg-slate-50/50 rounded-2xl p-4 mb-6 space-y-2 border border-slate-50">
                        ${o.items.map(i => `<div class="flex justify-between text-sm text-slate-700"><span class="font-medium truncate max-w-[200px]">${i.nama} <span class="text-slate-400 text-xs">(${i.size})</span></span><span class="font-bold text-slate-900">x${i.qty}</span></div>`).join('')}
                    </div>
                    <div class="flex justify-between items-end border-t border-dashed border-slate-100 pt-4">
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tagihan</p>
                            <p class="text-xl font-serif font-bold text-slate-900">Rp ${parseInt(o.total).toLocaleString()}</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-bold uppercase tracking-wider ${isLunas ? 'text-green-600 bg-green-50 border-green-100' : 'text-orange-600 bg-orange-50 border-orange-100'} px-3 py-1 rounded-full border">${isLunas ? 'LUNAS' : 'CICILAN'}</span>
                        </div>
                    </div>
                </div>`;
            });
        }
    } catch(e) { container.innerHTML = "Gagal memuat."; }
}

// === FUNGSI OPEN RECEIPT (DESAIN BARU & CLEAN) ===
// === FUNGSI OPEN RECEIPT (FIXED LAYOUT) ===
function openReceipt(id, itemsJson, status, total, date, method, name) {
    document.getElementById('receipt-modal').classList.remove('hidden');
    
    // Set Data Teks
    document.getElementById('receipt-id').innerText = id;
    document.getElementById('receipt-date').innerText = date;
    document.getElementById('receipt-method').innerText = method;
    document.getElementById('receipt-name').innerText = name || currentUser.nama;
    document.getElementById('receipt-total').innerText = "Rp " + parseInt(total).toLocaleString('id-ID');
    
    // Status Badge Logic (Warna lebih soft)
    const stEl = document.getElementById('receipt-status'); 
    stEl.innerText = status;
    stEl.className = "inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border";
    
    if(status === 'Lunas') {
        stEl.classList.add("bg-green-50", "text-green-600", "border-green-100");
    } else {
        stEl.classList.add("bg-orange-50", "text-orange-600", "border-orange-100");
    }

    // Render Items Loop (Font size disesuaikan agar muat)
    const items = JSON.parse(decodeURIComponent(itemsJson));
    document.getElementById('receipt-details').innerHTML = items.map(i => `
        <div class="flex justify-between items-start border-b border-dashed border-slate-200 last:border-0 pb-2 last:pb-0">
            <div class="flex-1 pr-2">
                <p class="font-bold text-slate-700 text-xs leading-snug line-clamp-2">${i.nama}</p>
                <p class="text-[10px] text-slate-400 mt-0.5">${i.size ? 'Size: '+i.size : ''}</p>
            </div>
            <div class="text-right whitespace-nowrap">
                <span class="font-mono font-bold text-slate-800 text-xs">x${i.qty}</span>
            </div>
        </div>
    `).join('');

    // Generate QR Code (Ukuran pas untuk modal compact)
    const container = document.getElementById("barcode-display"); 
    container.innerHTML = ""; 
    setTimeout(() => {
        new QRCode(container, { 
            text: id, 
            width: 80, // Ukuran QR diperkecil sedikit agar proporsional
            height: 80, 
            colorDark : "#1e293b", 
            colorLight : "#ffffff", 
            correctLevel : QRCode.CorrectLevel.M 
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
                container.innerHTML += `<div class="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-md transition-all shadow-sm"><div class="flex justify-between items-start mb-3"><div><div class="flex items-center gap-2 mb-1"><span class="font-mono text-xs font-bold text-brand-900">#${o.id}</span><span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-bold">${o.status_bayar}</span></div><h4 class="font-bold text-slate-800 text-sm">${o.nama}</h4></div><div class="text-right"><select onchange="handleStatusChange(this, '${o.id}', '${o.nama}', '${o.no_hp}')" class="text-[10px] font-bold uppercase p-2 rounded-lg border border-slate-200 bg-slate-50 focus:border-brand-500 outline-none cursor-pointer">${opts}</select></div></div><div class="bg-slate-50/50 rounded-xl p-3 mb-3 text-sm space-y-1 border border-slate-50">${o.items.map(i => `<div class="text-slate-600 flex justify-between"><span>${i.nama}</span> <span>x${i.qty}</span></div>`).join('')}</div><div class="flex justify-between items-center text-sm border-t border-slate-100 pt-3"><div class="${sisa <= 0 ? 'text-green-600' : 'text-orange-600'} font-bold text-xs">${sisa <= 0 ? 'LUNAS' : 'Sisa: Rp ' + sisa.toLocaleString()}</div><div class="flex gap-2">${o.bukti ? `<a href="${o.bukti}" target="_blank" class="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100">Bukti</a>` : ''}<button onclick="window.open('https://wa.me/${formatWA(o.no_hp)}')" class="text-slate-400 hover:text-green-600 px-2"><i class="fa-brands fa-whatsapp text-lg"></i></button></div></div></div>`;
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
            showToast("Barcode Valid!", "success");
            html5QrcodeScanner.clear(); closeScannerModal(); updateStatusApi(expectedId, 'Selesai');
        } else { showToast("Barcode Salah!", "error"); }
    });
}
function closeScannerModal() { document.getElementById('scanner-modal').classList.add('hidden'); if(html5QrcodeScanner) html5QrcodeScanner.clear(); pendingOrderIdForScan = null; fetchAdminOrders(); }