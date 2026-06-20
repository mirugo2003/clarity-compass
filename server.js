const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config(); // ✅ ADD THIS LINE

const app = express();

// Enable CORS for all origins (development only)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());
require('dotenv').config();

// 🔥 LOAD GROQ API KEY FROM .env
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Clarity Compass backend is running!' });
});

// Main analyze endpoint
app.post('/api/analyze', async (req, res) => {
    const { idea } = req.body;
    
    console.log('📥 Received idea:', idea?.substring(0, 50) + '...');

    if (!idea) {
        return res.status(400).json({ error: 'Idea is required' });
    }

    // Skip processing for ping
    if (idea === 'ping') {
        return res.json({ status: 'ok', message: 'API is working!' });
    }

    try {
        const prompt = `
You are Clarity Compass AI, a strategic planning expert for college students. Analyze the following idea and return a JSON response with:

1. "reasoning": Array of 4 objects, each with "title" and "description" (step-by-step reasoning, each description should be 2-3 sentences explaining WHY this step matters)

2. "summary": Object with "title", "context", "tech", "marketing" - each field should be descriptive

3. "risks": Array of 3-4 objects, each with "priority" (high/medium/low), "title", "description" (detailed explanation of the risk), "recommendation" (specific actionable advice)

4. "roadmap": Object with:
   - "firstStep": A detailed 1-2 sentence explanation of the very first action to take
   - "phase1": Array of 4 objects, each with "week" (e.g., "Week 1: Research & Discovery") and "tasks" (Array of 3-4 detailed, actionable tasks, each 10-15 words explaining WHAT to do and WHY it matters)
   - "phase2": Array of 3 objects, each with "week" and "tasks" (3-4 detailed tasks each)
   - "phase3": Array of 3 objects, each with "week" and "tasks" (3-4 detailed tasks each)

IMPORTANT: For the roadmap tasks, each task should be a complete sentence or two that explains:
- WHAT specifically to do
- WHY it's important for the project
- HOW it connects to the overall goal

EXAMPLE of a good task: "Conduct in-depth user interviews with 5 international students to understand their visa application pain points, which will inform the core features of your portal."

EXAMPLE of a bad task (too short): "Interview students"

Student's idea: "${idea}"

Return ONLY valid JSON, no other text. Make the tasks DETAILED and ACTIONABLE.
`;

        console.log('🤖 Calling Groq API with llama-3.3-70b-versatile...');

        const response = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'You are Clarity Compass AI, a strategic planning expert. Return ONLY valid JSON. No markdown, no explanations, just pure JSON. Your task descriptions should be detailed, actionable, and explain the reasoning behind each step.' },
                { role: 'user', content: prompt }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_tokens: 2500,
        });

        let content = response.choices[0].message.content;
        console.log('📝 Groq response received, length:', content.length);
        
        // Clean up the response
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const result = JSON.parse(content);
        console.log('✅ Parsed JSON successfully');
        res.json(result);
    } catch (error) {
        console.error('❌ Groq API error:', error.message);
        res.status(500).json({ error: 'Failed to analyze idea: ' + error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Clarity Compass backend running on http://localhost:${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/analyze`);
    console.log(`🤖 Using Groq AI (llama-3.3-70b-versatile)`);
    console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
});