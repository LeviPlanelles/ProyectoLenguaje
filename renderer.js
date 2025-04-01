document.addEventListener("DOMContentLoaded", () => {
    const map = L.map("map").setView([38.7886, 0.1629], 13); // Madrid como punto inicial

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
});
