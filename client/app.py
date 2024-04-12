from flask import Flask, jsonify, request,render_template,send_from_directory,url_for
from flask_cors import CORS
from dotenv import load_dotenv
from client.EV_heatmap_new import return_alpha_shape, get_public_charging_stations
import os

load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

current_directory = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def hello():
    hello = "Hello, World!"
    mapbox_api_key = os.environ.get('MAPBOX_API')
    return render_template('map.html',mapbox_api_key=mapbox_api_key,url_for=url_for)

@app.route('/alpha', methods=['GET'])
def get_alpha_shape():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    battery = float(request.args.get('battery')) 
    processed_data = return_alpha_shape(lat, lon, battery)
    response = jsonify(processed_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Private-Network', 'true')
    return response

@app.route('/station', methods=['GET'])
def get_station():
    lat = float(request.args.get('lat'))
    lon = float(request.args.get('lon'))
    processed_data = get_public_charging_stations(lat, lon)
    response = jsonify(processed_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Private-Network', 'true')
    return response

if __name__ == '__main__':
    app.run(debug=True)