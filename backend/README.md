# Convective Nowcast Backend — SIH26084

FastAPI backend for a 0–6 hour convective weather intelligence dashboard.

## Features

- FastAPI + automatic Swagger docs
- Open-Meteo location search
- Real current weather
- 0–6 hour hourly nowcast
- Thunderstorm risk
- Hail risk
- Cloudburst risk
- Combined overall risk
- Weather alerts
- Map point risk endpoint
- Data-layer metadata endpoint
- Report generation endpoint
- Settings endpoint
- SQLite search history
- Demo user registration/login/guest authentication
- CORS enabled for local frontend integration

## Run

From this folder:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs

## Important

The risk engine is a rule-based prototype intended for a project/demo. It is NOT an official meteorological warning system.

Radar and satellite layers are exposed as integration placeholders because operational radar/satellite imagery requires a dedicated provider.

## Main endpoints

GET `/`
GET `/health`
GET `/api/status`
GET `/api/search-location?city=Indore`
GET `/api/weather?latitude=22.71792&longitude=75.8333`
GET `/api/nowcast?latitude=22.71792&longitude=75.8333`
POST `/api/risk`
GET `/api/alerts?latitude=22.71792&longitude=75.8333`
GET `/api/map-point?latitude=22.71792&longitude=75.8333`
GET `/api/layers`
GET `/api/report?latitude=22.71792&longitude=75.8333`
GET `/api/settings`
POST `/api/auth/register`
POST `/api/auth/login`
POST `/api/auth/guest`

## Example frontend call

```js
const response = await fetch(
  "http://127.0.0.1:8000/api/nowcast?latitude=22.71792&longitude=75.8333"
);

const data = await response.json();
console.log(data);
```
