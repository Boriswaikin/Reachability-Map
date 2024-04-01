// set starting point coordinate
var start = [51.0276233, -114.087835];
var click_lat
var click_lon

// create a map in the "map" div, set the view to a given place and zoom
var map = L.map('map').setView(start, 7);

var carIcon = L.icon({
    iconUrl: 'electric-car.png',
    iconSize:     [38, 38], // size of the icon
    iconAnchor:   [22, 22], // point of the icon which will correspond to marker's location
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

// add an OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

const setVisible = (elementOrSelector, visible) => 
(typeof elementOrSelector === 'string'
? document.querySelector(elementOrSelector)
: elementOrSelector
).style.display = visible ? 'block' : 'none';

const batteryForm = document.getElementById('batteryForm');

document.getElementById('batteryInputForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 

    var batteryLevel = document.getElementById('batteryLevel').value;

    setVisible('#loading', true);
    refresh_shapeAndLine();
    const coordinates = await getTripCoordinate(click_lat, click_lon);
    if (coordinates) {
        console.log("Coordinates:", coordinates);
        var polyline = L.polyline(coordinates, {color: 'blue'
        ,weight: 5,smoothFactor: 1}).addTo(map); 
    } else {
        console.log("Failed to fetch trip coordinates.");
    }
    getalphashape(click_lat, click_lon, batteryLevel);

    batteryForm.style.display = 'none';
});


function getColor(d) {
    var value = parseFloat(d.replace('>', '').replace('%', ''));
    return value === 70 ? "darkgreen" :
           value === 35 ? "yellow" :
           value === 0 ? "red" : "black";
}
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend');
    var categories = ['>70%', '>35%', '>0%'];

    var circleHTML = '<div style="width: 80%;">'; // Opening div tag to wrap circle elements, labels, and categories

    circleHTML += '<div style="font-size: 14px;">' + '<strong>Battery Level</strong>' + '</div>'; // Wrapping the labels

    for (var i = 0; i < categories.length; i++) {
        var color = getColor(categories[i]);
        circleHTML +=
        '<div style="width: 100%; display: flex; align-items: center;">' +
        '<i class="circle" style="border-radius:50%; padding: 5px; padding-bottom: 5px; background-color:' +  color + '; width: 20px; height: 20px; margin-right: 10px;margin-bottom: 5px"></i>' + // Adjusting dimensions of circle
        '<span style="font-size: 16px;">' + (categories[i] ? categories[i] : '+') + '</span>' + // Adjusting font size of text
        '</div>';
    }

    circleHTML += '</div>'; // Closing div tag to wrap circle elements, labels, and categories

    div.innerHTML = circleHTML;
    return div;
};

legend.addTo(map);

var legendContainer = legend.getContainer();
legendContainer.style.width = '100%';
legendContainer.style.height = '100px';
legendContainer.style.marginBottom = '20px';
legendContainer.style.marginLeft = '15px';

async function getTripCoordinate(lat, lon) {
    const origin = [start[1],start[0]]
    const profile='mapbox/driving-traffic'
    const destination = [lon.toString(),lat.toString()]
    const originStr = origin[0] + ',' + origin[1];
    const destinationStr = destination[0] + ',' + destination[1];
    const coordinates = originStr + ';' + destinationStr;
    console.log("coordinates:", coordinates);
    return fetch(`https://api.mapbox.com/directions/v5/${profile}/${coordinates}?&steps=true&geometries=geojson&waypoints_per_route=true&overview=full&access_token=pk.eyJ1IjoiYm9yaXN3YWlraW4iLCJhIjoiY2xzY3hycng3MDVlZTJ2cTc1YjZiamZmcyJ9.-UEBrr6yXlE9K8O1voTUkg`)
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
            const swappedCoordinates = [];
            for (let i = 0; i < coordinate.length; i++) {
                const coord = coordinate[i];
                swappedCoordinates.push([coord[1], coord[0]]);
            }
            return swappedCoordinates;
        })
        .catch(error => {
            console.error('Error:', error);
            return false;
        });
}

function getalphashape(lat, lon, battery=100){
    fetch(`http://127.0.0.1:5000/alpha?lat=${lat}&lon=${lon}&battery=${battery}`)
    .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();})
    .then(data => {
        console.log("data:",data);
        var colorlist = ['darkgreen', 'yellow', 'red']
        var count = 0
        data.forEach(element => {
            // Check if the element is an empty list
            if (element.length > 0) {
                var polygon = L.polygon(element,{
                    color: colorlist[count],
                    fillColor: colorlist[count],
                    weight: 3
                }).addTo(map);
            }
            count++;
        });
    }).then(() => {
        setVisible('#loading', false);
    })
}

async function getchargingstation(lat, lon){
    fetch(`http://127.0.0.1:5000/station?lat=${lat}&lon=${lon}`)
    .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();})
    .then(data => {
        data.forEach(element => {
            var icon = L.icon({iconUrl: 'charging_station.png',iconSize: [20, 20]})
            var marker = L.marker([element.lat, element.lon],{icon:icon}).addTo(map);
            marker.addEventListener('click', async function() {
                marker.bindPopup(`<b>Charging Station</b><br>${element.name}<br>`).openPopup();
                click_lat = element.lat
                click_lon = element.lon
                map.setView([click_lat,click_lon], 10);
                batteryForm.style.display = 'flex';
            });
        });
    })
}


function show_starting_point(lat, lon) {
    L.marker([lat, lon],{icon:carIcon}).addTo(map);
}

function refresh() {
    map.eachLayer(function (layer) {
        if (layer instanceof L.Marker || layer instanceof L.Polygon || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    });
}

function refresh_shapeAndLine() {
    map.eachLayer(function (layer) {
        if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
            map.removeLayer(layer);
        }
    })
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
    setVisible('#loading', true);
    var addressInput = document.getElementById('address').value;
    var batteryInput = document.getElementById('battery').value;

    var address = addressInput !== '' ? addressInput : "2922 10 St SW, Calgary";

    var battery = batteryInput !== '' ? batteryInput : "100";
    
    var [latitude, longitude] = await geocodeAddress(address);
    start = [latitude, longitude];
    refresh();
    map.setView([latitude, longitude], 7);
    show_starting_point(latitude, longitude);
    getalphashape(latitude, longitude, battery);
    await getchargingstation(latitude, longitude);
   
    // const coordinates = await getTripCoordinate(latitude, longitude);
    // if (coordinates) {
    //     console.log("Coordinates:", coordinates);
    //     var polyline = L.polyline(coordinates, {color: 'blue'
    //     ,weight: 5,smoothFactor: 1}).addTo(map); 
    //     // map.fitBounds(polyline.getBounds()); 
    // } else {
    //     console.log("Failed to fetch trip coordinates.");
    // }
})

