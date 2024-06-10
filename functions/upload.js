const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');

const upload = multer({
    limits: {
        fileSize: 100 * 1024 * 1024 // 设置上传文件大小限制为100MB
    }
});

const app = express();
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

// 替换你的`onRequestPost`函数
app.post('/upload', upload.single('file'), async (req, res) => {
    const { env } = req;
    const file = req.file;
    const url = new URL(req.url);
    const apikey = env.ModerateContentApiKey;
    const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : "";
    const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;
    const clientIP = req.headers['x-forwarded-for'] || req.headers['clientIP'];
    const Referer = req.headers['referer'] || "Referer";

    const res_img = await fetch('https://telegra.ph/' + url.pathname + url.search, {
        method: req.method,
        headers: req.headers,
        body: req.body,
    });

    const options = {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const timedata = new Date();
    const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);

    if (!env.IMG) {
        return res_img;
    } else {
        const responseData = await res_img.json();
        try {
            const rating = ratingApi ? await getRating(ratingApi, responseData[0].src) : { rating: 0 };
            await insertImageData(env.IMG, responseData[0].src, Referer, clientIP, rating.rating, formattedDate);
        } catch (e) {
            console.log(e);
            await insertImageData(env.IMG, responseData[0].src, Referer, clientIP, 5, formattedDate);
        }

        return res.json(responseData);
    }
});

async function getRating(ratingApi, src) {
    const res = await fetch(`${ratingApi}url=https://telegra.ph${src}`);
    return await res.json();
}

async function insertImageData(env, src, referer, ip, rating, time) {
    const instdata = await env.prepare(
        `INSERT INTO imginfo (url, referer, ip, rating, total, time)
             VALUES ('${src}', '${referer}', '${ip}', ${rating}, 1, '${time}')`
    ).run();
}

// 启动服务器
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
