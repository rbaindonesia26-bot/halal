// ==========================================
// 1. CLOUD DATABASE MOCK SERVICE
// ==========================================
const CloudDatabaseService = {
    storageKey: 'halalpay_db_v4',
    
    getDB: function() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : { balance: 0, goldBalance: 0, transactions: [] };
    },
    saveDB: function(db) { localStorage.setItem(this.storageKey, JSON.stringify(db)); },
    getBalance: async function() { return new Promise(res => setTimeout(() => res(this.getDB().balance), 500)); },
    getGoldBalance: function() { return this.getDB().goldBalance; },
    
    updateBalance: function(newBalance) {
        const db = this.getDB(); db.balance = newBalance; this.saveDB(db);
    },
    updateGoldBalance: function(newGold) {
        const db = this.getDB(); db.goldBalance = newGold; this.saveDB(db);
    },
    saveTransaction: function(tx) {
        const db = this.getDB(); db.transactions.unshift(tx); this.saveDB(db);
    },
    getTransactions: async function() { return new Promise(res => setTimeout(() => res(this.getDB().transactions), 500)); }
};

// ==========================================
// 2. CORE APP LOGIC (UI & NAVIGATION)
// ==========================================
let currentBalance = 0;
let isBalanceHidden = false;

window.navigate = function(screenId) {
    document.querySelectorAll('.page-transition').forEach(el => {
        if(el.id && el.id.includes('screen')) {
            el.classList.remove('page-active'); el.classList.add('page-hidden');
        }
    });
    document.getElementById(screenId).classList.remove('page-hidden');
    document.getElementById(screenId).classList.add('page-active');
    
    if(screenId === 'admin-screen') loadHistory();
    if(screenId === 'scanner-screen') startCamera();
};

window.updateBalanceUI = function() {
    const balanceEl = document.getElementById('main-balance');
    const eyeIcon = document.getElementById('eye-icon');
    const ctaEl = document.getElementById('zero-balance-cta');
    
    if (isBalanceHidden) {
        balanceEl.textContent = 'Rp •••••••';
        eyeIcon.className = 'fa-regular fa-eye-slash';
    } else {
        balanceEl.textContent = 'Rp ' + currentBalance.toLocaleString('id-ID');
        eyeIcon.className = 'fa-regular fa-eye';
    }
    
    if (currentBalance === 0) ctaEl.classList.remove('hidden');
    else ctaEl.classList.add('hidden');
};

window.toggleBalance = function() {
    isBalanceHidden = !isBalanceHidden;
    updateBalanceUI();
};

// ==========================================
// 3. FITUR FINANSIAL & INVESTASI
// ==========================================
const GOLD_PRICE_PER_GRAM = 1250000;

window.loadInvestasiData = function() {
    const goldBal = CloudDatabaseService.getGoldBalance();
    document.getElementById('gold-balance').textContent = goldBal.toFixed(4);
    document.getElementById('gold-value').textContent = (goldBal * GOLD_PRICE_PER_GRAM).toLocaleString('id-ID');
};

window.calculateGold = function() {
    const input = document.getElementById('buy-gold-amount').value;
    if(input) {
        const gram = input / GOLD_PRICE_PER_GRAM;
        document.getElementById('gold-estimation').textContent = gram.toFixed(4) + " gram";
    } else {
        document.getElementById('gold-estimation').textContent = "0.0000 gram";
    }
};

window.processBuyGold = function() {
    const amount = parseInt(document.getElementById('buy-gold-amount').value);
    if (!amount || amount < 50000) { alert("Minimal pembelian Rp 50.000"); return; }
    if (amount > currentBalance) { alert("Saldo HalalPay tidak mencukupi!"); return; }

    if(confirm(`Beli emas senilai Rp ${amount.toLocaleString('id-ID')}?`)) {
        const gram = amount / GOLD_PRICE_PER_GRAM;
        const newGoldBal = CloudDatabaseService.getGoldBalance() + gram;
        currentBalance -= amount;

        CloudDatabaseService.updateBalance(currentBalance);
        CloudDatabaseService.updateGoldBalance(newGoldBal);
        CloudDatabaseService.saveTransaction({
            type: 'INVESTASI', title: 'Beli Emas ' + gram.toFixed(4) + 'g', amount: amount, isMinus: true, date: new Date().toISOString()
        });
        
        updateBalanceUI();
        loadInvestasiData();
        document.getElementById('buy-gold-amount').value = '';
        document.getElementById('gold-estimation').textContent = "0.0000 gram";
        alert("Alhamdulillah, pembelian emas berhasil!");
    }
};

window.payUmrahDP = function(paketName, dpAmount) {
    if (dpAmount > currentBalance) {
        alert(`Saldo tidak mencukupi. Anda butuh Rp ${dpAmount.toLocaleString('id-ID')} untuk membayar DP.`);
        return;
    }
    if(confirm(`Bayar DP (Uang Muka) Rp ${dpAmount.toLocaleString('id-ID')} untuk Paket Umrah ${paketName}?`)) {
        currentBalance -= dpAmount;
        CloudDatabaseService.updateBalance(currentBalance);
        CloudDatabaseService.saveTransaction({
            type: 'UMRAH', title: 'DP Umrah: ' + paketName, amount: dpAmount, isMinus: true, date: new Date().toISOString()
        });
        updateBalanceUI();
        alert(`Alhamdulillah, DP Paket ${paketName} berhasil dibayarkan!`);
        navigate('home-screen');
    }
};

// ==========================================
// 4. TRANSAKSI DASAR (PPOB, Transfer, Ziswaf)
// ==========================================
window.openPPOB = function() {
    const nominal = prompt("Masukkan nominal pulsa (Min. 10000):");
    if (!nominal) return;
    const num = parseInt(nominal);
    if (num > currentBalance) { alert("Saldo tidak mencukupi!"); return; }
    currentBalance -= num;
    CloudDatabaseService.updateBalance(currentBalance);
    CloudDatabaseService.saveTransaction({ type: 'PPOB', title: 'Beli Pulsa/Token', amount: num, isMinus: true, date: new Date().toISOString()});
    updateBalanceUI(); alert("Pembelian berhasil!");
};

window.openTransfer = function() {
    const rek = prompt("Masukkan Rekening Tujuan:");
    if (!rek) return;
    const num = parseInt(prompt("Masukkan Nominal Transfer:"));
    if (num > currentBalance) { alert("Saldo tidak mencukupi!"); return; }
    currentBalance -= num;
    CloudDatabaseService.updateBalance(currentBalance);
    CloudDatabaseService.saveTransaction({ type: 'TRANSFER', title: 'Transfer ke ' + rek, amount: num, isMinus: true, date: new Date().toISOString()});
    updateBalanceUI(); alert("Transfer berhasil!");
};

let selectedZiswafType = 'Zakat';
window.openZiswaf = function() { navigate('ziswaf-screen'); };
window.closeZiswaf = function() { navigate('home-screen'); };
window.selectZiswafType = function(type) { 
    selectedZiswafType = type;
    document.querySelectorAll('.ziswaf-type-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-500/10', 'border-emerald-500/50', 'text-emerald-400');
        btn.classList.add('bg-white/5', 'border-white/10', 'text-gray-300');
    });
    const activeBtn = document.getElementById('btn-' + type);
    activeBtn.classList.remove('bg-white/5', 'border-white/10', 'text-gray-300');
    activeBtn.classList.add('bg-emerald-500/10', 'border-emerald-500/50', 'text-emerald-400');
};

window.processZiswaf = function() {
    const amount = parseInt(document.getElementById('ziswaf-amount').value);
    if (!amount || amount < 10000) return alert("Minimal Rp 10.000");
    if (amount > currentBalance) return alert("Saldo tidak mencukupi.");
    if (confirm(`Salurkan ${selectedZiswafType} sebesar Rp ${amount}?`)) {
        currentBalance -= amount;
        CloudDatabaseService.updateBalance(currentBalance);
        CloudDatabaseService.saveTransaction({ type: 'ZISWAF', title: selectedZiswafType, amount: amount, isMinus: true, date: new Date().toISOString()});
        updateBalanceUI(); alert("Ziswaf berhasil disalurkan."); closeZiswaf();
    }
};

window.simulateWebhook = function(amount) {
    currentBalance += amount;
    CloudDatabaseService.updateBalance(currentBalance);
    CloudDatabaseService.saveTransaction({ type: 'DEPOSIT', title: 'Top Up Virtual Account', amount: amount, isMinus: false, date: new Date().toISOString()});
    updateBalanceUI(); alert(`Top Up Rp ${amount.toLocaleString()} berhasil!`); navigate('home-screen');
};

// ==========================================
// 5. RIWAYAT & DATABASE
// ==========================================
async function loadHistory() {
    const list = document.getElementById('transactions-list');
    const history = await CloudDatabaseService.getTransactions();
    list.innerHTML = history.length === 0 ? '<p class="text-center mt-10">Belum ada transaksi.</p>' : 
        history.map(tx => `
        <div class="bg-white p-4 rounded-xl shadow-sm border mb-2 flex justify-between">
            <div><p class="font-bold">${tx.title}</p><p class="text-xs text-gray-500">${tx.type} • ${new Date(tx.date).toLocaleDateString('id-ID')}</p></div>
            <p class="font-bold ${tx.isMinus ? 'text-gray-800' : 'text-emerald-500'}">${tx.isMinus ? '-' : '+'}Rp ${tx.amount.toLocaleString()}</p>
        </div>`).join('');
}

window.clearDatabase = function() {
    if(confirm('Hapus seluruh riwayat dan reset dompet?')) {
        localStorage.removeItem(CloudDatabaseService.storageKey);
        currentBalance = 0; updateBalanceUI(); navigate('home-screen');
    }
};

// ==========================================
// 6. MESIN AI & SCANNER (Tesseract & ZXing)
// ==========================================
let codeReader;
let tesseractWorker = null;
let isWorkerReady = false;

async function initAI() {
    const statusEl = document.getElementById('ai-status');
    if(statusEl) statusEl.classList.remove('hidden');
    try {
        tesseractWorker = Tesseract.createWorker({
            logger: m => {
                if (m.status === 'recognizing text' && statusEl) {
                    statusEl.textContent = `Menganalisis: ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        await tesseractWorker.load();
        await tesseractWorker.loadLanguage('ind+eng');
        await tesseractWorker.initialize('ind+eng');
        isWorkerReady = true;
        if(statusEl) {
            statusEl.textContent = 'AI Siap Digunakan!';
            setTimeout(() => statusEl.classList.add('hidden'), 2000);
        }
    } catch (err) {
        if(statusEl) statusEl.textContent = 'Gagal memuat AI';
    }
}

async function startCamera() {
    codeReader = new ZXing.BrowserMultiFormatReader();
    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        const selectedDeviceId = videoInputDevices[videoInputDevices.length - 1].deviceId; // Kamera belakang
        
        await codeReader.decodeFromVideoDevice(selectedDeviceId, 'video', (result, err) => {
            if (result) {
                alert(`QR/Barcode Ditemukan!\nData: ${result.text}`);
                window.stopScannerAndNavigateHome();
            }
        });
    } catch (err) {
        alert("Kamera tidak dapat diakses.");
        window.stopScannerAndNavigateHome();
    }
}

window.stopScannerAndNavigateHome = function() {
    if (codeReader) codeReader.reset();
    navigate('home-screen');
}

const haramKeywords = [
    "karmin", "carmine", "e120", "gelatin", "babi", "pork", "lard", "porcine", "bacon", 
    "angciu", "arak", "rum", "mirin", "rhum", "khamr", "rennet", "pepsin", "emulsifier", "e471"
];

window.captureAndAnalyze = async function() {
    if (!isWorkerReady) { alert("Mohon tunggu, AI sedang dimuat..."); return; }

    const video = document.getElementById('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const statusEl = document.getElementById('ai-status');
    statusEl.classList.remove('hidden');
    statusEl.textContent = 'AI Menganalisis Komposisi...';
    
    try {
        const result = await tesseractWorker.recognize(canvas);
        const text = result.data.text.toLowerCase();
        
        let foundHaram = [];
        haramKeywords.forEach(keyword => { if (text.includes(keyword)) foundHaram.push(keyword); });
        
        statusEl.classList.add('hidden');
        if (foundHaram.length > 0) alert(`⚠️ PERINGATAN!\nTerdeteksi bahan kritis: ${foundHaram.join(', ')}`);
        else alert(`✅ InsyaAllah Aman.\nTidak terdeteksi bahan haram umum.`);
    } catch (err) {
        statusEl.classList.add('hidden');
        alert("Gagal menganalisis teks.");
    }
}

// ==========================================
// 7. INISIALISASI SAAT APLIKASI DIBUKA
// ==========================================
window.initApp = async function() {
    try {
        currentBalance = await CloudDatabaseService.getBalance();
        updateBalanceUI();
        document.getElementById('server-text').textContent = "SERVER TERHUBUNG";
        document.getElementById('server-dot').className = "w-2 h-2 rounded-full bg-emerald-400";
    } catch (e) {}
};

// Jalankan Inisialisasi
initAI();
initApp();
