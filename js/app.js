/**
 * CONTACT CLEANER PRO V3.6.1 - HYBRID ENGINE
 * Update: Full Scan Mode for Phone 1-7 detection
 */

console.log("Contact Cleaner Pro v3.6.2 Loaded - Full Scan Mode Active");

const cleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        // Mendukung berbagai pemisah termasuk :::
        return String(rawString)
            .split(/[/|:;]|\s{2,}|:::/)
            .map(n => n.trim())
            .filter(n => n.length > 0);
    },
    formatForBlast: function(phone) {
        let clean = String(phone).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        let type = isMobile ? 'Mobile' : isHome ? 'Home' : isService ? 'Service' : 'Invalid';
        return { formatted: clean, type: type, isValid: clean.length >= 10 || type === 'Service' };
    },
    formatForArchive: function(phone) {
        // Hanya hapus simbol, biarkan awalan 0/62 asli untuk arsip
        let clean = String(phone).replace(/[+\-\s()]/g, ''); 
        return { formatted: clean, type: clean.length >= 10 ? "OK" : "Cek Manual" };
    }
};

let excelData = [];
const toggleLoading = (show, text = "") => {
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
};

// Fungsi Deteksi Kolom dengan FULL SCAN (Tanpa Limit Baris)
function detectPhoneColumns(data) {
    const allColumns = Object.keys(data[0]);
    const phoneKeywords = ['phone', 'mobile', 'kontak', 'contact', 'telp', 'wa', 'value', 'msisdn'];
    
    return allColumns.map(col => {
        const colLower = col.toLowerCase();
        const hasKeyword = phoneKeywords.some(key => colLower.includes(key));
        
        let foundSample = null;
        let isNumeric = false;
        
        // Pindai SEMUA baris untuk mencari data angka (agar Phone 3-5 terdeteksi)
        for (let i = 0; i < data.length; i++) {
            const val = String(data[i][col] || "").trim();
            if (/\d{5,}/.test(val)) { 
                isNumeric = true; 
                foundSample = val; 
                break; 
            }
        }
        
        return { 
            name: col, 
            sample: foundSample, 
            // Munculkan di daftar jika ada keyword atau berisi angka
            isVisible: hasKeyword || isNumeric, 
            // Auto-check jika memang terbukti berisi nomor
            isRecommended: isNumeric 
        };
    }).filter(item => item.isVisible);
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    toggleLoading(true, "Memindai Seluruh Baris Data...");
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            const detected = detectPhoneColumns(excelData);
            document.getElementById('column-checkbox-list').innerHTML = '<h4>Deteksi Kolom Telepon:</h4>' + detected.map(item => `
                <div class="column-item">
                    <label><input type="checkbox" name="phone-cols" value="${item.name}" ${item.isRecommended ? 'checked' : ''}> 
                    <strong>${item.name}</strong> <span class="sample-text">${item.sample ? 'Contoh: '+item.sample : '(Kosong)'}</span></label>
                </div>
            `).join('');
            
            document.getElementById('config-section').style.display = 'block';
            document.getElementById('file-name-display').innerText = file.name;
        } catch (err) { alert("Gagal memproses file!"); }
        finally { toggleLoading(false); }
    };
    reader.readAsArrayBuffer(file);
});

async function runProcess(isBlastMode) {
    const selectedCols = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    if (selectedCols.length === 0) return alert("Pilih minimal satu kolom!");

    toggleLoading(true, isBlastMode ? "Memproses Mode Blast..." : "Memproses Mode Arsip...");

    setTimeout(() => {
        const results = [];
        const globalSeen = new Set();
        const skipHome = document.getElementById('clean-home').checked;
        const doCombineNames = document.getElementById('combine-names').checked;

        excelData.forEach(row => {
            const baseRow = { ...row };
            // Gabungkan Nama jika opsi dipilih
            if (doCombineNames) {
                baseRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
            }

            let collectedNums = [];
            selectedCols.forEach(col => {
                if (row[col]) {
                    const splitRes = cleaner.splitNumbers(row[col]);
                    collectedNums = collectedNums.concat(splitRes);
                }
            });

            collectedNums.forEach(num => {
                let info;
                if (isBlastMode) {
                    info = cleaner.formatForBlast(num);
                    if (!info.isValid) return; 
                    if (skipHome && info.type === 'Home') return;
                    if (document.getElementById('remove-dup').checked && globalSeen.has(info.formatted)) return;
                    globalSeen.add(info.formatted);
                } else {
                    info = cleaner.formatForArchive(num);
                }

                const finalRow = { ...baseRow };
                selectedCols.forEach(c => delete finalRow[c]);
                
                finalRow['Clean_Phone'] = info.formatted;
                finalRow[isBlastMode ? 'Phone_Type' : 'Status_Kualitas'] = info.type;
                results.push(finalRow);
            });
        });

        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Result");
        XLSX.writeFile(wb, isBlastMode ? "Data_Blast.xlsx" : "Arsip_Kontak.xlsx");
        toggleLoading(false);
    }, 200);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
