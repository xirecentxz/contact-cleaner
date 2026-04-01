/**
 * CONTACT CLEANER PRO
 * v4.0.0 - Glassmorphism Edition 2026
 * Features: Live Preview, Logging Report, Progress Bar
 */
const APP_VERSION = "v4.0.0";
let excelData = [];

// Inisialisasi Versi
document.addEventListener("DOMContentLoaded", () => {
    const tag = document.getElementById('version-tag');
    if (tag) tag.innerText = APP_VERSION;
    console.log(`%c ${APP_VERSION} Active: Modern Mode `, "background: #6366f1; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px;");
});

function toggleAll(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('progress-bar-fill').style.width = '0%';
    
    excelHandler.read(file, (data) => {
        excelData = data;
        renderConfig(data);
        document.getElementById('file-name-display').innerText = `📄 ${file.name}`;
        document.getElementById('loading-overlay').style.display = 'none';
        
        // Reset preview dan stats saat ganti file
        document.getElementById('stats-report').style.display = 'none';
        document.getElementById('preview-area').style.display = 'none';
    });
});

function renderConfig(data) {
    if (!data || data.length === 0) return;
    const firstRow = data.find(row => Object.keys(row).length > 0) || data[0];
    const cols = Object.keys(firstRow);
    const phoneKeywords = ['phone', 'mobile', 'value', 'wa', 'telp', 'kontak', 'contact', 'no', 'hp'];
    
    const phoneContainer = document.getElementById('column-checkbox-list');
    const metaContainer = document.getElementById('metadata-checkbox-list');

    const phoneCols = cols.filter(c => phoneKeywords.some(k => c.toLowerCase().includes(k)));
    
    phoneContainer.innerHTML = (phoneCols.length > 0 ? phoneCols : cols).map(c => `
        <div class="column-item">
            <label><input type="checkbox" name="phone-cols" value="${c}"> <strong>${c}</strong></label>
        </div>`).join('');
    
    metaContainer.innerHTML = cols
        .filter(c => !phoneCols.includes(c))
        .map(c => `
            <div class="column-item">
                <label><input type="checkbox" name="meta-cols" value="${c}"> ${c}</label>
            </div>`).join('');
    
    document.getElementById('config-section').style.display = 'block';
}

async function runProcess(isBlast) {
    const selectedPhones = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    const selectedMeta = Array.from(document.querySelectorAll('input[name="meta-cols"]:checked')).map(el => el.value);
    
    if (selectedPhones.length === 0) return alert("Pilih minimal satu kolom telepon!");

    const overlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar-fill');
    overlay.style.display = 'flex';
    
    setTimeout(() => {
        const results = [];
        const globalSeen = new Set();
        const combine = document.getElementById('combine-names').checked;
        let successCount = 0;
        let failedCount = 0;

        excelData.forEach((row, index) => {
            // Update Progress Bar
            if (index % 100 === 0) {
                const progress = (index / excelData.length) * 100;
                progressBar.style.width = `${progress}%`;
            }

            let nums = [];
            selectedPhones.forEach(col => { 
                if (row[col]) nums = nums.concat(archiveCleaner.splitNumbers(row[col])); 
            });
            nums = [...new Set(nums.map(n => String(n).trim()))];

            if (isBlast) {
                nums.forEach(n => {
                    const info = blastCleaner.format(n);
                    
                    // Filter: Tidak valid atau No Rumah (jika dicentang)
                    const isHome = document.getElementById('clean-home').checked && info.formatted.startsWith('622');
                    if (!info.isValid || isHome) {
                        failedCount++;
                        return;
                    }
                    
                    if (document.getElementById('remove-dup').checked && globalSeen.has(info.formatted)) {
                        failedCount++;
                        return;
                    }
                    
                    globalSeen.add(info.formatted);
                    successCount++;

                    const newRow = {};
                    if (combine) {
                        newRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                    }
                    selectedMeta.forEach(m => newRow[m] = row[m]);
                    newRow['Clean_Phone'] = info.formatted;
                    results.push(newRow);
                });
            } else {
                const newRow = {};
                if (combine) {
                    newRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                }
                selectedMeta.forEach(m => newRow[m] = row[m]);
                
                let rowHasPhone = false;
                nums.forEach((n, i) => {
                    const info = archiveCleaner.format(n);
                    if (info.formatted) {
                        const colLabel = i === 0 ? "Phone_Main" : `Phone_Ext_${i}`;
                        newRow[colLabel] = info.formatted;
                        rowHasPhone = true;
                    }
                });

                if (rowHasPhone) {
                    successCount++;
                    results.push(newRow);
                } else {
                    failedCount++;
                }
            }
        });

        // Tampilkan Hasil Preview & Stats
        progressBar.style.width = '100%';
        showPreview(results.slice(0, 5));
        
        document.getElementById('count-success').innerText = successCount;
        document.getElementById('count-failed').innerText = failedCount;
        document.getElementById('stats-report').style.display = 'block';
        
        setTimeout(() => {
            const fileName = isBlast ? "Blast_Mode_v4.xlsx" : "Archive_Mode_v4.xlsx";
            excelHandler.export(results, fileName);
            overlay.style.display = 'none';
        }, 500);
    }, 100);
}

function showPreview(data) {
    const container = document.getElementById('preview-area');
    const table = document.getElementById('preview-table');
    
    if (data.length === 0) {
        container.style.display = 'none';
        return;
    }

    const cols = Object.keys(data[0]);
    
    let html = `<thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
    html += `<tbody>${data.map(row => `
        <tr>${cols.map(c => `<td>${row[c] || ''}</td>`).join('')}</tr>
    `).join('')}</tbody>`;
    
    table.innerHTML = html;
    container.style.display = 'block';
}

// Binding Tombol
document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
