let excelData = [];

document.getElementById('upload-excel').addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.SheetNames[0];
        excelData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

        // Munculkan pilihan kolom
        const selector = document.getElementById('column-selector');
        selector.innerHTML = Object.keys(excelData[0]).map(col => `<option value="${col}">${col}</option>`).join('');
        document.getElementById('config-section').style.display = 'block';
    };
    reader.readAsArrayBuffer(e.target.files[0]);
});

document.getElementById('process-btn').addEventListener('click', function() {
    const targetCol = document.getElementById('column-selector').value;
    const results = [];
    const seen = new Set();

    excelData.forEach(row => {
        const info = cleaner.classify(row[targetCol]);
        
        // Filter Berdasarkan Checkbox
        if (document.getElementById('clean-home').checked && info.type === 'Home') return;
        if (document.getElementById('clean-intl').checked && info.type === 'International/Invalid') return;
        
        if (document.getElementById('remove-dup').checked) {
            if (seen.has(info.formatted)) return;
            seen.add(info.formatted);
        }

        // Update row dengan nomor yang sudah rapi
        row[targetCol] = info.formatted;
        results.push(row);
    });

    // Download Hasil
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clean Data");
    XLSX.writeFile(wb, "Data_Bersih.xlsx");
});
