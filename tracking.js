/* ==========================================
   ASAN GLOBAL SHIPPING
   TRACKING DASHBOARD
   PART 3A
========================================== */

// =========================
// Create Map
// =========================

const map = L.map("map").setView([5.6037, -0.1870], 6);

// =========================
// OpenStreetMap
// =========================

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap Contributors"
}).addTo(map);

// =========================
// Ship Icon
// =========================

const shipIcon = L.icon({

    iconUrl:
        "https://cdn-icons-png.flaticon.com/512/2942/2942076.png",

    iconSize: [45, 45],

    iconAnchor: [22, 22]

});

// =========================
// Ship Marker
// =========================

let shipMarker = L.marker(
    [5.6037, -0.1870],
    { icon: shipIcon }
).addTo(map);

// =========================
// Popup
// =========================

shipMarker.bindPopup(`
<b>ASAN OCEAN STAR</b><br>
Current Status: In Transit<br>
Tema Port
`).openPopup();

// =========================
// Ship Route
// =========================

let route = [

    [5.6037, -0.1870],

    [5.40, -0.60],

    [5.20, -1.20],

    [4.90, -2.10],

    [4.50, -3.50],

    [4.00, -5.00],

    [3.60, -6.20],

    [3.20, -8.00]

];

let currentPoint = 0;

// =========================
// Search Button
// =========================

const trackButton =
document.querySelector(".search-box button");

const trackingInput =
document.getElementById("trackingInput") ||
document.querySelector(".search-box input");

function applyTrackingSearch(value) {
    if (!value || !value.trim()) {
        alert("Please enter a tracking number.");
        return;
    }
    trackingInput.value = value.trim().toUpperCase();
    alert("Tracking Number " + trackingInput.value + " found successfully!");
}

trackButton.addEventListener("click", () => {
    applyTrackingSearch(trackingInput.value);
});

trackingInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        applyTrackingSearch(trackingInput.value);
    }
});

const urlRef = new URLSearchParams(window.location.search).get("ref");
if (urlRef) {
    trackingInput.value = urlRef.trim().toUpperCase();
    setTimeout(() => applyTrackingSearch(urlRef), 600);
}

// =========================
// Download Button
// =========================

document
.querySelector(".download")
.addEventListener("click", () => {

alert("Shipment Report Download Started.");

});

// =========================
// Live Clock
// =========================

function updateClock(){

const now = new Date();

console.log(now.toLocaleTimeString());

}

setInterval(updateClock,1000);

// =========================
// Fake GPS Status
// =========================

const gps =
document.querySelector(".online");

let online = true;

setInterval(()=>{

if(online){

gps.innerHTML="ONLINE";

gps.style.background="#16c60c";

}else{

gps.innerHTML="SYNCING";

gps.style.background="#ff9800";

}

online=!online;

},6000);

// =========================
// Coordinates
// =========================

const coordinates = [

"5.6037° N, 0.1870° W",

"5.5500° N, 0.5000° W",

"5.4200° N, 1.0000° W",

"5.1200° N, 2.1000° W",

"4.9800° N, 3.4000° W",

"4.6000° N, 4.7000° W"

];

let coordinateIndex=0;
/* ==========================================
   ASAN GLOBAL SHIPPING
   TRACKING DASHBOARD
   PART 3B
========================================== */

// =========================
// Live Ship Movement
// =========================

setInterval(() => {

    currentPoint++;

    if (currentPoint >= route.length) {
        currentPoint = 0;
    }

    shipMarker.setLatLng(route[currentPoint]);

    map.panTo(route[currentPoint], {
        animate: true,
        duration: 2
    });

    shipMarker.setPopupContent(`
        <b>ASAN OCEAN STAR</b><br>
        Status: In Transit<br>
        Point ${currentPoint + 1}
    `);

}, 5000);

// =========================
// Live Coordinates
// =========================

const coordinateText =
document.getElementById("coordinates");

setInterval(() => {

    coordinateIndex++;

    if (coordinateIndex >= coordinates.length) {
        coordinateIndex = 0;
    }

    coordinateText.innerHTML =
        coordinates[coordinateIndex];

}, 5000);

// =========================
// ETA Countdown
// =========================

let days = 6;
let hours = 18;
let minutes = 45;

const eta =
document.getElementById("etaCountdown");

setInterval(() => {

    minutes--;

    if (minutes < 0) {

        minutes = 59;
        hours--;

    }

    if (hours < 0) {

        hours = 23;
        days--;

    }

    if (days < 0) {

        eta.innerHTML = "Delivered";

        return;

    }

    eta.innerHTML =
        `${days} Days ${hours}h ${minutes}m`;

}, 60000);

// =========================
// Shipment Status
// =========================

const status =
document.getElementById("shipStatus");

const statusList = [

    "Order Confirmed",

    "Loaded at Port",

    "Customs Cleared",

    "In Transit",

    "Approaching Destination",

    "Arrived"

];

let statusIndex = 3;

setInterval(() => {

    statusIndex++;

    if (statusIndex >= statusList.length) {

        statusIndex = 0;

    }

    status.innerHTML =
        statusList[statusIndex];

}, 12000);

// =========================
// Recent Updates
// =========================

const updates =
document.querySelector(".updates ul");

const messages = [

"🚢 Vessel entered shipping lane",

"🌊 Ocean conditions normal",

"📡 GPS location refreshed",

"⚓ Speed maintained at 18 knots",

"☀ Weather remains clear",

"📦 Cargo inspection completed",

"🛰 Satellite communication active",

"🚢 Heading towards destination"

];

setInterval(() => {

    const li =
    document.createElement("li");

    const now =
    new Date().toLocaleTimeString();

    li.innerHTML =

    `${messages[Math.floor(Math.random()*messages.length)]}

    <span>${now}</span>`;

    updates.prepend(li);

    if(updates.children.length > 6){

        updates.removeChild(
            updates.lastElementChild
        );

    }

},10000);

// =========================
// Welcome Message
// =========================

setTimeout(()=>{

console.log(
"ASAN GLOBAL Tracking Dashboard Loaded Successfully."
);

},1000);

// =========================
// END
// =========================
