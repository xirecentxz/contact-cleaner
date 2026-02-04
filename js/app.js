const APP_VERSION = "v3.7.3-Hybrid";
let excelData = [];

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('version-tag').innerText = APP_VERSION;
});

function toggleAll(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    if (!e.target.files[0]) return;
    document.getElementById('loading-overlay').style.display = 'flex';
    excelHandler.read(e.target.files[0], (data) => {
        excelData = data;
        const cols = Object.keys(data[0]);
        const phoneKeys = ['phone', 'mobile', 'value', 'wa'];

        document.getElementById('column-checkbox-list').innerHTML = cols.filter(c => phoneKeys.some(k => c.toLowerCase().includes(k))).map(c => `
            <div class="column-item"><label><input type="checkbox" name="phone-cols" value="${c}" checked> ${c}</label></div>`).join('');
        
        document.getElementById('metadata-checkbox-list').innerHTML = cols.filter(c => !phoneKeys.some(k => c.toLowerCase().includes(k))).map(c => `
            <div class="column-item"><label><input type="checkbox" name="meta-cols" value="${c}" checked> ${c}</label></div>`).join('');
        
        document.getElementById('config-section').style.display = 'block';
        document.getElementById('file-name-display').innerText = e.target.files[0].name;
        document.getElementById('loading-overlay').style.display = 'none';
    });
});

async function runProcess(isBlast) {
    const selectedPhones = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    const selectedMeta = Array.from(document.querySelectorAll('input[name="meta-cols"]:checked')).map(el => el.value);
    const results = [];
    const globalSeen = new Set();

    document.getElementById('loading-overlay').style.display = 'flex';
    
    setTimeout(() => {
        excelData.forEach(row => {
            let nums = [];
            selectedPhones.forEach(col => { if (row[col]) nums = nums.concat(archiveCleaner.splitNumbers(row[col])); });
            nums = [...new Set(nums)];

            if (isBlast) {
                nums.forEach(n => {
                    const info = blastCleaner.format(n);
                    if (!info.isValid || (document.getElementById('remove-dup').checked && globalSeen.has(info.formatted))) return;
                    globalSeen.add(info.formatted);
                    const newRow = {};
                    if (document.getElementById('combine-names').checked) newRow['Full_Name'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                    selectedMeta.forEach(m => newRow[m] = row[m]);
                    newRow['Clean_Phone'] = info.formatted;
                    results.push(newRow);
                });
            } else {
                const newRow = {};
                if (document.getElementById('combine-names').checked) newRow['Full_Name'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                selectedMeta.forEach(m => newRow[m] = row[m]);
                nums.forEach((n, i) => {
                    const info = archiveCleaner.format(n);
                    newRow[i === 0 ? "Phone_Main" : `Phone_Ext_${i}`] = info.formatted;
                });
                results.push(newRow);
            }
        });
        excelHandler.export(results, isBlast ? "Mode_Blast.xlsx" : "Mode_Arsip.xlsx");
        document.getElementById('loading-overlay').style.display = 'none';
    }, 100);
}

document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
