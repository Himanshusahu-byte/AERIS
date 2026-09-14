
from __future__ import annotations

import hashlib
import math
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field


# ============================================================
# CONVECTIVE NOWCAST API
# SIH26084
# 0–6 Hour Location-Specific Severe Weather Intelligence
# ============================================================

APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "nowcast.db"

OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"


app = FastAPI(
    title="Convective Nowcast API",
    description=(
        "Backend for 0–6 hour convective-scale nowcasting of "
        "thunderstorm, hail and cloudburst risk."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local SIH demo. Restrict in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE / AUTH
# ============================================================

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS searches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT,
                location_name TEXT,
                latitude REAL,
                longitude REAL,
                searched_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


init_db()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split("$", 1)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120_000,
        ).hex()
        return secrets.compare_digest(actual, expected)
    except ValueError:
        return False


# ============================================================
# REQUEST MODELS
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RiskRequest(BaseModel):
    humidity: float = Field(ge=0, le=100)
    precipitation_probability: float = Field(ge=0, le=100)
    precipitation: float = Field(ge=0)
    cloud_cover: float = Field(ge=0, le=100)
    wind_speed: float = Field(ge=0)
    pressure: float = Field(gt=0)


# ============================================================
# GENERAL HELPERS
# ============================================================

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp(value: float, low: float = 0, high: float = 100) -> float:
    return round(max(low, min(high, value)), 2)


def risk_level(score: float) -> str:
    score = float(score)
    if score >= 75:
        return "HIGH"
    if score >= 45:
        return "MODERATE"
    return "LOW"


def risk_color(level: str) -> str:
    return {
        "HIGH": "#ef4444",
        "MODERATE": "#f59e0b",
        "LOW": "#22c55e",
    }.get(level, "#64748b")


def safe_float(value, default=0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


# ============================================================
# RISK ENGINE
# ============================================================

def calculate_thunderstorm_risk(
    humidity: float,
    precipitation_probability: float,
    precipitation: float,
    cloud_cover: float,
    wind_speed: float,
    pressure: float,
) -> float:
    score = 0.0

    score += min(humidity / 100 * 25, 25)
    score += min(precipitation_probability / 100 * 25, 25)
    score += min(cloud_cover / 100 * 20, 20)
    score += min(max(precipitation, 0) * 8, 15)
    score += min(max(wind_speed, 0) / 50 * 10, 10)

    if pressure < 1000:
        score += 5

    return clamp(score)


def calculate_hail_risk(
    temperature: float,
    precipitation_probability: float,
    wind_speed: float,
    cloud_cover: float,
) -> float:
    score = 0.0

    # This is a conservative demo heuristic, not an operational hail model.
    if temperature <= 10:
        score += 30
    elif temperature <= 20:
        score += 20
    elif temperature <= 30:
        score += 10

    score += min(precipitation_probability / 100 * 30, 30)
    score += min(wind_speed / 60 * 25, 25)
    score += min(cloud_cover / 100 * 15, 15)

    return clamp(score)


def calculate_cloudburst_risk(
    humidity: float,
    precipitation_probability: float,
    precipitation: float,
    cloud_cover: float,
    pressure: float,
) -> float:
    score = 0.0

    score += min(humidity / 100 * 25, 25)
    score += min(precipitation_probability / 100 * 20, 20)
    score += min(max(precipitation, 0) * 12, 35)
    score += min(cloud_cover / 100 * 15, 15)

    if pressure < 990:
        score += 5

    return clamp(score)


def combined_risk(thunderstorm: float, hail: float, cloudburst: float) -> float:
    # Thunderstorm is weighted highest because the platform is convective-focused.
    return clamp(
        thunderstorm * 0.50
        + hail * 0.20
        + cloudburst * 0.30
    )


def build_risk_bundle(
    temperature,
    humidity,
    precipitation_probability,
    precipitation,
    cloud_cover,
    pressure,
    wind_speed,
):
    thunderstorm = calculate_thunderstorm_risk(
        humidity,
        precipitation_probability,
        precipitation,
        cloud_cover,
        wind_speed,
        pressure,
    )
    hail = calculate_hail_risk(
        temperature,
        precipitation_probability,
        wind_speed,
        cloud_cover,
    )
    cloudburst = calculate_cloudburst_risk(
        humidity,
        precipitation_probability,
        precipitation,
        cloud_cover,
        pressure,
    )
    overall = combined_risk(thunderstorm, hail, cloudburst)

    return {
        "overall": {
            "score": overall,
            "level": risk_level(overall),
        },
        "thunderstorm": {
            "score": thunderstorm,
            "level": risk_level(thunderstorm),
        },
        "hail": {
            "score": hail,
            "level": risk_level(hail),
        },
        "cloudburst": {
            "score": cloudburst,
            "level": risk_level(cloudburst),
        },
    }


# ============================================================
# WEATHER API
# ============================================================

CURRENT_VARS = [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "cloud_cover",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "weather_code",
]

HOURLY_VARS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
    "rain",
    "cloud_cover",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "weather_code",
]

# ============================================================
# WEATHER CACHE
# ============================================================

WEATHER_CACHE = {}

# Cache weather data for 10 minutes.
# This prevents repeated Open-Meteo requests for the same location.
WEATHER_CACHE_TTL = 600


def weather_cache_key(latitude: float, longitude: float) -> str:
    return f"{round(latitude, 2)}:{round(longitude, 2)}"


def get_cached_weather(latitude: float, longitude: float):
    key = weather_cache_key(latitude, longitude)
    cached = WEATHER_CACHE.get(key)

    if not cached:
        return None

    timestamp, data = cached

    if time.time() - timestamp > WEATHER_CACHE_TTL:
        WEATHER_CACHE.pop(key, None)
        return None

    return data
def fetch_weather(latitude: float, longitude: float) -> dict:
    # --------------------------------------------------------
    # 1. Check cache first
    # --------------------------------------------------------
    cached_data = get_cached_weather(latitude, longitude)

    if cached_data is not None:
        return cached_data

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join(CURRENT_VARS),
        "hourly": ",".join(HOURLY_VARS),
        "forecast_days": 2,
        "timezone": "auto",
    }

    headers = {
        "User-Agent": "Convective-Nowcast-SIH26084/2.0"
    }

    # --------------------------------------------------------
    # 2. Request Open-Meteo
    # --------------------------------------------------------
    try:
        response = requests.get(
            OPEN_METEO_FORECAST,
            params=params,
            headers=headers,
            timeout=15,
        )

        # ----------------------------------------------------
        # 3. Handle rate limiting
        # ----------------------------------------------------
        if response.status_code == 429:

            # If old cached data exists, use it.
            key = weather_cache_key(latitude, longitude)
            old_cached = WEATHER_CACHE.get(key)

            if old_cached:
                return old_cached[1]

            raise HTTPException(
                status_code=503,
                detail=(
                    "Weather provider is temporarily rate-limited. "
                    "Please try again shortly."
                ),
            )

        response.raise_for_status()

        data = response.json()

        # ----------------------------------------------------
        # 4. Save successful response in cache
        # ----------------------------------------------------
        key = weather_cache_key(latitude, longitude)

        WEATHER_CACHE[key] = (
            time.time(),
            data,
        )

        return data

    except HTTPException:
        raise

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Weather service unavailable: {exc}",
        )

def nearest_forecast_index(times: list[str], target: str | None = None) -> int:
    if not times:
        return 0

    # Open-Meteo's first hourly item is normally the current hour.
    # For this demo API we intentionally use index 0 as the current
    # starting point and return the next six hourly periods.
    return 0


def build_nowcast(latitude: float, longitude: float, data: dict) -> dict:
    current = data.get("current", {})
    hourly = data.get("hourly", {})

    times = hourly.get("time", [])
    temperatures = hourly.get("temperature_2m", [])
    humidities = hourly.get("relative_humidity_2m", [])
    precip_probs = hourly.get("precipitation_probability", [])
    precipitations = hourly.get("precipitation", [])
    rains = hourly.get("rain", [])
    clouds = hourly.get("cloud_cover", [])
    pressures = hourly.get("surface_pressure", [])
    winds = hourly.get("wind_speed_10m", [])
    wind_dirs = hourly.get("wind_direction_10m", [])
    weather_codes = hourly.get("weather_code", [])

    forecast = []

    # 0–6 hour window = current hour + next 6 hourly periods.
    for i in range(min(7, len(times))):
        temperature = safe_float(temperatures[i] if i < len(temperatures) else None)
        humidity = safe_float(humidities[i] if i < len(humidities) else None)
        precip_prob = safe_float(
            precip_probs[i] if i < len(precip_probs) else None
        )
        precipitation = safe_float(
            precipitations[i] if i < len(precipitations) else None
        )
        rain = safe_float(rains[i] if i < len(rains) else None)
        cloud = safe_float(clouds[i] if i < len(clouds) else None)
        pressure = safe_float(pressures[i] if i < len(pressures) else None)
        wind = safe_float(winds[i] if i < len(winds) else None)
        wind_dir = safe_float(
            wind_dirs[i] if i < len(wind_dirs) else None
        )
        weather_code = (
            weather_codes[i] if i < len(weather_codes) else None
        )

        risks = build_risk_bundle(
            temperature,
            humidity,
            precip_prob,
            precipitation,
            cloud,
            pressure,
            wind,
        )

        forecast.append(
            {
                "time": times[i],
                "hour": i,
                "weather": {
                    "temperature": temperature,
                    "humidity": humidity,
                    "precipitation_probability": precip_prob,
                    "precipitation": precipitation,
                    "rain": rain,
                    "cloud_cover": cloud,
                    "pressure": pressure,
                    "wind_speed": wind,
                    "wind_direction": wind_dir,
                    "weather_code": weather_code,
                },
                "risks": risks,
            }
        )

    current_weather = {
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "feels_like": current.get("apparent_temperature"),
        "precipitation": current.get("precipitation"),
        "rain": current.get("rain"),
        "cloud_cover": current.get("cloud_cover"),
        "pressure": current.get("surface_pressure"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_direction": current.get("wind_direction_10m"),
        "weather_code": current.get("weather_code"),
    }

    if forecast:
        current_risks = forecast[0]["risks"]
    else:
        current_risks = build_risk_bundle(
            safe_float(current.get("temperature_2m")),
            safe_float(current.get("relative_humidity_2m")),
            0,
            safe_float(current.get("precipitation")),
            safe_float(current.get("cloud_cover")),
            safe_float(current.get("surface_pressure")),
            safe_float(current.get("wind_speed_10m")),
        )

    return {
        "status": "success",
        "generated_at": now_iso(),
        "forecast_window": "0-6 Hours",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": data.get("timezone"),
            "elevation": data.get("elevation"),
        },
        "current_weather": current_weather,
        "current_risk": current_risks,
        "nowcast": forecast,
        "model": {
            "name": "Convective Risk Heuristic v2",
            "type": "rule-based prototype",
            "warning": (
                "Prototype intelligence for demonstration; "
                "not an official meteorological warning system."
            ),
        },
    }


# ============================================================
# LOCATION SEARCH
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Convective Nowcast Backend Running",
        "status": "online",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "Convective Nowcast Backend",
        "timestamp": now_iso(),
    }


@app.get("/api/status")
def api_status():
    return {
        "status": "online",
        "backend": "active",
        "weather_engine": "active",
        "risk_engine": "running",
        "forecast_window": "0-6 Hours",
        "version": "2.0.0",
    }


@app.get("/api/search-location")
def search_location(
    city: str = Query(min_length=1, max_length=100)
):
    params = {
        "name": city.strip(),
        "count": 5,
        "language": "en",
        "format": "json",
    }

    try:
        response = requests.get(
            OPEN_METEO_GEOCODING,
            params=params,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Location service unavailable: {exc}",
        )

    results = data.get("results") or []

    if not results:
        raise HTTPException(
            status_code=404,
            detail="Location not found",
        )

    locations = [
        {
            "name": place.get("name"),
            "latitude": place.get("latitude"),
            "longitude": place.get("longitude"),
            "country": place.get("country"),
            "country_code": place.get("country_code"),
            "admin1": place.get("admin1"),
            "timezone": place.get("timezone"),
            "population": place.get("population"),
        }
        for place in results
    ]

    return {
        "status": "success",
        "query": city,
        "locations": locations,
    }


# ============================================================
# NOWCAST ENDPOINTS
# ============================================================

@app.get("/api/nowcast")
def get_nowcast(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    data = fetch_weather(latitude, longitude)
    return build_nowcast(latitude, longitude, data)


@app.get("/api/weather")
def get_weather(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    data = fetch_weather(latitude, longitude)
    current = data.get("current", {})

    return {
        "status": "success",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": data.get("timezone"),
        },
        "weather": {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "feels_like": current.get("apparent_temperature"),
            "precipitation": current.get("precipitation"),
            "rain": current.get("rain"),
            "cloud_cover": current.get("cloud_cover"),
            "pressure": current.get("surface_pressure"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "weather_code": current.get("weather_code"),
        },
    }


@app.post("/api/risk")
def calculate_risk(payload: RiskRequest):
    risks = build_risk_bundle(
        temperature=20,
        humidity=payload.humidity,
        precipitation_probability=payload.precipitation_probability,
        precipitation=payload.precipitation,
        cloud_cover=payload.cloud_cover,
        pressure=payload.pressure,
        wind_speed=payload.wind_speed,
    )
    return {
        "status": "success",
        "risk": risks,
    }


# ============================================================
# ALERTS
# ============================================================

def alert_message(hazard: str, level: str, score: float) -> str:
    if level == "HIGH":
        return (
            f"High {hazard} risk detected "
            f"(risk score {score:.0f}/100). Monitor conditions closely."
        )
    if level == "MODERATE":
        return (
            f"Moderate {hazard} risk detected "
            f"(risk score {score:.0f}/100)."
        )
    return f"Low {hazard} risk detected."


@app.get("/api/alerts")
def get_alerts(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    nowcast = get_nowcast(latitude, longitude)
    alerts = []

    for item in nowcast["nowcast"]:
        for hazard, details in item["risks"].items():
            if details["level"] in {"HIGH", "MODERATE"}:
                alerts.append(
                    {
                        "time": item["time"],
                        "hour": item["hour"],
                        "hazard": hazard,
                        "level": details["level"],
                        "score": details["score"],
                        "message": alert_message(
                            hazard,
                            details["level"],
                            details["score"],
                        ),
                    }
                )

    alerts.sort(
        key=lambda x: (
            0 if x["level"] == "HIGH" else 1,
            x["hour"],
        )
    )

    return {
        "status": "success",
        "location": nowcast["location"],
        "active_alerts": alerts,
        "count": len(alerts),
        "generated_at": now_iso(),
    }


# ============================================================
# MAP / DATA LAYERS
# ============================================================

@app.get("/api/map-point")
def get_map_point(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    nowcast = get_nowcast(latitude, longitude)
    risk = nowcast["current_risk"]

    return {
        "status": "success",
        "point": {
            "latitude": latitude,
            "longitude": longitude,
            "risk_score": risk["overall"]["score"],
            "risk_level": risk["overall"]["level"],
            "thunderstorm": risk["thunderstorm"],
            "hail": risk["hail"],
            "cloudburst": risk["cloudburst"],
            "marker": {
                "label": risk["overall"]["level"],
                "color": risk_color(risk["overall"]["level"]),
            },
        },
    }


@app.get("/api/layers")
def get_layers():
    return {
        "status": "success",
        "layers": [
            {
                "id": "risk",
                "name": "Weather Risk",
                "type": "computed",
                "available": True,
            },
            {
                "id": "rainfall",
                "name": "Rainfall",
                "type": "weather-api",
                "available": True,
            },
            {
                "id": "wind",
                "name": "Wind",
                "type": "weather-api",
                "available": True,
            },
            {
                "id": "cloud-cover",
                "name": "Cloud Cover",
                "type": "weather-api",
                "available": True,
            },
            {
                "id": "temperature",
                "name": "Temperature",
                "type": "weather-api",
                "available": True,
            },
            {
                "id": "radar",
                "name": "Weather Radar",
                "type": "external-provider",
                "available": False,
                "note": "Connect a radar tile provider for operational radar.",
            },
            {
                "id": "satellite",
                "name": "Satellite",
                "type": "external-provider",
                "available": False,
                "note": "Connect a satellite imagery provider for live imagery.",
            },
        ],
    }


# ============================================================
# REPORTS
# ============================================================

@app.get("/api/report")
def generate_report(
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    nowcast = get_nowcast(latitude, longitude)
    current = nowcast["current_weather"]
    risk = nowcast["current_risk"]

    highest = max(
        [
            ("Thunderstorm", risk["thunderstorm"]["score"]),
            ("Hail", risk["hail"]["score"]),
            ("Cloudburst", risk["cloudburst"]["score"]),
        ],
        key=lambda item: item[1],
    )

    return {
        "status": "success",
        "report": {
            "title": "Convective Weather Intelligence Report",
            "generated_at": now_iso(),
            "forecast_window": "0-6 Hours",
            "location": nowcast["location"],
            "current_weather": current,
            "risk_summary": risk,
            "highest_risk_hazard": {
                "hazard": highest[0],
                "score": highest[1],
                "level": risk_level(highest[1]),
            },
            "summary": (
                f"Current overall convective risk is "
                f"{risk['overall']['level']} "
                f"({risk['overall']['score']}/100). "
                f"The highest individual hazard is {highest[0]}."
            ),
        },
    }


# ============================================================
# SETTINGS
# ============================================================

@app.get("/api/settings")
def get_settings():
    return {
        "status": "success",
        "settings": {
            "forecast_hours": 6,
            "temperature_unit": "Celsius",
            "severe_weather_alerts": True,
            "sound_alerts": False,
            "default_location": {
                "name": "Indore",
                "region": "Madhya Pradesh",
                "country": "India",
            },
        },
    }


# ============================================================
# SEARCH HISTORY
# ============================================================

@app.post("/api/search-history")
def save_search(
    email: Optional[EmailStr] = None,
    location_name: str = Query(min_length=1, max_length=100),
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
):
    with db() as conn:
        conn.execute(
            """
            INSERT INTO searches
            (email, location_name, latitude, longitude, searched_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                str(email) if email else None,
                location_name,
                latitude,
                longitude,
                now_iso(),
            ),
        )
        conn.commit()

    return {"status": "success", "message": "Search saved"}


@app.get("/api/search-history")
def get_search_history(
    email: Optional[EmailStr] = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    query = """
        SELECT location_name, latitude, longitude, searched_at
        FROM searches
    """
    params = []

    if email:
        query += " WHERE email = ?"
        params.append(str(email))

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    with db() as conn:
        rows = conn.execute(query, params).fetchall()

    return {
        "status": "success",
        "history": [dict(row) for row in rows],
    }


# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    with db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            (str(payload.email).lower(),),
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        conn.execute(
            """
            INSERT INTO users
            (name, email, password_hash, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                payload.name.strip(),
                str(payload.email).lower(),
                hash_password(payload.password),
                now_iso(),
            ),
        )
        conn.commit()

    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {
            "name": payload.name.strip(),
            "email": str(payload.email).lower(),
            "type": "User",
        },
    }


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    with db() as conn:
        user = conn.execute(
            """
            SELECT id, name, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (str(payload.email).lower(),),
        ).fetchone()

    if not user or not verify_password(
        payload.password,
        user["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    # Demo token. For production, replace with JWT/session management.
    token = secrets.token_urlsafe(32)

    return {
        "status": "success",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "type": "User",
        },
    }


@app.post("/api/auth/guest")
def guest_login():
    return {
        "status": "success",
        "token": secrets.token_urlsafe(24),
        "user": {
            "name": "Guest User",
            "email": "guest@nowcast.ai",
            "type": "Guest",
        },
    }


@app.get("/api/auth/me")
def current_user_demo(
    email: EmailStr = Query(...),
):
    with db() as conn:
        user = conn.execute(
            """
            SELECT id, name, email, created_at
            FROM users
            WHERE email = ?
            """,
            (str(email).lower(),),
        ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "status": "success",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "type": "User",
            "created_at": user["created_at"],
        },
    }


# ============================================================
# DEV ENTRYPOINT
# ============================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )
