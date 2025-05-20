// Variables globales
let map;
let userMarker;
let userCircle;
const INTERACTION_RADIUS = 100; // Radio de interacción en metros
let answeredQuestions = new Set();

// Inicialización del mapa
document.addEventListener('DOMContentLoaded', function() {
    // Cargar el selector de JSON
    loadJSONSelector();

    // Evento para iniciar la aventura
    document.getElementById('start-button').addEventListener('click', startAdventure);
});

function loadJSONSelector() {
    const select = document.getElementById('json-select');
    fetch('../locations/denia.json')
        .then(response => {
            if (!response.ok) throw new Error('Error cargando denia.json');
            return response;
        })
        .then(() => {
            select.innerHTML += `<option value="../locations/denia.json">Denia</option>`;
        })
        .catch(error => console.error('Error cargando denia.json:', error));
    
    fetch('../locations/javea.json')
        .then(response => {
            if (!response.ok) throw new Error('Error cargando javea.json');
            return response;
        })
        .then(() => {
            select.innerHTML += `<option value="../locations/javea.json">Javea</option>`;
        })
        .catch(error => console.error('Error cargando javea.json:', error));
}

function startAdventure() {
    const selectedFile = document.getElementById('json-select').value;
    if (!selectedFile) {
        alert('Por favor, selecciona una localidad');
        return;
    }

    // Ocultar selector y mostrar mapa
    document.getElementById('selector').style.display = 'none';
    document.getElementById('map').style.display = 'block';

    // Inicializar mapa
    initMap();

    // Cargar puntos y comenzar seguimiento de ubicación
    loadJSONData(selectedFile);
    initLocationTracking();
}

function initMap() {
    map = L.map('map').setView([0, 0], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function initLocationTracking() {
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(updateUserLocation, handleLocationError, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        });
    } else {
        alert('La geolocalización no está disponible en tu dispositivo');
    }
}

function updateUserLocation(position) {
    const { latitude, longitude } = position.coords;
    
    // Actualizar o crear el marcador del usuario
    if (!userMarker) {
        userMarker = L.marker([latitude, longitude], {
            icon: L.divIcon({
                className: 'user-location-marker',
                html: '<div class="pulse"></div>'
            })
        }).addTo(map);
        map.setView([latitude, longitude], 15);
    } else {
        userMarker.setLatLng([latitude, longitude]);
    }

    // Actualizar o crear el círculo de interacción
    if (!userCircle) {
        userCircle = L.circle([latitude, longitude], {
            radius: INTERACTION_RADIUS,
            className: 'interaction-circle'
        }).addTo(map);
    } else {
        userCircle.setLatLng([latitude, longitude]);
    }

    checkPointsInRange(latitude, longitude);
}

function handleLocationError(error) {
    console.error('Error al obtener la ubicación:', error);
    alert('No se pudo obtener tu ubicación. Por favor, verifica los permisos de ubicación.');
}

function enableMarkerInteraction(marker) {
    marker.off('click'); // Eliminar handlers anteriores
    marker.on('click', function(e) {
        marker.openPopup();
    });
}

function checkPointsInRange(userLat, userLng) {
    const markers = map._layers;
    Object.values(markers).forEach(layer => {
        if (layer instanceof L.Marker && layer !== userMarker) {
            const markerLatLng = layer.getLatLng();
            const distance = calculateDistance(
                userLat, userLng,
                markerLatLng.lat, markerLatLng.lng
            );

            if (distance > INTERACTION_RADIUS) {
                layer.off('click');
                layer.on('click', showRangeMessage);
                layer.getElement()?.classList.add('point-disabled');
            } else {
                layer.getElement()?.classList.remove('point-disabled');
                enableMarkerInteraction(layer);
            }
        }
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
}

function showRangeMessage() {
    const message = document.getElementById('rangeMessage');
    message.style.display = 'block';
    setTimeout(() => {
        message.style.display = 'none';
    }, 3000);
}

function loadJSONData(filename) {
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            createMarkers(data);
        })
        .catch(error => {
            console.error('Error cargando el JSON:', error);
            alert('Error al cargar los datos de la localidad');
        });
}

function createMarkers(data) {
    data.forEach((point, index) => {
        const marker = L.marker([point.coordenadas.lat, point.coordenadas.lng])
            .addTo(map);
        
        marker.bindPopup(`
            <h3>${point.nombre}</h3>
            <p>${point.pregunta}</p>
            <div class="options">
                ${point.respuestas.opciones.map((opcion, optIndex) => `
                    <button onclick="checkAnswer(${optIndex}, ${point.respuestas.correcta}, ${index})" 
                            ${answeredQuestions.has(index) ? 'disabled' : ''}>
                        ${opcion}
                    </button>
                `).join('')}
            </div>
            <div class="feedback-message"></div>
        `);
    });
}

function checkAnswer(selected, correct, pointId) {
    if (answeredQuestions.has(pointId)) {
        return;
    }

    const popup = document.querySelector('.leaflet-popup-content');
    const buttons = popup.querySelectorAll('.options button');
    const feedbackMessage = popup.querySelector('.feedback-message');

    if (selected === correct) {
        buttons[selected].classList.add('correct');
        feedbackMessage.textContent = '¡Respuesta correcta!';
        feedbackMessage.classList.add('correct', 'show');
    } else {
        buttons[selected].classList.add('incorrect');
        buttons[correct].classList.add('correct');
        feedbackMessage.textContent = 'Respuesta incorrecta';
        feedbackMessage.classList.add('incorrect', 'show');
    }

    // Deshabilitar todos los botones después de responder
    buttons.forEach(button => {
        button.disabled = true;
    });

    // Marcar la pregunta como respondida
    answeredQuestions.add(pointId);
    localStorage.setItem('answeredQuestions', JSON.stringify([...answeredQuestions]));
}