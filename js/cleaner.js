// Gunakan var agar variabel ini bersifat global dan bisa dibaca oleh app.js
var cleaner = {
    // Fungsi untuk memecah satu sel jika berisi banyak nomor
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        // Memecah berdasarkan simbol /, :, ;, atau spasi lebar
        return String(rawString)
            .split(/[/|:;]|\s{2,}/)
            .map(n => n.trim())
            .filter(n => n.length > 0);
    },

    // Fungsi untuk membersihkan dan menentukan kategori nomor
    classify: function(phone) {
        // Hapus semua karakter selain angka
        let clean = String(phone).replace(/\D/g, '');
        
        // Standarisasi awalan Indonesia ke 62
        if (clean.startsWith('0')) {
            clean = '62' + clean.slice(1);
        }

        // Kriteria Mobile: Awalan 628, panjang 11-14 digit
        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        
        // Kriteria Home (Nasional): Awalan 622 s/d 629 (kecuali 628), panjang 9-11 digit
        const isHome = /^62[2-7,9][0-9]{7,9}$/.test(clean) && !clean.startsWith('628');
        
        // Kriteria Layanan: Seperti 1500 atau 14045
        const isService = /^(62|0)?(140|150)[0-9]{2,5}$/.test(clean);
        
        let type = 'International/Invalid';
        if (isMobile) type = 'Mobile';
        else if (isHome) type = 'Home';
        else if (isService) type = 'Service/CallCenter';
        else if (clean.startsWith('62')) type = 'Invalid Indo';

        return { formatted: clean, type: type };
    }
};
