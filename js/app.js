/**
 * CONTACT CLEANER PRO
 * v3.6.6 - Ultra Deep Scan & Multi-Select Action
 */
const APP_VERSION = "v3.6.6-Final";

// Inisialisasi Versi di Layar
document.addEventListener("DOMContentLoaded", () => {
    const tag = document.getElementById('version-tag');
    if (tag) tag.innerText = APP_VERSION;
    console.log(`%c ${APP_VERSION} Active `, "background: #6366f1; color: #fff; font-weight: bold; padding: 4px;");
});

// Fungsi untuk tombol Select All
function toggleAll(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

const cleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        return String(rawString).split(/[/|:;]|\s{2,}|:::/).map(n => n.trim()).filter(n => n.length > 0);
    },
    formatForBlast: function(phone) {
        let clean = String(phone).replace(/[^\d]/g, '');
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
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    if (overlay && loadingText) {
        loadingText.innerText = text;
        overlay.style.display = show ? 'flex' : 'none';
    }
};

function processColumns(data) {
    const allColumns = Object.keys(data[0]);
    const phoneKeywords = ['phone', 'mobile', 'kontak', 'contact', 'telp', 'wa', 'value', 'msisdn'];
    const phoneCols = [];
    const metaCols = [];

    allColumns.forEach(col => {
        const colLower = col.toLowerCase();
        let isNumeric = false, sample = "";
        for (let i = 0; i < data.length; i++) {
            const val = String(data[i][col] || "").trim();
            if (/\d{5,}/.test(val)) { isNumeric = true; sample = val; break; }
        }
        if (phoneKeywords.some(k => colLower.includes(k)) || isNumeric) {
            phoneCols.push({ name: col, sample: sample, isRecommended: isNumeric });
        } else {
            metaCols.push({ name: col, isImportant: !colLower.includes('photo') && !colLower.includes('address') });
        }
    });
    return { phoneCols, metaCols };
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    toggleLoading(true, "Menganalisis Database...");
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array', raw: true, cellText: true });
            excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: "" });
            const { phoneCols, metaCols } = processColumns(excelData);
            
            document.getElementById('column-checkbox-list').innerHTML = phoneCols.map(item => `
                <div class="column-item">
                    <label><input type="checkbox" name="phone-cols" value="${item.name}" ${item.isRecommended ? 'checked' : ''}> 
                    <strong>${item.name}</strong> <span class="sample-text">${item.sample ? 'Sample: '+item.sample : ''}</span></label>
                </div>`).join('');
            
            document.getElementById('metadata-checkbox-list').innerHTML = metaCols.map(item => `
                <div class="column-item">
                    <label><input type="checkbox" name="meta-cols" value="${item.name}" ${item.isImportant ? 'checked' : ''}> ${item.name}</label>
                </div>`).join('');

            document.getElementById('config-section').style.display = 'block';
            document.getElementById('file-name-display').innerText = file.name;
        } finally { toggleLoading(false); }
    };
    reader.readAsArrayBuffer(file);
});

async function runProcess(isBlast) {
    const selectedPhones = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    const selectedMeta = Array.from(document.querySelectorAll('input[name="meta-cols"]:checked')).map(el => el.value);
    if (selectedPhones.length === 0) return alert("Pilih minimal satu kolom telepon!");

    toggleLoading(true, "Normalisasi Baris...");
    setTimeout(() => {
        const results = [], globalSeen = new Set();
        excelData.forEach(row => {
            let nums = [];
            selectedPhones.forEach(col => { if (row[col]) nums = nums.concat(cleaner.splitNumbers(row[col])); });

            nums.forEach(n => {
                let info = isBlast ? cleaner.formatForBlast(n) : cleaner.formatForArchive(n);
                if (isBlast && (!info.isValid || (document.getElementById('clean-home').checked && info.type === 'Home'))) return;
                if (isBlast && document.getElementById('remove-dup').checked && globalSeen.has(info.formatted)) return;
                if (isBlast) globalSeen.add(info.formatted);

                const finalRow = {};
                if (document.getElementById('combine-names').checked) {
                    finalRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                }
                selectedMeta.forEach(col => { finalRow[col] = row[col]; });
                finalRow['Clean_Phone'] = info.formatted;
                finalRow[isBlast ? 'Phone_Type' : 'Status_Kualitas'] = info.type;
                results.push(finalRow);
            });
        });

        const ws = XLSX.utils.json_to_sheet(results), wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Result");
        XLSX.writeFile(wb, isBlast ? "Mode_Blast.xlsx" : "Arsip_Rapi_Pecah.xlsx");
        toggleLoading(false);
    }, 200);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
