// Variabel untuk menampung data excel secara global di file ini
let excelData = [];

// Event listener saat file dipilih
document.getElementById('upload-excel').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Konversi ke format JSON
            excelData = XLSX.utils.sheet_to_json(worksheet);

            if (excelData.length > 0) {
                // Isi dropdown dengan nama kolom dari baris pertama
                const selector = document.getElementById('column-selector');
                selector.innerHTML = Object.keys(excelData[0])
                    .map(col => `<option value="${col}">${col}</option>`)
                    .join('');
                
                // Munculkan opsi pengaturan
                document.getElementById('config-section').style.display = 'block';
                console.log("Data berhasil dimuat. Total baris:", excelData.length);
            } else {
                alert("Wah, file Excel-nya kosong nih.");
            }
        } catch (err) {
            console.error("Gagal baca Excel:", err);
            alert("Error saat membaca file. Pastikan filenya tidak korup.");
        }
    };
    reader.readAsArrayBuffer(file);
});

// Event listener saat tombol Proses diklik
document.getElementById('process-btn').addEventListener('click', function() {
    if (excelData.length === 0) {
        alert("Upload file dulu, Bos!");
        return;
    }

    const targetCol = document.getElementById('column-selector').value;
    const results = [];
    const seen = new Set();

    // Checkbox values
    const skipHome = document.getElementById('clean-home').checked;
    const skipIntl = document.getElementById('clean-intl').checked;
    const doDedup = document.getElementById('remove-dup').checked;

    excelData.forEach(row => {
        const rawValue = row[targetCol];
        // Gunakan fungsi dari cleaner.js
        const individualNumbers = cleaner.splitNumbers(rawValue);

        individualNumbers.forEach(num => {
            const info = cleaner.classify(num);
            
            // Filter berdasarkan checkbox
            if (skipHome && info.type === 'Home') return;
            if (skipIntl && info.type === 'International/Invalid') return;
            
            // Filter duplikat
            if (doDedup) {
                if (seen.has(info.formatted)) return;
                seen.add(info.formatted);
            }

            // Duplikasi baris (cloning) agar tetap membawa data kolom lain (Nama, Alamat, dll)
            const newRow = { ...row }; 
            newRow[targetCol] = info.formatted; // Isi kolom target dengan nomor yang sudah bersih
            newRow['Label_Type'] = info.type;   // Tambah keterangan tipe nomor
            
            results.push(newRow);
        });
    });

    // Proses Export ke Excel Baru
    try {
        const ws = XLSX.utils.json_to_sheet(results);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clean Data");
        XLSX.writeFile(wb, "Data_IT_Support_Clean.xlsx");
        
        alert("Berhasil! File bersih sudah terdownload.");
    } catch (err) {
        console.error("Gagal export:", err);
        alert("Gagal membuat file Excel baru.");
    }
});
