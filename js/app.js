console.log("Contact Cleaner Pro v3.6.1 Loaded - Full Scan Mode Active");

const cleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        return String(rawString).split(/[/|:;]|\s{2,}|:::/).map(n => n.trim()).filter(n => n.length > 0);
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
        let clean = String(phone).replace(/[+\-\s()]/g, ''); 
        return { formatted: clean, type: clean.length >= 10 ? "OK" : "Cek Manual" };
    }
};

let excelData = [];
const toggleLoading = (show, text = "") => {
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
};

function detectPhoneColumns(data) {
    const allColumns = Object.keys(data[0]);
    const keywords = ['phone', 'mobile', 'kontak', 'contact', 'telp', 'wa', 'value'];
    return allColumns.map(col => {
        let isNumeric = false, sample = "";
        for (let i = 0; i < data.length; i++) { // FULL SCAN
            const val = String(data[i][col] || "").trim();
            if (/\d{5,}/.test(val)) { isNumeric = true; sample = val; break; }
        }
        return { name: col, sample: sample, isVisible: keywords.some(k => col.toLowerCase().includes(k)) || isNumeric, isRecommended: isNumeric };
    }).filter(item => item.isVisible);
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    toggleLoading(true, "Memindai Seluruh Kolom...");
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
            const detected = detectPhoneColumns(excelData);
            document.getElementById('column-checkbox-list').innerHTML = '<h4>Deteksi Kolom:</h4>' + detected.map(item => `
                <div class="column-item">
                    <label><input type="checkbox" name="phone-cols" value="${item.name}" ${item.isRecommended ? 'checked' : ''}> 
                    <strong>${item.name}</strong> <span class="sample-text">${item.sample ? 'Contoh: '+item.sample : '(Kosong)'}</span></label>
                </div>`).join('');
            document.getElementById('config-section').style.display = 'block';
            document.getElementById('file-name-display').innerText = file.name;
        } finally { toggleLoading(false); }
    };
    reader.readAsArrayBuffer(file);
});

async function runProcess(isBlast) {
    const selectedCols = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    if (selectedCols.length === 0) return alert("Pilih kolom!");
    toggleLoading(true, "Sedang Memproses...");
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
        XLSX.writeFile(wb, isBlast ? "Data_Blast.xlsx" : "Arsip_Rapi.xlsx");
        toggleLoading(false);
    }, 200);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
