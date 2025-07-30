from flask import Flask, request, jsonify, render_template
import json, os
from datetime import datetime, timedelta
import pytz

app = Flask(__name__)
DB_PATH = "dut-reservations.json"

def read_data():
    if not os.path.exists(DB_PATH):
        return {}
    try:
        with open(DB_PATH, "r") as f:
            content = f.read().strip()
            if not content:
                return {}
            return json.loads(content)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def write_data(data):
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

def cleanup_expired(data):
    pdt = pytz.timezone('US/Pacific')
    now = datetime.now(pdt).isoformat()
    return {
        k: v for k, v in data.items()
        if v.get("status") != "reserved" or v.get("expires_at", now) > now
    }

@app.route("/")
def gui():
    return render_template("index.html")

@app.route("/cli")
def cli():
    data = cleanup_expired(read_data())
    write_data(data)
    
    # Get all DUTs and their status
    all_duts = ["10.30.2.157", "10.30.2.75", "10.30.2.16", "10.30.2.134", "10.30.2.129"]
    dut_status = {}
    
    for dut in all_duts:
        if dut in data and data[dut].get("status") == "reserved":
            dut_status[dut] = {
                "status": "reserved",
                "user": data[dut].get("user", "Unknown"),
                "expires_at": data[dut].get("expires_at", "Unknown"),
                "friendly_name": DUT_MAPPING.get(dut, "unknown")
            }
        else:
            dut_status[dut] = {
                "status": "available",
                "friendly_name": DUT_MAPPING.get(dut, "unknown")
            }
    
    return render_template("cli.html", dut_status=dut_status)

@app.route("/schedule/<dut_ip>")
def schedule(dut_ip):
    if dut_ip not in DUT_MAPPING:
        return "DUT not found", 404
    
    friendly_name = DUT_MAPPING[dut_ip]
    current_date = datetime.now(pytz.timezone('US/Pacific')).strftime('%A, %B %d, %Y')
    return render_template("schedule.html", dut_ip=dut_ip, friendly_name=friendly_name, current_date=current_date)

@app.route("/api/schedule/<dut_ip>", methods=["GET"])
def get_schedule(dut_ip):
    data = read_data()
    # Return schedule data for the specific DUT
    return jsonify(data.get(dut_ip, {}))

@app.route("/api/schedule/<dut_ip>/day", methods=["GET"])
def get_day_schedule(dut_ip):
    data = read_data()
    # Get all reservations for today
    today = datetime.now(pytz.timezone('US/Pacific')).date()
    reservations = []
    
    for dut, reservation_data in data.items():
        if reservation_data.get("status") == "reserved":
            # Check if reservation is for today
            reserved_at = datetime.fromisoformat(reservation_data.get("reserved_at", "").replace('Z', '+00:00'))
            if reserved_at.date() == today:
                reservations.append({
                    "dut_ip": dut,
                    "friendly_name": DUT_MAPPING.get(dut, "unknown"),
                    "user": reservation_data.get("user"),
                    "time_slots": reservation_data.get("time_slots", []),
                    "reserved_at": reservation_data.get("reserved_at")
                })
    
    return jsonify(reservations)

@app.route("/api/schedule/<dut_ip>", methods=["POST"])
def update_schedule(dut_ip):
    data = read_data()
    request_data = request.get_json()
    
    # Update the schedule for this DUT
    data[dut_ip] = {
        "status": "reserved",
        "user": request_data.get("user"),
        "time_slots": request_data.get("time_slots", []),
        "reserved_at": datetime.now(pytz.timezone('US/Pacific')).isoformat()
    }
    
    write_data(data)
    return jsonify({"status": "success"})

@app.route("/api/duts")
def get_duts():
    data = cleanup_expired(read_data())
    write_data(data)
    return jsonify(data)

# DUT mapping with friendly names
DUT_MAPPING = {
    "10.30.2.157": "TL7 (no name)",
    "10.30.2.75": "leaf1",
    "10.30.2.16": "spine1", 
    "10.30.2.134": "leaf2",
    "10.30.2.129": "spine2"
}

@app.route("/api/available-duts")
def get_available_duts():
    # Define all possible DUTs by IP address
    all_duts = ["10.30.2.157", "10.30.2.75", "10.30.2.16", "10.30.2.134", "10.30.2.129"]
    data = cleanup_expired(read_data())
    
    # Filter out reserved DUTs
    available_duts = [dut for dut in all_duts if dut not in data or data[dut].get("status") != "reserved"]
    return jsonify(available_duts)

@app.route("/api/reserve", methods=["POST"])
def reserve():
    dut = request.form["dut"]
    user = request.form["user"]
    hours = int(request.form["hours"])
    pdt = pytz.timezone('US/Pacific')
    expires = (datetime.now(pdt) + timedelta(hours=hours)).isoformat()

    data = read_data()
    data[dut] = {
        "status": "reserved",
        "user": user,
        "expires_at": expires
    }
    write_data(data)
    return "Reserved", 200

@app.route("/api/delete", methods=["POST"])
def delete():
    dut = request.form["dut"]
    data = read_data()
    data.pop(dut, None)
    write_data(data)
    return "Deleted", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
