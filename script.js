document.addEventListener('DOMContentLoaded', () => {
    const apiKey = config.API_KEY;
    const translations = {
        'fr': {
            'title': 'Mon App Météo',
            'placeholder': 'Entrez le nom d\'une ville...',
            'search': 'Rechercher',
            'prompt': 'Veuillez rechercher une ville pour afficher les données météo.',
            'lastSearches': 'Dernières recherches',
            'weatherMap': 'Carte Météo',
            'feelsLike': 'Ressenti',
            'humidity': 'Humidité',
            'wind': 'Vent',
            'pressure': 'Pression',
            'errorNotFound': 'Ville non trouvée. Vérifiez l\'orthographe.',
            'errorFetch': 'Erreur lors de la récupération des données.',
            'errorApiKey': 'Veuillez insérer votre clé API OpenWeatherMap dans le fichier script.js',
            'noRecentSearches': 'Aucune recherche récente.'
        },
        'en': {
            'title': 'My Weather App',
            'placeholder': 'Enter a city name...',
            'search': 'Search',
            'prompt': 'Please search for a city to display weather data.',
            'lastSearches': 'Last Searches',
            'weatherMap': 'Weather Map',
            'feelsLike': 'Feels Like',
            'humidity': 'Humidity',
            'wind': 'Wind',
            'pressure': 'Pressure',
            'errorNotFound': 'City not found. Check the spelling.',
            'errorFetch': 'Error retrieving data.',
            'errorApiKey': 'Please insert your OpenWeatherMap API key in the script.js file',
            'noRecentSearches': 'No recent searches.'
        }
    };

    const cityInput = document.getElementById('city-input');
    const searchButton = document.getElementById('search-button');
    const weatherDataContainer = document.getElementById('weather-data');
    const searchHistoryList = document.getElementById('search-history');
    const mapContainer = document.getElementById('map');
    const themeToggleButton = document.getElementById('theme-toggle-button');
    const langToggleButton = document.getElementById('lang-toggle-button');

    let map;
    let markerLayer;
    let weatherLayer;
    let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    let currentTheme = localStorage.getItem('theme') || 'light';
    let currentLang = localStorage.getItem('lang') || 'fr';
    let lastSuccessfulCity = null;

    initMap();
    setTheme(currentTheme);
    setLanguage(currentLang);
    renderSearchHistory();

    function initMap() {
        map = L.map(mapContainer).setView([48.8566, 2.3522], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        markerLayer = L.layerGroup().addTo(map);
        updateWeatherLayer();
    }

    function updateWeatherLayer() {
        if (weatherLayer) {
            map.removeLayer(weatherLayer);
        }
        weatherLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${apiKey}`, {
            opacity: 0.7
        }).addTo(map);
    }

    async function fetchWeather(city, updateHistory = true) {
        if (!city) {
            alert(translations[currentLang].placeholder);
            return;
        }
        
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=${currentLang}`;

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(translations[currentLang].errorNotFound);
                } else {
                    throw new Error(translations[currentLang].errorFetch);
                }
            }
            const data = await response.json();
            
            lastSuccessfulCity = data.name;
            
            displayWeatherData(data);
            updateMap(data.coord.lat, data.coord.lon);

            if (updateHistory) {
                updateSearchHistory(data.name);
            }

        } catch (error) {
            console.error('Erreur Fetch:', error);
            weatherDataContainer.innerHTML = `<div class="placeholder"><p>Erreur : ${error.message}</p></div>`;
            lastSuccessfulCity = null;
        }
    }

    function displayWeatherData(data) {
        const { name, main, weather, wind } = data;
        const iconSrc = mapWeatherToIcon(weather[0].main);

        weatherDataContainer.innerHTML = `
            <div class="weather-header">
                <h2>${name}</h2>
                <p>${weather[0].description}</p>
            </div>
            <div class="weather-main">
                <img src="${iconSrc}" alt="${weather[0].description}" id="weather-icon">
                <span class="temp">${Math.round(main.temp)}°C</span>
            </div>
            <div class="weather-details">
                <div class="detail-box">
                    <h4>${translations[currentLang].feelsLike}</h4>
                    <p>${Math.round(main.feels_like)}°C</p>
                </div>
                <div class="detail-box">
                    <h4>${translations[currentLang].humidity}</h4>
                    <p>${main.humidity}%</p>
                </div>
                <div class="detail-box">
                    <h4>${translations[currentLang].wind}</h4>
                    <p>${Math.round(wind.speed * 3.6)} km/h</p>
                </div>
                <div class="detail-box">
                    <h4>${translations[currentLang].pressure}</h4>
                    <p>${main.pressure} hPa</p>
                </div>
            </div>
        `;
    }

    function mapWeatherToIcon(weatherMain) {
        const mapping = {
            'Clouds': 'weather/clouds.svg',
            'Rain': 'weather/rain.svg',
            'Drizzle': 'weather/drizzle.svg',
            'Thunderstorm': 'weather/thunderstorm.svg',
            'Snow': 'weather/snow.svg',
            'Clear': 'weather/clear.svg'
        };
        if (['Mist', 'Smoke', 'Haze', 'Dust', 'Fog', 'Sand', 'Ash', 'Squall', 'Tornado'].includes(weatherMain)) {
            return 'weather/atmosphere.svg';
        }
        return mapping[weatherMain] || 'weather/clear.svg';
    }

    function updateMap(lat, lon) {
        map.setView([lat, lon], 10);
        markerLayer.clearLayers();
        L.marker([lat, lon]).addTo(markerLayer);
    }

    function updateSearchHistory(city) {
        searchHistory = searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase());
        searchHistory.unshift(city);
        if (searchHistory.length > 5) {
            searchHistory.pop();
        }
        localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
        renderSearchHistory();
    }

    function renderSearchHistory() {
        searchHistoryList.innerHTML = '';
        if (searchHistory.length === 0) {
            searchHistoryList.innerHTML = `<li>${translations[currentLang].noRecentSearches}</li>`;
            return;
        }
        searchHistory.forEach(city => {
            const li = document.createElement('li');
            li.textContent = city;
            li.addEventListener('click', () => {
                cityInput.value = city;
                fetchWeather(city, false);
            });
            searchHistoryList.appendChild(li);
        });
    }

    function setTheme(theme) {
        localStorage.setItem('theme', theme);
        currentTheme = theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.textContent = '🌙';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggleButton.textContent = '☀️';
        }
    }

    function setLanguage(lang) {
        localStorage.setItem('lang', lang);
        currentLang = lang;
        document.documentElement.lang = lang;
        langToggleButton.textContent = lang === 'fr' ? 'EN' : 'FR';

        document.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            if (translations[lang][key]) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translations[lang][key];
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        });

        renderSearchHistory();

        const placeholderText = document.querySelector('.data-tab .placeholder p');
        if (placeholderText && placeholderText.getAttribute('data-translate-key') === 'prompt') {
            placeholderText.textContent = translations[lang].prompt;
        }

        if (lastSuccessfulCity) {
            fetchWeather(lastSuccessfulCity, false);
        }
    }

    searchButton.addEventListener('click', () => {
        fetchWeather(cityInput.value.trim(), true);
    });

    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchWeather(cityInput.value.trim(), true);
        }
    });

    themeToggleButton.addEventListener('click', () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    });

    langToggleButton.addEventListener('click', () => {
        const newLang = currentLang === 'fr' ? 'en' : 'fr'; 
        setLanguage(newLang);
    });
});