const archiveCleaner = {
    splitNumbers: function(rawString) {
        if (!rawString) return [];
        return String(rawString).split(/[/|:;]|\s{2,}|:::/).map(n => n.trim()).filter(n => n.length > 0);
    },
    format: function(phone) {
        let clean = String(phone).replace(/[+\-\s()]/g, ''); 
        return { formatted: clean, status: clean.length >= 10 ? "OK" : "Cek Manual" };
    }
};
