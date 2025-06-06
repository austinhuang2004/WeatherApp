let currentWeatherData = null; 

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

const apiKey = config.OPENWEATHER_API_KEY;
