from flask import Flask, jsonify, request,render_template,send_from_directory,url_for
from flask_cors import CORS
from dotenv import load_dotenv
from client.EV_heatmap_new import return_alpha_shape, get_public_charging_stations
from client.extensions import db
from client.database import Trip, Waypoint
import os

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

with app.app_context():
    db.create_all() 

CORS(app)

current_directory = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def hello():
    hello = "Hello, World!"
    mapbox_api_key = os.environ.get('MAPBOX_API')
    google_api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
    return render_template('map.html',mapbox_api_key=mapbox_api_key,google_api_key=google_api_key,url_for=url_for)

# @app.route('/alpha', methods=['GET'])
# def get_alpha_shape():
#     lat = float(request.args.get('lat'))
#     lon = float(request.args.get('lon'))
#     battery = float(request.args.get('battery')) 
#     processed_data = return_alpha_shape(lat, lon, battery)
#     response = jsonify(processed_data)
#     response.headers.add('Access-Control-Allow-Origin', '*')
#     response.headers.add('Access-Control-Allow-Private-Network', 'true')
#     return response

@app.route('/station', methods=['GET'])
def get_station():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    processed_data = get_public_charging_stations(lat, lon)
    response = jsonify(processed_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Private-Network', 'true')
    return response

@app.route('/api/route', methods=['GET'])
def check_route():
    # Round coordinates to 4 decimals (≈ 11 meters accuracy)
    def r(v):
        return round(float(v), 4)

    # Read & round incoming query parameters
    start_lat = r(request.args.get('start_lat'))
    start_lon = r(request.args.get('start_lon'))
    end_lat   = r(request.args.get('end_lat'))
    end_lon   = r(request.args.get('end_lon'))

    # Query for an EXISTING trip in DB
    trip = Trip.query.filter_by(
        start_lat=start_lat,
        start_lon=start_lon,
        end_lat=end_lat,
        end_lon=end_lon
    ).first()

    # If found → return ordered waypoints from database
    if trip:
        waypoints = Waypoint.query.filter_by(trip_id=trip.id).order_by(Waypoint.order_index).all()
        return jsonify([
            {"lat": w.latitude, "lon": w.longitude}
            for w in waypoints
        ])

    # If not found → frontend will call Mapbox and POST to /api/save-route
    return jsonify({"exists": False})

@app.route('/api/save-route', methods=['POST'])
def save_route():
    data = request.json

    # Round to 4 decimals (≈11m accuracy, same as frontend)
    def r(v): 
        return round(float(v), 4)

    start_lat = r(data['start_lat'])
    start_lon = r(data['start_lon'])
    end_lat   = r(data['end_lat'])
    end_lon   = r(data['end_lon'])

    # Prevent duplicate entries by checking existing trip first
    existing_trip = Trip.query.filter_by(
        start_lat=start_lat,
        start_lon=start_lon,
        end_lat=end_lat,
        end_lon=end_lon
    ).first()

    if existing_trip:
        return jsonify({"message": "Trip already exists", "trip_id": existing_trip.id}), 200

    # Create new trip if not exists
    trip = Trip(
        start_lat=start_lat,
        start_lon=start_lon,
        end_lat=end_lat,
        end_lon=end_lon
    )
    db.session.add(trip)
    db.session.commit()  # Commit now so trip.id is available

    # Insert waypoints (all rounded to 4 decimals)
    for wp in data['waypoints']:
        waypoint = Waypoint(
            trip_id=trip.id,
            latitude=r(wp['lat']),
            longitude=r(wp['lon']),
            order_index=wp['order_index']
        )
        db.session.add(waypoint)

    db.session.commit()
    return jsonify({"message": "Route saved successfully"})

if __name__ == '__main__':
    app.run()
