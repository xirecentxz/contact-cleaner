/**
 * CONTACT CLEANER PRO
 * v3.7.0 - Hybrid Horizontal/Vertical Engine
 */
const APP_VERSION = "v3.7.0-Hybrid";

document.addEventListener("DOMContentLoaded", () => {
    const tag = document.getElementById('version-tag');
    if (tag) tag.innerText = APP_VERSION;
    console.log(`%c ${APP_VERSION} Loaded: Horizontal Archive Mode Ready `, "background: #8b5cf6; color: #fff; font-weight: bold; padding: 4px;");
});

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
        return { formatted: clean, type: isMobile ? 'Mobile' : 'Other', isValid: clean.length >= 10 };
    },
    formatForArchive: function(phone) {
        let clean = String(phone).replace(/[+\-\s()]/g, ''); 
        return { formatted: clean, status: clean.length >= 10 ? "OK" : "Cek Manual" };
    }
};

let excelData = [];

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array', raw: true, cellText: true });
        excelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: "" });
        
        const allColumns = Object.keys(excelData[0]);
        const phoneKeywords = ['phone', 'mobile', 'value', 'wa'];
        
        // Render Telepon & Metadata Selection
        document.getElementById('column-checkbox-list').innerHTML = allColumns.filter(c => phoneKeywords.some(k => c.toLowerCase().includes(k))).map(c => `
            <div class="column-item"><label><input type="checkbox" name="phone-cols" value="${c}" checked> ${c}</label></div>`).join('');
        
        document.getElementById('metadata-checkbox-list').innerHTML = allColumns.filter(c => !phoneKeywords.some(k => c.toLowerCase().includes(k))).map(c => `
            <div class="column-item"><label><input type="checkbox" name="meta-cols" value="${c}" checked> ${c}</label></div>`).join('');
        
        document.getElementById('config-section').style.display = 'block';
        document.getElementById('file-name-display').innerText = file.name;
    };
    reader.readAsArrayBuffer(file);
});

async function runProcess(isBlast) {
    const selectedPhones = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    const selectedMeta = Array.from(document.querySelectorAll('input[name="meta-cols"]:checked')).map(el => el.value);
    const results = [];
    const globalSeen = new Set();

    excelData.forEach(row => {
        let nums = [];
        selectedPhones.forEach(col => { if (row[col]) nums = nums.concat(cleaner.splitNumbers(row[col])); });
        nums = [...new Set(nums)]; // Unique in row

        if (isBlast) {
            // MODE BLAST: Pecah ke Bawah (Vertikal)
            nums.forEach(n => {
                const info = cleaner.formatForBlast(n);
                if (!info.isValid || globalSeen.has(info.formatted)) return;
                globalSeen.add(info.formatted);

                const newRow = {};
                selectedMeta.forEach(m => newRow[m] = row[m]);
                newRow['Clean_Phone'] = info.formatted;
                results.push(newRow);
            });
        } else {
            // MODE ARSIP: Pecah ke Samping (Horizontal)
            const newRow = {};
            selectedMeta.forEach(m => newRow[m] = row[m]);
            nums.forEach((n, i) => {
                const info = cleaner.formatForArchive(n);
                const colName = i === 0 ? "Phone_Main" : `Phone_Ext_${i}`;
                newRow[colName] = info.formatted;
                if (i === 0) newRow['Quality_Status'] = info.status;
            });
            results.push(newRow);
        }
    });

    const ws = XLSX.utils.json_to_sheet(results), wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result");
    XLSX.writeFile(wb, isBlast ? "Blast_Vertical.xlsx" : "Arsip_Horizontal.xlsx");
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
