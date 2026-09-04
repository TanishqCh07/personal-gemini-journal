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
- **Zero Hardcoding & Secret Manager Ready**: The Gemini API key is managed securely on the server-side via environment variables and Google Cloud Secret Manager.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, React Markdown, Motion
- **Backend**: Express.js with Vite Middleware (Dev & Production bundling with esbuild)
- **AI Engine**: Gemini 3.6 Flash API (`@google/genai`)
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
```

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
