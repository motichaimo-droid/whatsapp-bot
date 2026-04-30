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
        protocolTimeout: 120000,
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

    if(!client.info) {
      console.log("הלקוח לא מחובר עדיין, מדלג....");
      return;
    }

   try {
      const myNumber = '972533632823@c.us';
      const message = getNextPart();

      const chat = await client.getchatById(myNumber);
      await chat.sendMessage(message)
      client.sendMessage(myNumber, message)

     console.log("הודעה נשלחה בהצלחה!");
   } catch (err) {
     consol.error("שגיאה בשליחה:", err);
  }
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
    let nextSendTime;

    function calculateNextSendTime() {
        const now = new Date();
        const next = new Date();
        next.setHours(8, 0, 0, 0);

        if (now > next) {
            next.setDate(next.getDate() + 1);
        }

        nextSendTime = next;
        return next - now;
    }

    const delay = calculateNextSendTime();

    console.log(`הודעה ראשונה תישלח בעוד ${Math.round(delay / 1000 / 60)} דקות.`);

    // ⏱️ הדפסה כל 10 דקות
    setInterval(() => {
        if (!nextSendTime) return;

        const now = new Date();
        const diff = nextSendTime - now;

        if (diff <= 0) return;

        const minutes = Math.floor(diff / 1000 / 60);
        console.log(`נשארו ${minutes} דקות לשליחה הבאה`);
    }, 10 * 60 * 1000);

    // ⏰ שליחה ראשונה
    setTimeout(() => {
        sendMessage();

        // עדכון זמן השליחה הבא
        nextSendTime = new Date();
        nextSendTime.setDate(nextSendTime.getDate() + 1);
        nextSendTime.setHours(8, 0, 0, 0);

        // שליחה יומית
        setInterval(() => {
            sendMessage();

            nextSendTime = new Date();
            nextSendTime.setDate(nextSendTime.getDate() + 1);
            nextSendTime.setHours(8, 0, 0, 0);

        }, 24 * 60 * 60 * 1000);

    }, delay);
}

// הפעלה
client.initialize();

