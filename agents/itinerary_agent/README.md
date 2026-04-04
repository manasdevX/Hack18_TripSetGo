# 🧩 Agent 7: Itinerary Planning Agent

**Role:** Trip Planner & Experience Designer  
**Port:** 8014  
**Primary Task:** Convert destination context + transport + stay into a detailed day-by-day itinerary with Morning/Afternoon/Evening activities.

---

## 📌 Overview

The Itinerary Agent transforms structured trip data (from Destination, Transport, and Stay agents) into a human-readable, experiences-focused daily schedule. It synthesizes destination context (areas, weather, tips) with user constraints (accommodation location, transport timing) to create coherent, realistic Activity sequences.

---

## 🛠️ Technical Stack

- **Framework:** FastAPI (Python 3.10+)
- **Port:** 8014 (Hard-coded)
- **Primary LLM:** Groq (Llama-3-8b-8192)
- **Fallback LLM:** Ollama (Llama-3)
- **Validation:** Pydantic v2

---

## 📦 Request Schema

```json
{
  "destination": "Paris",
  "num_days": 5,
  "transport_details": {
    "mode": "flight",
    "price": 600.0,
    "duration_hours": 10,
    "description": "Economy class"
  },
  "stay_details": {
    "name": "Hotel XYZ",
    "price_per_night": 150.0,
    "total_nights": 5,
    "category": "4-star",
    "location": "Central Paris"
  },
  "destination_context": {
    "destination": "Paris",
    "areas": ["Le Marais", "Montmartre", "Latin Quarter"],
    "weather_summary": "Sunny and pleasant, highs around 22°C",
    "best_areas_to_stay": ["Le Marais (Central)", "Saint-Germain-des-Prés"],
    "travel_advisories": ["Standard precautions apply"],
    "local_tips": "Use the Metro; book museum tickets in advance"
  },
  "preferences": "Mix of art museums and local cuisine"
}
```

---

## 📤 Response Schema

```json
{
  "days": [
    {
      "day_number": 1,
      "activities": [
        {"time": "Morning", "task": "Check into Hotel XYZ in Central Paris"},
        {"time": "Afternoon", "task": "Explore Le Marais neighborhood, visit local cafes"},
        {"time": "Evening", "task": "Dinner at a traditional brasserie"}
      ],
      "notes": "Arrival day - settle in and get oriented to the city"
    },
    {
      "day_number": 2,
      "activities": [
        {"time": "Morning", "task": "Visit Louvre Museum (pre-booked tickets)"},
        {"time": "Afternoon", "task": "Lunch near the museum, explore Tuileries Garden"},
        {"time": "Evening", "task": "Sunset at Montmartre, dinner in local restaurant"}
      ],
      "notes": null
    }
  ],
  "travel_tips": "Use the Metro pass for efficient travel; avoid rush hours (7-9am, 5-7pm); many museums have free entry on first Sunday of month"
}
```

---

## 🌐 API Specification

### Endpoint
```
POST /plan
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `destination` | string | ✅ | Destination name |
| `num_days` | int | ✅ | Number of days in trip |
| `transport_details` | TransportOption | ✅ | Transport from Agent 4 |
| `stay_details` | StayOption | ✅ | Accommodation from Agent 5 |
| `destination_context` | ContextResponse | ✅ | Context from Agent 3 |
| `preferences` | string | ❌ | User preferences |

---

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd agents/itinerary_agent
pip install -r requirements.txt
```

### 2. Configure Environment
Edit `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
ENABLE_OLLAMA_FALLBACK=true
ENVIRONMENT=development
DEBUG=false
PORT=8014
```

### 3. Run the Agent
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8014 --reload
```

Or via Makefile:
```bash
make run-itinerary-agent
```

---

## 📁 Project Structure

```
agents/itinerary_agent/
├── app/
│   ├── __init__.py
│   ├── main.py                     [FastAPI entry point]
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py        [POST /plan endpoint]
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               [Port 8014, LLM settings]
│   │   └── llm.py                  [Groq/Ollama wrapper]
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py              [ItineraryRequest model]
│   │   └── response.py             [ItineraryResponse & DayPlan models]
│   └── services/
│       ├── __init__.py
│       └── itinerary_service.py    [LLM logic & activity generation]
├── .env                            [Configuration]
├── requirements.txt                [Dependencies]
└── README.md                       [This file]
```

---

## 🧠 Core Algorithm

### 1. Accept Multi-Source Input
```
destination_context (areas, weather) 
+ transport (arrival time, price)
+ stay (location, duration)
+ preferences (user interests)
```

### 2. Synthesize via LLM
The LLM receives:
- All destination areas and tips
- Hotel location and number of nights
- Transport mode and timing
- User preferences

Generates:
- Morning/Afternoon/Evening activities for each day
- Realistic, coherent sequences
- Distance and timing awareness

### 3. Structure Output
- DayPlan objects with day_number, activities[], notes
- Travel tips for the entire trip
- Account for Day 1 (check-in), Last day (checkout)

---

## 💡 Key Design Patterns

### Activity Structuring
Each day has 3 time slots:
- **Morning:** Often used for museum/major attraction (arrival, longer activities)
- **Afternoon:** Lunch + exploration in different area
- **Evening:** Dinner, relaxation, shorter walking activities

### Area Utilization
- Agent uses `best_areas_to_stay` from destination context
- Suggests realistic walking distances and transport usage
- Avoids suggesting activities outside destination's provided areas

### Data Integration
```
Day 1:
  - Check-in: Hotel location (from stay_details.location)
  - Activities: Nearby areas from best_areas_to_stay
  
Day 2-N:
  - Mix activities across destination_context.areas
  - Leverage destination_context.local_tips for authenticity
  
Day N (Checkout day):
  - Morning activity only
  - Afternoon: checkout, travel to transport
```

---

## ✅ Health Check

```bash
curl http://localhost:8014/health
```

Response:
```json
{
  "status": "ok",
  "agent": "itinerary"
}
```

---

## 🧪 Testing

### Sample Request:
```bash
curl -X POST http://localhost:8014/plan \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris",
    "num_days": 3,
    "transport_details": {
      "mode": "flight",
      "price": 600.0,
      "duration_hours": 10
    },
    "stay_details": {
      "name": "Hotel Central",
      "price_per_night": 150.0,
      "total_nights": 3,
      "category": "4-star",
      "location": "Le Marais"
    },
    "destination_context": {
      "destination": "Paris",
      "areas": ["Le Marais", "Montmartre", "Latin Quarter"],
      "weather_summary": "Sunny, 22°C",
      "best_areas_to_stay": ["Le Marais"],
      "travel_advisories": [],
      "local_tips": "Use Metro"
    },
    "preferences": "Art and food"
  }'
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8014 | Server port (hard-coded) |
| `GROQ_API_KEY` | (empty) | Groq API key |
| `GROQ_MODEL` | llama3-8b-8192 | Groq model |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama service URL |
| `OLLAMA_MODEL` | llama3 | Ollama model |
| `ENABLE_OLLAMA_FALLBACK` | true | Enable fallback |
| `DEBUG` | false | Debug mode |
| `ENVIRONMENT` | development | Environment name |

---

## 🤝 Integration with Orchestrator

The Orchestrator calls:
```python
POST http://itinerary-agent:8014/plan
{
  "destination": <from user>,
  "num_days": <calculated>,
  "transport_details": <from transport_agent>,
  "stay_details": <from stay_agent>,
  "destination_context": <from destination_agent>,
  "preferences": <from user>
}
```

Returns:
```python
{
  "days": [DayPlan, ...],
  "travel_tips": str
}
```

Used by:
- **Frontend:** Display day-by-day itinerary to user
- **Navigation Agent:** Reference for tracking current progress
- **Re-planning:** Update when trip deviates

---

## 📞 Troubleshooting

### Port conflict
```bash
lsof -i :8014
kill -9 <PID>
```

### LLM not responding
- Verify `GROQ_API_KEY` is valid
- Ensure Ollama running on `OLLAMA_BASE_URL` if fallback enabled
- Check logs for detailed errors

### Activities too generic
- LLM may need more specific prompts
- Ensure destination_context.areas are detailed
- Check that user preferences are clear

### Module import errors
- Verify all `__init__.py` files exist
- Run from `/agents/itinerary_agent`
- Ensure `PYTHONPATH` includes project root

---

## 🎯 Performance Notes

- Response time: ~2-4 seconds (LLM generation)
- Token usage: ~800-1200 tokens per request
- Fallback strategy: Auto-generates basic itinerary if LLM fails
- Always returns structured response (never timeout without output)

---

## 📝 Notes

- Activities are realistic and account for travel time between areas
- Weather and seasonal considerations included in suggestions
- Day 1 accounts for arrival/check-in delays
- Final day includes checkout and departure considerations
- Each activity includes realistic time estimates (implicit in structuring)
