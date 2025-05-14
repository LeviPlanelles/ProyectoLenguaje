const { ipcRenderer } = require('electron');

// Inicializar el mapa
const map = L.map('map').setView([38.7849, 0.1802], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let currentPopup = null;
const markers = {};

// Elementos del DOM para la sidebar
const sidebar = document.querySelector('.sidebar');
const toggleBtn = document.querySelector('.toggle-btn');
const locationList = document.getElementById('location-list');

// Toggle sidebar
toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

function updateLocationsList(locations) {
    locationList.innerHTML = '';
    locations.forEach(location => {
        const li = document.createElement('li');
        li.className = 'location-item';
        
        // Contenedor del encabezado con nombre y botones
        const locationHeader = document.createElement('div');
        locationHeader.className = 'location-header';
        
        // Nombre del punto
        const nameSpan = document.createElement('span');
        nameSpan.textContent = location.nombre;
        nameSpan.style.cursor = 'pointer';
        
        // Añadir evento de clic al nombre para mostrar/ocultar detalles
        nameSpan.addEventListener('click', () => {
            detailsDiv.classList.toggle('active');
            map.setView([location.coordenadas.lat, location.coordenadas.lng], 13);
        });
        
        // Contenedor de botones
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'location-buttons';
        
        // Botón de editar nombre
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Editar nombre';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            const newName = prompt('Nuevo nombre para el punto:', location.nombre);
            if (newName && newName.trim() !== '') {
                const updatedLocation = {
                    ...location,
                    nombre: newName.trim()
                };
                
                // Eliminar el marcador antiguo
                if (markers[location.nombre]) {
                    markers[location.nombre].remove();
                    delete markers[location.nombre];
                }
                
                ipcRenderer.send('update-location', updatedLocation);
            }
        };
        
        // Botón de eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '✖';
        deleteBtn.title = 'Eliminar punto';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de que quieres eliminar este punto?')) {
                try {
                    // Enviar el evento de eliminación y esperar la respuesta
                    ipcRenderer.sendSync('delete-location', location.nombre);
                    
                    // Obtener la lista actualizada
                    const locations = ipcRenderer.sendSync('get-locations');
                    
                    // Limpiar todos los marcadores existentes
                    Object.values(markers).forEach(marker => {
                        if (marker && typeof marker.remove === 'function') {
                            marker.remove();
                        }
                    });
                    
                    // Reiniciar el objeto de marcadores
                    Object.keys(markers).forEach(key => delete markers[key]);
                    
                    // Actualizar la lista y los marcadores
                    locations.forEach(addMarker);
                    updateLocationsList(locations);
                } catch (error) {
                    console.error('Error al eliminar el punto:', error);
                    alert('Error al eliminar el punto. Por favor, intenta de nuevo.');
                }
            }
        };
        
        // Añadir botones al contenedor
        buttonsDiv.appendChild(editBtn);
        buttonsDiv.appendChild(deleteBtn);
        
        // Construir el header
        locationHeader.appendChild(nameSpan);
        locationHeader.appendChild(buttonsDiv);
        
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'location-details';
        
        const questionInput = document.createElement('textarea');
        questionInput.placeholder = 'Escribe tu pregunta aquí';
        questionInput.value = location.pregunta || '';
        
        const answersContainer = document.createElement('div');
        for(let i = 0; i < 4; i++) {
            const answerContainer = document.createElement('div');
            answerContainer.className = 'answer-container';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Respuesta ${i + 1}`;
            input.value = location.respuestas?.opciones[i] || '';
            
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `correct-${location.nombre}`;
            radio.value = i;
            if(location.respuestas?.correcta === i) radio.checked = true;
            
            label.appendChild(input);
            label.appendChild(radio);
            label.appendChild(document.createTextNode('Correcta'));
            
            answerContainer.appendChild(label);
            answersContainer.appendChild(answerContainer);
        }
        
        const saveButton = document.createElement('button');
        saveButton.className = 'save-button';
        saveButton.textContent = 'Guardar';
        saveButton.onclick = (e) => {
            e.stopPropagation();
            const answers = Array.from(answersContainer.querySelectorAll('input[type="text"]'))
                .map(input => input.value);
            const correctAnswer = parseInt(answersContainer.querySelector(`input[name="correct-${location.nombre}"]:checked`).value);
            
            ipcRenderer.send('update-question', {
                nombre: location.nombre,
                pregunta: questionInput.value,
                respuestas: {
                    opciones: answers,
                    correcta: correctAnswer
                }
            });
        };
        
        detailsDiv.appendChild(questionInput);
        detailsDiv.appendChild(answersContainer);
        detailsDiv.appendChild(saveButton);
        
        // Añadir el header antes del detailsDiv
        li.appendChild(locationHeader);
        li.appendChild(detailsDiv);
        
        locationList.appendChild(li);
    });
}

// Manejar eventos del mapa
function addMarker(placeData) {
    const { nombre, coordenadas } = placeData;
    const marker = L.marker([coordenadas.lat, coordenadas.lng], { draggable: true })
        .addTo(map)
        .bindPopup(`<b>${nombre}</b><br>(Arrástrame para mover)`);

    markers[nombre] = marker;

    marker.on('dragend', (event) => {
        const newCoords = event.target.getLatLng();
        const updatedData = {
            ...placeData,
            coordenadas: { lat: newCoords.lat, lng: newCoords.lng }
        };

        ipcRenderer.send('update-location', updatedData);
    });

    return marker;
}

// Eliminar el segundo evento click del mapa y mantener solo este
map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (currentPopup) {
        map.closePopup(currentPopup);
    }

    currentPopup = L.popup()
        .setLatLng(e.latlng)
        .setContent(`
            <input type="text" id="place-name" placeholder="Nombre del lugar" style="width: 100%; padding: 5px; margin-bottom: 5px;">
            <button id="save-place" style="width: 100%; padding: 5px; background: #007bff; color: white; border: none; cursor: pointer;">Guardar</button>
        `)
        .openOn(map);

    setTimeout(() => {
        const input = document.getElementById('place-name');
        const button = document.getElementById('save-place');

        if (input && button) {
            const savePoint = () => {
                const placeName = input.value.trim();
                if (placeName !== '') {
                    const placeData = {
                        nombre: placeName,
                        coordenadas: { lat, lng }
                    };

                    ipcRenderer.send('save-location', placeData);
                    addMarker(placeData);
                    
                    const locations = ipcRenderer.sendSync('get-locations');
                    updateLocationsList(locations);
                    
                    map.closePopup(currentPopup);
                    currentPopup = null;
                } else {
                    alert('Por favor, introduce un nombre.');
                }
            };

            button.addEventListener('click', savePoint);
            input.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    savePoint();
                }
            });

            input.focus();
        }
    }, 100);
});

// Escuchar eventos del proceso principal
ipcRenderer.on('load-locations', (event, locations) => {
    locations.forEach(addMarker);
    updateLocationsList(locations);
});

ipcRenderer.on('location-saved', () => {
    const locations = ipcRenderer.sendSync('get-locations');
    updateLocationsList(locations);
});

ipcRenderer.on('location-updated', () => {
    const locations = ipcRenderer.sendSync('get-locations');
    updateLocationsList(locations);
});

// Unificar el evento location-deleted
ipcRenderer.on('location-deleted', () => {
    // Ya no necesitamos este evento ya que la actualización se hace de forma síncrona
});

ipcRenderer.on('question-updated', () => {
    const locations = ipcRenderer.sendSync('get-locations');
    updateLocationsList(locations);
});


// Añadir después de la inicialización de los elementos DOM
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// Función para realizar la búsqueda
function searchLocation() {
    const searchTerm = searchInput.value.trim();
    if (searchTerm === '') {
        alert('Por favor, introduce un término de búsqueda');
        return;
    }

    // Usar el servicio de geocodificación de OpenStreetMap
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const location = data[0];
                map.setView([location.lat, location.lon], 16);
            } else {
                alert('No se encontró la ubicación');
            }
        })
        .catch(error => {
            console.error('Error en la búsqueda:', error);
            alert('Error al buscar la ubicación');
        });
}

// Evento para el botón de búsqueda
searchBtn.addEventListener('click', searchLocation);

// Evento para la tecla enter en el campo de búsqueda
searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchLocation();
    }
});
