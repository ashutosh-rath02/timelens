const fs = require("fs-extra");
const path = require("path");
const moment = require("moment");
const { GoogleGenerativeAI } = require("@google/generative-ai");

class AIService {
  constructor() {
    this.providers = {
      gemini: new GeminiProvider(),
      ollama: new OllamaProvider(),
    };
    this.currentProvider = "gemini"; // Default
    console.log("AIService: Initialized");
  }

  setProvider(provider) {
    if (this.providers[provider]) {
      this.currentProvider = provider;
      console.log(`AI Provider switched to: ${provider}`);
    } else {
      console.error(`Unknown AI provider: ${provider}`);
    }
  }
  // Wrote code for AI application

  setApiKey(apiKey) {
    if (this.currentProvider === "gemini") {
      this.providers.gemini.setApiKey(apiKey);
    }
  }

  async analyzeSession(sessionId, frames) {
    try {
      console.log(`Starting AI analysis for session: ${sessionId}`);

      const provider = this.providers[this.currentProvider];

      // Gemini Flow: 2 LLM calls approach
      // Step 1: Upload + Transcribe (analyze all frames as a video chunk)
      const activities = await this.analyzeVideoChunk(frames);

      // Step 2: Generate Cards (summarize into activity cards)
      const summary = await provider.generateSummary(activities);
      const title = await provider.generateTitle(summary);
      const segments =
        activities.length > 5
          ? await provider.segmentTimeline(activities)
          : {
              reasoning: "Not enough activities for segmentation",
              segments: [
                {
                  startTimestamp: "00:00",
                  endTimestamp: "End",
                  description: summary,
                },
              ],
            };

      const analysisResult = {
        sessionId,
        summary,
        title,
        segments,
        activities,
        analyzedAt: moment().toISOString(),
        provider: this.currentProvider,
      };

      console.log(`AI analysis completed for session: ${sessionId}`);
      return analysisResult;
    } catch (error) {
      console.error("AI analysis failed:", error);
      return {
        sessionId,
        summary: "Analysis failed - manual review needed",
        title: "Recording Session",
        segments: [],
        activities: [],
        analyzedAt: moment().toISOString(),
        provider: this.currentProvider,
        error: error.message,
      };
    }
  }

  async analyzeVideoChunk(frames) {
    const provider = this.providers[this.currentProvider];

    if (!provider.model) {
      return [
        {
          timestamp: frames[0]?.timestamp || new Date().toISOString(),
          frameNumber: 0,
          apps: ["Unknown"],
          activity: "Analysis unavailable - API key not set",
          confidence: 0.0,
        },
      ];
    }

    try {
      console.log(`Analyzing video chunk with ${frames.length} frames`);

      // Sample frames for analysis (every 5th frame to reduce processing)
      const sampleFrames = frames.filter((_, index) => index % 5 === 0);
      console.log(`Sampling ${sampleFrames.length} frames for analysis`);

      // Analyze multiple frames together for better context
      const activities = [];

      for (let i = 0; i < sampleFrames.length; i += 3) {
        const frameBatch = sampleFrames.slice(i, i + 3);
        const batchAnalysis = await this.analyzeFrameBatch(frameBatch);
        activities.push(...batchAnalysis);
      }

      return activities;
    } catch (error) {
      console.error("Video chunk analysis failed:", error);
      return [
        {
          timestamp: frames[0]?.timestamp || new Date().toISOString(),
          frameNumber: 0,
          apps: ["Error"],
          activity: "Analysis failed",
          confidence: 0.0,
        },
      ];
    }
  }

  async analyzeFrameBatch(frames) {
    const provider = this.providers[this.currentProvider];

    try {
      // Prepare multiple images for batch analysis
      const imageData = [];

      for (const frame of frames) {
        if (fs.existsSync(frame.file_path)) {
          const imageBuffer = fs.readFileSync(frame.file_path);
          const base64Image = imageBuffer.toString("base64");

          imageData.push({
            inlineData: {
              data: base64Image,
              mimeType: "image/png",
            },
          });
        }
      }

      if (imageData.length === 0) {
        return [
          {
            timestamp: frames[0]?.timestamp || new Date().toISOString(),
            frameNumber: frames[0]?.frame_number || 0,
            apps: ["Error"],
            activity: "No valid frames found",
            confidence: 0.0,
          },
        ];
      }

      // Analyze the batch of frames together
      const prompt = `Analyze these ${imageData.length} screenshots from a user's computer session and identify:

1. What applications/windows are visible across the frames
2. What the user is doing (specific activity progression)
3. Any websites, content, or specific tasks visible
4. How the activity changes between frames

Return ONLY valid JSON (no markdown, no code blocks):
{
  "activities": [
    {
      "timestamp": "ISO timestamp",
      "frameNumber": 0,
      "apps": ["list", "of", "visible", "applications"],
      "activity": "specific description of what user is doing",
      "confidence": 0.85
    }
  ]
}`;

      const result = await provider.model.generateContent([
        prompt,
        ...imageData,
      ]);

      const response = await result.response;
      const text = response.text();

      // Clean up the response
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Parse JSON response
      try {
        const parsed = JSON.parse(cleanText);
        console.log(
          `Batch analysis completed for ${frames.length} frames:`,
          parsed
        );

        // Map the results back to individual frames
        return parsed.activities.map((activity, index) => ({
          timestamp: frames[index]?.timestamp || activity.timestamp,
          frameNumber: frames[index]?.frame_number || activity.frameNumber,
          apps: activity.apps || ["Unknown"],
          activity: activity.activity || "Analysis completed",
          confidence: activity.confidence || 0.85,
        }));
      } catch (parseError) {
        console.error("Failed to parse batch analysis response:", parseError);
        console.error("Raw response:", text);

        // Fallback: return one activity for the batch
        return [
          {
            timestamp: frames[0]?.timestamp || new Date().toISOString(),
            frameNumber: frames[0]?.frame_number || 0,
            apps: ["Analysis"],
            activity: "Batch analysis completed",
            confidence: 0.8,
          },
        ];
      }
    } catch (error) {
      console.error("Frame batch analysis failed:", error);
      return [
        {
          timestamp: frames[0]?.timestamp || new Date().toISOString(),
          frameNumber: frames[0]?.frame_number || 0,
          apps: ["Error"],
          activity: "Batch analysis failed",
          confidence: 0.0,
        },
      ];
    }
  }

  async analyzeFrames(frames) {
    const activities = [];
    const frameInterval = 10; // Analyze every 10th frame to reduce processing

    for (let i = 0; i < frames.length; i += frameInterval) {
      const frame = frames[i];
      try {
        const analysis = await this.analyzeSingleFrame(frame);
        if (analysis) {
          activities.push({
            timestamp: frame.timestamp,
            frameNumber: frame.frame_number,
            ...analysis,
          });
        }
      } catch (error) {
        console.error(`Failed to analyze frame ${frame.frame_number}:`, error);
      }
    }

    return activities;
  }

  async analyzeSingleFrame(frame) {
    const provider = this.providers[this.currentProvider];
    return await provider.analyzeFrame(frame);
  }
}

class GeminiProvider {
  constructor() {
    this.apiKey = null;
    this.genAI = null;
    this.model = null;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      console.log("Gemini API initialized with key");
    } else {
      this.genAI = null;
      this.model = null;
      console.log("Gemini API key cleared");
    }
  }

  async analyzeFrame(frame) {
    if (!this.model) {
      return {
        apps: ["Unknown"],
        activity: "Analysis unavailable - API key not set",
        confidence: 0.0,
      };
    }

    try {
      // Read the actual screenshot file
      const fs = require("fs");
      const path = require("path");

      if (!fs.existsSync(frame.file_path)) {
        console.error(`Screenshot file not found: ${frame.file_path}`);
        return {
          apps: ["Error"],
          activity: "Screenshot file not found",
          confidence: 0.0,
        };
      }

      // Read and convert to base64
      const imageBuffer = fs.readFileSync(frame.file_path);
      const base64Image = imageBuffer.toString("base64");

      // Prepare the prompt for Gemini Vision
      const prompt = `Analyze this screenshot and identify:
1. What applications/windows are visible
2. What the user is doing (specific activity)
3. Any websites, content, or specific tasks visible

Return ONLY valid JSON (no markdown, no code blocks):
{
  "apps": ["list", "of", "visible", "applications"],
  "activity": "specific description of what user is doing",
  "confidence": 0.85
}`;

      // Send to Gemini Vision API
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: "image/png",
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Clean up the response - remove markdown code blocks
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Parse JSON response
      try {
        const parsed = JSON.parse(cleanText);
        console.log(`Frame ${frame.frame_number} analysis:`, parsed);
        return parsed;
      } catch (parseError) {
        console.error("Failed to parse Gemini vision response:", parseError);
        console.error("Raw response:", text);
        return {
          apps: ["Error"],
          activity: "Failed to parse AI response",
          confidence: 0.0,
        };
      }
    } catch (error) {
      console.error("Gemini frame analysis failed:", error);
      return {
        apps: ["Error"],
        activity: "Analysis failed",
        confidence: 0.0,
      };
    }
  }

  async generateSummary(activities) {
    if (!this.model) {
      return "Analysis unavailable - API key not set";
    }

    try {
      const activitiesText = activities
        .map((a) => `${a.timestamp}: ${a.activity}`)
        .join("\n");

      const prompt = `You are analyzing someone's computer activity from the last session. Be VERY specific about what the user actually did.

Activity periods:
${activitiesText}

Create a detailed summary that captures the specific activities and applications used.

SUMMARY GUIDELINES:
- Write in first person without using "I" (like a personal journal entry)
- Start sentences with action verbs: "Coded...", "Watched...", "Read...", "Browsed..."
- 3-4 sentences maximum
- Include specific app names, websites, content types
- Mention specific activities like coding, watching videos, reading articles, etc.
- Be detailed about what was actually happening

EXAMPLES:
"Coded in VS Code working on a React project with multiple components. Watched a tutorial video on YouTube about advanced JavaScript concepts. Read a technical blog post about web development best practices. Browsed Stack Overflow searching for solutions to coding problems."`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      console.log("Gemini summary generated:", summary);
      return summary;
    } catch (error) {
      console.error("Gemini summary generation failed:", error);
      return "Analysis failed - API error occurred";
    }
  }

  async generateTitle(summary) {
    if (!this.model) {
      return {
        reasoning: "API key not set",
        title: "Recording Session",
      };
    }

    try {
      const prompt = `Based on this summary: "${summary}"

Return ONLY valid JSON (no markdown, no code blocks):
{
  "reasoning": "Explain how you chose the title",
  "title": "5-8 word conversational title using only summary facts"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up the response - remove markdown code blocks
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(cleanText);
        console.log("Gemini title generated:", parsed);
        return parsed;
      } catch (parseError) {
        console.error("Failed to parse Gemini title response:", parseError);
        console.error("Raw response:", text);
        console.error("Cleaned response:", cleanText);
        return {
          reasoning: "Failed to parse AI response",
          title: "Recording Session",
        };
      }
    } catch (error) {
      console.error("Gemini title generation failed:", error);
      return {
        reasoning: "API error occurred",
        title: "Recording Session",
      };
    }
  }

  async segmentTimeline(activities) {
    if (!this.model) {
      return {
        reasoning: "API key not set",
        segments: [
          {
            startTimestamp: "00:00",
            endTimestamp: "End",
            description: "Analysis unavailable",
          },
        ],
      };
    }

    try {
      const prompt = `Draft how you'll group the activities before you answer. Decide where the natural breaks occur and ensure the full session is covered.

Activities:
${activities
  .map((a, i) => `${i + 1}. ${a.timestamp}: ${a.activity}`)
  .join("\n")}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "reasoning": "Use this space to think through how you're going to construct the segments",
  "segments": [
    {
      "startTimestamp": "MM:SS",
      "endTimestamp": "MM:SS", 
      "description": "Natural language summary of what happened"
    }
  ]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up the response - remove markdown code blocks
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(cleanText);
        console.log("Gemini segments generated:", parsed);
        return parsed;
      } catch (parseError) {
        console.error("Failed to parse Gemini segments response:", parseError);
        console.error("Raw response:", text);
        console.error("Cleaned response:", cleanText);
        return {
          reasoning: "Failed to parse AI response",
          segments: [
            {
              startTimestamp: "00:00",
              endTimestamp: "End",
              description: "Analysis failed",
            },
          ],
        };
      }
    } catch (error) {
      console.error("Gemini segmentation failed:", error);
      return {
        reasoning: "API error occurred",
        segments: [
          {
            startTimestamp: "00:00",
            endTimestamp: "End",
            description: "Analysis failed",
          },
        ],
      };
    }
  }
}

class OllamaProvider {
  constructor() {
    this.baseUrl = "http://localhost:11434/api";
  }

  async analyzeFrame(frame) {
    // TODO: Implement actual Ollama vision model analysis
    // This would require setting up Ollama with a vision model locally
    return {
      apps: ["Not Implemented"],
      activity: "Ollama vision analysis not yet implemented",
      confidence: 0.0,
    };
  }

  async generateSummary(activities) {
    // TODO: Implement actual Ollama API call for summary generation
    return "Ollama summary generation not yet implemented";
  }

  async generateTitle(summary) {
    // TODO: Implement actual Ollama API call for title generation
    return {
      reasoning: "Ollama title generation not yet implemented",
      title: "Recording Session",
    };
  }

  async segmentTimeline(activities) {
    // TODO: Implement actual Ollama API call for timeline segmentation
    return {
      reasoning: "Ollama segmentation not yet implemented",
      segments: [
        {
          startTimestamp: "00:00",
          endTimestamp: "End",
          description: "Ollama segmentation not yet implemented",
        },
      ],
    };
  }
}

module.exports = AIService;
