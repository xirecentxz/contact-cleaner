const cleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        return String(rawString).split(/[/|:;]|\s{2,}/).map(n => n.trim()).filter(n => n.length > 0);
    },
    classify: function(phone) {
        let clean = String(phone).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        let type = 'Invalid';
        if (isMobile) type = 'Mobile';
        else if (isHome) type = 'Home';
        else if (isService) type = 'Service';
        return { formatted: clean, type: type };
    }
};

let excelData = [];
const overlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

function toggleLoading(show, text = "") {
    loadingText.innerText = text;
    overlay.style.display = show ? 'flex' : 'none';
}

function detectPhoneColumns(data) {
    const allColumns = Object.keys(data[0]);
    const phoneKeywords = ['phone', 'mobile', 'kontak', 'contact', 'telp', 'wa', 'value', 'msisdn', 'cell'];
    
    return allColumns.map(col => {
        const colLower = col.toLowerCase();
        const hasKeyword = phoneKeywords.some(key => colLower.includes(key));
        let foundSample = null;
        let isNumeric = false;

        // DEEP SCAN: Cek semua baris untuk mencari pola angka
        for (let i = 0; i < data.length; i++) {
            const val = String(data[i][col] || "").trim();
            if (/\d{5,}/.test(val)) { 
                isNumeric = true; 
                foundSample = val; 
                break; 
            }
        }
        return { name: col, sample: foundSample, isRecommended: isNumeric || (hasKeyword && foundSample) };
    });
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    toggleLoading(true, "Membaca & Memindai File...");
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            
            const detected = detectPhoneColumns(excelData);
            const container = document.getElementById('column-checkbox-list');
            container.innerHTML = '<h4>Verifikasi Kolom Telepon:</h4>' + detected.map(item => `
                <div class="column-item">
                    <label><input type="checkbox" name="phone-cols" value="${item.name}" ${item.isRecommended ? 'checked' : ''}> 
                    <strong>${item.name}</strong> <span class="sample-text">${item.sample ? 'Contoh: '+item.sample : '(Kosong)'}</span></label>
                </div>
            `).join('');
            
            document.getElementById('config-section').style.display = 'block';
            document.getElementById('file-name-display').innerText = file.name;
        } catch (err) { alert("Error membaca file!"); }
        finally { toggleLoading(false); }
    };
    reader.readAsArrayBuffer(file);
});

async function runProcess(mode) {
    const selectedCols = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    if (selectedCols.length === 0) return alert("Pilih minimal satu kolom telepon!");

    toggleLoading(true, "Sedang Membersihkan Data...");

    setTimeout(() => {
        const results = [];
        const seen = new Set();
        const isBlast = (mode === 'blast');
        const skipHome = document.getElementById('clean-home').checked;
        const doCombineNames = document.getElementById('combine-names').checked;

        excelData.forEach(row => {
            const baseRow = { ...row };
            
            // 1. Konsolidasi Nama (Gabungkan First, Middle, Last)
            if (doCombineNames) {
                baseRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
            }

            let collectedNums = [];
            selectedCols.forEach(col => {
                if (row[col]) {
                    const nums = cleaner.splitNumbers(row[col]);
                    if (!isBlast) {
                        // MODE ARSIP: Rapikan di tempat (Horizontal)
                        baseRow[col] = nums.map(n => cleaner.classify(n).formatted).filter(n => n.length >= 10).join(' / ');
                    } else {
                        collectedNums = collectedNums.concat(nums);
                    }
                }
            });

            if (!isBlast) {
                results.push(baseRow);
            } else {
                // MODE BLAST: Pecah ke bawah (Vertical)
                collectedNums.forEach(n => {
                    const info = cleaner.classify(n);
                    // 10-Digit Rule & Filter Jenis
                    if (info.formatted.length < 10 && info.type !== 'Service') return;
                    if (skipHome && info.type === 'Home') return;
                    
                    if (document.getElementById('remove-dup').checked) {
                        if (seen.has(info.formatted)) return;
                        seen.add(info.formatted);
                    }

                    const blastRow = { ...baseRow };
                    selectedCols.forEach(c => delete blastRow[c]); // Bersihkan kolom lama agar tidak bingung
                    blastRow['Clean_Phone'] = info.formatted;
                    blastRow['Phone_Type'] = info.type;
                    results.push(blastRow);
                });
            }
        });

        // Simpan Hasil
        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Result");
        XLSX.writeFile(wb, isBlast ? "Data_Siap_Blast.xlsx" : "Data_Kontak_Arsip.xlsx");
        toggleLoading(false);
    }, 150);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess('archive'));
document.getElementById('blast-btn').addEventListener('click', () => runProcess('blast'));
