/**
 * CONTACT CLEANER PRO V3.5 - HYBRID ENGINE
 * Mode Arsip: Tidy Up (Keep Original Context + Audit Status)
 * Mode Blast: Clean Up (Force 62 + Strict Filtering)
 */

const cleaner = {
    // Menangani / , ::: , ; , dan spasi lebar
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        return String(rawString)
            .split(/[/|:;]|\s{2,}|:::/)
            .map(n => n.trim())
            .filter(n => n.length > 0);
    },

    // MESIN 1: Mode Blast (Standarisasi Internasional)
    formatForBlast: function(phone) {
        let clean = String(phone).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        
        let type = 'Invalid';
        if (isMobile) type = 'Mobile';
        else if (isHome) type = 'Home';
        else if (isService) type = 'Service';
        
        return { formatted: clean, type: type, isValid: clean.length >= 10 || type === 'Service' };
    },

    // MESIN 2: Mode Arsip (Hanya Rapikan Simbol, Jaga Keaslian)
    formatForArchive: function(phone) {
        // Hanya hapus simbol pengganggu, biarkan awalan 0 atau 62 apa adanya
        let clean = String(phone).replace(/[+\-\s()]/g, ''); 
        let status = (clean.length >= 10) ? "OK" : "Cek Manual";
        return { formatted: clean, type: status };
    }
};

let excelData = [];
const overlay = document.getElementById('loading-overlay');

function toggleLoading(show, text = "") {
    document.getElementById('loading-text').innerText = text;
    overlay.style.display = show ? 'flex' : 'none';
}

// Deep Scan mencari kolom telepon di ribuan baris
function detectPhoneColumns(data) {
    const allColumns = Object.keys(data[0]);
    const phoneKeywords = ['phone', 'mobile', 'kontak', 'contact', 'telp', 'wa', 'value', 'msisdn'];
    return allColumns.map(col => {
        let isNumeric = false;
        let sample = "";
        for (let i = 0; i < Math.min(data.length, 2000); i++) { // Deep Scan up to 2000 rows
            const val = String(data[i][col] || "");
            if (/\d{5,}/.test(val)) { isNumeric = true; sample = val; break; }
        }
        return { 
            name: col, 
            sample: sample, 
            isRecommended: isNumeric || phoneKeywords.some(k => col.toLowerCase().includes(k)) 
        };
    });
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    toggleLoading(true, "Membaca & Memindai Data...");
    
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
                    <strong>${item.name}</strong> <span class="sample-text">${item.sample ? 'Contoh: '+item.sample : ''}</span></label>
                </div>
            `).join('');
            
            document.getElementById('config-section').style.display = 'block';
            document.getElementById('file-name-display').innerText = file.name;
        } finally { toggleLoading(false); }
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
            if (doCombineNames) {
                // Menggabungkan Nama Lengkap jika kolom tersedia
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
                    // LOGIKA BLAST: Paksa 62, Buang sampah, Cek Duplikat
                    info = cleaner.formatForBlast(num);
                    if (!info.isValid) return; // Buang nomor pendek/invalid
                    if (skipHome && info.type === 'Home') return;
                    if (document.getElementById('remove-dup').checked && globalSeen.has(info.formatted)) return;
                    globalSeen.add(info.formatted);
                } else {
                    // LOGIKA ARSIP: Merapikan simbol, simpan semua (termasuk yang pendek)
                    const tidy = cleaner.formatForArchive(num);
                    info = { formatted: tidy.formatted, type: tidy.type };
                    // Di mode Arsip kita tidak menghapus duplikat global agar data kontak tetap utuh
                }

                const finalRow = { ...baseRow };
                selectedCols.forEach(c => delete finalRow[c]); // Hapus kolom asli agar rapi
                
                finalRow['Clean_Phone'] = info.formatted;
                finalRow[isBlastMode ? 'Phone_Type' : 'Status_Kualitas'] = info.type;
                results.push(finalRow);
            });
        });

        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Hasil_Proses");
        XLSX.writeFile(wb, isBlastMode ? "Data_Siap_Blast.xlsx" : "Arsip_Kontak_Rapi.xlsx");
        toggleLoading(false);
    }, 200);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
