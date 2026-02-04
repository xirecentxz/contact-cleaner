/**
 * ARCHIVE CLEANER ENGINE v3.7.4
 * Anti-Encoding Glitch Mode
 */
const archiveCleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        return String(rawString)
            .split(/[/|:;]|\s{2,}|:::/)
            .map(n => n.trim())
            .filter(n => n.length > 0);
    },

    format: function(phone) {
        // 1. Bersihkan semua karakter non-angka dan non-simbol plus (+)
        // Ini akan otomatis menghapus karakter 'â' dan sampah encoding lainnya
        let clean = String(phone).replace(/[^\d+]/g, '').trim(); 
        
        // 2. Jika ada karakter aneh yang masih menempel di depan, 
        // pastikan nomor dimulai dengan angka atau tanda +
        if (clean && !/^[0-9+]/.test(clean)) {
            clean = clean.replace(/^[^0-9+]+/, '');
        }

        return { 
            formatted: clean, 
            status: clean.length >= 10 ? "OK" : "Cek Manual" 
        };
    }
};
