const blastCleaner = {
    format: function(phone) {
        // Ambil angka saja
        let clean = String(phone).replace(/\D/g, '');
        
        // Normalisasi 08 atau 8 menjadi 628
        if (clean.startsWith('08')) clean = '62' + clean.slice(1);
        else if (clean.startsWith('8')) clean = '62' + clean;
        else if (clean.startsWith('6208')) clean = '62' + clean.slice(3);

        const isMobileWA = /^628[1-9][0-9]{7,11}$/.test(clean);
        return { 
            formatted: clean, 
            isValid: isMobileWA && clean.length >= 10 && clean.length <= 15 
        };
    }
};
