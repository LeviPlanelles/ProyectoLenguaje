const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("map").setView([38.7886, 0.1629], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-btn");

    function searchLocation() {
        const query = searchInput.value.trim();
        if (query === "") return;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const { lat, lon } = data[0];
                    map.setView([lat, lon], 13);
                } else {
                    alert("Ubicación no encontrada. Intenta con otro término.");
                }
            })
            .catch(error => console.error("Error en la búsqueda:", error));
    }

    searchButton.addEventListener("click", searchLocation);
    searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            searchLocation();
        }
    });

    let currentPopup = null;

    map.on("click", (e) => {
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
            const input = document.getElementById("place-name");
            const button = document.getElementById("save-place");

            if (input && button) {
                button.addEventListener("click", () => {
                    const placeName = input.value.trim();
                    if (placeName !== "") {
                        const placeData = {
                            nombre: placeName,
                            coordenadas: { lat, lng }
                        };

                        ipcRenderer.send("save-location", placeData);
                        addMarker(placeData); // Agregar al mapa inmediatamente

                        map.closePopup(currentPopup);
                        currentPopup = null;
                    } else {
                        alert("Por favor, introduce un nombre.");
                    }
                });

                input.focus();
            }
        }, 100);
    });

    function addMarker(placeData) {
        const { nombre, coordenadas } = placeData;
        const marker = L.marker([coordenadas.lat, coordenadas.lng], { draggable: true })
            .addTo(map)
            .bindPopup(`<b>${nombre}</b><br>(Arrástrame para mover)`);

        marker.on("dragend", (event) => {
            const newCoords = event.target.getLatLng();
            const updatedData = {
                nombre: nombre,
                coordenadas: { lat: newCoords.lat, lng: newCoords.lng }
            };

            ipcRenderer.send("update-location", updatedData);
        });
    }

    // Cargar ubicaciones guardadas
    ipcRenderer.on("load-locations", (event, locations) => {
        locations.forEach(addMarker);
    });
});
