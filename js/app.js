document.getElementById('process-btn').addEventListener('click', function() {
    const targetCol = document.getElementById('column-selector').value;
    const results = [];
    const seen = new Set();

    excelData.forEach(row => {
        const rawValue = row[targetCol];
        const individualNumbers = cleaner.splitNumbers(rawValue);

        individualNumbers.forEach(num => {
            const info = cleaner.classify(num);
            
            // Filter Berdasarkan Checkbox
            if (document.getElementById('clean-home').checked && info.type === 'Home') return;
            if (document.getElementById('clean-intl').checked && info.type === 'International/Invalid') return;
            
            // Dedup (Opsional berdasarkan nomor bersih)
            if (document.getElementById('remove-dup').checked) {
                if (seen.has(info.formatted)) return;
                seen.add(info.formatted);
            }

            // CLONING DATA: Agar satu baris bisa jadi banyak baris
            const newRow = { ...row }; 
            newRow[targetCol] = info.formatted; // Timpa nomor lama dengan yang sudah bersih
            newRow['Label_Type'] = info.type;   // Tambah kolom baru untuk menandai jenis nomor
            
            results.push(newRow);
        });
    });

    // Generate Excel baru
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clean Data");
    XLSX.writeFile(wb, "Data_Kontak_Sempurna.xlsx");
});
