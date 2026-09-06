# 🥗 NutriGuide — AI Nutrition Coach

A full-stack nutrition planning agent powered by **IBM watsonx Granite** (`ibm/granite-4-h-small`).

## Features

- 💬 Conversational AI chat interface
- 🎯 Personalised diet and meal plan generation
- 🥦 Supports all dietary preferences (vegan, vegetarian, gluten-free, diabetic-friendly, etc.)
- 📊 Calorie & macro guidance
- ⚡ Quick-start suggestion cards
- 🔄 Full conversation memory within a session
- 📱 Responsive design — works on mobile and desktop

## Project Structure

```
nutrition-agent/
├── server.js          # Express backend + IBM watsonx integration
├── package.json       # Node.js dependencies
├── .env.example       # Environment variable template
└── public/
    └── index.html     # Frontend chat UI (single-page app)
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
PORT=3000
IBM_API_KEY=your_ibm_api_key
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29
IBM_PROJECT_ID=your_project_id
IBM_MODEL_ID=ibm/granite-4-h-small
```

### 3. Run the server

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

### 4. Open in browser

Navigate to **http://localhost:3000**

## API Endpoints

| Method | Route        | Description                          |
|--------|--------------|--------------------------------------|
| POST   | `/api/chat`  | Send a message, get AI reply         |
| GET    | `/api/health`| Health check + model info            |

### `/api/chat` Request Body

```json
{
  "messages": [
    { "role": "user", "content": "I want to lose 5kg in 2 months" }
  ]
}
```

### `/api/chat` Response

```json
{
  "reply": "Great goal! Let me help you create a personalised plan..."
}
```

## Tech Stack

| Layer     | Technology                     |
|-----------|--------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JS        |
| Backend   | Node.js, Express               |
| AI Model  | IBM Granite 4 (via watsonx)    |
| Auth      | IBM IAM token (auto-refreshed) |
