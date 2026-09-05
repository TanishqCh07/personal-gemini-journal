# Gemini Reflection Journal & Thought Partner

A production-grade, user-authenticated journaling and thought-partner web application powered by the **Gemini 3.6 Flash API** (with a resilient multi-model fallback ladder) and **Cloud Firestore** for secure, user-isolated document persistence.

---

## 🚀 Key Features

- **Federated Authentication**: Secure Google Sign-In via Firebase Authentication with zero manual email/password handling.
- **Strict User-Isolated Storage**: Every journal entry, reflection, and conversational turn is locked under `/users/{userId}/interactions/{interactionId}` governed by owner-bound Firestore security rules (`request.auth.uid == userId`).
- **Semantic Vault Recall with Grounded Citations**: Intelligently searches past journal entries to ground reflections and multi-turn discussions in long-term personal context, displaying clickable citation chips with source dates, relevance reasons, and excerpts.
- **Resilient AI Thought Partner**: Built with the `@google/genai` SDK using a resilient model fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`) to gracefully recover from transient API limits or outages.
- **Automatic Key Takeaway Summarization**: Generates insightful reflections, constructive brainstorming prompts, and a concise 1-2 sentence core theme summary for every journal reflection.
- **Multi-Turn Contextual Conversation**: Continue talking with Gemini on any saved entry to unpack dilemmas, formulate action plans, or reflect deeper.
- **Location-Aware Journaling (Google Maps Places Autocomplete)**: Attach place names, formatted addresses, and coordinates to entries via Google Maps Platform Places Autocomplete web components, displayed as styled location chips in Vault History and entry details.
- **Voice Input Dictation (Web Speech API)**: Native, zero-cost voice dictation using the browser's built-in Web Speech API (`SpeechRecognition`). Includes a live pulsing recording indicator, real-time transcription streaming into existing text, and seamless text-only fallback for unsupported browsers.
- **Zero Hardcoding & Secret Management**: Dedicated `GEMINI_API_KEY` and client-restricted `MAPS_API_KEY` managed securely without hardcoded credentials.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, React Markdown, Motion, `@googlemaps/js-api-loader`
- **Backend**: Express.js with Vite Middleware (Dev & Production bundling with esbuild)
- **AI Engine**: Gemini 3.6 Flash API (`@google/genai`) with model fallback ladder
- **Maps Platform**: Google Maps JavaScript API (Places Autocomplete Element, attribution ID `gmp_mcp_codeassist_v1_aistudio`)
- **Database & Identity**: Firebase Authentication (Google Sign-In) & Cloud Firestore

---

## 📋 Prerequisites & GCP Setup

Ensure you have the [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and authenticated:

```bash
# Login to Google Cloud
gcloud auth login

# Set your active GCP project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

---

## 🔐 1. Secret Management Setup (Google Cloud Secret Manager)

Store your Gemini API key in Secret Manager and grant Cloud Run's runtime service account access:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Identify your Project Number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# 3. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. (Optional) Create MAPS_API_KEY secret for location tagging
gcloud secrets create MAPS_API_KEY --replication-policy="automatic"
echo -n "YOUR_MAPS_API_KEY" | gcloud secrets versions add MAPS_API_KEY --data-file=-
gcloud secrets add-iam-policy-binding MAPS_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

> **Google Maps Key Restrictions & Spend Safety**:
> - Restrict API key to **Maps JavaScript API** and **Places API**.
> - Restrict HTTP Referrers to your Cloud Run URL and AI Studio domain.
> - Configure daily quotas/spend alert in Google Cloud Console.
> - Grounded with attribution ID `gmp_mcp_codeassist_v1_aistudio`.

---

## 🛡️ 2. Cloud Firestore Database Security Configuration

Deploy owner-bound security rules to ensure no user can read or write another user's journal entries:

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User interactions, journal entries, and AI reflection history isolation
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🚢 3. Cloud Run Deployment Flow

Build and deploy the application container to Google Cloud Run:

```bash
# Deploy to Google Cloud Run with Secret Manager mounting
gcloud run deploy gemini-reflection-journal \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

## 🏷️ 4. Required Campaign Labeling (Verification Binding)

Apply the mandatory verification resource label to register the service for automated challenge verification:

```bash
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 🧪 Functional Walkthrough & Test Guide

1. **User Landing & Authentication**:
   - Navigate to the application root.
   - Click **"Sign In with Google"** (or **"Enter as Guest Explorer"** for sandbox preview).
   - Verify that your user avatar and profile populate the top navigation bar.

2. **Compose a New Journal Entry**:
   - Select a reflection category: *Deep Reflection*, *Brainstorm Ideas*, *Gratitude & Wins*, *Hurdle / Problem*, or *Day Summary*.
   - Use a thought starter or write your thoughts into the text area.
   - Click **"Reflect with Gemini"**.

3. **Verify AI Reflection & Summary**:
   - Check that Gemini returns a supportive reflection and a dedicated **Key Takeaways & Core Theme** card.
   - Confirm that the entry is instantly saved to Cloud Firestore under `/users/{userId}/interactions/{id}`.

4. **Multi-Turn Conversation**:
   - Scroll down to **"Continue the Conversation with Gemini"**.
   - Ask a follow-up question (e.g., *"What is the single best first step I can take tomorrow morning?"*).
   - Verify that Gemini responds with contextual continuity and the updated thread is persisted to Firestore.

5. **History Vault & Isolation**:
   - Verify the entry appears in the **Reflection Vault** sidebar.
   - Test the search filter and category filtering.
   - Verify that other user accounts cannot access or view your entries.

6. **Semantic Recall & Grounded Citations**:
   - In either the composer or multi-turn chat, toggle **"Recall from past entries"** ON.
   - Ask or write about a recurrent personal challenge or past reflection topic.
   - Verify that Gemini performs semantic ranking across your private vault and presents structured citations referencing past dates, categories, and key excerpts.

7. **Location-Aware Journaling (Google Maps Places Autocomplete)**:
   - In the composer, click **"Add location"** to reveal the Places Autocomplete input.
   - Search for a venue, park, or city, and select a prediction.
   - Verify that the location chip populates with place name, address, and coordinates.
   - Save the reflection and confirm the location chip renders on the entry card in the **Reflection Vault** sidebar and detail header.
   - Test graceful degradation: if `MAPS_API_KEY` is not provided or fails auth, the toggle gracefully hides while journaling continues uninterrupted.

8. **Entry Deletion & Instant Vault Synchronization**:
   - Locate any entry card in the **Reflection Vault** sidebar and click its small trash icon, or open the entry detail and click the **"Delete Entry"** button in the header.
   - Verify the in-app confirmation dialog appears with the entry title and a warning about permanent Firestore deletion.
   - Click **"Delete Permanently"** and confirm that:
     - The document is deleted from Firestore under `/users/{userId}/interactions/{id}`.
     - The entry is immediately removed from the Vault History list.
     - The total entry counter decrements immediately.
     - If viewing that entry, the view cleanly returns to the reflection composer.

9. **Voice Input Dictation (Web Speech API)**:
   - In the composer, check for the **"Voice Input"** microphone button in the toolbar and inside the textarea corner.
   - Tap the microphone button. Observe the recording indicator appear: a pulsing red beacon, "Listening... Transcribing speech into text", and real-time interim speech preview.
   - Speak naturally into your microphone and verify that the transcribed text streams and appends seamlessly into the textarea with appropriate spacing.
   - Tap **"Done Speaking"** or the microphone button again to stop listening.
   - Confirm that if the browser does not support SpeechRecognition or permissions are denied, the button hides or alerts gracefully, and the composer functions as normal text-only.
