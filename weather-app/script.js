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
                icon: weatherIcons[current.weather[0].main.toLowerCase()] || weatherIcons.default
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
                    icon: weatherIcons[entry.weather[0].main.toLowerCase()] || weatherIcons.default
                })),
            dateRange: {
                start: document.getElementById('startDate').value,
                end: document.getElementById('endDate').value
            },
            timestamp: new Date().toISOString()
        };

        currentWeatherData = weatherData;
        displayWeather(weatherData);

    } catch (error) {
        document.getElementById('weatherDisplay').innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}

// Display weather data
function displayWeather(data) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    
    let html = `
        <div class="weather-display">
            <h3>Weather for ${data.location}</h3>
            <div class="current-weather">
                <div>
                    <div class="weather-icon">${data.current.icon}</div>
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
                <div>${day.icon}</div>
                <div>${day.high}°/${day.low}°</div>
                <div style="font-size: 0.8em;">${day.date}</div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    weatherDisplay.innerHTML = html;
}