// === GLOBAL VARIABLES & INITIALIZATION ===
const busRoutes = {
    vijayawada: { 
        name: "Hyd to Vijayawada", 
        stops: [
            {lat:17.3850, lng:78.4867, name: "Hyderabad Central"}, 
            {lat:17.3456, lng:78.5521, name: "LB Nagar"}, 
            {lat:16.5062, lng:80.6480, name: "Vijayawada Terminal"}
        ] 
    },
    mumbai: { 
        name: "Hyd to Mumbai", 
        stops: [
            {lat:17.3850, lng:78.4867, name: "Hyderabad Central"}, 
            {lat:17.4430, lng:78.3490, name: "Miyapur"}, 
            {lat:19.0760, lng:72.8777, name: "Mumbai Gateway"}
        ] 
    },
    chennai: { 
        name: "Hyd to Chennai", 
        stops: [
            {lat:17.3858, lng:78.4860, name: "Hyderabad Koti"}, 
            {lat:14.4426, lng:79.9865, name: "Nellore Junction"}, 
            {lat:13.0827, lng:80.2707, name: "Chennai Egmore"}
        ] 
    },
    delhi: { 
        name: "Hyd to Delhi", 
        stops: [
            {lat:17.3850, lng:78.4867, name: "Hyderabad Central"}, 
            {lat:21.1458, lng:79.0882, name: "Nagpur"}, 
            {lat:28.6139, lng:77.2090, name: "New Delhi"}
        ] 
    },
    bangalore: { 
        name: "Hyd to Bangalore", 
        stops: [
            {lat:17.3858, lng:78.4860, name: "Koti"}, 
            {lat:15.8281, lng:78.0373, name: "Kurnool"}, 
            {lat:12.9716, lng:77.5946, name: "Bangalore Majestic"}
        ] 
    }
};

let map = L.map('map').setView([17.3850, 78.4867], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let busIcon = L.icon({ iconUrl: 'https://img.icons8.com/emoji/48/bus-emoji.png', iconSize: [40, 40] });
let busMarker, routeLine, busInterval, currentRoute, index = 0, startTime;
const synth = window.speechSynthesis;
let alertedStops = new Set();

// --- VOICE ENGINE ---
function speak(text) {
    if (synth.speaking) synth.cancel(); // Stop current talking to avoid overlap
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    synth.speak(utterance);
}

// --- BUS TRACKING LOGIC ---
function selectBus(key, element) {
    document.querySelectorAll('.bus-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
    
    currentRoute = busRoutes[key];
    document.getElementById('display-selected-bus').value = currentRoute.name;
    renderSeats();

    if (busMarker) map.removeLayer(busMarker);
    if (routeLine) map.removeLayer(routeLine);
    
    routeLine = L.polyline(currentRoute.stops.map(s => [s.lat, s.lng]), { color: 'blue', weight: 4 }).addTo(map);
    map.fitBounds(routeLine.getBounds());
    busMarker = L.marker([currentRoute.stops[0].lat, currentRoute.stops[0].lng], { icon: busIcon }).addTo(map);
    index = 0;
    alertedStops.clear();
}

function startBusManually() {
    if (!currentRoute) return alert("Please select a bus route from the list first!");
    
    // Voice feedback on Start
    speak("The bus has started. Live tracking is now active. Please be seated.");
    
    startTime = Date.now();
    alertedStops.clear();
    if (busInterval) clearInterval(busInterval);
    busInterval = setInterval(updateBus, 1000);
}

function updateBus() {
    if (!currentRoute || index >= currentRoute.stops.length - 1) {
        if (index >= currentRoute.stops.length - 1) {
            speak("We have reached the final destination. Thank you for traveling with Smart Bus.");
            clearInterval(busInterval);
        }
        return;
    }

    const A = currentRoute.stops[index];
    const B = currentRoute.stops[index + 1];
    
    // Simulate journey: each stop-to-stop takes 10 seconds
    const progress = Math.min((Date.now() - startTime) / 10000, 1);
    const lat = A.lat + (B.lat - A.lat) * progress;
    const lng = A.lng + (B.lng - A.lng) * progress;
    
    busMarker.setLatLng([lat, lng]);

    // --- 5 MINUTE ALERT LOGIC ---
    // (Simulated: Triggers when 70% of the way to the next stop)
    if (progress >= 0.7 && !alertedStops.has(index + "_near")) {
        speak(`Attention passengers, we will reach ${B.name} in approximately 5 minutes.`);
        alertedStops.add(index + "_near");
    }

    // Arrival Logic
    if (progress >= 1) {
        index++;
        startTime = Date.now();
        speak(`Now arriving at ${B.name}.`);
    }
}

// --- EMERGENCY LOGIC ---
function triggerEmergency() {
    // Immediate Voice Alert to Passengers
    speak("Attention passengers. An emergency signal has been sent to the police control room. Please remain calm.");
    
    // Visual Feedback
    alert('🚨 SOS SENT: Authorities have been notified of your live location.');
}

// --- SEAT RESERVATION LOGIC ---
function renderSeats() {
    const container = document.getElementById('seat-container');
    const windowOnly = document.getElementById('window-only').checked;
    container.innerHTML = '';
    const occupied = [3, 8, 12]; 
    
    for (let i = 1; i <= 20; i++) {
        if (i > 1 && (i - 1) % 4 === 2) {
            const gap = document.createElement('div');
            gap.className = 'gap';
            container.appendChild(gap);
        }
        const isWindow = (i % 4 === 1 || i % 4 === 0);
        if (windowOnly && !isWindow) continue;
        const seat = document.createElement('div');
        const isOccupied = occupied.includes(i);
        seat.className = `seat ${isOccupied ? 'occupied' : 'available'} ${isWindow ? 'window' : ''}`;
        seat.innerText = i;
        if (!isOccupied) {
            seat.onclick = function() {
                document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('selected-seat-num').value = i;
            };
        }
        container.appendChild(seat);
    }
}

function confirmSelection() {
    const bus = document.getElementById('display-selected-bus').value;
    const seat = document.getElementById('selected-seat-num').value;
    if (bus === "None (Select from map)") return alert("Select a bus route first.");
    if (!seat) return alert("Please pick a seat.");
    
    const msg = `✅ Seat ${seat} reserved for ${bus}`;
    document.getElementById('selection-result').innerText = msg;
    speak(`Seat ${seat} has been successfully reserved.`);
    alert(msg);
}

// Map Controls
function zoomIn() { map.zoomIn(); }
function zoomOut() { map.zoomOut(); }
function centerMap() { if (busMarker) map.panTo(busMarker.getLatLng()); }

window.onload = () => { renderSeats(); };
