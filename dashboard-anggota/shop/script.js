let currentUser = JSON.parse(localStorage.getItem('user_session'));
let cart = JSON.parse(localStorage.getItem('sadulur_cart')) || [];
let products = [];
let cropper = null; 
let html5QrcodeScanner = null;
let pendingOrderIdForScan = null;

// --- GLOBAL VARS UNTUK MULTI-UPLOAD ---
let activeSlotIndex = null;
let activeVariantComboId = null; 
let tempImages = [null, null, null];
let deletedIndexes = [];

// --- GLOBAL VARS UNTUK VOUCHER & VARIAN ---
let appliedVoucher = null;
let currentSubtotal = 0;
let variantCombinationsMemory = [];

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
document.addEventListener('DOMContentLoaded', async () => {
    const allowedRoles = ['ketua', 'pengurus', 'bendahara', 'wakil', 'sdm'];
    const userRole = (currentUser.jabatan || "").toLowerCase();
    const isAdmin = currentUser.nia === 'SS-0098' || allowedRoles.some(r => userRole.includes(r));

    if(isAdmin) document.getElementById('admin-sidebar-links').classList.remove('hidden');

    renderSkeleton();
    await fetchProducts(); 
    updateCartUI(); 

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');
    if (productId) { openProductDetail(productId); }
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
    document.querySelectorAll('.view-section').forEach(el => { el.classList.add('hidden'); el.classList.remove('animate-fade-up'); });
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active-tab'));
    
    const target = document.getElementById('view-' + tabName);
    if(target) { target.classList.remove('hidden'); void target.offsetWidth; target.classList.add('animate-fade-up'); }
    
    const titleEl = document.getElementById('page-title'); const subEl = document.getElementById('page-subtitle');
    if(tabName === 'catalog') { titleEl.innerText = 'Katalog Terbaru'; subEl.innerText = 'Koleksi eksklusif merchandise Sadulur Sepoor.'; }
    else if(tabName === 'my-orders') { titleEl.innerText = 'Riwayat Pesanan'; subEl.innerText = 'Pantau status pembayaran dan pengiriman Anda.'; fetchMyOrders(); }
    else if(tabName === 'admin-product') { titleEl.innerText = 'Kelola Produk'; subEl.innerText = 'Manajemen inventaris toko.'; }
    else if(tabName === 'admin-orders') { titleEl.innerText = 'Pesanan Masuk'; subEl.innerText = 'Verifikasi pembayaran dan update resi.'; fetchAdminOrders(); }
    else if(tabName === 'admin-voucher') { titleEl.innerText = 'Kelola Voucher'; subEl.innerText = 'Manajemen kode promo toko.'; fetchAdminVouchers(); }
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
        
        let varianObj = {attributes:[], combinations:[]}; 
        try { varianObj = typeof p.varian === 'string' ? JSON.parse(p.varian) : p.varian; } catch(e){}
        if(varianObj.sizes && !varianObj.attributes) { varianObj.attributes = [{name: "Ukuran", values: varianObj.sizes}]; varianObj.combinations = varianObj.sizes.map(s => ({id: s, price: harga, discount: 0})); }
        
        // AUTO-DETECT SMART IMAGE LOGIC
        let allImages = [];
        let variantImageMap = {}; 
        let hasVariantImage = false;
        
        if (varianObj && varianObj.combinations) {
            varianObj.combinations.forEach(combo => {
                if (combo.image) {
                    hasVariantImage = true;
                    if(!allImages.includes(combo.image)) allImages.push(combo.image);
                    variantImageMap[combo.id] = allImages.indexOf(combo.image); 
                }
            });
        }
        
        // Jika tidak ada foto varian satupun, pakai foto produk utama
        if (!hasVariantImage) {
            allImages = Array.isArray(p.gambar) ? p.gambar.filter(x => x) : (typeof p.gambar === 'string' && p.gambar ? [p.gambar] : []);
        }
        if (allImages.length === 0) allImages = ['https://placehold.co/400x400/f1f5f9/94a3b8?text=No+Image'];

        window[`varianData_${p.id}`] = varianObj;
        window[`varianImageMap_${p.id}`] = variantImageMap;

        let sliderHtml = '';
        if (allImages.length > 1) {
            const slides = allImages.map(src => `<div class="snap-center shrink-0 w-full h-full"><img src="${src}" loading="lazy" class="w-full h-full object-cover"></div>`).join('');
            const dots = allImages.map((_, i) => `<div class="img-dot ${i===0?'active':''}" id="dot-${p.id}-${i}"></div>`).join('');
            sliderHtml = `<div id="catalog-slider-${p.id}" class="flex overflow-x-auto snap-x scrollbar-hide w-full h-full relative z-10 scroll-smooth" onscroll="updateDots(this, '${p.id}', ${allImages.length})">${slides}</div><div class="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">${dots}</div>`;
        } else {
            sliderHtml = `<div id="catalog-slider-${p.id}" class="w-full h-full"><img src="${allImages[0]}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"></div>`;
        }

        let priceHtml = `<div id="catalog-price-box-${p.id}"><span class="font-bold text-slate-900 text-lg">Rp ${harga.toLocaleString('id-ID')}</span></div>`;
        if(diskon > 0) priceHtml = `<div id="catalog-price-box-${p.id}" class="flex flex-col leading-tight"><span class="text-[10px] text-slate-400 line-through">Rp ${(harga + diskon).toLocaleString('id-ID')}</span><span class="font-bold text-red-500 text-lg">Rp ${harga.toLocaleString('id-ID')}</span></div>`;
        
        let badge = isPO ? `<span class="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur text-brand-600 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">Pre-Order</span>` : `<span class="absolute top-3 left-3 z-30 bg-white/90 backdrop-blur text-slate-600 text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">Ready</span>`;
        if(isHabis) badge = `<span class="absolute top-3 left-3 z-30 bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm uppercase tracking-wide">Sold Out</span>`;
        
        let selectHtml = '';
        if (varianObj.attributes && varianObj.attributes.length > 0) {
            selectHtml = `<div class="mt-3 space-y-2">`;
            varianObj.attributes.forEach((attr) => {
                selectHtml += `<select class="var-select-catalog-${p.id} w-full p-2 text-xs bg-slate-50 border-none rounded-lg font-medium text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors" data-name="${attr.name}" onchange="updateCatalogVariant('${p.id}')" onclick="event.stopPropagation()">
                    ${attr.values.map(v => `<option value="${v}">${attr.name}: ${v}</option>`).join('')}
                </select>`;
            });
            selectHtml += `</div>`;
        } else {
            selectHtml = `<input type="hidden" class="var-select-catalog-${p.id}" value="All Size"><div class="mt-3"></div>`;
        }

        grid.innerHTML += `
            <div class="group bg-white rounded-[24px] p-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative flex flex-col border border-slate-50 stagger-${(index%3)+1} animate-fade-up">
                <div class="cursor-pointer" onclick="openProductDetail('${p.id}')">
                    <div class="relative aspect-[4/5] rounded-[20px] overflow-hidden bg-slate-100 mb-3 isolate">
                        ${badge}
                        ${sliderHtml}
                    </div>
                    <div class="px-1 flex-1 flex flex-col">
                        <h3 class="font-serif font-bold text-slate-900 text-lg leading-snug line-clamp-2 mb-1 group-hover:text-brand-600 transition-colors">${p.nama}</h3>
                        <div class="mb-1">${priceHtml}</div>
                    </div>
                </div>
                <div class="px-1 pb-1 mt-auto">
                    ${selectHtml}
                    <div class="flex gap-2 mt-2">
                        <button onclick="addToCart('${p.id}', false); event.stopPropagation();" ${isHabis?'disabled':''} class="w-10 h-10 bg-slate-50 text-slate-600 hover:bg-brand-50 hover:text-brand-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center active:scale-95 ${isHabis ? 'opacity-50 cursor-not-allowed':''}"><i class="fa-solid fa-cart-plus"></i></button>
                        <button onclick="buyNow('${p.id}', false); event.stopPropagation();" ${isHabis?'disabled':''} class="flex-1 h-10 bg-slate-900 text-white hover:bg-brand-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 ${isHabis ? 'bg-slate-300 shadow-none cursor-not-allowed':''}">${isHabis ? 'Habis' : 'Beli'}</button>
                    </div>
                </div>
            </div>`;
            
        // Trigger harga & swipe awal untuk katalog
        setTimeout(()=>updateCatalogVariant(p.id), 50);
    });
}

function updateCatalogVariant(id) {
    const varianData = window[`varianData_${id}`];
    if(!varianData || !varianData.combinations) return;

    const selects = document.querySelectorAll(`.var-select-catalog-${id}`);
    if(selects.length === 0) return;

    const selectedValues = Array.from(selects).map(s => s.value);
    const comboId = selectedValues.join(' - ');
    const combo = varianData.combinations.find(c => c.id === comboId);

    if(combo) {
        const prod = products.find(p => p.id == id);
        const harga = combo.price;
        const diskon = combo.discount > 0 ? combo.discount : parseInt(prod.diskon || 0);
        
        const box = document.getElementById(`catalog-price-box-${id}`);
        if(box) {
            if(diskon > 0) box.innerHTML = `<span class="text-[10px] text-slate-400 line-through">Rp ${(harga).toLocaleString('id-ID')}</span><span class="font-bold text-red-500 text-lg block leading-tight">Rp ${(harga - diskon).toLocaleString('id-ID')}</span>`;
            else box.innerHTML = `<span class="font-bold text-slate-900 text-lg block leading-tight">Rp ${harga.toLocaleString('id-ID')}</span>`;
        }

        const imageMap = window[`varianImageMap_${id}`];
        if (imageMap && imageMap[comboId] !== undefined) {
            const imgIndex = imageMap[comboId];
            const slider = document.getElementById(`catalog-slider-${id}`);
            if (slider && slider.children.length > 1) {
                const slideWidth = slider.offsetWidth;
                slider.scrollTo({ left: slideWidth * imgIndex, behavior: 'smooth' });
            }
        }
    }
}

function updateDots(el, id, count) {
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    for(let i=0; i<count; i++) {
        const dot = document.getElementById(`dot-${id}-${i}`);
        if(dot) i === index ? dot.classList.add('active') : dot.classList.remove('active');
    }
}

// --- PRODUCT DETAIL LOGIC ---
function copyProductLink(id) {
    const link = window.location.origin + window.location.pathname + "?product=" + id;
    navigator.clipboard.writeText(link).then(() => { showToast("Link produk disalin!", "success"); });
}

function openProductDetail(id) {
    const prod = products.find(p => p.id == id);
    if (!prod) return showToast("Produk tidak ditemukan", "error");

    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    let detailSection = document.getElementById('view-product-detail');
    if(!detailSection) return;
    detailSection.classList.remove('hidden');

    const newUrl = window.location.origin + window.location.pathname + "?product=" + id;
    window.history.pushState({ path: newUrl }, '', newUrl);

    document.getElementById('page-title').innerText = "Detail Produk";
    document.getElementById('page-subtitle').innerText = prod.nama;

    const isPO = prod.tipe_stok === 'PO';
    const isHabis = !isPO && prod.stok <= 0;
    const harga = parseInt(prod.harga);
    const diskon = parseInt(prod.diskon || 0);
    
    // Dynamic Variant Setup
    let varianObj = {attributes:[], combinations:[]}; 
    try { varianObj = typeof prod.varian === 'string' ? JSON.parse(prod.varian) : prod.varian; } catch(e){}
    if(varianObj.sizes && !varianObj.attributes) { varianObj.attributes = [{name: "Ukuran", values: varianObj.sizes}]; varianObj.combinations = varianObj.sizes.map(s => ({id: s, price: harga, discount: 0})); }
    window[`varianData_${prod.id}`] = varianObj;

    // SMART IMAGE LOGIC UNTUK DETAIL
    let allImages = [];
    let variantImageMap = {}; 
    let hasVariantImage = false;
    
    if (varianObj && varianObj.combinations) {
        varianObj.combinations.forEach(combo => {
            if (combo.image) {
                hasVariantImage = true;
                if(!allImages.includes(combo.image)) allImages.push(combo.image);
                variantImageMap[combo.id] = allImages.indexOf(combo.image); 
            }
        });
    }
    
    if(!hasVariantImage) {
        allImages = Array.isArray(prod.gambar) ? prod.gambar.filter(x => x) : (typeof prod.gambar === 'string' && prod.gambar ? [prod.gambar] : []);
    }
    if(allImages.length === 0) allImages = ['https://placehold.co/600x600/f1f5f9/94a3b8?text=No+Image'];
    window[`varianImageMap_${prod.id}`] = variantImageMap;

    let sliderHtml = '';
    if (allImages.length > 1) {
        const slides = allImages.map(src => `<div class="snap-center shrink-0 w-full h-full"><img src="${src}" class="w-full h-full object-cover"></div>`).join('');
        sliderHtml = `<div id="detail-slider-${prod.id}" class="flex overflow-x-auto snap-x scrollbar-hide w-full h-full rounded-[20px] md:rounded-[24px] isolate transition-all duration-300 scroll-smooth">${slides}</div>`;
    } else {
        sliderHtml = `<div id="detail-slider-${prod.id}" class="w-full h-full"><img src="${allImages[0]}" class="w-full h-full object-cover rounded-[20px] md:rounded-[24px]"></div>`;
    }

    let selectHtml = '';
    if (varianObj.attributes && varianObj.attributes.length > 0) {
        selectHtml = `<h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><i class="fa-solid fa-layer-group"></i> Pilih Varian</h4><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`;
        varianObj.attributes.forEach((attr) => {
            selectHtml += `
                <div>
                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">${attr.name}</label>
                    <select class="var-select-${prod.id}-detail w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none cursor-pointer hover:border-brand-300 transition-colors focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-50 shadow-sm" data-name="${attr.name}" onchange="updateDetailPrice('${prod.id}')">
                        ${attr.values.map(v => `<option value="${v}">${v}</option>`).join('')}
                    </select>
                </div>
            `;
        });
        selectHtml += `</div>`;
    } else {
         selectHtml = `<input type="hidden" class="var-select-${prod.id}-detail" value="All Size">`;
    }

    document.getElementById('product-detail-container').innerHTML = `
        <div class="w-full md:w-5/12 flex flex-col gap-4">
            <div class="aspect-[4/5] md:aspect-square bg-slate-100 rounded-[24px] md:rounded-[32px] relative p-1.5 md:p-2 border border-slate-100 shadow-sm overflow-hidden md:sticky md:top-28">
                ${sliderHtml}
            </div>
        </div>

        <div class="w-full md:w-7/12 flex flex-col md:pl-2">
            <div class="flex items-center gap-2 mb-4">
                <span class="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">${prod.tipe_stok}</span>
                <span class="${prod.stok > 0 ? 'text-green-600 bg-green-50 border border-green-100' : 'text-red-600 bg-red-50 border border-red-100'} px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">${prod.stok > 0 ? 'Sisa ' + prod.stok : 'Habis'}</span>
            </div>
            
            <h2 class="font-serif font-bold text-3xl md:text-4xl text-slate-900 leading-tight mb-3">${prod.nama}</h2>
            <div class="mb-6 pb-6 border-b border-slate-100" id="detail-price-box-${prod.id}"></div>

            <div class="mb-8">
                <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-align-left"></i> Deskripsi Produk
                </h4>
                <div class="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-5 rounded-2xl border border-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                    ${prod.deskripsi ? prod.deskripsi : "<span class='italic text-slate-400'>Belum ada deskripsi untuk produk ini.</span>"}
                </div>
            </div>

            <div class="mb-8">
                ${selectHtml}
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-white/95 backdrop-blur-xl border-t border-slate-200 z-[60] flex gap-3 
                        md:relative md:p-0 md:pb-0 md:bg-transparent md:border-none md:backdrop-blur-none md:z-auto shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] md:shadow-none">
                <button onclick="copyProductLink('${prod.id}')" class="w-14 h-14 shrink-0 bg-white border-2 border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50 rounded-2xl transition-all flex items-center justify-center active:scale-95"><i class="fa-solid fa-share-nodes text-lg"></i></button>
                <button onclick="addToCart('${prod.id}', true)" ${isHabis?'disabled':''} class="w-14 h-14 shrink-0 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-2xl transition-all flex items-center justify-center active:scale-95 ${isHabis ? 'opacity-50 cursor-not-allowed':''}"><i class="fa-solid fa-cart-plus text-lg"></i></button>
                <button onclick="buyNow('${prod.id}', true)" ${isHabis?'disabled':''} class="flex-1 h-14 bg-slate-900 text-white hover:bg-brand-600 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all ${isHabis ? 'bg-slate-300 shadow-none cursor-not-allowed':''} flex items-center justify-center gap-2">${isHabis ? 'Stok Habis' : 'Beli Langsung <i class="fa-solid fa-arrow-right"></i>'}</button>
            </div>
        </div>
    `;

    updateDetailPrice(prod.id);
}

function updateDetailPrice(id) {
    const varianData = window[`varianData_${id}`];
    if(!varianData || !varianData.combinations) return;

    const selects = document.querySelectorAll(`.var-select-${id}-detail`);
    let comboId = "All Size";
    if(selects.length > 0) comboId = Array.from(selects).map(s => s.value).join(' - ');
    
    const combo = varianData.combinations.find(c => c.id === comboId);

    if(combo) {
        const prod = products.find(p => p.id == id);
        const harga = combo.price;
        const diskon = combo.discount > 0 ? combo.discount : parseInt(prod.diskon || 0);
        
        const box = document.getElementById(`detail-price-box-${id}`);
        if(box) {
            if(diskon > 0) box.innerHTML = `<span class="text-sm text-slate-400 line-through">Rp ${(harga).toLocaleString('id-ID')}</span><span class="font-bold text-red-500 text-3xl md:text-4xl block mt-1">Rp ${(harga - diskon).toLocaleString('id-ID')}</span>`;
            else box.innerHTML = `<span class="font-bold text-brand-600 text-3xl md:text-4xl block mt-1">Rp ${harga.toLocaleString('id-ID')}</span>`;
        }

        const imageMap = window[`varianImageMap_${id}`];
        if (imageMap && imageMap[comboId] !== undefined) {
            const imgIndex = imageMap[comboId];
            const slider = document.getElementById(`detail-slider-${id}`);
            if (slider && slider.children.length > 1) {
                const slideWidth = slider.offsetWidth;
                slider.scrollTo({ left: slideWidth * imgIndex, behavior: 'smooth' });
            }
        }
    }
}

function closeProductDetail() {
    const base = window.location.origin + window.location.pathname;
    window.history.pushState({ path: base }, '', base);
    switchTab('catalog');
}

// --- VARIANT & CART LOGIC ---
function getSelectedVariant(id, isDetail) {
    const selectorClass = isDetail ? `.var-select-${id}-detail` : `.var-select-catalog-${id}`;
    const selects = document.querySelectorAll(selectorClass);
    
    if(selects.length === 0) return { string: "All Size", price: null, discount: null, image: null };
    
    const selectedValues = Array.from(selects).map(s => s.value);
    const comboId = selectedValues.join(' - ');
    
    const varianData = window[`varianData_${id}`];
    let price = null; let discount = null; let image = null;
    if(varianData && varianData.combinations) {
         const combo = varianData.combinations.find(c => c.id === comboId);
         if(combo) { price = combo.price; discount = combo.discount; image = combo.image; }
    }
    
    const displayArr = Array.from(selects).map(s => `${s.getAttribute('data-name')}: ${s.value}`);
    return { string: displayArr.join(', '), id: comboId, price: price, discount: discount, image: image };
}

function addToCart(id, isDetail = true) {
    const prod = products.find(p => p.id == id); if (!prod) return;
    
    const variantData = getSelectedVariant(id, isDetail);
    const basePrice = variantData.price !== null ? variantData.price : parseInt(prod.harga);
    const disc = variantData.discount > 0 ? variantData.discount : parseInt(prod.diskon || 0);
    const finalPrice = basePrice - disc;
    
    // Auto-detect fallback image untuk cart
    let fallbackImg = Array.isArray(prod.gambar) ? (prod.gambar[0] || 'https://placehold.co/100') : prod.gambar;
    if (window[`varianImageMap_${id}`]) {
        const firstVariantImgId = Object.keys(window[`varianImageMap_${id}`])[0];
        const vData = window[`varianData_${id}`].combinations.find(c => c.id === firstVariantImgId);
        if (vData && vData.image) fallbackImg = vData.image; 
    }
    let firstImg = variantData.image || fallbackImg;
    
    const existing = cart.find(c => c.id == id && c.size == variantData.string);
    if (existing) { 
        if(prod.tipe_stok === 'Ready' && existing.qty >= prod.stok) return showToast("Stok maksimal tercapai!", "error"); 
        existing.qty++; existing.checked = true;
    } else { 
        cart.push({ ...prod, qty: 1, size: variantData.string, harga: finalPrice, gambar: firstImg, checked: true });
    }
    saveCart(); showToast("Produk ditambahkan", "success");
}

function buyNow(id, isDetail = true) {
    const prod = products.find(p => p.id == id); if (!prod) return;
    
    const variantData = getSelectedVariant(id, isDetail);
    const basePrice = variantData.price !== null ? variantData.price : parseInt(prod.harga);
    const disc = variantData.discount > 0 ? variantData.discount : parseInt(prod.diskon || 0);
    const finalPrice = basePrice - disc;
    
    let fallbackImg = Array.isArray(prod.gambar) ? (prod.gambar[0] || 'https://placehold.co/100') : prod.gambar;
    if (window[`varianImageMap_${id}`]) {
        const firstVariantImgId = Object.keys(window[`varianImageMap_${id}`])[0];
        const vData = window[`varianData_${id}`].combinations.find(c => c.id === firstVariantImgId);
        if (vData && vData.image) fallbackImg = vData.image; 
    }
    let firstImg = variantData.image || fallbackImg;

    const tempItem = { ...prod, qty: 1, size: variantData.string, harga: finalPrice, gambar: firstImg, checked: true };
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

function renderCartItems() {
    const container = document.getElementById('cart-items'); 
    container.innerHTML = ""; 
    
    if(cart.length === 0) { 
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-64 text-slate-300"><i class="fa-solid fa-basket-shopping text-4xl mb-3 opacity-30"></i><p class="text-sm font-medium">Keranjang kosong</p></div>`; 
        document.getElementById('cart-total').innerText = "Rp 0"; 
        return; 
    }
    
    const allChecked = cart.length > 0 && cart.every(item => item.checked);

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
                <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wide mt-0.5 mb-1 truncate">${item.size}</div>
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

function updateItemCheck(index, el) { cart[index].checked = el.checked; saveCart(); recalculateCartTotal(); }
function toggleSelectAll(el) { const isChecked = el.checked; cart.forEach(item => item.checked = isChecked); saveCart(); renderCartItems(); }
function recalculateCartTotal() {
    let total = 0;
    cart.forEach(item => { if(item.checked) total += item.harga * item.qty; });
    document.getElementById('cart-total').innerText = "Rp " + total.toLocaleString('id-ID');
}
function removeItem(idx) { cart.splice(idx, 1); saveCart(); renderCartItems(); }

// --- ADMIN UPLOAD LOGIC ---
function triggerUpload(index) {
    if(tempImages[index] && tempImages[index] !== "EXISTING") return; 
    activeSlotIndex = index;
    activeVariantComboId = null;
    document.getElementById('hidden-file-input').value = "";
    document.getElementById('hidden-file-input').click();
}
function triggerVariantUpload(comboId) {
    activeVariantComboId = comboId;
    activeSlotIndex = null;
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
    activeSlotIndex = null; activeVariantComboId = null;
}
function applyCrop() {
    if(!cropper) return;
    const base64 = cropper.getCroppedCanvas({ width: 600, height: 600, fillColor: '#fff' }).toDataURL('image/jpeg', 0.85);
    
    if (activeVariantComboId !== null) {
        updateComboMemory(activeVariantComboId, 'image_base64', base64);
        const previewDiv = document.getElementById(`var-img-preview-${activeVariantComboId}`);
        if(previewDiv) {
            previewDiv.querySelector('img').src = base64;
            previewDiv.classList.remove('hidden');
            document.getElementById(`var-img-label-${activeVariantComboId}`).innerText = 'Ganti Foto';
        }
    } else if (activeSlotIndex !== null) {
        tempImages[activeSlotIndex] = base64;
        const slot = document.getElementById(`slot-${activeSlotIndex}`);
        slot.style.backgroundImage = `url(${base64})`; slot.classList.add('filled');
        slot.querySelector('.slot-placeholder').classList.add('hidden');
        slot.querySelector('.btn-remove').classList.remove('hidden');
    }
    cancelCrop();
}
function removeImage(e, index) {
    e.stopPropagation(); tempImages[index] = null;
    if(document.getElementById('prod-is-edit').value === "true") { if(!deletedIndexes.includes(index)) deletedIndexes.push(index); }
    const slot = document.getElementById(`slot-${index}`);
    slot.style.backgroundImage = ''; slot.classList.remove('filled');
    slot.querySelector('.slot-placeholder').classList.remove('hidden');
    slot.querySelector('.btn-remove').classList.add('hidden');
}
function removeVariantImage(comboId) {
    updateComboMemory(comboId, 'image_base64', null);
    updateComboMemory(comboId, 'image', null);
    const previewDiv = document.getElementById(`var-img-preview-${comboId}`);
    if(previewDiv) {
        previewDiv.classList.add('hidden');
        previewDiv.querySelector('img').src = '';
        document.getElementById(`var-img-label-${comboId}`).innerText = '+ Foto';
    }
}

// --- ADMIN PRODUCTS & DYNAMIC VARIANTS ---
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

function addVariantAttribute(name = "", values = "") {
    const container = document.getElementById('variant-attributes');
    const idx = container.children.length;
    const html = `
        <div class="flex gap-2 items-start variant-row" data-idx="${idx}">
            <div class="w-1/3">
                <input type="text" class="input-field !py-2 text-xs var-name" placeholder="Cth: Warna" value="${name}">
            </div>
            <div class="flex-1">
                <input type="text" class="input-field !py-2 text-xs var-values" placeholder="Cth: Hitam, Putih (Koma)" value="${values}">
            </div>
            <button type="button" onclick="this.parentElement.remove(); generateCombinations();" class="w-[38px] h-[38px] rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 hover:bg-red-100 transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function generateCombinations() {
    const rows = document.querySelectorAll('.variant-row');
    let attrs = [];
    rows.forEach(row => {
        const name = row.querySelector('.var-name').value.trim();
        const vals = row.querySelector('.var-values').value.split(',').map(v => v.trim()).filter(v => v);
        if (name && vals.length > 0) attrs.push({ name, values: vals });
    });

    const listContainer = document.getElementById('combination-list');
    const comboWrapper = document.getElementById('variant-combinations');

    if (attrs.length === 0) { comboWrapper.classList.add('hidden'); listContainer.innerHTML = ''; return; }

    const combine = (arr) => arr.reduce((a, b) => a.flatMap(x => b.values.map(y => [...x, y])), [[]]);
    const combos = combine(attrs);
    const basePrice = parseInt(document.getElementById('prod-price').value) || 0;
    
    listContainer.innerHTML = '';

    combos.forEach(combo => {
        const comboId = combo.join(' - ');
        const mem = variantCombinationsMemory.find(c => c.id === comboId);
        const price = mem ? mem.price : basePrice;
        const discount = mem ? (mem.discount || 0) : 0;
        const hasImage = mem && (mem.image || mem.image_base64);
        const imgSrc = mem ? (mem.image_base64 || mem.image) : '';

        listContainer.innerHTML += `
            <div class="flex flex-col bg-white p-3 rounded-xl border border-slate-200 combo-row shadow-sm gap-2" data-id="${comboId}">
                <div class="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span class="text-xs font-bold text-slate-700">${comboId}</span>
                    <button type="button" onclick="triggerVariantUpload('${comboId}')" class="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-brand-50 hover:text-brand-600 font-bold transition-colors flex items-center gap-1">
                        <i class="fa-solid fa-camera"></i> <span id="var-img-label-${comboId}">${hasImage ? 'Ganti Foto' : '+ Foto'}</span>
                    </button>
                </div>
                <div class="flex items-center justify-between gap-4">
                    <div class="flex-1">
                        <label class="text-[9px] font-bold text-slate-400 uppercase">Harga Khusus</label>
                        <div class="flex items-center gap-1 mt-0.5">
                            <span class="text-[10px] font-bold text-slate-400">Rp</span>
                            <input type="number" class="input-field !py-1 !px-2 w-full text-xs font-bold combo-price text-slate-700 bg-slate-50 border-none" value="${price}" onchange="updateComboMemory('${comboId}', 'price', this.value)">
                        </div>
                    </div>
                    <div class="flex-1">
                        <label class="text-[9px] font-bold text-red-400 uppercase">Diskon Varian</label>
                        <div class="flex items-center gap-1 mt-0.5">
                            <span class="text-[10px] font-bold text-red-400">Rp</span>
                            <input type="number" class="input-field !py-1 !px-2 w-full text-xs font-bold combo-disc text-red-500 bg-red-50 border-none" value="${discount}" onchange="updateComboMemory('${comboId}', 'discount', this.value)">
                        </div>
                    </div>
                </div>
                <div id="var-img-preview-${comboId}" class="${hasImage ? '' : 'hidden'} mt-2 relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden group">
                    <img src="${imgSrc}" class="w-full h-full object-cover">
                    <button type="button" onclick="removeVariantImage('${comboId}')" class="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `;
    });
    comboWrapper.classList.remove('hidden');
}

function updateComboMemory(id, key, value) {
    let combo = variantCombinationsMemory.find(c => c.id === id);
    if(!combo) { combo = { id: id, price: 0, discount: 0 }; variantCombinationsMemory.push(combo); }
    if (key === 'price' || key === 'discount') { combo[key] = parseInt(value) || 0; } 
    else { combo[key] = value; }
}

function getVariantDataJSON() {
    const attrs = [];
    document.querySelectorAll('.variant-row').forEach(row => {
        const name = row.querySelector('.var-name').value.trim();
        const vals = row.querySelector('.var-values').value.split(',').map(v => v.trim()).filter(v => v);
        if(name && vals.length > 0) attrs.push({name, values: vals});
    });
    const combos = [];
    document.querySelectorAll('.combo-row').forEach(row => {
        const id = row.getAttribute('data-id');
        const price = parseInt(row.querySelector('.combo-price').value) || 0;
        const discount = parseInt(row.querySelector('.combo-disc').value) || 0;
        const mem = variantCombinationsMemory.find(c => c.id === id);
        const comboObj = { id, price, discount };
        if (mem && mem.image_base64) comboObj.image_base64 = mem.image_base64;
        else if (mem && mem.image) comboObj.image = mem.image;
        combos.push(comboObj);
    });
    return { attributes: attrs, combinations: combos };
}

function openProductModal() {
    document.getElementById('product-form').reset();
    document.getElementById('prod-id').value = "";
    document.getElementById('prod-is-edit').value = "false";
    document.getElementById('modal-title').innerText = "Tambah Produk";
    document.getElementById('btn-save-prod').innerText = "Simpan Produk";
    const descEl = document.getElementById('prod-desc'); if(descEl) descEl.value = "";
    
    document.getElementById('variant-attributes').innerHTML = '';
    document.getElementById('combination-list').innerHTML = '';
    document.getElementById('variant-combinations').classList.add('hidden');
    variantCombinationsMemory = [];

    tempImages = [null, null, null]; deletedIndexes = [];
    document.getElementById('cropper-wrapper').classList.add('hidden');
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`slot-${i}`); slot.style.backgroundImage = ''; slot.classList.remove('filled');
        slot.querySelector('.slot-placeholder').classList.remove('hidden'); slot.querySelector('.btn-remove').classList.add('hidden');
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
    const descEl = document.getElementById('prod-desc'); if(descEl) descEl.value = p.deskripsi || "";
    toggleStockInput();
    
    document.getElementById('variant-attributes').innerHTML = '';
    document.getElementById('combination-list').innerHTML = '';
    variantCombinationsMemory = [];
    
    let varianObj = {attributes:[], combinations:[]}; 
    try { varianObj = typeof p.varian === 'string' ? JSON.parse(p.varian) : p.varian; } catch(e){}
    
    if(varianObj && varianObj.sizes && !varianObj.attributes) {
        varianObj.attributes = [{name: "Ukuran", values: varianObj.sizes}];
        varianObj.combinations = varianObj.sizes.map(s => ({id: s, price: p.harga, discount: 0}));
    }

    if(varianObj && varianObj.attributes) {
        varianObj.attributes.forEach(attr => addVariantAttribute(attr.name, attr.values.join(', ')));
        variantCombinationsMemory = varianObj.combinations || [];
        generateCombinations();
    } else {
        document.getElementById('variant-combinations').classList.add('hidden');
    }

    document.getElementById('modal-title').innerText = "Edit Produk";
    tempImages = [null, null, null]; deletedIndexes = [];
    document.getElementById('cropper-wrapper').classList.add('hidden');
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`slot-${i}`); slot.style.backgroundImage = ''; slot.classList.remove('filled');
        slot.querySelector('.slot-placeholder').classList.remove('hidden'); slot.querySelector('.btn-remove').classList.add('hidden');
    }
    let currentImages = Array.isArray(p.gambar) ? p.gambar : [p.gambar];
    currentImages.forEach((url, i) => {
        if(i < 3 && url) {
            tempImages[i] = "EXISTING"; const slot = document.getElementById(`slot-${i}`);
            slot.style.backgroundImage = `url(${url})`; slot.classList.add('filled');
            slot.querySelector('.slot-placeholder').classList.add('hidden'); slot.querySelector('.btn-remove').classList.remove('hidden');
        }
    });
    document.getElementById('product-modal').classList.remove('hidden');
}

function closeProductModal() { document.getElementById('product-modal').classList.add('hidden'); if(cropper) { cropper.destroy(); cropper = null; } }
function toggleStockInput() { document.getElementById('stok-group').style.display = document.getElementById('prod-type').value === 'Ready' ? 'block' : 'none'; }

async function saveProduct(e) {
    e.preventDefault(); 
    const btn = document.getElementById('btn-save-prod'); const ot = btn.innerText; 
    btn.innerText = "Mengupload..."; btn.disabled = true;
    
    const isEdit = document.getElementById('prod-is-edit').value === "true";
    const descEl = document.getElementById('prod-desc');
    
    const newImages = [];
    tempImages.forEach((img, idx) => { if(img && img !== "EXISTING" && img.startsWith('data:image')) newImages.push({ index: idx, base64: img }); });
    
    const complexVariantJSON = getVariantDataJSON();

    const payload = { 
        action: 'shop_save_product', 
        id: document.getElementById('prod-id').value, 
        nama: document.getElementById('prod-name').value, 
        harga: document.getElementById('prod-price').value, 
        diskon: document.getElementById('prod-disc').value, 
        tipe_stok: document.getElementById('prod-type').value, 
        stok: document.getElementById('prod-stock').value, 
        varian: complexVariantJSON, 
        new_images: newImages, 
        deleted_indexes: deletedIndexes, 
        is_edit: isEdit,
        deskripsi: descEl ? descEl.value : ""
    };
    
    try { 
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        closeProductModal(); await fetchProducts(); showToast(isEdit ? "Produk diperbarui" : "Produk disimpan", "success"); 
    } catch(err) { showToast("Gagal menyimpan", "error"); }
    btn.innerText = ot; btn.disabled = false;
}

async function deleteProduct(id) { if(!confirm("Hapus produk ini permanen?")) return; await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_delete_product', id: id }) }); fetchProducts(); showToast("Produk dihapus", "info"); }

// --- CHECKOUT LOGIC ---
let checkoutItems = []; 
let isDirectBuy = false;

function openCheckoutForm(directItem = null) { 
    appliedVoucher = null; 
    document.getElementById('voucher-input').value = "";
    document.getElementById('voucher-input').disabled = false;
    document.getElementById('btn-apply-voucher').disabled = false;
    document.getElementById('btn-apply-voucher').innerText = "Pakai";
    document.getElementById('voucher-msg').classList.add('hidden');
    document.getElementById('discount-row').classList.add('hidden');

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
    
    document.getElementById('checkout-form').reset();
    document.getElementById('payment-info-container').innerHTML = ''; 
    document.getElementById('payment-info-container').classList.add('hidden');
    document.getElementById('cicilan-group').classList.add('hidden');
    
    const summaryList = document.getElementById('checkout-summary-list');
    summaryList.innerHTML = '';
    
    currentSubtotal = 0; 
    checkoutItems.forEach(item => {
        currentSubtotal += item.harga * item.qty;
        summaryList.innerHTML += `
        <div class="flex justify-between text-xs text-slate-600 border-b border-dashed border-slate-100 pb-1 last:border-0">
            <span class="truncate max-w-[200px]">${item.nama} <span class="text-slate-400">(${item.size})</span></span>
            <span class="font-bold">x${item.qty}</span>
        </div>`;
    });
    document.getElementById('checkout-final-total').innerText = "Rp " + currentSubtotal.toLocaleString('id-ID');

    document.querySelectorAll('.pay-option').forEach(el => {
        el.classList.remove('border-brand-500', 'bg-brand-50', 'ring-1', 'ring-brand-500');
        el.querySelector('.check-circle').classList.remove('bg-brand-500', 'border-brand-500');
        el.querySelector('.check-circle i').classList.add('opacity-0');
    });

    const radioCicil = document.querySelector('input[value="cicil"]');
    const containerCicil = document.getElementById('div-cicilan');
    const labelCicil = document.getElementById('label-cicilan');

    disableCicilanOption(radioCicil, containerCicil, "Memuat status...");
    containerCicil.querySelector('span').innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Cek Status...`;

    document.querySelector('input[value="full"]').checked = true;
    toggleCicilanInput();

    document.getElementById('cart-modal').classList.add('hidden'); 
    document.getElementById('checkout-modal').classList.remove('hidden'); 

    runCicilanCheck(checkoutItems, radioCicil, containerCicil, labelCicil);
}

async function applyVoucher() {
    const kode = document.getElementById('voucher-input').value.trim();
    const msgEl = document.getElementById('voucher-msg');
    const btn = document.getElementById('btn-apply-voucher');
    
    if(!kode) return;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; btn.disabled = true;

    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_validate_voucher', kode: kode }) });
        const data = await res.json();
        
        msgEl.classList.remove('hidden');
        if(data.status) {
            appliedVoucher = data.data;
            msgEl.className = "text-[10px] mt-1 font-bold text-green-500";
            msgEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Voucher berhasil diterapkan!`;
            document.getElementById('voucher-input').disabled = true;
            btn.innerText = "Aktif";
            
            let discount = appliedVoucher.tipe === 'Persen' ? currentSubtotal * (parseInt(appliedVoucher.nilai) / 100) : parseInt(appliedVoucher.nilai);
            if(discount > currentSubtotal) discount = currentSubtotal; 
            
            const totalAfter = currentSubtotal - discount;
            
            document.getElementById('discount-row').classList.remove('hidden');
            document.getElementById('discount-code-display').innerText = appliedVoucher.kode;
            document.getElementById('discount-amount').innerText = "- Rp " + discount.toLocaleString('id-ID');
            document.getElementById('checkout-final-total').innerText = "Rp " + totalAfter.toLocaleString('id-ID');
        } else {
            msgEl.className = "text-[10px] mt-1 font-bold text-red-500";
            msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.message}`;
            btn.disabled = false; btn.innerText = "Pakai";
        }
    } catch(e) { btn.disabled = false; btn.innerText = "Pakai"; }
}

async function runCicilanCheck(items, radio, div, label) {
    if (items.length > 1) { return disableCicilanOption(radio, div, "Hanya untuk 1 barang"); } 
    if (items[0].qty > 1) { return disableCicilanOption(radio, div, "Maksimal Qty 1"); }

    try {
        const hasDebt = await checkUserDebt();
        if (hasDebt) disableCicilanOption(radio, div, "Lunasi tagihan lama");
        else enableCicilanOption(radio, div, label);
    } catch (e) { enableCicilanOption(radio, div, label); }
}

function enableCicilanOption(inputEl, divEl, labelEl) {
    inputEl.disabled = false; if(labelEl) labelEl.classList.remove('pointer-events-none', 'opacity-60');
    divEl.classList.remove('bg-slate-100', 'border-slate-200', 'text-slate-400');
    divEl.classList.add('bg-white', 'hover:border-orange-300', 'hover:bg-orange-50', 'hover:shadow-md'); 
    divEl.querySelector('span').innerHTML = `<i class="fa-solid fa-clock mr-1"></i> Cicilan / DP`;
}

function disableCicilanOption(inputEl, divEl, reason) {
    inputEl.disabled = true; const labelParent = inputEl.closest('label');
    if(labelParent) labelParent.classList.add('pointer-events-none', 'opacity-60');
    divEl.classList.add('bg-slate-100', 'border-slate-200', 'text-slate-400');
    divEl.classList.remove('hover:border-orange-300', 'hover:bg-orange-50', 'hover:shadow-md', 'bg-white'); 
    divEl.querySelector('span').innerHTML = `<i class="fa-solid fa-lock mr-1"></i> ${reason}`;
}

async function checkUserDebt() {
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_get_orders', nia: currentUser.nia, is_admin: false, _ts: new Date().getTime() }) });
        const data = await res.json();
        if(data.status && data.orders) {
            const unpaidOrder = data.orders.find(o => o.status_bayar !== 'Lunas');
            return !!unpaidOrder; 
        }
    } catch(e) { return false; } return false;
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
    let finalTotalTagihan = currentSubtotal;
    let discount = 0;
    
    if(appliedVoucher) {
        if(appliedVoucher.tipe === 'Persen') discount = currentSubtotal * (parseInt(appliedVoucher.nilai) / 100);
        else discount = parseInt(appliedVoucher.nilai);
        if(discount > currentSubtotal) discount = currentSubtotal;
        finalTotalTagihan = currentSubtotal - discount;
    }

    const btn = document.getElementById('btn-confirm-pay'); 
    const ot = btn.innerHTML; 
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memproses...'; 
    btn.disabled = true;

    const method = document.getElementById('pay-method').value; 
    if(!method) { showToast("Pilih metode pembayaran", "error"); btn.disabled=false; btn.innerHTML=ot; return; }
    
    const tipeBayar = document.querySelector('input[name="pay-type"]:checked').value; 
    let bayarAwal = finalTotalTagihan;

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
            items: checkoutItems.map(c => ({ id: c.id, nama: c.nama, qty: c.qty, size: c.size, harga: c.harga, gambar: c.gambar })),
            total_tagihan: finalTotalTagihan, 
            bayar_awal: bayarAwal, 
            metode: method, 
            bukti_base64: base64,
            voucher_kode: appliedVoucher ? appliedVoucher.kode : ""
        };
        
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        const data = await res.json();
        
        if(data.status) { 
            showToast("Pesanan Berhasil!", "success"); 
            if (!isDirectBuy) { cart = cart.filter(item => !item.checked); saveCart(); }
            closeCheckoutForm(); 
            setTimeout(() => switchTab('my-orders'), 1000);
        } else { showToast(data.message, "error"); }
    } catch(err) { showToast("Koneksi gagal", "error"); }
    btn.innerHTML = ot; btn.disabled = false;
}

// --- ORDER HISTORY ---
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
                                <p class="text-[10px] text-slate-400 truncate">${i.size ? i.size : 'All Size'}</p>
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

function openReceipt(id, itemsJson, status, total, date, method, name) {
    document.getElementById('receipt-modal').classList.remove('hidden');
    document.getElementById('receipt-id').innerText = id;
    document.getElementById('receipt-date').innerText = date;
    document.getElementById('receipt-method').innerText = method;
    document.getElementById('receipt-name').innerText = name || currentUser.nama;
    document.getElementById('receipt-total').innerText = "Rp " + parseInt(total).toLocaleString('id-ID');
    
    const stEl = document.getElementById('receipt-status'); 
    stEl.innerText = status;
    stEl.className = "inline-block mb-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border";
    if(status === 'Lunas') { stEl.classList.add("bg-green-50", "text-green-600", "border-green-200"); } 
    else { stEl.classList.add("bg-orange-50", "text-orange-600", "border-orange-200"); }

    const items = JSON.parse(decodeURIComponent(itemsJson));
    document.getElementById('receipt-details').innerHTML = items.map(i => `
        <div class="flex justify-between items-start text-[10px] border-b border-dashed border-slate-200 last:border-0 pb-1.5 last:pb-0">
            <div class="flex-1 pr-2">
                <p class="font-bold text-slate-700 leading-tight line-clamp-2">${i.nama}</p>
                <p class="text-[9px] text-slate-400 mt-0.5">${i.size ? i.size : 'All Size'}</p>
            </div>
            <div class="text-right whitespace-nowrap"><span class="font-bold text-slate-900">x${i.qty}</span></div>
        </div>
    `).join('');

    const container = document.getElementById("barcode-display"); 
    container.innerHTML = ""; 
    setTimeout(() => { new QRCode(container, { text: id, width: 256, height: 256, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H }); }, 100);
}
function closeReceiptModal() { document.getElementById('receipt-modal').classList.add('hidden'); }

// --- ADMIN ORDERS & SCANNER ---
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
                    
                    <div class="bg-slate-50/50 rounded-xl p-3 mb-4 text-xs space-y-1 border border-slate-50 max-h-32 overflow-y-auto">
                        ${o.items.map(i => `<div class="text-slate-600 flex justify-between border-b border-slate-100 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0"><div><span>${i.nama}</span> <br><span class="text-[9px] text-slate-400">${i.size||''}</span></div> <span class="font-bold">x${i.qty}</span></div>`).join('')}
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

// --- INSTALLMENT / CICILAN ---
function openInstallmentModal(orderId, sisa) {
    document.getElementById('installment-modal').classList.remove('hidden');
    document.getElementById('inst-order-id').innerText = "#" + orderId;
    document.getElementById('inst-id-hidden').value = orderId;
    document.getElementById('inst-sisa-tagihan').innerText = "Rp " + parseInt(sisa).toLocaleString('id-ID');
    document.getElementById('inst-nominal').value = ""; 
    document.getElementById('inst-proof').value = ""; 
    document.getElementById('inst-drop-text').innerHTML = `<i class="fa-solid fa-camera text-xl text-slate-300 group-hover:text-brand-500 mb-1 transition-colors"></i><p class="text-[10px] font-bold text-slate-400">Upload Bukti</p>`;
}
function closeInstallmentModal() { document.getElementById('installment-modal').classList.add('hidden'); }
function previewInstFile() {
    const input = document.getElementById('inst-proof');
    if(input.files && input.files[0]) document.getElementById('inst-drop-text').innerHTML = `<div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1 text-green-500"><i class="fa-solid fa-check"></i></div><p class="text-[9px] font-bold text-slate-700 truncate max-w-[100px] mx-auto">${input.files[0].name}</p>`;
}
async function submitInstallment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-inst'); const ot = btn.innerText;
    btn.innerText = "Mengirim..."; btn.disabled = true;

    const id = document.getElementById('inst-id-hidden').value;
    const nominal = parseInt(document.getElementById('inst-nominal').value);
    const fileInput = document.getElementById('inst-proof');

    if (!nominal || nominal <= 0) { showToast("Masukkan nominal pembayaran", "error"); btn.disabled = false; btn.innerText = ot; return; }
    if (fileInput.files.length === 0) { showToast("Upload bukti transfer", "error"); btn.disabled = false; btn.innerText = ot; return; }

    try {
        const base64 = await toBase64(fileInput.files[0]);
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_pay_installment', id_transaksi: id, nominal: nominal, bukti_base64: base64 }) });
        const data = await res.json();
        if (data.status) { showToast("Pembayaran cicilan berhasil!", "success"); closeInstallmentModal(); fetchMyOrders(); } 
        else { showToast(data.message, "error"); }
    } catch (err) { showToast("Koneksi gagal", "error"); }

    btn.innerText = ot; btn.disabled = false;
}

function selectPaymentMethod(value, el) {
    document.getElementById('pay-method').value = value;
    document.querySelectorAll('.pay-option').forEach(opt => {
        opt.classList.remove('border-brand-500', 'bg-brand-50', 'ring-1', 'ring-brand-500');
        opt.querySelector('.check-circle').classList.remove('bg-brand-500', 'border-brand-500');
        opt.querySelector('.check-circle i').classList.add('opacity-0');
    });
    el.classList.add('border-brand-500', 'bg-brand-50', 'ring-1', 'ring-brand-500');
    el.querySelector('.check-circle').classList.add('bg-brand-500', 'border-brand-500');
    el.querySelector('.check-circle i').classList.remove('opacity-0');
    updatePaymentInfo();
}

// --- ADMIN VOUCHER CRUD ---
async function fetchAdminVouchers() {
    const tbody = document.getElementById('admin-voucher-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-5 text-slate-400">Loading...</td></tr>';
    try {
        const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_get_vouchers' }) });
        const data = await res.json();
        if(data.status) {
            tbody.innerHTML = '';
            if(data.data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-5 text-slate-400">Belum ada voucher</td></tr>'; return; }
            data.data.forEach(v => {
                const diskonTxt = v.tipe === 'Persen' ? `${v.nilai}%` : `Rp ${parseInt(v.nilai).toLocaleString('id-ID')}`;
                const stClass = v.status === 'Terpakai' ? 'text-red-500 bg-red-50' : 'text-green-500 bg-green-50';
                tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-5 pl-8 font-mono font-bold text-brand-600">${v.kode}</td>
                    <td class="p-5 font-bold text-slate-700">${diskonTxt}</td>
                    <td class="p-5 text-xs text-slate-500">${v.berlaku}</td>
                    <td class="p-5 text-center"><span class="${stClass} px-2 py-1 rounded text-[10px] font-bold uppercase">${v.status}</span></td>
                    <td class="p-5 pr-8 text-right">
                        <button onclick="deleteVoucher('${v.id}')" class="text-slate-400 hover:text-red-600 w-8 h-8 rounded-full hover:bg-red-50"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>`;
            });
        }
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-5 text-red-500">Error memuat data</td></tr>'; }
}

function openVoucherModal() { document.getElementById('voucher-modal').classList.remove('hidden'); }
function closeVoucherModal() { document.getElementById('voucher-modal').classList.add('hidden'); }

async function saveVoucher(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-vch'); const ot = btn.innerText;
    btn.innerText = "Menyimpan..."; btn.disabled = true;
    
    const payload = {
        action: 'shop_save_voucher',
        kode: document.getElementById('vch-kode').value.replace(/\s+/g, ''),
        tipe: document.getElementById('vch-tipe').value,
        nilai: document.getElementById('vch-nilai').value,
        berlaku: document.getElementById('vch-berlaku').value
    };
    
    try {
        await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
        showToast("Voucher berhasil dibuat", "success");
        closeVoucherModal(); e.target.reset(); fetchAdminVouchers();
    } catch(e) { showToast("Gagal menyimpan voucher", "error"); }
    btn.innerText = ot; btn.disabled = false;
}

async function deleteVoucher(id) {
    if(!confirm("Hapus voucher ini?")) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'shop_delete_voucher', id: id }) });
    showToast("Voucher dihapus", "success");
    fetchAdminVouchers();
}