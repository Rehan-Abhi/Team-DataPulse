const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const auth = require('../middleware/auth'); // Optional: verifyToken if we want protection

// Multer setup (Memory storage for parsing)
const upload = multer({ storage: multer.memoryStorage() });

// Helper to call Gemini API
async function generatePodcastScript(text, apiKey) {
    const prompt = `
    You are an expert educational podcaster. 
    Analyze the following academic notes/text and convert them into a lively, 2-minute "Audio Overview" script.
    
    Format the output STRICTLY as a JSON array of objects, where each object has "speaker" (either "Host" or "Expert") and "text".
    Example:
    [
        {"speaker": "Host", "text": "Welcome back! Today we're diving into..."},
        {"speaker": "Expert", "text": "Exactly. It's a fascinating topic because..."}
    ]

    Keep it engaging, simple, and focus on the key concepts.
    
    TEXT TO ANALYZE:
    ${text.substring(0, 30000)} ... (truncated for brevity if too long)
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    
    // Cleanup JSON markdown if present
    const jsonString = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString);
}


// POST /api/studio/generate
router.post('/generate', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No PDF file provided" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Logic for "Mock Mode" if no key provided
            console.warn("GEMINI_API_KEY missing. Using Mock Response.");
            const script = [
                { speaker: "System", "text": "Gemini API Key is missing on the server." },
                { speaker: "System", "text": "Please add GEMINI_API_KEY to your .env file to generate real scripts." },
                { speaker: "Host", "text": "For now, here is a demo. We received your PDF!" },
                { speaker: "Expert", "text": "Indeed. I can see the file size was " + req.file.size + " bytes." }
            ];
            return res.json({ script });
        }

        // 1. Parse PDF
        const data = await pdf(req.file.buffer);
        const text = data.text;

        if (!text || text.length < 50) {
            return res.status(400).json({ error: "Could not extract text from PDF (or it's empty)." });
        }

        console.log(`Extracted ${text.length} chars from PDF. Sending to Gemini...`);

        // 2. Generate Script
        const script = await generatePodcastScript(text, apiKey);

        res.json({ script });

    } catch (error) {
        console.error("Studio Error:", error);
        res.status(500).json({ error: "Failed to generate summary", details: error.message });
    }
});

module.exports = router;
