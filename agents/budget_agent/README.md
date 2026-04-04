# 🧩 Agent 6: Budget Optimization Agent

**Role:** Financial Optimizer  
**Port:** 8015  
**Primary Task:** Calculate total trip cost and suggest optimizations if budget is exceeded.

---

## 📌 Overview

The Budget Optimization Agent acts as the financial "Brain" of TripSetGo. It receives the outputs from the Transport and Stay agents, calculates the total trip cost, and uses an LLM to suggest specific cost-saving measures if the total exceeds the user's budget limit.

**Key Principle:** Minimal LLM usage. If the trip is already under budget, we skip the LLM call to save tokens and reduce latency.

---

## 🛠️ Technical Stack

- **Framework:** FastAPI (Python 3.10+)
- **Port:** 8015 (Hard-coded)
- **Primary LLM:** Groq (Llama-3-8b-8192)
- **Fallback LLM:** Ollama (Llama-3)
- **Validation:** Pydantic v2

---

## 🔄 Budget Check Loop

```
Input (Transport + Stay from agents)
    ↓
Calculate Total Cost
    ↓
Is Total ≤ Budget?
    ├─ YES → Return "within_budget" status (no LLM call) ✅
    └─ NO → Call LLM for optimization suggestions ⚠️
    ↓
Return adjustments and optimization strategy
```

---

## 📦 Request Schema

```json
{
  "total_user_budget": 5000.0,
  "selected_transport": {
    "mode": "flight",
    "price": 800.0,
    "duration_hours": 10,
    "description": "Economy class"
  },
  "selected_stay": {
    "name": "Hilton Paris",
    "price_per_night": 200.0,
    "total_nights": 7,
    "category": "5-star",
    "location": "Paris"
  },
  "estimated_other_costs": 500.0,
  "preferences": "Comfort is important but want to save where possible"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total_user_budget` | float | ✅ | User's total trip budget in currency |
| `selected_transport` | TransportOption | ✅ | Transport choice from Transport Agent |
| `selected_stay` | StayOption | ✅ | Accommodation choice from Stay Agent |
| `estimated_other_costs` | float | ❌ | Food, activities, etc. (default: 0.0) |
| `preferences` | string | ❌ | User priorities or constraints |

---

## 📤 Response Schema

### Within Budget
```json
{
  "status": "within_budget",
  "total_cost": 2300.0,
  "budget_delta": 2700.0,
  "adjustments": [],
  "optimization_summary": "Great news! Your trip is within budget. You have $2700.00 remaining."
}
```

### Over Budget
```json
{
  "status": "exceeded",
  "total_cost": 6200.0,
  "budget_delta": -1200.0,
  "adjustments": [
    "Switch to a 4-star hotel instead of 5-star in Paris",
    "Consider a coach option instead of a direct flight",
    "Plan more free activities to reduce daily spending"
  ],
  "optimization_summary": "Your trip exceeds budget by $1200.00. We suggest the following cost-saving measures..."
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"within_budget"`, `"exceeded"`, or `"optimized"` |
| `total_cost` | float | Total calculated cost (transport + stay + other) |
| `budget_delta` | float | Budget difference (budget - total). Positive = under budget |
| `adjustments` | array | Cost-saving suggestions (empty if within budget) |
| `optimization_summary` | string | Brief explanation and recommendations |

---

## 🚀 Installation & Setup

### 1. Install Dependencies
```bash
cd agents/budget_agent
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
PORT=8015
```

### 3. Run the Agent
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8015 --reload
```

Or via Makefile:
```bash
make run-budget-agent
```

---

## 📁 Project Structure

```
agents/budget_agent/
├── app/
│   ├── __init__.py
│   ├── main.py                     [FastAPI entry point]
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints.py        [POST /optimize endpoint]
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py               [Port 8015, LLM settings]
│   │   └── llm.py                  [Groq/Ollama wrapper]
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request.py              [Request models]
│   │   └── response.py             [Response model]
│   └── services/
│       ├── __init__.py
│       └── optimization_service.py [Core budget logic]
├── .env                            [Configuration]
├── requirements.txt                [Dependencies]
└── README.md                       [This file]
```

---

## 💡 Core Algorithm

### 1. Calculate Total Cost
```
total_cost = transport.price + (stay.price_per_night × stay.total_nights) + other_costs
```

### 2. Compare with Budget
```
if total_cost ≤ user_budget:
    return status="within_budget" (with budget_delta)
else:
    excess = total_cost - user_budget
    call LLM with excess amount
    return status="exceeded" (with adjustment suggestions)
```

### 3. LLM System Prompt
```
You are a Travel Budget Expert. Your task is to suggest specific, actionable ways 
to reduce trip costs. Return ONLY a JSON array of strings, where each string is 
a concrete suggestion. Do NOT include markdown, explanations, or anything other 
than the JSON array.
```

---

## 🔍 LLM Integration

### When LLM is Called
- **Only when `total_cost > budget`**
- Receives: current plan costs, excess amount, user preferences
- Returns: JSON array of 3-5 specific cost-saving suggestions

### When LLM is Skipped
- When `total_cost ≤ budget` → Immediate response (saves tokens + latency)
- When LLM fails → Fallback suggestions are generated automatically

### Fallback Suggestions
If LLM fails, the agent generates contextual suggestions based on:
- Accommodation cost percentage (suggests cheaper hotel category)
- Transport cost vs. budget ratio (suggests alternative transport)
- Other costs (suggests free/low-cost activities)

---

## ✅ Health Check

```bash
curl http://localhost:8015/health
```

Response:
```json
{
  "status": "ok",
  "agent": "budget"
}
```

---

## 🧪 Testing

### Test with in-budget trip:
```bash
curl -X POST http://localhost:8015/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "total_user_budget": 5000.0,
    "selected_transport": {
      "mode": "flight",
      "price": 600.0
    },
    "selected_stay": {
      "name": "Hotel XYZ",
      "price_per_night": 100.0,
      "total_nights": 5,
      "category": "3-star",
      "location": "Paris"
    },
    "estimated_other_costs": 300.0
  }'
```

Expected Response (Within Budget):
```json
{
  "status": "within_budget",
  "total_cost": 1400.0,
  "budget_delta": 3600.0,
  "adjustments": [],
  "optimization_summary": "Great news! Your trip is within budget. You have $3600.00 remaining."
}
```

### Test with over-budget trip:
```bash
curl -X POST http://localhost:8015/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "total_user_budget": 2000.0,
    "selected_transport": {
      "mode": "flight",
      "price": 1200.0
    },
    "selected_stay": {
      "name": "Luxury Hotel",
      "price_per_night": 400.0,
      "total_nights": 5,
      "category": "5-star",
      "location": "Paris"
    },
    "estimated_other_costs": 500.0
  }'
```

Expected Response (Over Budget):
```json
{
  "status": "exceeded",
  "total_cost": 3700.0,
  "budget_delta": -1700.0,
  "adjustments": [
    "Switch to a 4-star hotel instead of 5-star in Paris",
    "Consider a more economical flight option or alternative transport method",
    "Plan more free or low-cost activities to reduce daily spending"
  ],
  "optimization_summary": "Your trip exceeds budget by $1700.00. We suggest..."
}
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8015 | Server port (hard-coded) |
| `GROQ_API_KEY` | (empty) | Groq API key for LLM |
| `GROQ_MODEL` | llama3-8b-8192 | Groq model to use |
| `OLLAMA_BASE_URL` | http://localhost:11434 | Ollama service URL |
| `OLLAMA_MODEL` | llama3 | Ollama model to use |
| `ENABLE_OLLAMA_FALLBACK` | true | Enable fallback to Ollama |
| `DEBUG` | false | Enable debug mode |
| `ENVIRONMENT` | development | Environment name |

---

## 🤝 Integration with Orchestrator

The Orchestrator calls this agent with:
```python
POST http://budget-agent:8015/optimize
{
  "total_user_budget": <from user>,
  "selected_transport": <from transport_agent>,
  "selected_stay": <from stay_agent>,
  "estimated_other_costs": <estimated>,
  "preferences": <from user>
}
```

The response is used to:
- Determine if trip is financially viable
- Display cost-saving options to user
- Re-plan if budget adjustments are needed

---

## 📞 Troubleshooting

### Port already in use
```bash
lsof -i :8015
kill -9 <PID>
```

### LLM not responding
- Verify `GROQ_API_KEY` is set and valid
- Confirm Ollama is running on `OLLAMA_BASE_URL` if fallback enabled
- Check logs for detailed error messages

### JSON parsing errors
- Ensure LLM returns valid JSON array format
- Check system prompt in `optimization_service.py`
- Review logs for LLM response content

### Module import errors
- Verify all `__init__.py` files exist in package directories
- Run from `/agents/budget_agent` directory
- Ensure `PYTHONPATH` includes project root

---

## 🎯 Performance Notes

- **Token Savings:** Skipping LLM calls for in-budget trips saves ~50-70 tokens per request
- **Response Time:** <200ms for in-budget trips (no LLM), ~1-2s for optimization
- **Fallback Strategy:** Automatic suggestions ensure no timeout even if LLM fails
- **Error Handling:** Graceful degradation - Always returns valid response

---

## 📝 Notes

- All costs use consistent currency (user responsibility)
- Budget delta can be negative (exceeded) or positive (under budget)
- Adjustments list is empty if within budget
- LLM calls include user preferences for personalized suggestions
- Fallback suggestions are generated dynamically based on cost breakdown
