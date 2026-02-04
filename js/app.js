// --- LOGIKA PEMBERSIH & KLASIFIKASI ---
const cleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        // Memecah berdasarkan simbol /, :, ;, atau spasi yang lebar
        return String(rawString)
            .split(/[/|:;]|\s{2,}/)
            .map(n => n.trim())
            .filter(n => n.length > 0);
    },

    classify: function(phone) {
        let clean = String(phone).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);

        // Mobile: 628...
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        // Home: 62 + (2-7, 9) + nomor, panjang 9-11 digit
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');
        // Service: 1500 atau 140xx
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        
        let type = 'International/Invalid';
        if (isMobile) type = 'Mobile';
        else if (isHome) type = 'Home';
        else if (isService) type = 'Service/CallCenter';
        else if (clean.startsWith('62')) type = 'Invalid Indo';

        return { formatted: clean, type: type };
    }
};

// --- LOGIKA UTAMA APLIKASI ---
let excelData = [];

// 1. Handler Upload File
document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            excelData = XLSX.utils.sheet_to_json(worksheet);

            if (excelData.length > 0) {
                const selector = document.getElementById('column-selector');
                selector.innerHTML = Object.keys(excelData[0])
                    .map(col => `<option value="${col}">${col}</option>`)
                    .join('');
                
                // Munculkan opsi pengaturan
                document.getElementById('config-section').style.display = 'block';
                console.log("Data berhasil dimuat. Total baris:", excelData.length);
            } else {
                alert("File Excel kosong.");
            }
        } catch (err) {
            console.error("Gagal baca Excel:", err);
            alert("Terjadi kesalahan saat membaca file.");
        }
    };
    reader.readAsArrayBuffer(file);
});

// 2. Handler Tombol Proses (Sudah Optimasi Loading)
document.getElementById('process-btn').addEventListener('click', function() {
    if (excelData.length === 0) return;

    // Visual Feedback: Ubah tombol jadi mode loading
    const btn = this;
    const originalText = btn.innerText;
    btn.innerText = "⏳ Sedang Memproses Data...";
    btn.disabled = true;
    btn.style.opacity = "0.7";

    // Berikan jeda sedikit agar browser sempat merender perubahan teks tombol
    setTimeout(() => {
        const targetCol = document.getElementById('column-selector').value;
        const results = [];
        const seen = new Set();

        const skipHome = document.getElementById('clean-home').checked;
        const skipIntl = document.getElementById('clean-intl').checked;
        const doDedup = document.getElementById('remove-dup').checked;

        try {
            excelData.forEach(row => {
                const rawValue = row[targetCol];
                const individualNumbers = cleaner.splitNumbers(rawValue);

                individualNumbers.forEach(num => {
                    const info = cleaner.classify(num);
                    
                    // Filter berdasarkan checkbox
                    if (skipHome && info.type === 'Home') return;
                    if (skipIntl && info.type === 'International/Invalid') return;
                    
                    // Filter duplikat
                    if (doDedup) {
                        if (seen.has(info.formatted)) return;
                        seen.add(info.formatted);
                    }

                    // Cloning row agar data kolom lain tidak hilang
                    const newRow = { ...row }; 
                    newRow[targetCol] = info.formatted; 
                    newRow['Label_Type'] = info.type; 
                    
                    results.push(newRow);
                });
            });

            // Buat & Download File
            const ws = XLSX.utils.json_to_sheet(results);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Clean Data");
            XLSX.writeFile(wb, "Data_Clean_Terproses.xlsx");

        } catch (error) {
            console.error("Proses gagal:", error);
            alert("Terjadi kesalahan saat memproses data.");
        } finally {
            // Kembalikan tombol ke keadaan semula
            btn.innerText = originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }
    }, 150); // Jeda 150ms sudah cukup untuk membuat UI terasa responsif
});
