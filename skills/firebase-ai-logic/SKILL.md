---
name: firebase-ai-logic
description: >-
  Integrates the Gemini API into client apps via Firebase AI Logic — text
  generation, multimodal (image / video / audio) inference, structured JSON
  output, streaming, and chat sessions. Use whenever the user wants Gemini
  in a web or mobile app without proxying through their own backend, with
  App Check protection. Pair with firebase-app-check to prevent quota
  theft.
compatibility: Available on web (firebase) and Expo/RN (@react-native-firebase/vertexai or the new ai package). Requires the Vertex AI in Firebase or Google AI provider enabled in the Firebase Console.
---

# Firebase AI Logic (Gemini)

Firebase AI Logic lets you call Gemini directly from the client without managing a backend or API key. The SDK exchanges App Check tokens for short-lived Gemini credentials — abuse-resistant by default.

There are two providers under the same SDK:

- **Vertex AI in Firebase** — billed via your Google Cloud project, enterprise SLAs, available in more regions, supports all Gemini models including 2.5 Pro/Flash.
- **Google AI (Gemini Developer API)** — billed via Firebase, simpler quota model, good for early-stage apps and prototypes.

Pick one per project. Migrating later requires re-init code; pick deliberately.

## Minimum viable example

```ts
import { getVertexAI, getGenerativeModel } from "@react-native-firebase/vertexai";

const model = getGenerativeModel(getVertexAI(), { model: "gemini-2.5-flash" });
const result = await model.generateContent("Write a haiku about Firebase");
console.log(result.response.text());
```

App Check must be initialized first — without it, anyone with your client bundle can spend your tokens. This is non-negotiable for production.

## 1. Enable the provider

Firebase Console → Build → AI Logic → Get Started → choose **Vertex AI** or **Google AI**. The console walks through enabling the underlying API.

## 2. Enable App Check (mandatory in production)

Without App Check, anyone with your web Firebase config can bill your project. See the `firebase-app-check` skill — initialize App Check **before** the AI SDK on every platform.

## 3. Install

### Web

```bash
npm install firebase
```

```ts
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";

const vertexAI = getVertexAI(app);
const model = getGenerativeModel(vertexAI, { model: "gemini-2.5-flash" });
```

### Expo / React Native

```bash
npx expo install @react-native-firebase/vertexai
```

```ts
import { getVertexAI, getGenerativeModel } from "@react-native-firebase/vertexai";

const vertexAI = getVertexAI();
const model = getGenerativeModel(vertexAI, { model: "gemini-2.5-flash" });
```

## 4. Model selection

| Model | When to use |
|---|---|
| `gemini-2.5-flash` | Default for most apps — fast, cheap, multimodal. Start here. |
| `gemini-2.5-pro` | Complex reasoning, long-context analysis, code generation. |
| `gemini-2.5-flash-lite` | Highest-volume / lowest-latency tasks. Classification, extraction. |

Pin to a specific version in production (`gemini-2.5-flash-002`) — unversioned aliases roll forward and can change behavior overnight.

## 5. Single-turn generation

```ts
const result = await model.generateContent("Write a haiku about Firebase");
const text = result.response.text();
```

## 6. Multimodal (image + text)

```ts
import { fileToGenerativePart } from "firebase/vertexai";

const imagePart = await fileToGenerativePart(file); // File from <input>
const result = await model.generateContent([
  "Describe what's in this image",
  imagePart,
]);
```

On React Native, load the image as base64 and pass:

```ts
const imagePart = {
  inlineData: { data: base64String, mimeType: "image/jpeg" },
};
```

For videos and audio, the same `inlineData` shape works with the appropriate MIME (`video/mp4`, `audio/mp3`). Files > 20 MB must be uploaded via Cloud Storage and referenced by URI.

## 7. Streaming responses

```ts
const result = await model.generateContentStream("Write a 200-word story");
for await (const chunk of result.stream) {
  process.stdout.write(chunk.text());
}
const final = await result.response;
```

Streaming gives a much better UX — show tokens as they arrive instead of waiting 5+ seconds for a full response.

## 8. Structured JSON output

To get strictly-typed output instead of parsing free-form text:

```ts
const model = getGenerativeModel(vertexAI, {
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        confidence: { type: "number" },
        keywords:   { type: "array", items: { type: "string" } },
      },
      required: ["sentiment", "confidence"],
    },
  },
});

const result = await model.generateContent("I love this product!");
const parsed = JSON.parse(result.response.text()) as {
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  keywords?: string[];
};
```

The model is constrained to emit valid JSON matching the schema — no try/catch ladders.

## 9. Chat sessions (multi-turn)

```ts
const chat = model.startChat({
  history: [
    { role: "user", parts: [{ text: "I'm planning a trip to Lima" }] },
    { role: "model", parts: [{ text: "Great choice! When are you going?" }] },
  ],
});

const response = await chat.sendMessage("Next month, 5 days");
const reply = response.response.text();

// History auto-accumulates
const fullHistory = await chat.getHistory();
```

Persist `getHistory()` to Firestore if you need conversations to survive app restarts.

For tool use / function calling — letting Gemini invoke your APIs or query Firestore as part of a conversation — see [references/function-calling.md](references/function-calling.md).

## 10. System instructions

Set persistent context that applies to every turn without consuming chat history:

```ts
const model = getGenerativeModel(vertexAI, {
  model: "gemini-2.5-flash",
  systemInstruction: "You are a terse code reviewer. Reply in at most 3 bullet points.",
});
```

## 11. Cost and quota

- All requests count against your provider's quota (Vertex AI quota for Vertex; Google AI free/paid tier for Google AI)
- **Token-priced**: input + output tokens. Multimodal inputs cost more per "token" because images/audio expand significantly.
- Cache long static prompts using **context caching** (Vertex AI feature) for repeated system prompts — drops cost by ~75%.
- Monitor in Firebase Console → AI Logic → Usage.

## 12. Common mistakes

- **Shipping without App Check.** Your Firebase web config + an AI Logic call = anyone can spend your money. Always enforce App Check before going to prod.
- **Pinning to an unversioned model alias.** Behavior changes silently. Pin to `gemini-2.5-flash-002` or specific dates.
- **Calling from a server.** Use the Vertex AI Node SDK or `firebase-admin` directly — Firebase AI Logic is client-only.
- **Treating JSON output as guaranteed valid.** Even with `responseSchema`, schema misses are rare but possible. Wrap `JSON.parse` in try/catch and retry on failure.
- **Loading 100MB videos as inlineData.** Use Cloud Storage URIs for anything > 20 MB.
- **Forgetting `await` on `getHistory()`.** It's async.
