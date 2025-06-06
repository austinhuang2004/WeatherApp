let currentWeatherData = null; 
const apiKey = config.OPENWEATHER_API_KEY;

// Weather icons
const weatherIcons = {
    'clear': '🌞',
    'clouds': '☁️',
    'rain': '🌧️',
    'snow': '❄️',
    'thunderstorm': '⛈️',
    'drizzle': '🌦️',
    'mist': '🌫️',
    'fog': '🌫️',
    'default': '🌤️'
};

// Initialize SQL.js database
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

// Create database tables
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
            forecast_data TEXT, -- JSON string for forecast array
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

// Save database to localStorage
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Array.from(data);
        localStorage.setItem('weatherDatabase', JSON.stringify(buffer));
    }
}

// Lat or lon checker
function isLatLon(value) {
    return /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(value);
}

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    await initDatabase();
    
    const today = new Date();
    const futureDate = new Date(today.getTime() + (5 * 24 * 60 * 60 * 1000));
    document.getElementById('startDate').value = today.toISOString().split('T')[0];
    document.getElementById('endDate').value = futureDate.toISOString().split('T')[0];
});

// Modal functions
function openModal() {
    document.getElementById('infoModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('infoModal').style.display = 'none';
}

// Geolocation
function getCurrentLocation() {
    if (navigator.geolocation) {
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
    } else {
        document.getElementById('weatherDisplay').innerHTML = '<div class="error">Geolocation is not supported by this browser.</div>';
    }
}