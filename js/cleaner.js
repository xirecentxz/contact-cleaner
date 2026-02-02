const cleaner = {
    classify: function(phone) {
        let clean = String(phone).replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);

        const isMobile = /^628[1-9][0-9]{7,11}$/.test(clean);
        const isHome = /^62[2-7][0-9]{7,10}$/.test(clean);
        
        let type = 'International/Invalid';
        if (isMobile) type = 'Mobile';
        else if (isHome) type = 'Home';
        else if (clean.startsWith('62')) type = 'Invalid Indo';

        return { formatted: clean, type: type };
    }
};
