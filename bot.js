console.log("הקובץ התחיל לרוץ");

const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    }
});

// טען טקסט
const text = fs.readFileSync('mesilat.txt', 'utf-8');

// פיצול לפרקים (כולל הקדמה)
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

// ניהול התקדמות
const progressFile = 'progress.json';

function getNextPart() {
    let index = 0;

    if (fs.existsSync(progressFile)) {
        const data = JSON.parse(fs.readFileSync(progressFile));
        index = data.index;
    }

    // אם נגמר → מתחילים מהתחלה
    if (index >= parts.length) {
        index = 0;
    }

    const part = parts[index];

    fs.writeFileSync(progressFile, JSON.stringify({ index: index + 1 }));

    return `📖 מסילת ישרים
יום ${index + 1} מתוך ${parts.length}

${part.title}

${part.text}`;
}

// שליחה
function sendMessage() {
    const now = new Date();
    const day = now.getDay(); // 0=ראשון ... 6=שבת

    if (day === 6) {
        console.log("שבת - לא נשלחת הודעה");
        return;
    }

    const myNumber = '972533632823@c.us';
    const message = getNextPart();
    client.sendMessage(myNumber, message);
}

// QR
client.on('qr', async (qr) => {
     try {
      // qr
      const qrImage = await qrcode.toDataURL(qr, {width: 300});

      console.log('\n סרוק את ה QR הבא:\n');
      console.log(qrImage);
      console.log('\n העתיקי את כל השורה לדפדפן ☝️\n');
    } catch (err) {
    console.error('שגיאה ביצירת QR:' , err);
});

// כשהבוט מוכן
client.on('ready', () => {
    console.log('הבוט מוכן!');
    scheduleDailyMessage();
});

// שליחה כל יום ב־08:00
function scheduleDailyMessage() {
    function getDelay() {
        const now = new Date();
        const next = new Date();

        next.setHours(8, 0, 0, 0); // 08:00

        if (now > next) {
            next.setDate(next.getDate() + 1);
        }

        return next - now;
    }

    const delay = getDelay();

    console.log(`הודעה ראשונה תישלח בעוד ${Math.round(delay / 1000)} שניות`);

    setTimeout(() => {
        sendMessage();
        setInterval(sendMessage, 24 * 60 * 60 * 1000);
    }, delay);
}

client.initialize();
