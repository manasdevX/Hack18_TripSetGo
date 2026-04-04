# Destination & Context Agent (Agent 2)

**Purpose:** Provides ground-truth destination context (neighborhoods, weather, local tips) immediately after intent validation. Used by Transport, Stay, and Itinerary agents to refine their results.

---

## 📌 API Specification

### Endpoint
```
POST /context
```

### Request Payload
```json
{
  "destination": "Paris",
  "dates": "2024-06-01 to 2024-06-10"
}
```

### Response Payload
```json
{
  "destination": "Paris",
  "areas": ["Le Marais", "Montmartre", "Latin Quarter"],
  "weather_summary": "Sunny and pleasant, highs around 22°C.",
  "best_areas_to_stay": ["Le Marais (Central)", "Saint-Germain-des-Prés (Shopping)"],
  "travel_advisories": ["Standard precautions apply"],
  "local_tips": "Book Museum tickets in advance; use the Metro."
}
```

---

## 🛠️ Technical Stack

- **Framework:** FastAPI (Python 3.10+)
- **Port:** 8011 (Hard-coded)
- **Primary LLM:** Groq (Llama-3-8b-8192)
- **Fallback LLM:** Ollama (Llama-3)

---

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd agents/destination_agent
pip install -r requirements.txt
```

### 2. Configure Environment
Edit `.env` file:
```env
GROQ_API_KEY=your_groq_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
ENABLE_OLLAMA_FALLBACK=true
ENVIRONMENT=development
DEBUG=false
PORT=8011
```

### 3. Run the Agent
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload
```

Or use the Makefile:
```bash
make run-destination-agent
```

---

## 📁 Project Structure

```
destination_agent/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py          [POST /context logic]
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                 [PORT=8011, LLM settings]
│   │   └── llm.py                    [Groq/Ollama Wrapper]
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py                [ContextRequest model]
│   │   └── response.py               [ContextResponse model]
│   ├── services/
│   │   ├── __init__.py
│   │   └── context_service.py        [LLM call & JSON parsing]
│   └── main.py                       [FastAPI entry point]
├── .env                              [Configuration]
├── requirements.txt                  [Dependencies]
└── README.md                         [This file]
```

---

## 🔄 LLM Integration

### System Prompt
The agent uses this system prompt to ensure structured JSON output:

```
You are a World-Class Travel Expert. Your task is to provide detailed context 
for a trip to {destination} during {dates}. You MUST return a valid JSON object 
with the following keys:
  - destination: string
  - areas: list of strings (popular tourist areas)
  - weather_summary: string (likely weather for these dates)
  - best_areas_to_stay: list of strings (neighborhoods with a brief 'why')
  - travel_advisories: list of strings
  - local_tips: string

DO NOT include any conversational text or markdown blocks. 
RETURN ONLY THE JSON.
```

### Fallback Strategy
1. **Primary:** Groq (Llama-3-8b-8192) via `GROQ_API_KEY`
2. **Fallback:** Local Ollama (Llama-3) if Groq fails
3. **Error:** Returns error message if both fail

---

## ✅ Health Check

```bash
curl http://localhost:8011/health
```

Response:
```json
{
  "status": "ok",
  "agent": "destination"
}
```

---

## 🧪 Testing

### Test the endpoint manually:
```bash
curl -X POST http://localhost:8011/context \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris",
    "dates": "2024-06-01 to 2024-06-10"
  }'
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8011 | Server port (hard-coded) |
| `GROQ_API_KEY` | (empty) | Groq API key for LLM |
| `GROQ_MODEL` | llama3-8b-8192 | Groq model to use |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama service URL |
| `OLLAMA_MODEL` | llama3 | Ollama model to use |
| `ENABLE_OLLAMA_FALLBACK` | true | Enable fallback to Ollama |
| `DEBUG` | false | Enable debug mode |
| `ENVIRONMENT` | development | Environment name |

---

## 📝 Notes

- The agent **always returns valid JSON** or raises an HTTP 400 error.
- The LLM response is cleaned to remove markdown code blocks before parsing.
- All timestamps and date formats are flexible (LLM-native parsing).
- CORS is enabled for all origins (adjust in production).

---

## 🤝 Integration with Orchestrator

The Orchestrator calls this agent with:
```python
POST http://destination-agent:8011/context
{
  "destination": "...",
  "dates": "..."
}
```

The response is used directly by:
- **Transport Agent** (for route planning)
- **Stay Agent** (for accommodation recommendations)
- **Itinerary Agent** (for activity planning)

---

## 📞 Troubleshooting

### LLM not responding
- Check `GROQ_API_KEY` is set and valid
- Verify Ollama is running on `OLLAMA_BASE_URL` if fallback is enabled
- Check logs for detailed error messages

### JSON parsing errors
- Ensure LLM output is valid JSON
- Check the system prompt is correctly formatted
- Review logs for LLM response content

### Port conflicts
- Port 8011 is hard-coded. Stop any process using this port.
- Or modify `config.py` if needed (not recommended for orchestrator compatibility).
