// Inicializar el mapa
const map = L.map('map').setView([38.7849, 0.1802], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Cargar los puntos desde el archivo JSON
fetch('../locations/locations.json')
    .then(response => response.json())
    .then(locations => {
        locations.forEach(location => {
            const marker = L.marker([location.coordenadas.lat, location.coordenadas.lng], {
                draggable: false // Los marcadores no se pueden mover
            });

            const popupContent = createPopupContent(location);
            marker.bindPopup(popupContent);
            marker.addTo(map);
        });
    })
    .catch(error => console.error('Error al cargar las ubicaciones:', error));

function createPopupContent(location) {
    const container = document.createElement('div');
    container.className = 'popup-content';

    const title = document.createElement('div');
    title.className = 'popup-title';
    title.textContent = location.nombre;

    const question = document.createElement('div');
    question.className = 'popup-question';
    question.textContent = location.pregunta;

    const resultMessage = document.createElement('div');
    resultMessage.className = 'result-message';

    container.appendChild(title);
    container.appendChild(question);

    location.respuestas.opciones.forEach((opcion, index) => {
        const answerOption = document.createElement('div');
        answerOption.className = 'answer-option';
        answerOption.textContent = opcion;
        
        answerOption.addEventListener('click', () => {
            // Eliminar la selección previa
            container.querySelectorAll('.answer-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Seleccionar la opción actual
            answerOption.classList.add('selected');
            
            // Mostrar el resultado
            resultMessage.style.display = 'block';
            if (index === location.respuestas.correcta) {
                resultMessage.textContent = '¡Correcto!';
                resultMessage.className = 'result-message correct';
            } else {
                resultMessage.textContent = 'Incorrecto, intenta de nuevo';
                resultMessage.className = 'result-message incorrect';
            }
        });

        container.appendChild(answerOption);
    });

    container.appendChild(resultMessage);
    return container;
}