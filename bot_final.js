const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const XLSX = require('xlsx');

// ========== НАСТРОЙКИ ==========
const SEND_START_HOUR = 10;          // 10:00 МСК
const SEND_END_HOUR = 18;            // 18:00 МСК
const MAX_PER_DAY = 24;              // 24 сообщения в день
const DELAY_MINUTES = 20;            // 20 минут между сообщениями

const statsFile = './daily_stats.json';
const sentFile = './sent.json';

let dailyStats = { date: '', count: 0 };
let sentPhones = new Set();

// ========== ЗАГРУЗКА / СОХРАНЕНИЕ ==========
function loadDailyStats() {
    if (fs.existsSync(statsFile)) {
        try { dailyStats = JSON.parse(fs.readFileSync(statsFile)); } catch(e) {}
    }
    const today = new Date().toISOString().slice(0,10);
    if (dailyStats.date !== today) {
        dailyStats = { date: today, count: 0 };
        saveDailyStats();
    }
}
function saveDailyStats() { fs.writeFileSync(statsFile, JSON.stringify(dailyStats, null, 2)); }

function loadSent() {
    if (fs.existsSync(sentFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(sentFile));
            sentPhones = new Set(data);
        } catch(e) {}
    }
}
function saveSent() { fs.writeFileSync(sentFile, JSON.stringify([...sentPhones], null, 2)); }

// ========== ПРОВЕРКИ ==========
function canSendNow() {
    const now = new Date();
    const mskHour = (now.getUTCHours() + 3) % 24;
    return (mskHour >= SEND_START_HOUR && mskHour < SEND_END_HOUR);
}

// ========== ОЧИСТКА НОМЕРА ==========
function cleanPhone(raw) {
    let cleaned = String(raw).replace(/[^\d]/g, '');
    if (cleaned.startsWith('8')) cleaned = '7' + cleaned.slice(1);
    if (cleaned.length === 10 && cleaned.startsWith('9')) cleaned = '7' + cleaned;
    if (cleaned.startsWith('77')) cleaned = '7' + cleaned.slice(2);
    return (cleaned.length === 11 && cleaned.startsWith('7')) ? cleaned : null;
}

// ========== ЧТЕНИЕ EXCEL ==========
function getPhonesFromExcel(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const phones = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        for (const cell of row) {
            const phone = cleanPhone(cell);
            if (phone && !phones.includes(phone)) {
                phones.push(phone);
                break;
            }
        }
    }
    console.log(`📋 ${filePath}: ${phones.length} номеров`);
    return phones;
}

// ========== ТЕКСТ И КАРТИНКА ==========
const MESSAGE_TEXT = `приветствую! 👋

Снова по навесному оборудованию. У нас сейчас:
✅ Новые поступления оборудования на склад
✅ Сезонные скидки
✅ Доставка продукции по России и странам СНГ 🚚

Что из этого актуально для вас?`;

let imageMedia = null;
if (fs.existsSync('./d9bd221f-1d18-4a5c-981e-978c60ecb773-md.jpeg')) {
    imageMedia = MessageMedia.fromFilePath('./d9bd221f-1d18-4a5c-981e-978c60ecb773-md.jpeg');
    console.log('✅ Картинка загружена');
}

// ========== ОТПРАВКА ==========
async function sendToPhone(phone) {
    const chatId = `${phone}@c.us`;
    console.log(`📤 Отправка на ${phone}`);
    try {
        if (imageMedia) {
            await bot.sendMessage(chatId, imageMedia, { caption: MESSAGE_TEXT });
        } else {
            await bot.sendMessage(chatId, MESSAGE_TEXT);
        }
        sentPhones.add(phone);
        saveSent();
        dailyStats.count++;
        saveDailyStats();
        console.log(`✅ Отправлено (${dailyStats.count}/${MAX_PER_DAY} сегодня)`);
    } catch (err) {
        console.error(`❌ Ошибка ${phone}:`, err.message);
    }
}

async function startBot() {
    console.log('\n🚀 СТАРТ РАССЫЛКИ...');
    loadDailyStats();
    loadSent();
    
    if (!canSendNow()) {
        console.log(`⏰ Сейчас не время. Ждём с 10:00 до 18:00 МСК.`);
        return;
    }
    
    if (dailyStats.count >= MAX_PER_DAY) {
        console.log(`📊 Дневной лимит (${MAX_PER_DAY}) исчерпан.`);
        return;
    }
    
    const files = fs.readdirSync('./').filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));
    if (!files.length) {
        console.log('❌ Нет .xlsx файлов');
        return;
    }
    
    for (const file of files) {
        if (dailyStats.count >= MAX_PER_DAY) break;
        const phones = getPhonesFromExcel(file);
        for (const phone of phones) {
            if (dailyStats.count >= MAX_PER_DAY) break;
            if (sentPhones.has(phone)) {
                console.log(`⏭️ Пропускаю ${phone} (уже отправлено)`);
                continue;
            }
            await sendToPhone(phone);
            if (dailyStats.count < MAX_PER_DAY) {
                console.log(`⏳ Жду ${DELAY_MINUTES} мин...`);
                await new Promise(r => setTimeout(r, DELAY_MINUTES * 60 * 1000));
            }
        }
    }
    
    console.log(`\n📊 Отправлено сегодня: ${dailyStats.count}/${MAX_PER_DAY}`);
    console.log('✅ Бот завершил работу');
    process.exit(0);
}

// ========== WHATSAPP ==========
const bot = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

bot.on('qr', qr => {
    console.log('📱 ОТСКАНИРУЙ QR-КОД:');
    qrcode.generate(qr, { small: true });
});

bot.on('ready', async () => {
    console.log('\n✅ БОТ ГОТОВ!\n');
    await startBot();
});

bot.initialize();
console.log('🟢 ЗАПУСК БОТА...');
