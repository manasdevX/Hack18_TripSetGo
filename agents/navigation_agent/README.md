# 🧩 Agent 8: Navigation & Continuity Agent

**Role:** Real-Time Trip Tracker & Re-Plan Engine  
**Port:** 8016  
**Primary Task:** Track live trip events and detect when user deviations require a full Orchestrator re-plan.

---

## 📌 Overview

The Navigation Agent is the real-time continuity engine. It maintains the "current state" of an active trip and analyzes user-reported updates (flight delays, missed activities, etc.) to detect significant deviations that require re-planning. If a deviation is critical, it signals the Orchestrator to trigger a full re-plan.

**Key Responsibility:** Be the "Continuity Brain" that decides: "Should the Orchestrator re-calculate the rest of this trip?"

---

## 🛠️ Technical Stack

- **Framework:** FastAPI (Python 3.10+)
- **Port:** 8016 (Hard-coded)
- **Primary LLM:** Groq (Llama-3-8b-8192)
- **Fallback LLM:** Ollama (Llama-3)
- **State Management:** NavigationState model

---

## 📦 Request Schema

```json
{
  "destination": "Paris",
  "full_itinerary": {
    "days": [
      {
        "day_number": 1,
        "activities": [...],
        "notes": "..."
      }
    ],
    "travel_tips": "..."
  },
  "current_state": {
    "current_day": 2,
    "current_location": "Le Marais",
    "activities_completed": 2,
    "estimated_next_checkpoint": "Train at 14:00",
    "delays_encountered": 1,
    "reason": null
  },
  "user_update": "Flight delayed by 3 hours. Will arrive at 21:00 instead of 18:00."
}
```

---

## 📤 Response Schema

### Re-Plan Required
```json
{
  "updated_state": {
    "current_day": 2,
    "current_location": "Le Marais",
    "activities_completed": 2,
    "estimated_next_checkpoint": null,
    "delays_encountered": 2,
    "reason": "Flight delayed by 3 hours..."
  },
  "trigger_replan": true,
  "immediate_instruction": "Your trip plan needs adjustment due to: Flight delayed by 3 hours... Please wait while we recalculate your itinerary for the remaining days.",
  "replan_reason": "Flight delay >2 hours"
}
```

### No Re-Plan Needed
```json
{
  "updated_state": {
    "current_day": 2,
    "current_location": "Le Marais",
    "activities_completed": 2,
    "estimated_next_checkpoint": "Train at 14:00",
    "delays_encountered": 1,
    "reason": "Museum visit took 15 minutes longer."
  },
  "trigger_replan": false,
  "immediate_instruction": "Noted: Museum took 15 minutes longer. Continue with your planned activities.",
  "replan_reason": null
}
```

---

## 🌐 API Specification

### Endpoint
```
POST /track
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `destination` | string | ✅ | Destination name |
| `full_itinerary` | dict | ✅ | Complete ItineraryResponse as dict |
| `current_state` | NavigationState | ✅ | Current trip state |
| `user_update` | string | ✅ | User-reported update |

### NavigationState

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `current_day` | int | 1 | Current day in trip (1-indexed) |
| `current_location` | string | "unknown" | Where user is now |
| `activities_completed` | int | 0 | # of activities done today |
| `estimated_next_checkpoint` | string | null | Next scheduled event (e.g., train time) |
| `delays_encountered` | int | 0 | Total # of delays so far |
| `reason` | string | null | Reason for last state change |

---

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd agents/navigation_agent
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
PORT=8016
```

### 3. Run the Agent
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8016 --reload
```

Or via Makefile:
```bash
make run-navigation-agent
```

---

## 📁 Project Structure

```
agents/navigation_agent/
├── app/
│   ├── __init__.py
│   ├── main.py                     [FastAPI entry point]
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py        [POST /track endpoint]
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               [Port 8016, LLM settings]
│   │   └── llm.py                  [Groq/Ollama wrapper]
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py              [NavigationRequest, NavigationState models]
│   │   └── response.py             [NavigationResponse model]
│   └── services/
│       ├── __init__.py
│       └── navigation_service.py   [Re-plan detection logic]
├── .env                            [Configuration]
├── requirements.txt                [Dependencies]
└── README.md                       [This file]
```

---

## 🧠 Re-Plan Trigger Logic

### What Triggers Re-Plan?

✅ **ALWAYS trigger re-plan:**
- Flight/Train/Bus **cancelled**
- **Missed** transport or major activity
- Delay **> 2 hours** (adjusts rest of day significantly)
- **Accident** or emergency situation
- Major schedule conflict preventing rest of day's activities

❌ **NO re-plan triggered:**
- Minor delays < 30 minutes
- Activity took slightly longer (< 1 hour variance)
- Weather change (unless catastrophic)
- Small preference changes

### Analysis Process

```
User Update
    ↓
Extract Keywords (delay, cancelled, missed, duration)
    ↓
LLM Analysis (context-aware decision)
    OR
Fallback Heuristics (if LLM unavailable)
    ↓
Set trigger_replan = true/false
    ↓
Update NavigationState
    ↓
Generate immediate_instruction
```

---

## 💡 Key Concepts

### NavigationState
A "pointer" into the active trip that tracks:
- Current day (1-indexed)
- Physical location
- Activities completed
- Next checkpoint
- Cumulative delays

### Trigger Decision
Not all user updates require re-planning. The agent uses context:
- How significant is the delay?
- Can the user "catch up" by skipping a non-critical activity?
- Is the rest of the trip structurally viable?

### Immediate Instruction
Guides the user while Orchestrator recalculates:
- "Stay at the station, re-calculating..."
- "Continue with your planned activities"
- "Wait for updated itinerary..."

---

## ✅ Health Check

```bash
curl http://localhost:8016/health
```

Response:
```json
{
  "status": "ok",
  "agent": "navigation"
}
```

---

## 🧪 Testing

### Test Case 1: Major Delay (Should Trigger Re-Plan)
```bash
curl -X POST http://localhost:8016/track \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris",
    "full_itinerary": {
      "days": [
        {"day_number": 1, "activities": [...], "notes": null},
        {"day_number": 2, "activities": [...], "notes": null}
      ],
      "travel_tips": "..."
    },
    "current_state": {
      "current_day": 1,
      "current_location": "Airport",
      "activities_completed": 0,
      "estimated_next_checkpoint": "Flight at 18:00",
      "delays_encountered": 0
    },
    "user_update": "Flight delayed by 3 hours. New departure: 21:00"
  }'
```

Expected: `"trigger_replan": true`

### Test Case 2: Minor Delay (No Re-Plan)
```bash
curl -X POST http://localhost:8016/track \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris",
    "full_itinerary": {...},
    "current_state": {
      "current_day": 2,
      "current_location": "Le Marais",
      "activities_completed": 1,
      "estimated_next_checkpoint": "Train at 14:00",
      "delays_encountered": 0
    },
    "user_update": "Museum visit took 20 minutes longer."
  }'
```

Expected: `"trigger_replan": false`

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8016 | Server port (hard-coded) |
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
POST http://navigation-agent:8016/track
{
  "destination": <current>,
  "full_itinerary": <from itinerary_agent>,
  "current_state": <tracked state>,
  "user_update": <from user/mobile app>
}
```

Receives:
```python
{
  "updated_state": NavigationState,
  "trigger_replan": bool,
  "immediate_instruction": str,
  "replan_reason": str | null
}
```

Logic:
```python
if response.trigger_replan:
    # Call transport_agent, stay_agent, itinerary_agent again
    # for remaining days with updated starting point
else:
    # Update UI with immediate_instruction
    # Continue trip with current itinerary
```

---

## 📞 Troubleshooting

### LLM not evaluating correctly
- Check that GROQ_API_KEY is valid
- Review system prompt in `navigation_service.py`
- Fallback heuristics should still work

### Port conflict
```bash
lsof -i :8016
kill -9 <PID>
```

### Re-plan never triggers even with delays
- Verify LLM is responding (check logs)
- Heuristic should catch "delayed by X hours" keywords
- Ensure user_update format is clear

### State updates are incorrect
- Check NavigationState initialization
- Verify reason extraction logic
- Review state mutation in `_update_state()`

---

## 🎯 Performance Notes

- Response time: ~1-2 seconds (LLM analysis)
- Token usage: ~200-300 tokens per request (minimal)
- Always returns decision (never timeout without answer)
- Fallback heuristics ensure no silent failures

---

## 📝 Notes

- NavigationState is immutable in response (always create new)
- Delays are cumulative (state.delays_encountered increments)
- Re-plan trigger is context-aware (not just keyword matching)
- Immediate instruction should be actionable for user
- Full itinerary must be provided for reference (not used in decision but available)

---

## 🔄 Workflow Example

```
User on Trip (Day 2, Le Marais)
    ↓
Reports: "Flight tomorrow cancelled, rebooking for next day"
    ↓
Navigation Agent receives update
    ↓
LLM analyzes: "Cancelled flight = major disruption"
    ↓
trigger_replan = true
    ↓
Orchestrator receives response
    ↓
Calls Transport Agent to find new flight
    ↓
Calls Itinerary Agent to re-plan remaining days (Day 3+)
    ↓
Updated itinerary sent to user
    ↓
trip_state updated with new current_day = 2
```

---

## 🏗️ Architecture Notes

- **Stateless:** Agent doesn't store state between requests
- **Immutable Updates:** Returns new NavigationState, doesn't mutate input
- **Graceful Fallback:** If LLM fails, heuristics still provide decision
- **Minimal Decisions:** Only decides: replan=yes/no. Doesn't modify itinerary itself.
