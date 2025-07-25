from flask import Flask, request, jsonify, render_template
import json, os
from datetime import datetime, timedelta

app = Flask(__name__)
DB_PATH = "dut-reservations.json"

def read_data():
    if not os.path.exists(DB_PATH):
        return {}
    with open(DB_PATH, "r") as f:
        return json.load(f)

def write_data(data):
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)

def cleanup_expired(data):
    now = datetime.utcnow().isoformat()
    return {
        k: v for k, v in data.items()
        if v.get("status") != "reserved" or v.get("expires_at", now) > now
    }

@app.route("/")
def gui():
    return render_template("index.html")

@app.route("/cli")
def cli():
    return render_template("cli.html")

@app.route("/api/duts")
def get_duts():
    data = cleanup_expired(read_data())
    write_data(data)
    return jsonify(data)

@app.route("/api/reserve", methods=["POST"])
def reserve():
    dut = request.form["dut"]
    user = request.form["user"]
    hours = int(request.form["hours"])
    expires = (datetime.utcnow() + timedelta(hours=hours)).isoformat()

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
