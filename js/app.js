/**
 * CONTACT CLEANER PRO
 * v3.7.8 - Fixed ID Selection & Smart Header Detection
 */
const APP_VERSION = "v3.7.8";
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

// Fungsi untuk merender daftar kolom
function renderConfig(data) {
    if (!data || data.length === 0) return;

    // Ambil semua judul kolom dari baris pertama yang berisi data
    const firstRow = data.find(row => Object.keys(row).length > 0) || data[0];
    const cols = Object.keys(firstRow);
    
    // Kata kunci untuk mendeteksi kolom yang kemungkinan berisi nomor telepon
    const phoneKeywords = ['phone', 'mobile', 'value', 'wa', 'telp', 'kontak', 'contact', 'no', 'hp'];
    
    // Sinkronisasi ID dengan index.html Anda
    const phoneContainer = document.getElementById('column-checkbox-list');
    const metaContainer = document.getElementById('metadata-checkbox-list');

    // Filter Kolom Telepon
    const phoneCols = cols.filter(c => phoneKeywords.some(k => c.toLowerCase().includes(k)));
    
    phoneContainer.innerHTML = phoneCols.map(c => `
            <div class="column-item">
                <label><input type="checkbox" name="phone-cols" value="${c}"> <strong>${c}</strong></label>
            </div>`).join('');
    
    // Filter Kolom Metadata (selain kolom telepon)
    metaContainer.innerHTML = cols
        .filter(c => !phoneCols.includes(c))
        .map(c => `
            <div class="column-item">
                <label><input type="checkbox" name="meta-cols" value="${c}"> ${c}</label>
            </div>`).join('');
    
    // Jika tidak ada kolom yang cocok dengan kata kunci telepon, tampilkan semua di box telepon agar user bisa pilih manual
    if (phoneCols.length === 0) {
        phoneContainer.innerHTML = cols.map(c => `
            <div class="column-item">
                <label><input type="checkbox" name="phone-cols" value="${c}"> <strong>${c}</strong></label>
            </div>`).join('');
    }
    
    document.getElementById('config-section').style.display = 'block';
}

// Fungsi Eksekusi Utama
async function runProcess(isBlast) {
    const selectedPhones = Array.from(document.querySelectorAll('input[name="phone-cols"]:checked')).map(el => el.value);
    const selectedMeta = Array.from(document.querySelectorAll('input[name="meta-cols"]:checked')).map(el => el.value);
    
    if (selectedPhones.length === 0) {
        return alert("Pilih minimal satu kolom yang berisi nomor telepon!");
    }

    document.getElementById('loading-overlay').style.display = 'flex';
    
    setTimeout(() => {
        const results = [];
        const globalSeen = new Set();
        const combine = document.getElementById('combine-names').checked;

        excelData.forEach(row => {
            let nums = [];
            selectedPhones.forEach(col => { 
                if (row[col]) {
                    // Pastikan memanggil fungsi split dari archiveCleaner
                    nums = nums.concat(archiveCleaner.splitNumbers(row[col])); 
                }
            });
            
            // Hapus duplikat dalam satu baris & bersihkan spasi
            nums = [...new Set(nums.map(n => String(n).trim()))]; 

            if (isBlast) {
                // MODE BLAST: Vertikal (Ke Bawah) & Format 628
                nums.forEach(n => {
                    const info = blastCleaner.format(n);
                    if (!info.isValid) return;
                    
                    // Filter No Rumah (PSTN) jika dicentang
                    if (document.getElementById('clean-home').checked && info.formatted.startsWith('622')) return;
                    
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
                // MODE ARSIP: Horizontal (Ke Samping)
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
                
                if (Object.keys(newRow).length > selectedMeta.length + (combine ? 1 : 0)) {
                    results.push(newRow);
                }
            }
        });

        if (results.length === 0) {
            alert("Tidak ada data yang berhasil diproses. Cek kembali pilihan kolom Anda.");
            document.getElementById('loading-overlay').style.display = 'none';
            return;
        }

        const fileName = isBlast ? "Blast_Mode_Result.xlsx" : "Archive_Mode_Result.xlsx";
        excelHandler.export(results, fileName);
        document.getElementById('loading-overlay').style.display = 'none';
    }, 100);
}

// Binding Tombol
document.getElementById('archive-btn').addEventListener('click', () => runProcess(false));
document.getElementById('blast-btn').addEventListener('click', () => runProcess(true));
