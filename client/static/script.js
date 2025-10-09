// set starting point coordinate
var initial_start = [49.2827, -123.1207];
var start = [49.2827, -123.1207];
var click_lat;
var click_lon;
var initial_battery;
var remaining_battery;
var startingPointInitialised = false;
var chargingStationMarkers = {};
// var previous_point_speed
var chunk_size = 10;
const BATTERY_CAPACITY = 75000;
const MASS = 2139;
const GRAVITY = 9.8066;
const CI = 1.75 ;
const CR = 1.15;
const C1 = 0.0328;
const C2 = 4.575;
const CD = 0.23;
const AF = 2.22;
const PA = 1.2256;
const ED = 0.93;
const EM = 0.92;
const EB = 0.9;
var battery_level = ['<10%','<20%','<30%','<40%','<50%','<60%','<70%','<80%','<90%','<100%'];
var variants = ['#FE0000', '#FE00A5','#FE7000', '#FEC400', '#FEF600', '#00FEE7', '#00D8FE', '#009AFE','#00FE9A','#00FE40'];
// create a map in the "map" div, set the view to a given place and zoom
var map = L.map('map').setView(start, 7);
const baseUrl = window.location.origin;

var carIcon = L.icon({
    iconUrl: '/static/electric-car.png',
    iconSize:     [38, 38], // size of the icon
    iconAnchor:   [22, 22], // point of the icon which will correspond to marker's location
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

var waypoints = L.icon({
    iconUrl: '/static/waypoints.png',
    iconSize:     [25, 25], // size of the icon
    iconAnchor:   [22, 22], // point of the icon which will correspond to marker's location
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

var charging_station = L.icon({
    iconUrl: '/static/charging_station.png',iconSize: [20, 20]
})

// add an OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// --- Global State Variables ---
// Holds the temporary marker dropped by the user for confirmation
var tempConfirmationMarker = null;

// Flag to prevent multiple asynchronous path requests from running simultaneously
var isProcessingClick = false; 

// Assumed to be defined elsewhere (e.g., L.map('map', ...))
// var map = ...; 

// Assumed to be defined elsewhere
// var chargingStationMarkers = ...; 
// var batteryForm = ...; 
// var start = ...; 
// function createPath() { ... }
// function getalphashape() { ... }
// function setVisible() { ... }

// --- Core Logic Function ---
// This function contains all your original code, triggered ONLY by the confirmation button.
async function processConfirmedLocation(lat, lon) {
    if (isProcessingClick) return; 
    isProcessingClick = true; 

    try {
        click_lat = lat;
        click_lon = lon;
        console.log("Processing map click request for latitude: " + click_lat + " and longitude: " + click_lon);
        var clickedCoordinates = [click_lat, click_lon].toString();
        
        // Set loading message for path creation
        document.getElementById('loading-message').textContent = "Getting optimum path to the location...";
        setVisible('#loading', true);
        
        var result = await createPath(); 
        
        if (result >= 0) {
            remaining_battery = result;
            if (chargingStationMarkers.hasOwnProperty(clickedCoordinates)){
                const currentBatteryLabel = document.createElement('label');
                currentBatteryLabel.setAttribute('for', 'currentBatteryLevel');
                currentBatteryLabel.textContent = "Current Battery level is: " + Math.round(remaining_battery * 10)/10 + " %";
                const form = document.getElementById('batteryInputForm');
                form.insertBefore(currentBatteryLabel, form.firstChild);
                map.setView([start[0],start[1]], 12);
                batteryForm.style.display = 'flex';
                
                // Clear loading message before showing the battery form
                document.getElementById('loading-message').textContent = "";
                setVisible('#loading', false);
                return; // Exit here as battery form is now visible
            }
            
            // Set loading message for final range calculation
            document.getElementById('loading-message').textContent = "Getting optimum path to the location...";
            getalphashape(remaining_battery);
            
            map.setView([click_lat, click_lon], 12);  
        }
    } catch (error) {
        console.error("Error during map click path processing:", error);
    } finally {
        isProcessingClick = false;
        
        // Clear loading message and hide spinner
        document.getElementById('loading-message').textContent = "";
        setVisible('#loading', false);
    }
}

async function processChargingStation(lat, lon) {
    if (isProcessingClick) return;
    isProcessingClick = true; 

    try {
        click_lat = lat;
        click_lon = lon;
        console.log("Processing charging station request for latitude: " + click_lat + " and longitude: " + click_lon);

        document.getElementById('loading-message').textContent = "Navigating to charging station...";
        setVisible('#loading', true);
        var result = await createPath();
        
        if (result >= 0) {
            remaining_battery = result;
            const currentBatteryLabel = document.createElement('label');
            currentBatteryLabel.setAttribute('for', 'currentBatteryLevel');
            currentBatteryLabel.textContent = "Current Battery level is: " + Math.round(remaining_battery * 10)/10 + " %";
            const form = document.getElementById('batteryInputForm');
            form.insertBefore(currentBatteryLabel, form.firstChild);
            map.setView([start[0],start[1]], 12);
            batteryForm.style.display = 'flex';
        }
        
    } catch (error) {
        console.error("Error processing charging station path:", error);
    } finally {
        isProcessingClick = false;
    }
    document.getElementById('loading-message').textContent = "";
    setVisible('#loading', false);
}

map.on('click', async function(e){
    if (isProcessingClick) {
        console.log("Click ignored: Processing previous request.");
        return;
    }
    
    if (!startingPointInitialised){
        // Display an alert message if the start location is not set
        alert("Please input your address in the START PLAN");
        return; 
    }

    // Clear any previous temporary marker
    if (tempConfirmationMarker) {
        map.removeLayer(tempConfirmationMarker);
        tempConfirmationMarker = null;
    }

    var coord = e.latlng;
    var lat = coord.lat;
    var lon = coord.lng;
    var latDisplay = lat.toFixed(4);
    var lonDisplay = lon.toFixed(4);

    // Create the HTML content for the confirmation popup
    var popupContent = `
        <div style="text-align: center; min-width: 150px;">
            <p style="margin-bottom: 5px;"><strong>Confirm Destination:</strong></p>
            <p style="font-weight: bold; margin-bottom: 10px;">${latDisplay}, ${lonDisplay}</p>
            <button id="confirmLocationBtn" 
                    data-lat="${lat}" 
                    data-lon="${lon}" 
                    style="margin-right: 10px; background-color: #007bff; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Go Here</button>
            <button id="cancelConfirmationBtn" 
                    style="background-color: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cancel</button>
        </div>
    `;

    // Drop the temporary marker and bind the popup
    tempConfirmationMarker = L.marker([lat, lon]).addTo(map);
    tempConfirmationMarker.bindPopup(popupContent).openPopup();

    map.setView([lat, lon], map.getZoom());
});

async function getchargingstation(){
    lat = start[0]
    lon = start[1]
    
    // Clear all the existing charging station markers
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker && layer.options.icon === charging_station) {
            map.removeLayer(layer);
        }
    });
    chargingStationMarkers = {}; // Initialize as an empty object for key-value storage

    fetch(`${baseUrl}/station?lat=${lat}&lon=${lon}`)
    .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();})
    .then(data => {
        data.forEach(element => {
            var marker = show_marker(element.lat, element.lon, charging_station);
            chargingStationMarkers[[element.lat, element.lon].toString()] = marker;
            
            // 💥 Charging Station Click: Show Confirmation Popup 💥
            marker.addEventListener('click', function() {
                if (isProcessingClick) return; 

                // Clear temporary map click marker if it exists
                if (tempConfirmationMarker) {
                    map.removeLayer(tempConfirmationMarker);
                    tempConfirmationMarker = null;
                }

                const latDisplay = element.lat.toFixed(4);
                const lonDisplay = element.lon.toFixed(4);
                
                const popupContent = `
                    <div style="text-align: center; min-width: 150px;">
                        <p style="margin-bottom: 5px;"><b>Confirm Charging Station:</b></p>
                        <p style="font-weight: bold; margin-bottom: 10px;">${element.name || 'Station'}</p>
                        <button id="confirmStationBtn" 
                                data-lat="${element.lat}" 
                                data-lon="${element.lon}" 
                                style="margin-right: 10px; background-color: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Go Charge</button>
                        <button id="cancelStationBtn" 
                                style="background-color: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cancel</button>
                    </div>
                `;

                // Bind the popup to the station marker and open it
                marker.bindPopup(popupContent, {closeButton: false}).openPopup();
                map.setView([element.lat, element.lon], map.getZoom());
            });
        });
    })
}
    

// Listener for buttons INSIDE the popup
document.addEventListener('click', function(event) {
    const targetId = event.target.id;

    if (targetId === 'confirmLocationBtn') {
        // Handle general map click confirmation
        const lat = parseFloat(event.target.dataset.lat);
        const lon = parseFloat(event.target.dataset.lon);

        if (tempConfirmationMarker) {
            map.removeLayer(tempConfirmationMarker);
            tempConfirmationMarker = null;
        }
        map.closePopup();

        processConfirmedLocation(lat, lon);
        
    } else if (targetId === 'cancelConfirmationBtn') {
        // Handle general map click cancellation
        map.closePopup();
        if (tempConfirmationMarker) {
            map.removeLayer(tempConfirmationMarker);
            tempConfirmationMarker = null;
        }
        console.log("Location confirmation cancelled.");

    } else if (targetId === 'confirmStationBtn') {
        // Handle Charging Station confirmation
        const lat = parseFloat(event.target.dataset.lat);
        const lon = parseFloat(event.target.dataset.lon);

        map.closePopup();
        
        processChargingStation(lat, lon);
        
    } else if (targetId === 'cancelStationBtn') {
        // Handle Charging Station cancellation
        map.closePopup();
        console.log("Charging station selection cancelled.");
    }
});

const setVisible = (elementOrSelector, visible) => {
    const element =
      typeof elementOrSelector === 'string'
        ? document.querySelector(elementOrSelector)
        : elementOrSelector;
    if (!element) return;
    element.style.display = visible ? 'flex' : 'none'; // must use flex to center spinner
};

function getColor(d) {
    var value = parseFloat(d.replace('>', '').replace('%', ''));
    return value === 70 ? "darkgreen" :
        value === 35 ? "yellow" :
        value === 0 ? "red" : "black";
}
var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    // Create the main legend container div with standard Leaflet classes
    var div = L.DomUtil.create('div', 'info legend');
    
    // The original circleHTML content is commented out as requested.
    /* var circleHTML = '<div style="position:relative; width: 70%;top:65%;left:10%"><div style="font-size: 18px;"><strong>Battery Level</strong></div><div style="width: 100%; display: flex; align-items: center;"><img src="/static/green.png" style="width: 20px; height: 20px; margin-right: 10px;margin-bottom: 5px;margin-top: 5px" /><span style="font-size: 16px;">>=70%</span></div><div style="width: 100%; display: flex; align-items: center;"><img src="/static/yellow.png" style="width: 20px; height: 20px; margin-right: 10px;margin-bottom: 5px;margin-top: 5px" /><span style="font-size: 16px;">35%-<70%</span></div><div style="width: 100%; display: flex; align-items: center;"><img src="/static/red.png" style="width: 20px; height: 20px; margin-right: 10px;margin-bottom: 5px;margin-top: 5px" /><span style="font-size: 16px;">0%-<35%</span></div></div>'; */
    
    // additionalLegendContent container start
    // 💥 FIX: Removed conflicting inline width/margin from the inner container 
    // to allow it to fill the space provided by the outer Leaflet control.
    var additionalLegendContent = '<div>' + 
                            '<h3 style="width:100%; text-align: center; margin: 5px 0 10px 0;">Color Palette on Battery Level</h3>' +
                            '<div class="container text-center" style="display: flex; flex-direction: column;">';

    // Loop through battery levels to build the legend content
    battery_level.forEach(function(batteryLevel, index) {
        additionalLegendContent += '<div class="col py-3" style="background-color: ' + variants[index] + '; text-align: center; margin-bottom: 3px; border-radius: 3px;"><small style="font-size: 12px; color: black; font-weight: bold;">' + batteryLevel + '</small></div>';
    });

    // Close the container divs
    additionalLegendContent += '</div>' +
    '</div>';

    // Set the div's content
    div.innerHTML = additionalLegendContent;
    
    return div;
};

legend.addTo(map);

// 💥 MODIFICATION: Use external CSS for control container styling 
// and only set width/height if absolutely necessary.
var legendContainer = legend.getContainer();

// 1. Set display to flex and flex-direction to column for clean stacking (optional but helpful)
legendContainer.style.display = 'flex';
legendContainer.style.flexDirection = 'column';

// 2. Set max-width to allow content to dictate height, but limit width
legendContainer.style.maxWidth = '100px'; 
// Remove the fixed height and conflicting margins
// legendContainer.style.height = '250px'; 
// legendContainer.style.marginBottom = '20px'; 
// legendContainer.style.marginLeft = '15px'; 


const batteryForm = document.getElementById('batteryForm');

document.getElementById('batteryInputForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    var batteryLevel = document.getElementById('batteryLevel').value;
    if (batteryLevel < remaining_battery) {
        alert("Your input charge level is lower than current level");
        return; // Stop further execution
    }
    remaining_battery = batteryLevel
    
    // Set loading message for battery update
    document.getElementById('loading-message').textContent = "Updating to new battery level...";
    setVisible('#loading', true);
    
    getalphashape(remaining_battery);
    
    map.setView([click_lat,click_lon], 12);
    batteryForm.style.display = 'none';
    
    // remove the label 
    const oldLabel = document.querySelector('form#batteryInputForm label[for="currentBatteryLevel"]');
    if (oldLabel) {
        oldLabel.parentNode.removeChild(oldLabel);
    }
    
    // Clear loading message and hide spinner
    document.getElementById('loading-message').textContent = "Updating to new battery level...";
    setVisible('#loading', false);
});

async function createPath(){
    // setVisible('#loading', true);
    const coordinates_tmp = await getTripCoordinate(click_lat, click_lon);
    // console.log(coordinates_tmp)
    // if (!coordinates_tmp) return -1;
    var coordinates = swaplatlng(coordinates_tmp)
    coordinates = splitCoordinate(coordinates,chunk_size)
    // console.log("Coordinates array: ", coordinates)
    var chargelist = []
    // console.log(coordinates)
    if (coordinates) {
        // console.log("Coordinates:", coordinates);
        var color_map = {0:variants[0],
                        10:variants[1],
                        20:variants[2],
                        30:variants[3],
                        40:variants[4],
                        50:variants[5],
                        60:variants[6],
                        70:variants[7],
                        80:variants[8],
                        90:variants[9]}
        var previous_charge = remaining_battery
        var previous_speed = 0
        for (var i = 0;i<coordinates.length;i++){
            coordinates_array = convertToPairs(coordinates[i])
            var coordinates_array_swapped = swaplatlng(coordinates_array)
            var tripdistance =  await getTripDistance(coordinates_array_swapped)
            if (tripdistance){
                var [new_charge,new_speed] = getChargePair(tripdistance,previous_charge,previous_speed)
                if (new_charge<0) {
                    // setVisible('#loading', false);
                    alert("Not enough battery charge to reach the destination");
                    return -1; // Stop further execution
                }
                chargelist.push(new_charge)
                previous_charge = new_charge
                // console.log(previous_charge)
                previous_speed = new_speed
            }
        }
        if (chargelist[chargelist.length-1]>0){
            // refresh_shape();
            removeMarkerAtCoordinates(start[0],start[1]);
            show_marker(start[0],start[1],waypoints);
            var marker = show_marker(click_lat,click_lon,carIcon);
            show_battery_level(marker)
            for (var i = 0;i<chargelist.length;i++){
                coordinates_array = convertToPairs(coordinates[i])
                var path_color = color_map[Math.floor(chargelist[i] / 10) * 10];
                // console.log("chargeList: ",path_color," ",chargelist[i])
                var polyline = new L.polyline(coordinates_array, {color: path_color
                ,weight: 7,smoothFactor: 1}).addTo(map);
            } 
        }
    } else {
        console.log("Failed to fetch trip coordinates.");
    }
    start = [click_lat,click_lon]
    // setVisible('#loading', false);
    return chargelist[chargelist.length-1]
}

function getPowerMotor(acceleration, velocity, road_grade) {
    const road_grade_radian = (road_grade / 180) * Math.PI;
    let power_of_wheel = 0;
    let power_of_motor = 0;
    const gradient_resistance_force = MASS * GRAVITY * Math.sin(road_grade_radian);
    const rolling_resistance_force = MASS * GRAVITY * Math.cos(road_grade_radian) * CR * (C1 * velocity + C2) / 1000;
    const aerodynamic_drag_force = 0.5 * (PA * AF * CD * Math.pow(velocity, 2));
    const inertia_resistance_force = CI * MASS * acceleration;
    power_of_wheel = (gradient_resistance_force + rolling_resistance_force + aerodynamic_drag_force + inertia_resistance_force) * velocity;
    power_of_motor = power_of_wheel / (ED * EM * EB);
    return power_of_motor;
}

function getStateOfCharge(acceleration, velocity, road_grade) {
    const power = getPowerMotor(acceleration, velocity, road_grade);
    let total_power = 0;
    if (acceleration < 0 && power < 0) {
        const ER = 1 / Math.exp(0.0411 / Math.abs(acceleration));
        total_power = ER * power;
    } else if (power < 0) {
        const ER = 0.7;
        total_power = ER * power;
    } else {
        total_power = power;
    }
    return total_power / (3600 * BATTERY_CAPACITY);
}

async function getElevation(coordinateList) {
    const maxRequestSize = 300;
    const sublists = [];
    var elevation_data = []; 
    for (let i = 0; i < coordinateList.length; i += maxRequestSize) {
        sublists.push(coordinateList.slice(i, i + maxRequestSize));
    }
    for (let i = 0; i<sublists.length; i++){
        const coordinate = sublists[i].map(coord => coord.join(',')).join('|');
        const url = `https://api.open-elevation.com/api/v1/lookup?locations=${coordinate}`;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            elevation_data = elevation_data.concat(data.results);
        } else {
            console.log("Response failed, status code:", response.status);
            return null;
        }
    }
    return elevation_data;
}

async function elevationDifference(coordinateList) {
    const data = await getElevation(coordinateList);
    if (data !== null) {
        const elevationList = data.map(item => item.elevation || 0);
        const elevationPairs = elevationList.slice(1).map((elevation, index) => elevation - elevationList[index]);
        return elevationPairs;
    }
    return null;
}


function swaplatlng(coordinate){
    const swappedCoordinates = [];
        for (let i = 0; i < coordinate.length; i++) {
            const coord = coordinate[i];
            subarray = [coord[1], coord[0]];
            swappedCoordinates.push(subarray);
    }
    return swappedCoordinates;
}
 
async function getTripCoordinate(lat, lon) {
    const origin = [start[1],start[0]]
    const profile='mapbox/driving-traffic'
    const destination = [lon.toString(),lat.toString()]
    const originStr = origin[0] + ',' + origin[1];
    const destinationStr = destination[0] + ',' + destination[1];
    const coordinates = originStr + ';' + destinationStr;
    return fetch(`https://api.mapbox.com/directions/v5/${profile}/${coordinates}?&steps=true&geometries=geojson&waypoints_per_route=true&overview=full&access_token=${mapboxApiKey}`)
        .then(response => {
            if (!response.ok) {
                console.error('Response failed, status code:', response.status);
                return false;
            }
            return response.json();
        })
        .then(data => {
            if (data.code !== 'Ok') {
                console.error('Error in API response:', data.message);
                return false;
            }
            const coordinate = data.routes[0].geometry.coordinates;
            coordinate.unshift(origin);
            coordinate.push(destination);
            return coordinate;
        })
        .catch(error => {
            console.error('Error:', error);
            return false;
        });
}

async function getTripDistance(tripCoordinate, profile = 'mapbox/driving-traffic') {
    let data = tripCoordinate;
    const max_request_size = 20;
    const sublists = [];
    for (let i = 0; i < data.length; i += max_request_size) {
        sublists.push(data.slice(i, i + max_request_size));
    }
    for (let i = 0; i < sublists.length - 1; i++) {
        sublists[i + 1] = [sublists[i][sublists[i].length - 1]].concat(sublists[i + 1]);
    }

    let duration_distance_pairs = [];
    let elevation_pairs = [];

    const swapped_coordinates = data.map(coord => [coord[1], coord[0]]);
    elevation_pairs = await elevationDifference(swapped_coordinates);

    for (const sublist of sublists) {
        const coordinates_str = sublist.map(item => `${item[0]}, ${item[1]}`).join('; ');
        
        const url = `https://api.mapbox.com/directions/v5/${profile}/${coordinates_str}?&access_token=${mapboxApiKey}`;
        const response = await fetch(url);
        if (response.ok) {
            const responseData = await response.json();
            const legData = responseData.routes[0].legs;
            for (const leg of legData) {
                duration_distance_pairs.push([leg.duration, leg.distance]);
            }
        } else {
            console.log("Response failed (Get Distance), status code:", response.status);
            return null;
        }
    }

    const combinedList = [];
    if (elevation_pairs === null) {
        elevation_pairs = Array(duration_distance_pairs.length).fill(0);
    }
    for (let i = 0; i < duration_distance_pairs.length; i++) {
        const [duration, distance] = duration_distance_pairs[i];
        const elevation = elevation_pairs[i];
        combinedList.push([duration, distance, elevation]);
    }
    return combinedList;
}

function getChargePair(tripdistance, current_battery_level,start_speed) {
    let data_pair = tripdistance;
    // let total_duration = 0;
    // let total_distance = 0;
    let previous_charge = current_battery_level;
    let previous_speed = start_speed;

    for (const data of data_pair) {
        let duration = data[0];
        if (duration === null) {
            duration = 0.0;
        }
        // total_duration += duration;
        let distance = data[1];
        // total_distance += distance;
        let elevation = data[2];

        if (duration === 0 || distance === 0) {
            continue;
        } else {
            let road_grade = Math.atan2(elevation, distance) * (180 / Math.PI);
            let velocity = distance / duration;
            let max_acceleration = 3;

            if (velocity > previous_speed) {
                let acceleration;
                if ((velocity - previous_speed) > (10 * 1000 / 3600)) {
                    acceleration = max_acceleration;
                } else {
                    acceleration = (max_acceleration / 10) * (velocity - previous_speed);
                }
                let acceleration_time = (velocity - previous_speed) / acceleration;
                let charge = Math.min(100, previous_charge - (getStateOfCharge(acceleration, velocity, road_grade) * acceleration_time + getStateOfCharge(0, velocity, road_grade) * (duration - acceleration_time)) * 100);
                previous_charge = charge;
            } else if (previous_speed > velocity) {
                let deceleration = -(0.005 * Math.pow(previous_speed, 2) + 0.154 * previous_speed + 0.493);
                let deceleration_time = (velocity - previous_speed) / deceleration;
                let charge = Math.min(100, previous_charge - (getStateOfCharge(deceleration, velocity, road_grade) * deceleration_time + getStateOfCharge(0, velocity, road_grade) * (duration - deceleration_time)) * 100);
                previous_charge = charge;
            } else {
                let charge = Math.min(100, previous_charge - (getStateOfCharge(0, velocity, road_grade) * duration) * 100);
                previous_charge = charge;
            }
            previous_speed = velocity;
        }
    }
    return [previous_charge,previous_speed];
}
async function getalphashape(battery = 100) {
    // show loading animatio 
    setVisible('#loading', true);

    const lat = start[0];
    const lon = start[1];

    try {
        // const response = await fetch(`${baseUrl}/alpha?lat=${lat}&lon=${lon}&battery=${battery}`);

        // if (!response.ok) {
        //     throw new Error(`HTTP error! Status: ${response.status}`);
        // }

        // const data = await response.json();
        // console.log("data:", data);

        /*
        const colorlist = ['darkgreen', 'yellow', 'red'];
        let count = 0;

        data.forEach(element => {
            if (element.length > 0) {
                L.polygon(element, {
                    color: colorlist[count],
                    fillColor: colorlist[count],
                    weight: 3
                }).addTo(map);
            }
            count++;
        });
        */
        await getchargingstation();

    } catch (error) {
        console.error('Error:', error);
    } finally {
        // end loading
        setVisible('#loading', false);
    }
}


function splitCoordinate(coordinates,size) {
    var result = [];
    var chunkSize = Math.ceil(coordinates.length / size);

    for (var i = 0; i < size; i++) {
        var start = i * chunkSize;
        var end = (i + 1) * chunkSize;
        if (i > 0) {
            start -= 2;
        }
        var subarray = coordinates.slice(start, end).flat();
        result.push(subarray);
    }

    return result;
}

function convertToPairs(array) {
    var result = [];
    for (var i = 0; i < array.length; i += 2) {
        result.push([array[i], array[i + 1]]);
    }
    return result;
}

function show_marker(lat, lon, picture) {
    var marker = L.marker([lat, lon],{icon:picture}).addTo(map);
    return marker
}

function refresh() {
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
}

// function refresh_shape() {
//     map.eachLayer(function (layer) {
//         if (layer instanceof L.Polygon) {
//             map.removeLayer(layer);
//         }
//     })
// }


// function hideShowLayer(opacityValue,fillOpacityValue) {
//     var hasPolygons = false; // Flag to check if any polygon layers are present
//     map.eachLayer(function (layer) {
//         if (layer instanceof L.Polygon) {
//             hasPolygons = true; // Set the flag to true since at least one polygon layer is found
//             layer.setStyle({ // Change style to hide the layer
//                 opacity: opacityValue, // Make the layer transparent
//                 fillOpacity: fillOpacityValue // Make the layer's fill transparent (if any)
//             });
//         }
//     });

//     if (!hasPolygons) {
//         alert("Alpha shape is not yet created");
//         return 0;
//     }
//     return 1;
// }

// document.getElementById('checkbox').addEventListener('change', function(event) {
//     // Your event handling code here
//     var result = 0;
//     if (event.target.checked) {
//         // Checkbox is checked
//         result = hideShowLayer(0,0); // checked, hide alpha shape
//         if (result  == 1){
//             map.setView(start, 8);
//         }
//         else event.target.checked = false;
//     } else {
//         result = hideShowLayer(1,0.2);// Checkbox is unchecked, show alpha shape
//         if (result  == 1){
//             map.setView(start, 7);
//         }
//         else event.target.checked = true;
//         // You may want to do something else here if needed
//     }
// });

function removeMarkerAtCoordinates(latToRemove, lngToRemove) {
    // Iterate through all markers on the map
    map.eachLayer(function(layer) {
        // Check if the layer is a marker
        if (layer instanceof L.Marker) {
            // Get the coordinates of the marker
            var markerLat = layer.getLatLng().lat;
            var markerLng = layer.getLatLng().lng;

            // Check if the marker coordinates match the coordinates to remove
            if (markerLat === latToRemove && markerLng === lngToRemove) {
                map.removeLayer(layer);
            }
        }
    });
}


async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({'address': address}, function(results, status) {
            if (status === 'OK' && results[0]) {
                var latitude = results[0].geometry.location.lat();
                var longitude = results[0].geometry.location.lng();
                resolve([latitude, longitude]);
            } else {
                reject('Geocode was not successful for the following reason: ' + status);
            }
        });
    });
}

function initAutocomplete() {
    var autocomplete = new google.maps.places.Autocomplete(
        document.getElementById('address'), {
            types: ['geocode']
        });
    
}


document.getElementById('coordinateForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    // Set loading message for coordinate form submission
    document.getElementById('loading-message').textContent = "Initialising starting position...";
    setVisible('#loading', true);
    
    var addressInput = document.getElementById('selected_address_data').value;
    var batteryInput = document.getElementById('battery').value;

    var address = addressInput !== '' ? addressInput : "Vancouver, BC, Canada";
    var battery = batteryInput !== '' ? batteryInput : "100";

    var [latitude, longitude] = await geocodeAddress(address);
    start = [latitude, longitude];
    initial_start = [latitude,longitude];
    initial_battery = battery;
    remaining_battery = battery;
    refresh();
    map.setView([latitude, longitude], 12);
    var marker = show_marker(start[0],start[1],carIcon);
    show_battery_level(marker)
    // show_starting_point(latitude, longitude);
    
    // Update message before starting alpha shape calculation
    document.getElementById('loading-message').textContent = "Initialising starting position...";
    if (marker) {
        setVisible('#loading', false);
    }
    getalphashape(remaining_battery);
    startingPointInitialised = true ;
})

//showing the remaining battery when pointing to the car
function show_battery_level(marker){
    marker.on('mouseover', function(e) {
        if (e.target.options.icon === carIcon) {
            e.target.bindPopup(`<b style="font-size: 20px;">Current battery level of the vehicle: ${Math.round(remaining_battery * 10)/10}%</b>`).openPopup();
        }
    });
    
    // Add mouseout event to hide popup only for markers with customIcon
    marker.on('mouseout', function(e) {
        if (e.target.options.icon === carIcon) {
            e.target.closePopup();
        }
    });
}

document.getElementById('resetMapButton').addEventListener('click', function(event) {
    // Prevent any default form submission behavior
    event.preventDefault(); 
    
    // 1. Show loading screen with a specific message
    if (!startingPointInitialised){
        // Display an alert message if the start location is not set
        alert("Please input your address in the START PLAN");
        return; 
    }
    
    document.getElementById('loading-message').textContent = "Recalculating initial range and clearing map...";
    setVisible('#loading', true);
    
    // 2. Clear map features and re-establish the starting point
    // Note: Assuming 'refresh()' removes old paths/shapes.
    refresh();
    
    map.setView([initial_start[0], initial_start[1]], 12);
    
    // Log the current starting point for debugging
    console.log("Resetting map from starting point:", start);

    // Re-draw the starting marker and its battery level display
    start = initial_start;
    var marker = show_marker(start[0], start[1], carIcon);
    show_battery_level(marker);
    
    // 3. Re-calculate and re-draw the initial reachable area (alpha shape)
    // Note: getalphashape is assumed to be synchronous or handle its own loading internally after this point.
    // If getalphashape is an async function, you should use 'await' here: await getalphashape(remaining_battery);
    remaining_battery = initial_battery;
    getalphashape(remaining_battery);
    
    // 4. Hide loading screen and clear message
    // You should use a brief setTimeout if getalphashape is synchronous but slow, to ensure the loading message is seen.
    // Otherwise, hide it immediately:
    document.getElementById('loading-message').textContent = "Recalculating initial range and clearing map...";
    if (marker) {
        setVisible('#loading', false);
    }
});

