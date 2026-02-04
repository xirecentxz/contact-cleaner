const cleaner = {
    // Memecah teks jika ada lebih dari satu nomor dalam satu sel
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        // Memecah berdasarkan simbol /, :, ;, atau spasi yang lebar
        return String(rawString).split(/[/|:;]|\s{2,}/).map(n => n.trim()).filter(n => n.length > 0);
    },

    classify: function(phone) {
        // Hapus karakter non-digit
        let clean = String(phone).replace(/\D/g, '');
        
        // Standarisasi ke 62
        if (clean.startsWith('0')) {
            clean = '62' + clean.slice(1);
        }

        // 1. Mobile Check (628 + 9-11 digit)
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        
        // 2. Home/PSTN Check (62 + Kode Area [2-9] + Nomor)
        // Kita exclude 628 agar tidak bentrok dengan Mobile
        // Panjang nomor rumah di Indonesia umumnya 9-11 digit (termasuk 62)
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');

        // 3. Call Center/Short Number (misal 1500, 140xx)
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        
        let type = 'International/Invalid';
        if (isMobile) type = 'Mobile';
        else if (isHome) type = 'Home';
        else if (isService) type = 'Service/CallCenter';
        else if (clean.startsWith('62')) type = 'Invalid Indo';

        return { formatted: clean, type: type };
    }
};
