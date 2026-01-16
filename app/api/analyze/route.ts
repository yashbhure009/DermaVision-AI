import { type NextRequest, NextResponse } from "next/server";

// ✅ UPDATED: specific models from your successful diagnostic log
const MODELS_TO_TRY = [
  "gemini-2.5-flash", 
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite"
];

export async function POST(req: NextRequest) {
  try {
    console.log("🟢 API Hit: /api/analyze (Production Mode)");

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Server Error: API Key Missing" }, { status: 500 });
    }

    const body = await req.json();
    const { image, symptoms, classification } = body;

    // 1. Clean Base64 Data
    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    // 2. Construct Prompt
    const promptText = `
      You are "DermaVision Doctor".
      CONTEXT: Visual Scan: ${classification}. Symptoms: ${symptoms?.join(", ") || "None"}.
      TASK: Analyze the image. Provide: 1. Observation, 2. Analysis, 3. Recommendations, 4. Urgency.
      Start with "Based on AI analysis..."
    `;

    // 3. Prepare Payload
    const payload = {
      contents: [{
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          }
        ]
      }]
    };

    // 4. Try Models One by One
    let lastError = "";
    
    for (const modelName of MODELS_TO_TRY) {
      console.log(`🟡 Attempting model: ${modelName}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          console.log(`🟢 Success with ${modelName}!`);
          return NextResponse.json({ result: text });
        }
      } else {
        const errData = await response.json();
        console.warn(`🔴 Failed ${modelName}:`, errData.error?.message || response.statusText);
        lastError = errData.error?.message || "Unknown API Error";
      }
    }

    // 5. If all failed
    throw new Error(`All models failed. Last error: ${lastError}`);

  } catch (error: any) {
    console.error("🔴 Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}