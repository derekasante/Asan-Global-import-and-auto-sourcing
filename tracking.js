/* ==========================================
   ASAN GLOBAL SHIPPING
   TRACKING DASHBOARD
   PART 3A
========================================== */

// NOTE: tracking.html already builds the Leaflet map inside its inline script (initMap())
// tracking.js previously created another “fake GPS” map + movement.
// To avoid conflicts, we disable the fake map animation and only keep the helper logic.

// (Intentionally no-op map initialization here.)

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

    const tracking = value.trim().toUpperCase();
    trackingInput.value = tracking;

    // Connect tracking number to the real-time dashboard page state (no backend)
    // This keeps the UI consistent and allows tracking.js to reload correct data.
    const url = new URL(window.location.href);
    url.searchParams.set('tracking', tracking);
    window.history.replaceState({}, '', url.toString());

    // Trigger data refresh if the page listens for it.
    // Many functions in tracking.html use DOMContentLoaded + localStorage polling.
    // Force a reload for perfect consistency.
    window.location.reload();
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

// Live Ship Movement (guarded so tracking pages don't crash)
try {
    if (typeof window.currentPoint === 'undefined') window.currentPoint = 0;

    const hasRoute = typeof window.route !== 'undefined' && Array.isArray(window.route) && window.route.length > 1;
    const hasMap = typeof window.map !== 'undefined' && window.map && typeof window.map.panTo === 'function';
    const hasMarker = typeof window.shipMarker !== 'undefined' && window.shipMarker && typeof window.shipMarker.setLatLng === 'function';

    if (hasRoute && hasMap && hasMarker) {
        setInterval(() => {
            window.currentPoint++;

            if (window.currentPoint >= window.route.length) {
                window.currentPoint = 0;
            }

            window.shipMarker.setLatLng(window.route[window.currentPoint]);

            window.map.panTo(window.route[window.currentPoint], {
                animate: true,
                duration: 2
            });

            window.shipMarker.setPopupContent(`
                <b>ASAN OCEAN STAR</b><br>
                Status: In Transit<br>
                Point ${window.currentPoint + 1}
            `);
        }, 5000);
    }
} catch (e) {
    // do nothing - prevent JS errors from stopping other parts of the page
}

// =========================
// Live Coordinates
// =========================

const coordinateText =
document.getElementById("coordinates");

// NOTE: current tracking.html layout has no #coordinates element (superseded by
// the live map). Guard so this legacy interval cannot throw and spam the console.
if (coordinateText) {
    setInterval(() => {

        coordinateIndex++;

        if (coordinateIndex >= coordinates.length) {
            coordinateIndex = 0;
        }

        coordinateText.innerHTML =
            coordinates[coordinateIndex];

    }, 5000);
}

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
