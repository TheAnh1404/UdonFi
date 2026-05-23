const fs = require('fs');
const path = 'd:\\TheAnhProject\\UdonFi\\frontend\\src\\components\\PoolsPage.tsx';

// Read the current (potentially corrupted) file
let content = fs.readFileSync(path, 'utf8');

// Remove BOM if present
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}

// Fix known corrupted Vietnamese text patterns
const fixes = [
    ['LÃ£i Suáº¥t CÆ¡ Báº£n (Base):', 'Lãi Suất Cơ Bản (Base):'],
    ['LÃ£i Suáº¥t Vay Hiá»‡n Táº¡i:', 'Lãi Suất Vay Hiện Tại:'],
    ["Há»‡ Sá»' U Hiá»‡n Táº¡i:", 'Hệ Số U Hiện Tại:'],
    ["U Tá»'i Æ¯u (U_opt):", 'U Tối Ưu (U_opt):'],
    ["Tham Sá»' Hiá»‡n Tráº¡ng Bá»ƒ", 'Tham Số Hiện Trạng Bể'],
    ['GiÃ¡m SÃ¡t Thanh LÃ½', 'Giám Sát Thanh Lý'],
    ['PhÃ¢n TÃ­ch Chi Tiáº¿t Bá»ƒ Thanh Khoáº£n', 'Phân Tích Chi Tiết Bể Thanh Khoản'],
    ["Há»‡ thá»'ng bÃ¡o cÃ¡o toÃ n diá»‡n", 'Hệ thống báo cáo toàn diện'],
    ["lá»‹ch sá»­ biáº¿n Ä'á»™ng dÃ²ng tiá»n thá»i gian thá»±c", 'lịch sử biến động dòng tiền thời gian thực'],
    ['thuáº­t toÃ¡n lÃ£i suáº¥t gáº¥p khÃºc', 'thuật toán lãi suất gấp khúc'],
    ['giÃ¡m sÃ¡t thanh lÃ½ 2 bÆ°á»›c Soroban', 'giám sát thanh lý 2 bước Soroban'],
];

// Check if file has corruption
let hasCorruption = false;
for (const [corrupted, fixed] of fixes) {
    if (content.includes(corrupted)) {
        hasCorruption = true;
        content = content.split(corrupted).join(fixed);
    }
}

if (hasCorruption) {
    console.log('Fixed encoding corruption');
} else {
    console.log('No known corruption patterns found (may be ok or different patterns)');
}

// Write back without BOM
fs.writeFileSync(path, content, 'utf8');
console.log('File rewritten with proper UTF-8 encoding');
