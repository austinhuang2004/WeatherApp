# WeatherApp

A comprehensive weather application that fetches current weather data and 5-day forecasts using the OpenWeather API. The app provides a complete weather management solution with advanced features for data storage, management, and export.

## Features

- **Weather Lookup**: Search by city name, ZIP code, or geographic coordinates
- **GPS Integration**: Automatic location detection using device GPS
- **Local Data Storage**: Built-in SQL.js database for offline data management
- **CRUD Operations**: Full create, read, update, and delete functionality for weather records
- **Search & Filter**: Advanced search and filtering capabilities for saved data
- **Data Export**: Export weather data in multiple formats:
  - JSON
  - CSV
  - XML
  - PDF
  - Markdown
- **Date Range Support**: Optional date range filtering for exports

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd WeatherApp
```

### 2. Create config.js file, put it in weather-app folder, then input API key into config.js from OpenWeatherAPI
```bash
const API_KEY = 'your-api-key-here';
```

### 3. Download live server extension to open index.html
Open the project in VS Code.
Install the Live Server extension (if not already installed):
Go to Extensions tab (Ctrl+Shift+X)
Search for “Live Server” by Ritwick Dey
Click Install
Right-click on index.html → Open with Live Server


### 4. How to use the Weather Application
Getting Weather Data
1. By Location Name: Enter a city name and click "Get Weather"
2. By ZIP Code: Enter a ZIP code
3. By Coordinates: Enter latitude and longitude separated by a comma
4. GPS Location: Click "Use Current Location" for automatic coordinate detection

Managing Weather Records
1. Save Data: After fetching weather data, click "Save Weather Data" to store it locally
2. View Records: Scroll down to see all saved weather records
3. Edit Records: Click the edit button on any record to modify it
4. Delete Records: Click the delete button to remove unwanted records

Exporting Data
1. Choose Format: Select from JSON, CSV, XML, PDF, or Markdown
2. Date Range (Optional): Set start and end dates to filter exported data
3. Export: Click the corresponding export button to download your data

Search and Filter
Use the search functionality to quickly find specific weather records by location, date, or weather conditions.


### 5. File Structure
```bash
WeatherApp/
├── index.html
├── script.js 
├── style.css       
├── config.js           
└── README.md     
```
