let currentWeatherData = null;
let editingRecordId = null;
let db = null;

// Weather icons mapping
const ICON_OPTIONS = [
    { code: '01d', name: 'Clear Sky (Day)' },
    { code: '01n', name: 'Clear Sky (Night)' },
    { code: '02d', name: 'Few Clouds (Day)' },
    { code: '02n', name: 'Few Clouds (Night)' },
    { code: '03d', name: 'Scattered Clouds' },
    { code: '04d', name: 'Broken Clouds' },
    { code: '09d', name: 'Shower Rain' },
    { code: '10d', name: 'Rain (Day)' },
    { code: '10n', name: 'Rain (Night)' },
    { code: '11d', name: 'Thunderstorm' },
    { code: '13d', name: 'Snow' },
    { code: '50d', name: 'Mist/Fog' }
];

// Utility functions
function getWeatherIconUrl(iconCode, size = '2x') {
    const validIconCode = iconCode && iconCode.length >= 3 ? iconCode : '01d';
    return `https://openweathermap.org/img/wn/${validIconCode}@${size}.png`;
}

function isLatLon(value) {
    return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value);
}

// Database operations
async function initDatabase() {
    try {
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        const savedDB = localStorage.getItem('weatherDatabase');
        if (savedDB) {
            const uInt8Array = new Uint8Array(JSON.parse(savedDB));
            db = new SQL.Database(uInt8Array);
        } else {
            db = new SQL.Database();
            createTables();
        }
        
        console.log('Database initialized successfully');
        loadRecords();
    } catch (error) {
        console.error('Failed to initialize database:', error);
        alert('Database initialization failed. Please refresh the page.');
    }
}

function createTables() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS weather_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location TEXT NOT NULL,
            location_type TEXT,
            temperature REAL,
            condition TEXT,
            description TEXT,
            humidity INTEGER,
            wind_speed REAL,
            pressure REAL,
            icon TEXT,
            forecast_data TEXT,
            date_range_start TEXT,
            date_range_end TEXT,
            timestamp TEXT,
            saved_at TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    db.run(createTableSQL);
    saveDatabase();
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Array.from(data);
        localStorage.setItem('weatherDatabase', JSON.stringify(buffer));
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    await initDatabase();
    
    const today = new Date();
    const futureDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    document.getElementById('endDate').value = futureDate.toISOString().split('T')[0];
});

// UI functions
function createIconSelector(selectedIcon = '01d') {
    let html = '<select id="editIcon" class="form-control">';
    
    ICON_OPTIONS.forEach(option => {
        const selected = option.code === selectedIcon ? 'selected' : '';
        html += `<option value="${option.code}" ${selected}>${option.name}</option>`;
    });
    
    html += '</select>';
    return html;
}

function openModal() {
    document.getElementById('infoModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        document.getElementById('weatherDisplay').innerHTML = '<div class="error">Geolocation is not supported by this browser.</div>';
        return;
    }
    
    document.getElementById('weatherDisplay').innerHTML = '<div class="loader"></div><p>Getting your location...</p>';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            document.getElementById('location').value = `${lat},${lon}`;
            getWeather();
        },
        (error) => {
            document.getElementById('weatherDisplay').innerHTML = '<div class="error">Unable to get your location. Please enter manually.</div>';
        }
    );
}

// Weather API functions
const apiKey = config.OPENWEATHER_API_KEY;

async function getWeather() {
    const locationInput = document.getElementById('location').value.trim();
    if (!locationInput) {
        document.getElementById('weatherDisplay').innerHTML = '<div class="error">Please enter a location.</div>';
        return;
    }

    document.getElementById('weatherDisplay').innerHTML = '<p>Loading...</p>';

    try {
        const url = isLatLon(locationInput)
            ? `https://api.openweathermap.org/data/2.5/forecast?lat=${locationInput.split(',')[0]}&lon=${locationInput.split(',')[1]}&appid=${apiKey}&units=metric`
            : `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(locationInput)}&appid=${apiKey}&units=metric`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.cod !== "200") throw new Error(data.message);

        const current = data.list[0];
        const weatherData = {
            location: `${data.city.name}, ${data.city.country}`,
            locationType: isLatLon(locationInput) ? "Coordinates" : "City",
            current: {
                temperature: Math.round(current.main.temp),
                condition: current.weather[0].main.toLowerCase(),
                description: current.weather[0].description,
                humidity: current.main.humidity,
                windSpeed: current.wind.speed,
                pressure: current.main.pressure,
                icon: current.weather[0].icon
            },
            forecast: data.list
                .filter((entry, i) => i % 8 === 0)
                .slice(0, 5)
                .map(entry => ({
                    date: entry.dt_txt.split(' ')[0],
                    day: new Date(entry.dt_txt).toLocaleDateString('en-US', { weekday: 'short' }),
                    condition: entry.weather[0].main.toLowerCase(),
                    high: Math.round(entry.main.temp_max),
                    low: Math.round(entry.main.temp_min),
                    icon: entry.weather[0].icon
                })),
            dateRange: {
                start: document.getElementById('startDate').value,
                end: document.getElementById('endDate').value
            },
            timestamp: new Date().toISOString()
        };

        currentWeatherData = weatherData;
        displayWeather(weatherData);
        
        document.getElementById('saveWeatherBtn').style.display = 'inline-block';

    } catch (error) {
        document.getElementById('weatherDisplay').innerHTML = `<div class="error">Error: ${error.message}</div>`;
        document.getElementById('saveWeatherBtn').style.display = 'none';
    }
}

function displayWeather(data) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    
    let html = `
        <div class="weather-display">
            <h3>Weather for ${data.location}</h3>
            <div class="current-weather">
                <div>
                    <div class="weather-icon">
                        <img src="${getWeatherIconUrl(data.current.icon)}" alt="${data.current.description}" style="width: 50px; height: 50px;">
                    </div>
                    <div>${data.current.description}</div>
                </div>
                <div class="temperature">${data.current.temperature}°C</div>
            </div>
            
            <div class="weather-details">
                <div class="detail-item">
                    <strong>Humidity</strong><br>
                    ${data.current.humidity}%
                </div>
                <div class="detail-item">
                    <strong>Wind Speed</strong><br>
                    ${data.current.windSpeed} km/h
                </div>
                <div class="detail-item">
                    <strong>Pressure</strong><br>
                    ${data.current.pressure} hPa
                </div>
                <div class="detail-item">
                    <strong>Location Type</strong><br>
                    ${data.locationType}
                </div>
            </div>
    `;

    if (data.dateRange) {
        html += `
            <div style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <strong>Date Range:</strong> ${data.dateRange.start} to ${data.dateRange.end}
            </div>
        `;
    }

    html += `
            <h4 style="margin-top: 20px; margin-bottom: 10px;">5-Day Forecast</h4>
            <div class="forecast-container">
    `;

    data.forecast.forEach(day => {
        html += `
            <div class="forecast-item">
                <div><strong>${day.day}</strong></div>
                <div><img src="${getWeatherIconUrl(day.icon)}" alt="weather" style="width: 30px; height: 30px;"></div>
                <div>${day.high}°/${day.low}°</div>
                <div style="font-size: 0.8em;">${day.date}</div>
            </div>
        `;
    });

    html += `</div></div>`;
    weatherDisplay.innerHTML = html;
}

// CRUD Operations
function saveWeatherData() {
    if (!currentWeatherData) {
        alert('No weather data to save. Please get weather data first.');
        return;
    }

    if (!db) {
        alert('Database not initialized');
        return;
    }

    try {
        const data = currentWeatherData;
        const now = new Date().toISOString();

        if (editingRecordId) {
            // UPDATE existing record
            const updateSQL = `
                UPDATE weather_records SET
                    location = ?, location_type = ?, temperature = ?, condition = ?, description = ?,
                    humidity = ?, wind_speed = ?, pressure = ?, icon = ?, forecast_data = ?,
                    date_range_start = ?, date_range_end = ?, timestamp = ?, saved_at = ?
                WHERE id = ?
            `;

            db.run(updateSQL, [
                data.location, data.locationType, data.current.temperature, data.current.condition,
                data.current.description, data.current.humidity, data.current.windSpeed,
                data.current.pressure, data.current.icon, JSON.stringify(data.forecast),
                data.dateRange?.start || null, data.dateRange?.end || null, data.timestamp, now,
                editingRecordId
            ]);

            editingRecordId = null;
            alert('Weather data updated successfully!');
        } else {
            // INSERT new record
            const insertSQL = `
                INSERT INTO weather_records (
                    location, location_type, temperature, condition, description,
                    humidity, wind_speed, pressure, icon, forecast_data,
                    date_range_start, date_range_end, timestamp, saved_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            db.run(insertSQL, [
                data.location, data.locationType, data.current.temperature, data.current.condition,
                data.current.description, data.current.humidity, data.current.windSpeed,
                data.current.pressure, data.current.icon, JSON.stringify(data.forecast),
                data.dateRange?.start || null, data.dateRange?.end || null, data.timestamp, now
            ]);

            alert('Weather data saved successfully!');
        }

        saveDatabase();
        loadRecords();
        
    } catch (error) {
        console.error('Error saving weather data:', error);
        alert('Error saving weather data: ' + error.message);
    }
}

function loadRecords() {
    if (!db) {
        document.getElementById('recordsContainer').innerHTML = '<p>Database not initialized.</p>';
        return;
    }

    try {
        const selectSQL = `SELECT * FROM weather_records ORDER BY created_at DESC`;
        const stmt = db.prepare(selectSQL);
        const records = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            row.forecast = row.forecast_data ? JSON.parse(row.forecast_data) : [];
            records.push(row);
        }
        stmt.free();

        displayRecords(records);

    } catch (error) {
        console.error('Error loading records:', error);
        document.getElementById('recordsContainer').innerHTML = '<p>Error loading records.</p>';
    }
}

// Helper function to display records
function displayRecords(records) {
    const container = document.getElementById('recordsContainer');

    if (records.length === 0) {
        container.innerHTML = '<p>No saved records found.</p>';
        return;
    }

    let html = '';
    records.forEach(record => {
        const dateRange = record.date_range_start && record.date_range_end 
            ? `<div>Date Range: ${record.date_range_start} to ${record.date_range_end}</div>` 
            : '';

        const iconCode = record.icon || '01d';
        const iconDisplay = `<img src="${getWeatherIconUrl(iconCode)}" alt="weather" style="width: 24px; height: 24px; vertical-align: middle;" onerror="this.src='${getWeatherIconUrl('01d')}'">`;

        html += `
            <div class="record-item">
                <div><strong>${iconDisplay} ${record.location}</strong></div>
                <div>Temperature: ${record.temperature}°C</div>
                <div>Condition: ${record.description}</div>
                <div>Saved: ${new Date(record.saved_at).toLocaleString()}</div>
                ${dateRange}
                <div class="record-actions">
                    <button class="btn" onclick="editRecord(${record.id})">✏️ Edit</button>
                    <button class="btn btn-danger" onclick="deleteRecord(${record.id})">🗑️ Delete</button>
                    <button class="btn btn-secondary" onclick="viewRecord(${record.id})">👁️ View Details</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function getRecord(id) {
    if (!db) return null;

    try {
        const selectSQL = `SELECT * FROM weather_records WHERE id = ?`;
        const stmt = db.prepare(selectSQL);
        stmt.bind([id]);
        
        if (stmt.step()) {
            const record = stmt.getAsObject();
            record.forecast = record.forecast_data ? JSON.parse(record.forecast_data) : [];
            stmt.free();
            return record;
        }
        stmt.free();
        return null;

    } catch (error) {
        console.error('Error getting record:', error);
        return null;
    }
}

function editRecord(id) {
    const record = getRecord(id);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    // Show edit section and populate fields
    document.getElementById('editSection').style.display = 'block';
    document.getElementById('editLocation').value = record.location || '';
    document.getElementById('editTemperature').value = record.temperature || '';
    document.getElementById('editCondition').value = record.description || '';
    document.getElementById('editHumidity').value = record.humidity || '';
    document.getElementById('editWindSpeed').value = record.wind_speed || '';
    document.getElementById('editPressure').value = record.pressure || '';
    
    // Handle icon selector
    let iconContainer = document.getElementById('editIconContainer');
    if (!iconContainer) {
        const pressureGroup = document.getElementById('editPressure').parentElement;
        const iconGroup = document.createElement('div');
        iconGroup.className = 'input-group';
        iconGroup.innerHTML = `
            <label for="editIcon">Weather Icon:</label>
            <div id="editIconContainer"></div>
        `;
        pressureGroup.parentNode.insertBefore(iconGroup, pressureGroup.nextSibling);
        iconContainer = document.getElementById('editIconContainer');
    }
    
    if (iconContainer) {
        const currentIconCode = record.icon || '01d';
        iconContainer.innerHTML = createIconSelector(currentIconCode);
    }

    // Set date ranges if they exist
    if (record.date_range_start) {
        document.getElementById('editStartDate').value = record.date_range_start;
    }
    if (record.date_range_end) {
        document.getElementById('editEndDate').value = record.date_range_end;
    }
    
    editingRecordId = id;
    document.getElementById('editSection').scrollIntoView({ behavior: 'smooth' });
}

function updateRecord() {
    if (!editingRecordId || !db) {
        alert('No record selected for editing or database not initialized');
        return;
    }

    try {
        const location = document.getElementById('editLocation').value.trim();
        const temperature = parseFloat(document.getElementById('editTemperature').value);
        const condition = document.getElementById('editCondition').value.trim();
        const humidity = parseInt(document.getElementById('editHumidity').value);
        const windSpeed = parseFloat(document.getElementById('editWindSpeed').value);
        const pressure = parseFloat(document.getElementById('editPressure').value);
        const startDate = document.getElementById('editStartDate').value;
        const endDate = document.getElementById('editEndDate').value;

        const iconSelect = document.getElementById('editIcon');
        const selectedIconCode = iconSelect ? iconSelect.value : '01d';

        if (!location || isNaN(temperature) || !condition || isNaN(humidity) || isNaN(windSpeed) || isNaN(pressure)) {
            alert('Please fill in all required fields with valid values');
            return;
        }

        const now = new Date().toISOString();

        const updateSQL = `
            UPDATE weather_records SET
                location = ?, temperature = ?, description = ?, humidity = ?, wind_speed = ?,
                pressure = ?, icon = ?, date_range_start = ?, date_range_end = ?, saved_at = ?
            WHERE id = ?
        `;

        db.run(updateSQL, [
            location, temperature, condition, humidity, windSpeed, pressure,
            selectedIconCode, startDate || null, endDate || null, now, editingRecordId
        ]);

        saveDatabase();
        loadRecords();
        cancelEdit();
        
        alert('Record updated successfully!');

    } catch (error) {
        console.error('Error updating record:', error);
        alert('Error updating record: ' + error.message);
    }
}

function cancelEdit() {
    document.getElementById('editSection').style.display = 'none';
    editingRecordId = null;
    
    // Clear all edit fields
    const fields = ['editLocation', 'editTemperature', 'editCondition', 'editHumidity', 'editWindSpeed', 'editPressure', 'editStartDate', 'editEndDate'];
    fields.forEach(field => document.getElementById(field).value = '');
}

function deleteRecord(id) {
    if (!db) {
        alert('Database not initialized');
        return;
    }

    if (confirm('Are you sure you want to delete this record?')) {
        try {
            const deleteSQL = `DELETE FROM weather_records WHERE id = ?`;
            db.run(deleteSQL, [id]);
            saveDatabase();
            loadRecords();
        } catch (error) {
            console.error('Error deleting record:', error);
            alert('Error deleting record: ' + error.message);
        }
    }
}

function viewRecord(id) {
    const record = getRecord(id);
    if (record) {
        // Reconstruct weather data object for display
        const weatherData = {
            location: record.location,
            locationType: record.location_type,
            current: {
                temperature: record.temperature,
                condition: record.condition,
                description: record.description,
                humidity: record.humidity,
                windSpeed: record.wind_speed,
                pressure: record.pressure,
                icon: record.icon
            },
            forecast: record.forecast,
            dateRange: record.date_range_start && record.date_range_end ? {
                start: record.date_range_start,
                end: record.date_range_end
            } : null,
            timestamp: record.timestamp
        };
        displayWeather(weatherData);
    }
}

function clearRecords() {
    if (!db) {
        alert('Database not initialized');
        return;
    }

    if (confirm('Are you sure you want to delete all records?')) {
        try {
            db.run(`DELETE FROM weather_records`);
            saveDatabase();
            loadRecords();
            alert('All records deleted.');
        } catch (error) {
            console.error('Error clearing records:', error);
            alert('Error clearing records: ' + error.message);
        }
    }
}

function searchRecords() {
    if (!db) return;

    const searchTerm = document.getElementById('searchRecords').value.toLowerCase();
    
    if (!searchTerm.trim()) {
        loadRecords();
        return;
    }

    try {
        const searchSQL = `
            SELECT * FROM weather_records 
            WHERE LOWER(location) LIKE ? 
               OR LOWER(description) LIKE ?
               OR date_range_start LIKE ?
               OR date_range_end LIKE ?
            ORDER BY created_at DESC
        `;
        
        const searchPattern = `%${searchTerm}%`;
        const stmt = db.prepare(searchSQL);
        stmt.bind([searchPattern, searchPattern, searchPattern, searchPattern]);
        
        const filteredRecords = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            row.forecast = row.forecast_data ? JSON.parse(row.forecast_data) : [];
            filteredRecords.push(row);
        }
        stmt.free();

        displayRecords(filteredRecords);

    } catch (error) {
        console.error('Error searching records:', error);
        document.getElementById('recordsContainer').innerHTML = '<p>Error searching records.</p>';
    }
}

// Export functions
function exportData(format) {
    if (!db) {
        alert('Database not initialized');
        return;
    }

    try {
        const selectSQL = `SELECT * FROM weather_records ORDER BY created_at DESC`;
        const stmt = db.prepare(selectSQL);
        const records = [];
        
        while (stmt.step()) {
            const row = stmt.getAsObject();
            row.forecast = row.forecast_data ? JSON.parse(row.forecast_data) : [];
            records.push(row);
        }
        stmt.free();

        if (records.length === 0) {
            alert('No data to export!');
            return;
        }

        const exporters = {
            json: () => exportJSON(records),
            csv: () => exportCSV(records),
            xml: () => exportXML(records),
            markdown: () => exportMarkdown(records),
            pdf: () => exportPDF(records)
        };

        if (exporters[format]) {
            exporters[format]();
        } else {
            alert('Unsupported export format');
        }

    } catch (error) {
        console.error('Error exporting data:', error);
        alert('Error exporting data: ' + error.message);
    }
}

// Individual export functions
function exportJSON(records) {
    const content = JSON.stringify(records, null, 2);
    downloadFile(content, 'application/json', 'json');
}

function exportCSV(records) {
    let content = 'ID,Location,Temperature,Condition,Humidity,Wind Speed,Pressure,Date Range Start,Date Range End,Saved At\n';
    records.forEach(record => {
        content += `${record.id},"${record.location}",${record.temperature},"${record.description}",${record.humidity},${record.wind_speed},${record.pressure},"${record.date_range_start || ''}","${record.date_range_end || ''}","${record.saved_at}"\n`;
    });
    downloadFile(content, 'text/csv', 'csv');
}

function exportXML(records) {
    let content = '<?xml version="1.0" encoding="UTF-8"?>\n<weather_records>\n';
    records.forEach(record => {
        content += `  <record id="${record.id}">\n`;
        content += `    <location>${record.location}</location>\n`;
        content += `    <temperature>${record.temperature}</temperature>\n`;
        content += `    <condition>${record.description}</condition>\n`;
        content += `    <humidity>${record.humidity}</humidity>\n`;
        content += `    <wind_speed>${record.wind_speed}</wind_speed>\n`;
        content += `    <pressure>${record.pressure}</pressure>\n`;
        if (record.date_range_start && record.date_range_end) {
            content += `    <date_range>\n`;
            content += `      <start>${record.date_range_start}</start>\n`;
            content += `      <end>${record.date_range_end}</end>\n`;
            content += `    </date_range>\n`;
        }
        content += `    <saved_at>${record.saved_at}</saved_at>\n`;
        content += `  </record>\n`;
    });
    content += '</weather_records>';
    downloadFile(content, 'application/xml', 'xml');
}

function exportMarkdown(records) {
    let content = '# Weather Data Export\n\n';
    content += `Generated on: ${new Date().toLocaleString()}\n\n`;
    records.forEach((record, index) => {
        content += `## Record ${index + 1}: ${record.location}\n\n`;
        content += `- **Temperature:** ${record.temperature}°C\n`;
        content += `- **Condition:** ${record.description}\n`;
        content += `- **Humidity:** ${record.humidity}%\n`;
        content += `- **Wind Speed:** ${record.wind_speed} km/h\n`;
        content += `- **Pressure:** ${record.pressure} hPa\n`;
        if (record.date_range_start && record.date_range_end) {
            content += `- **Date Range:** ${record.date_range_start} to ${record.date_range_end}\n`;
        }
        content += `- **Saved At:** ${new Date(record.saved_at).toLocaleString()}\n\n`;
    });
    downloadFile(content, 'text/markdown', 'md');
}

function exportPDF(records) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Weather Data Export', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 35);
    
    let yPosition = 50;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    
    records.forEach((record, index) => {
        if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Record ${index + 1}: ${record.location}`, margin, yPosition);
        yPosition += 10;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        const details = [
            `Temperature: ${record.temperature}°C`,
            `Condition: ${record.description}`,
            `Humidity: ${record.humidity}%`,
            `Wind Speed: ${record.wind_speed} km/h`,
            `Pressure: ${record.pressure} hPa`
        ];
        
        if (record.date_range_start && record.date_range_end) {
            details.push(`Date Range: ${record.date_range_start} to ${record.date_range_end}`);
        }
        
        details.push(`Saved At: ${new Date(record.saved_at).toLocaleString()}`);
        
        details.forEach(detail => {
            doc.text(detail, margin + 5, yPosition);
            yPosition += 6;
        });
        
        yPosition += 10;
    });
    
    doc.save(`weather_data_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Helper function for file downloads
function downloadFile(content, mimeType, extension) {
    const filename = `weather_data_${new Date().toISOString().split('T')[0]}.${extension}`;
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Modal event handler
window.onclick = function(event) {
    const modal = document.getElementById('infoModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}