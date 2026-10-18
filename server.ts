import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { attachUser, registerAuthRoutes, requireAuth, sameOriginOnly } from './server/auth';
import { registerRecordRoutes } from './server/records';
import { RecordStore } from './server/store';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

// নিরাপত্তা হেডার (ডেটা ফাঁস/ক্লিকজ্যাকিং/MIME-স্নিফিং কমাতে)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // নিজের পেজে PDF দেখানোর জন্য
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// বড় বডি (ছবি) শুধু লগইন-করা ব্যবহারকারীর কাছ থেকে নেওয়া হয় — অনুমতি যাচাই বডি পার্স করার আগে
app.use(sameOriginOnly);
app.use('/api/ocr-extract', attachUser, requireAuth(['operator', 'admin']), express.json({ limit: '15mb' }));
app.use('/api/records', attachUser, requireAuth(), express.json({ limit: '15mb' }));
app.use(express.json({ limit: '20kb' }));
app.use(attachUser);
registerAuthRoutes(app);

// স্থায়ী রেকর্ড স্টোর (data/db.json); ফোল্ডার বদলাতে BHOOMI_DATA_DIR দিন
const store = new RecordStore(process.env.BHOOMI_DATA_DIR || path.resolve(__dirname, 'data'));
registerRecordRoutes(app, store);

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

// Fallback intelligent parser for Bangladeshi Land Records
function getMockExtraction(fileName?: string, surveyHint?: string) {
  return {
    rawText: `বাংলাদেশ ফরম নং ৫৪৬৩\nখতিয়ান ও পর্চা (স্বত্বলিপি)\nজেলা: ঢাকা, থানা/উপজেলা: সাভার, মৌজা: কাশিমপুর, জে.এল নং: ২১\nজরিপের ধরন: RS (রিভিশনাল সার্ভে)\nখতিয়ান নম্বর: ১২৩৪ (1234)\n\nমালিকগণের নাম ও বিবরণ:\n১. মোঃ আব্দুল করিম, পিতা: মৃত রহমত আলী, সাং: কাশিমপুর, অংশ: ১/২ (০.৫০)\n২. সেলিনা বেগম, স্বামী: মোঃ আব্দুল করিম, সাং: কাশিমপুর, অংশ: ১/২ (০.৫০)\n\nদাগ নম্বরসমূহ ও জমির বিবরণ:\nদাগ নং ৫৬৭: শ্রেণি - নাল/ধানি, জমির পরিমাণ: ০.১২ একর (১২ শতাংশ)\nদাগ নং ৫৬৮: শ্রেণি - ভিটি/বাড়ি, জমির পরিমাণ: ০.০৮ একর (৮ শতাংশ)\nমোট জমির পরিমাণ: ০.২০ একর (২০ শতাংশ)\n\nচৌহদ্দি/সীমানা:\nউত্তরে: মোঃ রহিম উদ্দিনের জমি\nদক্ষিণে: কামাল হোসেনের জোত\nপূর্বে: রফিক মিঞার বাড়ি\n পশ্চিমে: সরকারি কাঁচা রাস্তা\n\nমন্তব্য: প্রস্তুতের তারিখ ১৫ই মাঘ, ১৩৮৫ বাংলা। রাজস্ব নিয়মিত আদায়কৃত।`,
    structuredData: {
      docType: 'খতিয়ান',
      surveyType: surveyHint || 'RS',
      district: 'ঢাকা',
      upazila: 'সাভার',
      mouza: 'কাশিমপুর',
      jlNo: '২১',
      khatianNo: '1234',
      khatianNoBn: '১২৩৪',
      dagNo: '567',
      dagNoBn: '৫৬৭',
      landClass: 'ধানি/নাল',
      totalArea: 0.12,
      totalAreaBn: '০.১২',
      areaUnit: 'একর',
      owners: [
        {
          name: 'মোঃ আব্দুল করিম',
          fatherOrSpouse: 'মৃত রহমত আলী',
          share: '১/২',
          shareDecimal: 0.5,
          address: 'কাশিমপুর, সাভার, ঢাকা'
        },
        {
          name: 'সেলিনা বেগম',
          fatherOrSpouse: 'স্বামী: মোঃ আব্দুল করিম',
          share: '১/২',
          shareDecimal: 0.5,
          address: 'কাশিমপুর, সাভার, ঢাকা'
        }
      ],
      plots: [
        {
          dagNo: '567',
          dagNoBn: '৫৬৭',
          landClass: 'ধানি/নাল',
          area: 0.12,
          areaUnit: 'একর',
          confidence: 78
        }
      ],
      boundaries: {
        north: 'উত্তরে-রহিম',
        south: 'দক্ষিণে-কামাল',
        east: 'পূর্বে-রফিক',
        west: 'পশ্চিমে-সরকারি রাস্তা'
      },
      confidenceScore: 87,
      fieldConfidences: {
        district: 95,
        upazila: 92,
        mouza: 89,
        khatianNo: 98,
        dagNo: 78, // Low confidence flagged in the screenshot
        totalArea: 94,
        owners: 88,
        boundaries: 85
      },
      checks: {
        sharesSum: 'ok',
        areaSum: 'ok',
        surveyValid: 'ok',
        mandatoryFields: 'ok',
        unitConsistency: 'ok',
        notes: 'দাগ নম্বর ফিল্ডে কম কনফিডেন্স (৭৮%) - দয়া করে মূল নথির সাথে মিলিয়ে দেখুন'
      }
    }
  };
}

// API: Process OCR and Extract Structured Data
app.post('/api/ocr-extract', requireAuth(['operator', 'admin']), async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', fileName, surveyHint } = req.body ?? {};

    // ইনপুট যাচাই: শুধু JPG/PNG/PDF, সর্বোচ্চ ~10MB
    const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
    if (imageBase64 !== undefined) {
      if (typeof imageBase64 !== 'string' || !ALLOWED_MIME.includes(mimeType)) {
        return res.status(400).json({ success: false, error: 'bad_file', message: 'শুধু JPG, PNG বা PDF ফাইল গ্রহণযোগ্য।' });
      }
      if (imageBase64.length > 14_000_000) {
        return res.status(413).json({ success: false, error: 'too_large', message: 'ফাইল ১০ MB-এর বেশি হতে পারবে না।' });
      }
    }

    if (!aiClient || !imageBase64) {
      // Return high-quality domain mock
      const mockResult = getMockExtraction(fileName, surveyHint);
      return res.json({
        success: true,
        source: 'engine_local',
        isDemoData: true, // এটি কাল্পনিক নমুনা ডেটা, আপলোড করা ছবি থেকে পড়া নয়
        ...mockResult
      });
    }

    // Call Gemini 3.8 Flash Multimodal OCR
    const prompt = `Analyze this Bangladeshi historical land record (খতিয়ান, পর্চা, বা দলিল). 
Perform full OCR extraction in Bengali, and parse the following key entities into strict JSON format.
RULES: (1) Transcribe only what is actually visible; never invent or guess missing values - use "" for text and 0 for numbers when a field is absent or unreadable. (2) Every "confidence" and "fieldConfidences" number is YOUR honest 0-100 estimate of how sure you are about that field; give lower numbers for blurry, damaged, handwritten or ambiguous text, and 0 when not found. The values written as "<0-100>" in the template are placeholders; do not copy them. (3) "areaUnit" must be exactly one of "একর", "শতক", "কাঠা", as written in the document. (4) List EVERY plot (দাগ) of the khatian in "plots" with its own area and unit.
Template:
{
  "rawText": "full raw transcription in Bengali",
  "structuredData": {
    "docType": "খতিয়ান" or "পর্চা" or "দলিল",
    "surveyType": "CS" or "SA" or "RS" or "BS",
    "district": "জেলা (e.g. ঢাকা)",
    "upazila": "উপজেলা / থানা (e.g. সাভার)",
    "mouza": "মৌজা (e.g. কাশিমপুর)",
    "jlNo": "জেএল নম্বর (e.g. ২১)",
    "khatianNo": "খতিয়ান নম্বর (English digits, e.g. 1234)",
    "khatianNoBn": "খতিয়ান নম্বর (Bengali digits, e.g. ১২৩৪)",
    "dagNo": "প্রধান দাগ নম্বর (e.g. 567)",
    "dagNoBn": "প্রধান দাগ নম্বর (e.g. ৫৬৭)",
    "landClass": "জমির শ্রেণি (ধানি, ভিটি, বাড়ি, বাগান ইত্যাদি)",
    "totalArea": number (in decimal, e.g. 0.12),
    "totalAreaBn": "০.১২",
    "areaUnit": "একর" or "শতক" or "কাঠা",
    "owners": [
      {
        "name": "মালিকের নাম",
        "fatherOrSpouse": "পিতা বা স্বামীর নাম",
        "share": "অংশ (e.g. ১/২ বা ১৬ আনা)",
        "shareDecimal": 0.5,
        "address": "ঠিকানা"
      }
    ],
    "plots": [
      {
        "dagNo": "567",
        "dagNoBn": "৫৬৭",
        "landClass": "ধানি",
        "area": 0.12,
        "areaUnit": "একর",
        "confidence": "<0-100>"
      }
    ],
    "boundaries": {
      "north": "উত্তরে সীমানা",
      "south": "দক্ষিণে সীমানা",
      "east": "পূর্বে সীমানা",
      "west": "পশ্চিমে সীমানা"
    },
    "confidenceScore": "<0-100>",
    "fieldConfidences": {
      "district": "<0-100>",
      "upazila": "<0-100>",
      "mouza": "<0-100>",
      "khatianNo": "<0-100>",
      "dagNo": "<0-100>",
      "totalArea": "<0-100>",
      "owners": "<0-100>",
      "boundaries": "<0-100>"
    }
  }
}
Only output valid JSON with no markdown wrapping.`;

    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9\/\+\-]+;base64,/, '');

    const response = await aiClient.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    const responseText = response.text || '';
    const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanJson);
      return res.json({
        success: true,
        source: 'gemini_vision',
        ...parsed
      });
    } catch {
      // If parsing fails, return fallback with rawText
      const fallback = getMockExtraction(fileName, surveyHint);
      fallback.rawText = responseText || fallback.rawText;
      return res.json({
        success: true,
        source: 'gemini_raw',
        isDemoData: true, // JSON পার্স হয়নি, তাই কাঠামোবদ্ধ অংশ নমুনা ডেটা
        ...fallback
      });
    }
  } catch (error: any) {
    console.error('OCR processing error:', error);
    const mock = getMockExtraction();
    return res.json({
      success: true,
      source: 'engine_local',
      isDemoData: true,
      ...mock,
      errorInfo: 'OCR সেবা এই মুহূর্তে সাড়া দেয়নি; নমুনা ডেটা দেখানো হচ্ছে।' // ভেতরের ত্রুটির বিবরণ ক্লায়েন্টকে দেওয়া হয় না
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
