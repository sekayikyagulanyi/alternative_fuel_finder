from flask import Flask, render_template, jsonify, request
import os
import requests

charge_app = Flask(__name__)

NREL_API_KEY = os.environ.get("NREL_API_KEY")


@charge_app.route("/")
def homepage():
    return render_template("index.html")


@charge_app.route("/api/stations")
def get_stations():
    fuel_type = request.args.get("fuel_type", "all")
    access = request.args.get("access", "all")
    status = request.args.get("status", "all")
    state = request.args.get("state")
    zip_code = request.args.get("zip")
    country = request.args.get("country", "US")
    limit = request.args.get("limit", "20")
    offset = request.args.get("offset", "0")
    latitude = request.args.get("latitude")
    longitude = request.args.get("longitude")

    if latitude and longitude:
        url = "https://developer.nlr.gov/api/alt-fuel-stations/v1/nearest.json"
        params = {
            "api_key": NREL_API_KEY,
            "fuel_type": fuel_type,
            "access": access,
            "status": status,
            "latitude": latitude,
            "longitude": longitude,
            "limit": limit
        }
    else:
        url = "https://developer.nlr.gov/api/alt-fuel-stations/v1.json"
        params = {
            "api_key": NREL_API_KEY,
            "fuel_type": fuel_type,
            "access": access,
            "status": status,
            "country": country,
            "limit": limit,
            "offset": offset
        }

        if state:
            params["state"] = state

        if zip_code:
            params["zip"] = zip_code

    response = requests.get(url, params=params, timeout=10)
    data = response.json()

    stations = []

    for station in data.get("fuel_stations", []):
        stations.append({
            "id": station.get("id"),
            "name": station.get("station_name"),
            "fuel_type": station.get("fuel_type_code"),
            "address": station.get("street_address"),
            "city": station.get("city"),
            "state": station.get("state"),
            "zip": station.get("zip"),
            "country": station.get("country"),
            "access": station.get("access_code"),
            "status": station.get("status_code"),
            "phone": station.get("station_phone"),
            "hours": station.get("access_days_time"),
            "latitude": station.get("latitude"),
            "longitude": station.get("longitude"),
        })

    return jsonify({
        "total_results": data.get("total_results"),
        "returned": len(stations),
        "filters": {
            "fuel_type": fuel_type,
            "access": access,
            "status": status,
            "state": state,
            "zip": zip_code,
            "country": country,
            "limit": limit,
            "offset": offset,
            "latitude": latitude,
            "longitude": longitude
        },
        "stations": stations
    })


if __name__ == "__main__":
    charge_app.run(debug=True)