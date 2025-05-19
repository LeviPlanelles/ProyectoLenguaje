let map;
let markers = [];
let failCounter = 0; // Contador de fallos

// Inicializar el mapa
function initMap() {
    map = L.map('map').setView([38.7849, 0.1802], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Añadir geolocalización
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Crear un marcador personalizado para la ubicación actual
            const userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-location-marker',
                    html: '<div class="pulse"></div>',
                    iconSize: [20, 20]
                })
            }).addTo(map);

            userMarker.bindPopup('Tu ubicación actual').openPopup();
            map.setView([lat, lng], 13);
        }, function(error) {
            console.error('Error al obtener la ubicación:', error);
            alert('No se pudo obtener tu ubicación actual.');
        });
    } else {
        console.error('Geolocalización no disponible');
        alert('Tu dispositivo no soporta geolocalización.');
    }

    return map;
}

// Cargar la lista de archivos JSON disponibles
async function loadJsonFiles() {
    try {
        const jsonFiles = ['javea', 'denia'];
        
        const select = document.getElementById('json-select');
        select.innerHTML = '<option value="">Elige una localidad</option>';
        
        jsonFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file.charAt(0).toUpperCase() + file.slice(1);
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar los archivos JSON:', error);
    }
}

// Iniciar la aplicación con el JSON seleccionado
async function startWithJson(jsonName) {
    if (!jsonName) {
        alert('Por favor, selecciona una localidad');
        return;
    }

    try {
        const response = await fetch(`../locations/${jsonName}.json`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const locations = await response.json();
        
        document.getElementById('selector').classList.add('hidden');
        document.getElementById('map').style.display = 'block';
        
        map = initMap();
        
        locations.forEach(location => {
            if (location.coordenadas && location.coordenadas.lat && location.coordenadas.lng) {
                const marker = L.marker([location.coordenadas.lat, location.coordenadas.lng]);
                const popupContent = createPopupContent(location);
                marker.bindPopup(popupContent);
                marker.addTo(map);
                markers.push(marker);
            }
        });

        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            map.fitBounds(group.getBounds());
        }
        
        // Reiniciar el contador de fallos al iniciar
        failCounter = 0;
        updateFailCounter();
    } catch (error) {
        console.error('Error al cargar los puntos:', error);
        alert('Error al cargar los puntos. Verifica que los archivos JSON estén en la carpeta locations junto al archivo index.html');
    }
}

function createPopupContent(location) {
    const container = document.createElement('div');
    container.className = 'popup-content';

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = location.nombre;
    container.appendChild(title);

    if (location.pregunta) {
        const question = document.createElement('div');
        question.className = 'popup-question';
        question.textContent = location.pregunta;
        container.appendChild(question);

        if (location.respuestas && location.respuestas.opciones) {
            const pointId = `point_${location.nombre.replace(/\s+/g, '_')}`;
            const hasBeenAttempted = sessionStorage.getItem(pointId);

            if (!hasBeenAttempted) {
                location.respuestas.opciones.forEach((opcion, index) => {
                    const answerOption = document.createElement('div');
                    answerOption.className = 'answer-option';
                    answerOption.textContent = opcion;
                    
                    answerOption.addEventListener('click', () => {
                        sessionStorage.setItem(pointId, 'true');
                        
                        container.querySelectorAll('.answer-option').forEach(opt => {
                            opt.style.pointerEvents = 'none';
                            opt.style.opacity = '0.7';
                        });
                        
                        const isCorrect = index === location.respuestas.correcta;
                        answerOption.classList.add('selected');
                        answerOption.classList.add(isCorrect ? 'correct' : 'incorrect');
                        
                        if (!isCorrect) {
                            failCounter++;
                            updateFailCounter();
                        }
                        
                        const resultMessage = document.createElement('div');
                        resultMessage.className = `result-message ${isCorrect ? 'correct' : 'incorrect'}`;
                        resultMessage.textContent = isCorrect ? 
                            '¡Correcto!' : 'Incorrecto. ¡Inténtalo de nuevo después de cerrar el navegador!';
                        
                        const existingMessage = container.querySelector('.result-message');
                        if (existingMessage) {
                            container.removeChild(existingMessage);
                        }
                        container.appendChild(resultMessage);
                    });

                    container.appendChild(answerOption);
                });
            } else {
                const attemptedMessage = document.createElement('div');
                attemptedMessage.className = 'result-message';
                attemptedMessage.textContent = 'Ya has intentado responder esta pregunta. Cierra el navegador para intentarlo de nuevo.';
                container.appendChild(attemptedMessage);
            }
        }
    }

    return container;
}

// Función para actualizar el contador en la interfaz
function updateFailCounter() {
    let counterElement = document.getElementById('fail-counter');
    if (!counterElement) {
        counterElement = document.createElement('div');
        counterElement.id = 'fail-counter';
        counterElement.style.position = 'fixed';
        counterElement.style.bottom = '20px';
        counterElement.style.right = '20px';
        counterElement.style.backgroundColor = 'rgba(244, 67, 54, 0.9)';
        counterElement.style.color = 'white';
        counterElement.style.padding = '10px 20px';
        counterElement.style.borderRadius = '5px';
        counterElement.style.fontWeight = 'bold';
        counterElement.style.zIndex = '1000';
        document.body.appendChild(counterElement);
    }
    counterElement.textContent = `Fallos: ${failCounter}`;
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    loadJsonFiles();
    
    // Manejar el botón de inicio
    document.getElementById('start-button').addEventListener('click', () => {
        const selectedJson = document.getElementById('json-select').value;
        startWithJson(selectedJson);
    });
});