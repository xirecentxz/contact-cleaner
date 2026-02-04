/**
 * ARCHIVE CLEANER ENGINE v3.7.7
 * Fix: Menjamin data tidak hilang, hanya simbol yang dibuang
 */
const archiveCleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        // Tetap gunakan pemisah asli dari contacts.csv Anda
        return String(rawString).split(/[/|:;]|\s{2,}|:::/).map(n => n.trim()).filter(n => n.length > 0);
    },
    format: function(phone) {
        // Ambil string asli
        let raw = String(phone);
        
        // HANYA buang karakter pengganggu: ( ) - + spasi dan â
        // Kita tidak menggunakan [^\d] karena terlalu berisiko menghapus data mentah
        let clean = raw.replace(/[+\-\s()â]/g, '').trim(); 
        
        // Jika hasil pembersihan kosong tapi data asli ada, 
        // ambil angka saja sebagai pertahanan terakhir
        if (!clean && raw) {
            clean = raw.replace(/\D/g, '');
        }
        
        return { 
            formatted: clean, 
            status: clean.length >= 10 ? "OK" : "Cek Manual" 
        };
    }
};
