# Autonomous Web Research & Action System

An enterprise-grade, multi-agent AI system that performs autonomous web research, fact verification, criteria-based comparison, and safe human-approved action planning.

Powered by **Mistral AI**, **Tavily Web Search**, **Playwright Browser Automation**, **FastAPI**, and **React + Vite + Tailwind CSS**.

---

## 🌟 Architecture & 5-Agent Pipeline

The system coordinates 5 specialized AI agents sequentially through a live streaming pipeline:

```
[ User Research Query ]
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ 1. Browser Agent                                       │
│    • Live web search via Tavily Search API             │
│    • Deep headless page content scraping via Playwright│
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 2. Research Agent (Mistral AI)                         │
│    • Extracts structured facts with exact source URLs  │
│    • Synthesizes executive summary & key discoveries   │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 3. Comparison Agent (Mistral AI)                       │
│    • Evaluates options across user/domain criteria     │
│    • Produces side-by-side scorecard matrix & rankings │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 4. Verification Agent (Mistral AI)                     │
│    • Cross-checks claims across multiple sources       │
│    • Detects conflicting facts, flags unsupported data │
│    • Computes confidence score (0-100%) & risk alerts  │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│ 5. Action Planner Agent (Mistral AI)                   │
│    • Prepares implementation next steps                │
│    • Prepares safe draft actions (links, memos, md)    │
│    • ENFORCES HUMAN APPROVAL before execution          │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
[ Modern Reactive Dashboard (Approve / Reject / Execute) ]
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v3, Lucide Icons
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Server-Sent Events (SSE)
- **AI Reasoning**: Mistral AI API (`mistral-small-latest` / `mistral-large-latest`)
- **Web Search**: Tavily Search API
- **Browser Automation**: Playwright (Headless Chromium)
- **Validation**: Pydantic v2
- **Storage**: Python in-memory dictionaries & lists (No database required)

---

## 🛡️ Human-in-the-Loop Safety Constraints

1. **Zero Autonomous Real-World Mutations**: The system never submits web forms, creates external accounts, sends live emails, or makes purchases autonomously.
2. **Drafting & Staging Only**: The Action Planner stages reviewable drafts (e.g., stakeholder migration memos, executive briefs) and verified navigation targets.
3. **Explicit User Approval**: Actions remain in `pending` status until the user explicitly clicks **"Approve"**. Only approved actions can be executed.
4. **No Fabricated Sources**: The Browser Agent only collects genuine search results from Tavily, and the Research Agent strictly attributes facts to the provided source URLs.

---

## 🚀 Windows Setup & Running Instructions

### Prerequisites

Ensure you have the following installed on your Windows machine:
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm**

---

### Step 1: Configure API Keys

1. Create a `.env` file in either the project root or the `backend/` directory:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` and fill in your API keys:
   ```env
   # Mistral AI API Key (Free tier available at: https://console.mistral.ai/)
   MISTRAL_API_KEY=your_mistral_api_key_here

   # Tavily Web Search API Key (Free tier available at: https://app.tavily.com/)
   TAVILY_API_KEY=your_tavily_api_key_here

   # Optional Configuration
   MISTRAL_MODEL=mistral-small-latest
   PLAYWRIGHT_HEADLESS=true
   MAX_SEARCH_RESULTS=5
   PORT=8000
   ```

> **Note**: If API keys are missing, the application will still launch cleanly and display a setup checklist guiding you on where to get keys.

---

### Step 2: Install Dependencies

#### Backend:
Open PowerShell in the project directory:
```powershell
python -m pip install -r requirements.txt
python -m playwright install chromium
```

#### Frontend:
```powershell
cd frontend
npm install
cd ..
```

---

### Step 3: Launch the Application

Run the backend and frontend in separate PowerShell terminals:

#### Terminal 1 — Backend (FastAPI):
```powershell
python -m uvicorn backend.main:app --reload --port 8000
```
- API Health: `http://127.0.0.1:8000/api/health`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

#### Terminal 2 — Frontend (React + Vite):
```powershell
cd frontend
npm run dev
```
- Dashboard UI: `http://localhost:5173`

---

## 🧪 Running Backend Tests

The project includes an automated test suite verifying endpoints, Pydantic validation, in-memory session management, action approval lifecycles, and the complete 5-agent pipeline:

```powershell
python -m pytest backend/tests/test_backend.py -v
```

All 8 tests should pass:
```
backend/tests/test_backend.py::test_health_endpoint PASSED
backend/tests/test_backend.py::test_status_endpoint_no_secrets_exposed PASSED
backend/tests/test_backend.py::test_in_memory_storage_lifecycle PASSED
backend/tests/test_backend.py::test_action_approval_workflow PASSED
backend/tests/test_backend.py::test_pydantic_models_validation PASSED
backend/tests/test_backend.py::test_markdown_export PASSED
backend/tests/test_backend.py::test_orchestrator_unconfigured_keys_safely_halt PASSED
backend/tests/test_backend.py::test_orchestrator_complete_five_agents_workflow PASSED
```

---

## 📂 Project Structure

```
Autonomous Web Research & Action System/
├── backend/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── browser_agent.py          # Agent 1: Tavily Search + Playwright Scraper
│   │   ├── research_agent.py         # Agent 2: Mistral fact extraction & source linking
│   │   ├── comparison_agent.py       # Agent 3: Multi-criteria matrix & rankings
│   │   ├── verification_agent.py     # Agent 4: Claim cross-checking & confidence score
│   │   └── action_planner_agent.py   # Agent 5: Safe action drafts & recommendations
│   ├── tests/
│   │   └── test_backend.py           # Comprehensive pytest suite
│   ├── config.py                     # Environment loading & setup status validation
│   ├── mistral_client.py             # Mistral API caller with JSON schema parsing
│   ├── models.py                     # Pydantic models for artifacts & events
│   ├── orchestrator.py               # 5-Agent pipeline controller & SSE streaming
│   ├── storage.py                    # Thread-safe in-memory session & action store
│   ├── main.py                       # FastAPI application & REST endpoints
│   ├── requirements.txt              # Backend dependencies
│   └── .env                          # Local credentials file (ignored by git)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx            # Top navbar with API status indicator
│   │   │   ├── SetupModal.jsx        # API key setup modal with checklist & links
│   │   │   ├── ResearchForm.jsx      # Query input, criteria tags & presets
│   │   │   ├── AgentProgressStepper.jsx # 5-agent visual stepper & live SSE logs
│   │   │   ├── ResultsDashboard.jsx  # Overview, sources, comparison, audit, actions
│   │   │   └── HistorySidebar.jsx    # Session history drawer
│   │   ├── services/
│   │   │   └── api.js                # REST and SSE client service
│   │   ├── App.jsx                   # Main application controller
│   │   ├── index.css                 # Tailwind directives & glassmorphic styling
│   │   └── main.jsx                  # React DOM mount point
│   ├── index.html                    # Root HTML with Google Fonts & metadata
│   ├── package.json                  # Frontend scripts & dependencies
│   ├── tailwind.config.js            # Tailwind v3 custom palette & configuration
│   └── vite.config.js                # Vite config with backend proxy on :8000
├── package.json                      # Root convenience scripts
├── requirements.txt                  # Root dependencies copy
├── .env.example                      # Root environment template
└── README.md                         # Documentation & Windows setup guide
```

---

## 📄 Exporting Reports

From the dashboard or via direct endpoint, you can download the entire verified multi-agent research report in clean Markdown format:
```
GET /api/sessions/{session_id}/export/markdown
```
Or click the **"Download Report (.md)"** button directly in the UI.
