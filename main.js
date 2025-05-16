const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let selectedJsonPath = '';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
    
    // Mostrar diálogo de selección al inicio
    showJsonSelectionDialog();
});

function showJsonSelectionDialog() {
    const locationsDir = path.join(__dirname, 'locations');
    
    // Crear el directorio si no existe
    if (!fs.existsSync(locationsDir)) {
        fs.mkdirSync(locationsDir);
    }
    
    // Leer archivos JSON existentes
    const jsonFiles = fs.readdirSync(locationsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => ({
            name: file.replace('.json', ''),
            path: path.join(locationsDir, file)
        }));
    
    // Enviar lista de archivos al renderer
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('json-files', jsonFiles);
    });
}

// Manejar la creación de nuevo archivo JSON
ipcMain.on('create-json', (event, locationName) => {
    const fileName = `${locationName}.json`;
    const filePath = path.join(__dirname, 'locations', fileName);
    
    fs.writeFileSync(filePath, '[]');
    selectedJsonPath = filePath;
    event.reply('json-selected', selectedJsonPath);
});

// Manejar la selección de archivo JSON existente
ipcMain.on('select-json', (event, filePath) => {
    selectedJsonPath = filePath;
    event.reply('json-selected', selectedJsonPath);
});

// Modificar los eventos existentes para usar selectedJsonPath
// Eliminar esta duplicación del evento save-location
ipcMain.on('save-location', (event, locationData) => {
    try {
        if (!selectedJsonPath) {
            console.error('No hay un archivo JSON seleccionado');
            return;
        }
        const locations = JSON.parse(fs.readFileSync(selectedJsonPath, 'utf8'));
        locations.push(locationData);
        fs.writeFileSync(selectedJsonPath, JSON.stringify(locations, null, 2));
        event.reply('location-saved');
    } catch (error) {
        console.error('Error al guardar la ubicación:', error);
    }
});

// Eliminar estas líneas que hacen referencia a locations.json
// const locationsPath = path.join(__dirname, "locations");
// const filePath = path.join(locationsPath, "locations.json");

// Actualizar los otros eventos para usar selectedJsonPath
ipcMain.on('update-location', (event, updatedLocation) => {
    try {
        if (!selectedJsonPath) {
            console.error('No hay un archivo JSON seleccionado');
            return;
        }
        const locations = JSON.parse(fs.readFileSync(selectedJsonPath, 'utf8'));
        const updatedLocations = locations.map((loc) =>
            loc.nombre === updatedLocation.nombre ? updatedLocation : loc
        );
        fs.writeFileSync(selectedJsonPath, JSON.stringify(updatedLocations, null, 2));
        event.reply('location-updated');
    } catch (error) {
        console.error('Error al actualizar la ubicación:', error);
    }
});

ipcMain.on('update-question', (event, data) => {
    try {
        if (!selectedJsonPath) {
            console.error('No hay un archivo JSON seleccionado');
            return;
        }
        const locations = JSON.parse(fs.readFileSync(selectedJsonPath, 'utf8'));
        const updatedLocations = locations.map(loc => {
            if (loc.nombre === data.nombre) {
                return {
                    ...loc,
                    pregunta: data.pregunta,
                    respuestas: data.respuestas
                };
            }
            return loc;
        });
        fs.writeFileSync(selectedJsonPath, JSON.stringify(updatedLocations, null, 2));
        event.reply('question-updated');
    } catch (error) {
        console.error('Error al actualizar la pregunta:', error);
    }
});

ipcMain.on("delete-location", (event, locationName) => {
    try {
        if (!selectedJsonPath) {
            console.error('No hay un archivo JSON seleccionado');
            return;
        }
        const locations = JSON.parse(fs.readFileSync(selectedJsonPath, 'utf8'));
        const updatedLocations = locations.filter(loc => loc.nombre !== locationName);
        fs.writeFileSync(selectedJsonPath, JSON.stringify(updatedLocations, null, 2));
        event.reply('location-deleted', updatedLocations);
    } catch (error) {
        console.error('Error al eliminar la ubicación:', error);
        event.reply('location-deleted', []);
    }
});

// Obtener ubicaciones
// Modificar el evento get-locations para usar el archivo seleccionado
ipcMain.on('get-locations', (event) => {
    try {
        if (!selectedJsonPath) {
            event.returnValue = [];
            return;
        }
        const locations = JSON.parse(fs.readFileSync(selectedJsonPath, 'utf8'));
        event.returnValue = locations;
    } catch (error) {
        console.error('Error al obtener las ubicaciones:', error);
        event.returnValue = [];
    }
});
