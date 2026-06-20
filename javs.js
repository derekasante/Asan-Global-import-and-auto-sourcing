const map = L.map('map').setView([5.6037,-0.1870],6);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{

attribution:'© OpenStreetMap'

}).addTo(map);

let marker;

function showShip(lat,lng,name){

if(marker){

map.removeLayer(marker);

}

marker=L.marker([lat,lng]).addTo(map);

marker.bindPopup("<b>"+name+"</b><br>Current Position").openPopup();

map.flyTo([lat,lng],8);

}