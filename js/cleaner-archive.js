/**
 * ARCHIVE CLEANER ENGINE v3.7.6
 * Fokus: Angka Murni Tanpa Spasi (Ultra Clean)
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
        // [^\d] = Hapus SEMUA selain angka (spasi, +, (), -, â, dll)
        let clean = String(phone).replace(/[^\d]/g, '').trim(); 
        
        return { 
            formatted: clean, 
            status: clean.length >= 10 ? "OK" : "Cek Manual" 
        };
    }
};
