let map;
let markers = [];

// Inicializar el mapa
function initMap() {
    map = L.map('map').setView([38.7849, 0.1802], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
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
        // Modificar la ruta para usar la ruta correcta
        const response = await fetch(`../locations/${jsonName}.json`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const locations = await response.json();
        console.log('Datos cargados:', locations); // Para depuración
        
        // Ocultar selector y mostrar mapa
        document.getElementById('selector').classList.add('hidden');
        document.getElementById('map').style.display = 'block';
        
        // Inicializar mapa y esperar a que esté listo
        map = initMap();
        
        // Cargar los puntos inmediatamente
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
    } catch (error) {
        console.error('Error al cargar los puntos:', error);
        console.error('Detalles del error:', error.message);
        alert('Error al cargar los puntos. Asegúrate de que los archivos JSON estén en la carpeta locations.');
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
            // Cambiar localStorage por sessionStorage
            const pointId = `point_${location.nombre.replace(/\s+/g, '_')}`;
            const hasBeenAttempted = sessionStorage.getItem(pointId);

            if (!hasBeenAttempted) {
                location.respuestas.opciones.forEach((opcion, index) => {
                    const answerOption = document.createElement('div');
                    answerOption.className = 'answer-option';
                    answerOption.textContent = opcion;
                    
                    answerOption.addEventListener('click', () => {
                        // Usar sessionStorage en lugar de localStorage
                        sessionStorage.setItem(pointId, 'true');
                        
                        // Deshabilitar todos los botones de respuesta
                        container.querySelectorAll('.answer-option').forEach(opt => {
                            opt.style.pointerEvents = 'none';
                            opt.style.opacity = '0.7';
                        });
                        
                        const isCorrect = index === location.respuestas.correcta;
                        answerOption.classList.add('selected');
                        answerOption.classList.add(isCorrect ? 'correct' : 'incorrect');
                        
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
                // Si ya se intentó, mostrar mensaje
                const attemptedMessage = document.createElement('div');
                attemptedMessage.className = 'result-message';
                attemptedMessage.textContent = 'Ya has intentado responder esta pregunta. Cierra el navegador para intentarlo de nuevo.';
                container.appendChild(attemptedMessage);
            }
        }
    }

    return container;
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