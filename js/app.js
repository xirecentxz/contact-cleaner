/**
 * CONTACT CLEANER PRO
 * v3.6.4 - Raw Text Engine (Anti-Data Corruption)
 */
const APP_VERSION = "v3.6.4-RawText";

// Update Label Versi Otomatis
document.addEventListener("DOMContentLoaded", () => {
    const tag = document.getElementById('version-tag');
    if (tag) tag.innerText = APP_VERSION;
    console.log(`%c ${APP_VERSION} Active: Raw Reading Mode `, "background: #f59e0b; color: #000; font-weight: bold; padding: 4px;");
});

const cleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        // Regex cerdas untuk memisahkan nomor berdasarkan simbol aneh di CSV Anda
        return String(rawString).split(/[/|:;]|\s{2,}|:::/).map(n => n.trim()).filter(n => n.length > 0);
    },
    formatForBlast: function(phone) {
        let clean = String(phone).replace(/[^\d]/g, ''); // Buang semua kecuali angka
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        let type = isMobile ? 'Mobile' : isHome ? 'Home' : isService ? 'Service' : 'Invalid';
        return { formatted: clean, type: type, isValid: clean.length >= 10 || type === 'Service' };
    },
    formatForArchive: function(phone) {
        // Mode Arsip: Hanya buang simbol dasar, pertahankan konteks 0/62
        let clean = String(phone).replace(/[+\-\s()]/g, ''); 
        return { formatted: clean, type: clean.length >= 10 ? "OK" : "Cek Manual" };
    }
};

let excelData = [];
const toggleLoading = (show, text = "") => {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (overlay && loadingText) {
        loadingText.innerText = text;
        overlay.style.display = show ? 'flex' : 'none';
    }
};

function detectPhoneColumns(data) {
    if (!data || data.length === 0) return [];
    const allColumns = Object.keys(data[0]);
    const phoneKeywords = ['phone', 'mobile', 'kontak', 'contact', 'telp', 'wa', 'value', 'msisdn'];
    
    return allColumns.map(col => {
        const colLower = col.toLowerCase();
        const hasKeyword = phoneKeywords.some(key => colLower.includes(key));
        let foundSample = null;
        let isNumeric = false;
        
        // SCAN SELURUH DATA: Sekarang lebih akurat karena data dibaca sebagai Raw String
        for (let i = 0; i < data.length; i++) {
            const val = String(data[i][col] || "").trim();
            if (/\d{5,}/.test(val)) { 
                isNumeric = true; 
                foundSample = val; 
                break; 
            }
        }
        return { name: col, sample: foundSample, isVisible: hasKeyword || isNumeric, isRecommended: isNumeric };
    }).filter(item => item.isVisible);
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    toggleLoading(true, "Membaca Data Mentah (Raw Mode)...");
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            // DISINI KUNCINYA: Memaksa pembacaan sebagai Teks (Raw)
            const workbook = XLSX.read(data, {
                type: 'array',
                raw: true,
                cellText: true
            });
            
            excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
                raw: false,
                defval: ""
            });
            
            const detected = detectPhoneColumns(excelData);
            document.getElementById('column-checkbox-list').innerHTML = '<h4>Verifikasi Kolom:</h4>' + detected.map(item => `
                <div class="column-item">
                    <label><input type="checkbox" name="phone-cols" value="${item.name}" ${item.isRecommended ? 'checked' : ''}> 
                    <strong>${item.name}</strong> <span class="sample-text">${item.sample ? 'Contoh: '+item.sample : '(Kosong)'}</span></label>
                </div>`).join('');
            document.getElementById('config-section').style.display = 'block';
            document.getElementById('file-name-display').innerText = file.name;
        } catch (err) { alert("Error: " + err.message); }
        finally { toggleLoading(false); }
    };
    reader.readAsArrayBuffer(file);
});

async function runProcess(isBlast) {
    const selectedCols = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    if (selectedCols.length === 0) return alert("Pilih minimal satu kolom!");
    toggleLoading(true, "Merapikan Baris...");
    setTimeout(() => {
        const results = [], globalSeen = new Set();
        excelData.forEach(row => {
            const baseRow = { ...row };
            if (document.getElementById('combine-names').checked) {
                baseRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
            }
            let nums = [];
            selectedCols.forEach(col => { if (row[col]) nums = nums.concat(cleaner.splitNumbers(row[col])); });
            nums.forEach(n => {
                let info = isBlast ? cleaner.formatForBlast(n) : cleaner.formatForArchive(n);
                if (isBlast && (!info.isValid || (document.getElementById('clean-home').checked && info.type === 'Home'))) return;
                if (isBlast && document.getElementById('remove-dup').checked && globalSeen.has(info.formatted)) return;
                if (isBlast) globalSeen.add(info.formatted);
                
                const finalRow = { ...baseRow };
                selectedCols.forEach(c => delete finalRow[c]);
                finalRow['Clean_Phone'] = info.formatted;
                finalRow[isBlast ? 'Phone_Type' : 'Status_Kualitas'] = info.type;
                results.push(finalRow);
            });
        });
        const ws = XLSX.utils.json_to_sheet(results), wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Result");
        XLSX.writeFile(wb, isBlast ? "Data_Blast.xlsx" : "Arsip_Kontak.xlsx");
        toggleLoading(false);
    }, 200);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
