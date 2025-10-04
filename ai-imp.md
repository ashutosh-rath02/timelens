# AI Model and Prompt Overview for Dayflow

## 1. AI Models Used

Dayflow supports multiple AI models for analyzing and summarizing user computer activity:

- **Google Gemini API (Gemini 2.5 Pro and Gemini 2.5 Flash):**

  - Cloud-based LLMs for high-accuracy, fast analysis.
  - Used for session synthesis, timeline segmentation, and detailed summaries.

- **Ollama (Local Model Support):**
  - Enables running local LLMs (e.g., Llama2, Mistral, others) via [Ollama](https://ollama.com/) or [LM Studio](https://lmstudio.ai/).
  - Useful for privacy-conscious or offline scenarios.

Users can select their preferred model in the app's onboarding and settings.

---

## 2. AI Workflow and Process

Dayflow’s AI workflow involves several steps:

1. **Activity Collection:**

   - The app collects timestamped observations of user activity (apps used, browser tabs, actions taken, etc.).

2. **Preprocessing:**

   - Observations are grouped into “cards” representing coherent sessions, using rules for context switches and minimum durations.

3. **Prompt Generation:**

   - Custom prompts are constructed to guide the AI in generating natural language summaries and titles.
   - Prompts include detailed formatting guidelines and examples.

4. **LLM Inference:**

   - The selected model (Gemini or Ollama) receives the prompt and activity data.
   - The model returns structured summaries (JSON) and/or descriptive segmentations.

5. **Post-processing:**
   - The app parses the LLM output, validates structural requirements, and surfaces summaries/titles in the timeline UI.

---

## 3. Example Prompts Used

Prompts are written as multi-line strings, with explicit guidelines and sample outputs. Below are examples from the codebase:

### a. Summary Generation (`OllamaProvider.swift`)

```swift
You are analyzing someone's computer activity from the last 15 minutes.

Activity periods:
<observationsText>

Create a summary that captures what happened during this time period.

SUMMARY GUIDELINES:
- Write in first person without using "I" (like a personal journal entry)
- Start sentences with action verbs: "Managed...", "Browsed...", "Searched..."
- 2-3 sentences maximum
- Include specific details (app names, search topics, etc.)
- Natural, conversational tone

GOOD EXAMPLES:
"Managed Mac system preferences focusing on software updates and accessibility settings. Browsed Chrome searching for iPhone wireless charging info while checking Twitter and Slack messages."
```

### b. Title Generation (`OllamaProvider.swift`)

```swift
Return JSON:
{
  "reasoning": "Explain how you chose the title",
  "title": "5-8 word conversational title using only summary facts"
}
```

### c. Timeline Segmentation (`GeminiDirectProvider.swift`)

```swift
Draft how you'll group the snapshots before you answer. Decide where the natural breaks occur and ensure the full video is covered.

Respond with a JSON object using this exact shape:
{
  "reasoning": "Use this space to think through how you're going to construct the segments",
  "segments": [
    {
      "startTimestamp": "MM:SS",
      "endTimestamp": "MM:SS",
      "description": "Natural language summary of what happened"
    }
  ]
}
```

### d. Style and Content Rules (`formatted_prompt.txt`)

```text
TITLE GUIDELINES:
Write titles like you're texting a friend about what you did. Natural, conversational, direct, specific.

Rules:
- Be specific and clear (not creative or vague)
- Keep it short - aim for 5-10 words
- Include main activity + distraction if relevant
- Include specific app/tool names, not generic activities
- Use specific verbs: "Debugged Python" not "Worked on project"
```

---

## References

- Code Files:
  - `Dayflow/Dayflow/Core/AI/OllamaProvider.swift`
  - `Dayflow/Dayflow/Core/AI/GeminiDirectProvider.swift`
  - `formatted_prompt.txt`
- Model Documentation:
  - [Google Gemini API](https://ai.google.dev/gemini-api/docs)
  - [Ollama](https://ollama.com/)
  - [LM Studio](https://lmstudio.ai/)
