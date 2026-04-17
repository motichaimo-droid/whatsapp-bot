console.log("הקובץ התחיל לרוץ");

const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const QRcode = require('qrcode'); // ייבוא הספרייה

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // ב-Railway, אם הוספת Buildpack של Chromium, מומלץ לעיתים להשאיר את זה ריק 
        // או להשתמש בנתיב המערכת. ננסה את הנתיב הסטנדרטי:
        executablePath: process.env.CHROME_PATH || '/usr/bin/chromium',
        headless: true,
        proyocolTimeout: 120000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    }
});

// טעינת הטקסט
const text = fs.readFileSync('mesilat.txt', 'utf-8');

// פיצול לפרקים
function splitChapters(text) {
    const regex = /(הקדמה|פרק\s+[א-ת]+)([\s\S]*?)(?=פרק\s+[א-ת]+|$)/g;
    let match;
    let chapters = [];
    while ((match = regex.exec(text)) !== null) {
        chapters.push({
            title: match[1],
            content: match[2].trim()
        });
    }
    return chapters;
}

// חלוקה חכמה בתוך פרק
function splitChapterToParts(chapterText, targetSize) {
    const paragraphs = chapterText.split('\n').filter(p => p.trim() !== '');
    let parts = [];
    let current = '';

    for (let p of paragraphs) {
        if ((current + p).length < targetSize) {
            current += p + '\n\n';
        } else {
            if (current.length > targetSize * 0.5) {
                parts.push(current);
                current = p + '\n\n';
            } else {
                current += p + '\n\n';
            }
        }
    }
    if (current) parts.push(current);
    return parts;
}

// יצירת כל החלקים
function buildAllParts(text, days = 200) {
    const chapters = splitChapters(text);
    const totalLength = text.length;
    const targetSize = Math.floor(totalLength / days);
    let allParts = [];

    for (let chapter of chapters) {
        const parts = splitChapterToParts(chapter.content, targetSize);
        parts.forEach((p) => {
            allParts.push({
                title: chapter.title,
                text: p
            });
        });
    }
    return allParts;
}

const parts = buildAllParts(text, 200);
const progressFile = 'progress.json';

function getNextPart() {
    let index = 0;
    if (fs.existsSync(progressFile)) {
        const data = JSON.parse(fs.readFileSync(progressFile));
        index = data.index;
    }

    if (index >= parts.length) index = 0;

    const part = parts[index];
    fs.writeFileSync(progressFile, JSON.stringify({ index: index + 1 }));

    return `📖 מסילת ישרים
יום ${index + 1} מתוך ${parts.length}

${part.title}

${part.text}`;
}

// פונקציית השליחה
function sendMessage() {
    const now = new Date();
    const day = now.getDay(); // 0=ראשון

    if (day === 6) {
        console.log("שבת - לא נשלחת הודעה");
        return;
    }

    const myNumber = '972533632823@c.us';
    const message = getNextPart();
    
    client.sendMessage(myNumber, message)
        .then(() => console.log("הודעה נשלחה בהצלחה!"))
        .catch(err => console.error("שגיאה בשליחה:", err));
}

// אירוע יצירת ה-QR
client.on('qr', async (qr) => {
    try {
        // שימוש ב-QRcode (כמו שהוגדר למעלה) כדי ליצור לינק תמונה
        const qrImage = await QRcode.toDataURL(qr);

        console.log('\n--- סריקת הבוט לוואטסאפ ---');
        console.log('העתיקי את הקישור הארוך למטה והדביקי בדפדפן:');
        console.log('\n' + qrImage + '\n');
        console.log('---------------------------\n');
    } catch (err) {
        console.error('שגיאה ביצירת QR:', err);
    }
});

// כשהבוט מוכן
client.on('ready', async () => {
    console.log('הבוט מוכן ומחובר!');
    const chats = await cleint.getChats();

    chats.forEach(chat => {
       if (chat.isGroup && chat.name.includes("מסילת ישרים") {
          console.log(`שם קבוצה: ${chat.name}`);
          console.log(`ID: ${chat.id._serialized}`);
          console.log('-------------------');
 scheduleDailyMessage();
});

// תזמון הודעה יומית
function scheduleDailyMessage() {
    function getDelay() {
        const now = new Date();
        const next = new Date();
        next.setHours(8, 0, 0, 0);

        if (now > next) {
            next.setDate(next.getDate() + 1);
        }
        return next - now;
    }

    const delay = getDelay();
    console.log(`הודעה ראשונה תישלח בעוד ${Math.round(delay / 1000 / 60)} דקות.`);

    setTimeout(() => {
        sendMessage();
        setInterval(sendMessage, 24 * 60 * 60 * 1000);
    }, delay);
}

// הפעלה
client.initialize();

