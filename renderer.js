document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("map").setView([38.7886, 0.1629], 13); // Jávea como punto inicial

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

    let currentPopup = null; // Variable para almacenar el popup actual

    map.on("click", (e) => {
        const { lat, lng } = e.latlng;

        // Cerrar popup anterior si existe
        if (currentPopup) {
            map.closePopup(currentPopup);
        }

        // Crear nuevo popup
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
                        // Crear marcador en la ubicación guardada
                        const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
                            .bindPopup(`<b>${placeName}</b><br>(Arrástrame para mover)`);

                        // Mostrar datos en la consola
                        const placeData = {
                            nombre: placeName,
                            coordenadas: { lat, lng }
                        };
                        console.log(JSON.stringify(placeData, null, 2));

                        // Evento para detectar cuando el marcador es movido
                        marker.on("dragend", (event) => {
                            const newCoords = event.target.getLatLng();
                            console.log(`Marcador "${placeName}" movido a:`, {
                                lat: newCoords.lat,
                                lng: newCoords.lng
                            });
                        });

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
});
