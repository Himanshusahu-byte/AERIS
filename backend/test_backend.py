import requests

BASE = "http://127.0.0.1:8000"

def check(method, url, **kwargs):
    r = requests.request(method, BASE + url, timeout=20, **kwargs)
    print(method, url, r.status_code)
    print(r.json())
    print("-" * 60)

check("GET", "/")
check("GET", "/health")
check("GET", "/api/status")
check("GET", "/api/search-location?city=Indore")
check("GET", "/api/weather?latitude=22.71792&longitude=75.8333")
check("GET", "/api/nowcast?latitude=22.71792&longitude=75.8333")
check("GET", "/api/alerts?latitude=22.71792&longitude=75.8333")
check("GET", "/api/map-point?latitude=22.71792&longitude=75.8333")
check("GET", "/api/layers")
check("GET", "/api/report?latitude=22.71792&longitude=75.8333")
check("GET", "/api/settings")
