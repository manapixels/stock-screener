# Signal - Intelligent Stock Monitoring & Alerting Dashboard

This project consists of a frontend (Next.js) and a backend (FastAPI).

## Getting Started

### 1. Backend Setup

Navigate to the `backend` directory and install the dependencies:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

To run the backend server:

```bash
uvicorn main:app --reload
```

The backend will be running at `http://127.0.0.1:8000`.

### 2. Frontend Setup

Navigate to the `frontend` directory and install the dependencies:

```bash
cd frontend
npm install
```

To run the frontend development server:

```bash
npm run dev
```

The frontend will be running at `http://localhost:3000`.
