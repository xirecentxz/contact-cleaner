/**
 * CONTACT CLEANER PRO
 * v3.7.5 - Full Manual Selection Mode
 * Deskripsi: Awal upload tidak tercentang untuk mencegah file bengkak.
 */
const APP_VERSION = "v3.7.6-ManualMode";
let excelData = [];

// Inisialisasi Versi di Layar
document.addEventListener("DOMContentLoaded", () => {
    const tag = document.getElementById('version-tag');
    if (tag) tag.innerText = APP_VERSION;
    console.log(`%c ${APP_VERSION} Active: Initial Unchecked Mode `, "background: #10b981; color: #fff; font-weight: bold; padding: 4px;");
});

// Fungsi Global untuk tombol Select All
function toggleAll(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

// Handler saat file diupload
document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('loading-overlay').style.display = 'flex';
    
    excelHandler.read(file, (data) => {
        excelData = data;
        renderConfig(data);
        document.getElementById('file-name-display').innerText = file.name;
        document.getElementById('loading-overlay').style.display = 'none';
    });
});

// Fungsi untuk merender daftar kolom (Awalnya tidak tercentang)
function renderConfig(data) {
    if (!data || data.length === 0) return;
    const cols = Object.keys(data[0]);
    const phoneKeywords = ['phone', 'mobile', 'value', 'wa', 'telp', 'kontak'];
    
    // Render Kolom Telepon - DISET TIDAK TERCENTANG
    document.getElementById('column-checkbox-list').innerHTML = cols
        .filter(c => phoneKeywords.some(k => c.toLowerCase().includes(k)))
        .map(c => `
            <div class="column-item">
                <label><input type="checkbox" name="phone-cols" value="${c}"> <strong>${c}</strong></label>
            </div>`).join('');
    
    // Render Kolom Metadata - DISET TIDAK TERCENTANG
    document.getElementById('metadata-checkbox-list').innerHTML = cols
        .filter(c => !phoneKeywords.some(k => c.toLowerCase().includes(k)))
        .map(c => `
            <div class="column-item">
                <label><input type="checkbox" name="meta-cols" value="${c}"> ${c}</label>
            </div>`).join('');
    
    document.getElementById('config-section').style.display = 'block';
}

// Fungsi Eksekusi Utama
async function runProcess(isBlast) {
    const selectedPhones = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    const selectedMeta = Array.from(document.querySelectorAll('input[name="meta-cols"]:checked')).map(el => el.value);
    
    if (selectedPhones.length === 0) {
        return alert("Pilih minimal satu kolom telepon!");
    }

    document.getElementById('loading-overlay').style.display = 'flex';
    
    setTimeout(() => {
        const results = [];
        const globalSeen = new Set();
        const combine = document.getElementById('combine-names').checked;

        excelData.forEach(row => {
            // Split nomor menggunakan logika dari archive cleaner
            let nums = [];
            selectedPhones.forEach(col => { 
                if (row[col]) nums = nums.concat(archiveCleaner.splitNumbers(row[col])); 
            });
            nums = [...new Set(nums)]; // Hapus duplikat dalam satu baris

            if (isBlast) {
                // MODE BLAST: Vertikal (Ke Bawah) & Ketat 628
                nums.forEach(n => {
                    const info = blastCleaner.format(n);
                    if (!info.isValid) return;
                    if (document.getElementById('remove-dup').checked && globalSeen.has(info.formatted)) return;
                    
                    globalSeen.add(info.formatted);

                    const newRow = {};
                    if (combine) {
                        newRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                    }
                    selectedMeta.forEach(m => newRow[m] = row[m]);
                    newRow['Clean_Phone'] = info.formatted;
                    results.push(newRow);
                });
            } else {
                // MODE ARSIP: Horizontal (Ke Samping) & Pertahankan Data
                const newRow = {};
                if (combine) {
                    newRow['Full_Name_Combined'] = [row['First Name'], row['Middle Name'], row['Last Name']].filter(Boolean).join(' ');
                }
                selectedMeta.forEach(m => newRow[m] = row[m]);
                
                nums.forEach((n, i) => {
                    const info = archiveCleaner.format(n);
                    const colLabel = i === 0 ? "Phone_Main" : `Phone_Ext_${i}`;
                    newRow[colLabel] = info.formatted;
                });
                results.push(newRow);
            }
        });

        const fileName = isBlast ? "Blast_Vertical.xlsx" : "Arsip_Horizontal.xlsx";
        excelHandler.export(results, fileName);
        document.getElementById('loading-overlay').style.display = 'none';
    }, 100);
}

// Binding Tombol
document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
