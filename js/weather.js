"use strict";

var weather = {

    requestParams: {
        url: "https://api.darksky.net/forecast/",
        key: "92bd3e58604d7e3e7b32e86b71f4be3d",
        lat: "",
        long: ""
    },

    currentLocation: {
        lat: "",
        long: "",
        isAllowed: false
    },

    currentCityForecast: {},

    weeklyForecast: [],

    favoriteCity: {
        city: []
    },

    historyCity: {
        city: []
    },
    isFahrenheit: true,


    init: function () {

        // @todo store lat and long from request url param hash
        weather.getLatLongFromURL();

        window.onhashchange = function () {
            weather.getLatLongFromURL();
        };

        weather.insertGoogleScript();
        weather.getAutoLocation();

        $(".findLocation").click(function (e) {
            e.preventDefault();
            weather.actionGetCurrentLocation();


        });

        $('.favoriteCity').on('click', function (e) {
            e.preventDefault();
            weather.addToFavorite();
        });

        $('.celsius').on('click', function (e) {
            e.preventDefault();
            $('.celsius').removeClass('inactive');
            $('.fahrenheit').addClass('inactive');
            weather.fahrenToCelsius($('.temperatureValue').html());

            weather.isFahrenheit = false;

            weather.showWeather();

        });

        $('.fahrenheit').on('click', function (e) {
            e.preventDefault();
            $('.fahrenheit').removeClass('inactive');
            $('.celsius').addClass('inactive');
            $('.temperatureValue').html(weather.currentCityForecast.tempF);
            weather.isFahrenheit = true;
            weather.showWeather();
        });

        $('.historyList').on('click', '.cityForecast', function (e) {
            var dataName = $(this).data('name');
            $('#city-search').val(dataName);
        });

        $('.favoriteList').on('click', '.cityForecast', function (e) {
            var dataName = $(this).data('name');
            $('#city-search').val(dataName);
        });


        weather.renderFavorite();
        weather.renderHistory();

    },

    actionGetCurrentLocation: function () {
        if (!weather.currentLocation.isAllowed) {
            return;
        }

        $('#city-search').val('');

        weather.requestParams.lat = weather.currentLocation.lat;
        weather.requestParams.long = weather.currentLocation.long;


        weather.getLocationName(weather.currentLocation.lat, weather.currentLocation.long);

        weather.getWeather();
    },

    getLocationName: function (lat, long) {
        $.ajax({
            url: 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + long + '&sensor=true',
            dataType: "json",
            success: function (data) {
                $('#city-search').val(data.results[0].formatted_address);
            }

        })
    },

    getAutoLocation: function () {

        if (!navigator.geolocation) {
            console.log("not allowed");
            weather.currentLocation.isAllowed = false;
            return;
        }

        navigator.geolocation.getCurrentPosition(function (position) {
            var lat = position.coords.latitude;
            var long = position.coords.longitude;
            weather.currentLocation.lat = lat.toFixed(4);
            weather.currentLocation.long = long.toFixed(4);
            weather.currentLocation.isAllowed = true;

        }, function (err) {
            console.warn('err', err);
            weather.currentLocation.isAllowed = false;
            // @TODO popup cant find your location
            alert("Can`t find your location");
            $('.findLocation').prop('disabled', true);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        })
    },

    getWeather: function () {

        var api_call = weather.requestParams.url + weather.requestParams.key + "/" + weather.requestParams.lat + "," + weather.requestParams.long;


        $.ajax({
            url: api_call,
            dataType: "jsonp", // JSONP its ability to make a cross-domain request, that is why it works.
            success: function (forecast) {

                if (typeof forecast == "undefined") {
                    return;
                }
                weather.handleSuccessRequest(forecast);
            }

        });

    },

    handleSuccessRequest: function (forecast) {

        weather.currentCityForecast.locationName = forecast.timezone;
        weather.currentCityForecast.tempF = forecast.currently.temperature.toFixed(0);
        weather.currentCityForecast.description = forecast.currently.summary;
        weather.currentCityForecast.icon = forecast.currently.icon;

        $(".weatherIcon.current").attr("data-icon", weather.currentCityForecast.icon);

        weather.weeklyForecast = [];

        // Loop through daily forecasts
        for (var i = 0, l = forecast.daily.data.length; i < l - 1; i++) {

            var dailyObj = {
                icon: forecast.daily.data[i].icon,
                temperatureMax: forecast.daily.data[i].temperatureMax,
                temperatureMin: forecast.daily.data[i].temperatureMin,
                humidity: forecast.daily.data[i].humidity.toFixed(2),
                date: new Date(forecast.daily.data[i].time * 1000)
            };
            weather.weeklyForecast.push(dailyObj);
        }
        weather.showWeather();
        window.location.hash = "lat=" + weather.requestParams.lat + "&long=" + weather.requestParams.long;
        weather.addToHistory();
        $('.weatherInfo').css("display", "block");
    },

    fahrenToCelsius: function (fahrenheit) {
        var celsius = ((fahrenheit - 32) * 5 / 9).toFixed(0);

        $('.temperatureValue').html(celsius);
    },

    getLatLongFromURL: function () {
        var hash = window.location.hash.substr(1);

        var result = hash.split('&').reduce(function (result, item) {
            var parts = item.split('=');
            result[parts[0]] = parts[1];
            return result;
        }, {});

        if (typeof result.lat == "undefined" || typeof result.long == "undefined") {
            return;
        }

        weather.requestParams.lat = result.lat;
        weather.requestParams.long = result.long;

        weather.getWeather();
    },


    // Report City & AutoFill Coords

    insertGoogleScript: function () {
        var google_api = document.createElement('script'),
            api_key = 'AIzaSyCFYRuRgQBjP2G2YWvL7jg72DJ43kOLmN4';

        google_api.src = "https://maps.googleapis.com/maps/api/js?key=" + api_key + "&libraries=places,geometry&callback=weather.initGoogleAPI";

        document.body.appendChild(google_api);
    },

// // SearchBox Method

    initGoogleAPI: function () {
        var autocomplete = new google.maps.places.SearchBox(document.querySelector("#city-search"));

        autocomplete.addListener('places_changed', function () {
            var place = autocomplete.getPlaces()[0];
            if (typeof place == "undefined") {
                return;
            }

            var lat = place.geometry.location.lat();
            var long = place.geometry.location.lng();
            weather.requestParams.lat = lat.toFixed(4);
            weather.requestParams.long = long.toFixed(4);
            weather.getWeather();
        });
    },

    //Show Weather

    showWeather: function () {
        weather.renderToday();
        weather.renderWeeklyForecast();
        weather.skycons();
    },

    renderToday: function () {

        $('.currentCityName').text($('#city-search').val().split(',')[0]);
        $('.currentRegion').text(weather.currentCityForecast.locationName.split('/')[0]);
        $('.temperatureValue').text(weather.currentCityForecast.tempF);
        $('.description').text(weather.currentCityForecast.description);

    },

    skycons: function () {

        var skycons = new Skycons({
            "color": "#FFFFFF"
        });

        for (var i = 0; i < $(".weatherIcon").length; i++) {
            var weatherIcon = $(".weatherIcon")[i];
            var $weatherIcon = $(weatherIcon);
            var dataIcon = $weatherIcon.data("icon");
            skycons.add(weatherIcon, dataIcon);
        }

        skycons.play();
    },

    addToFavorite: function () {

        if ($('#city-search').val() == "") {
            return;
        }
        var favoriteLocalStorage = localStorage.getItem("favorite");

        if (favoriteLocalStorage && favoriteLocalStorage.length > 0) {
            var favoritesObj = JSON.parse(favoriteLocalStorage);
            weather.favoriteCity = favoritesObj;
        }

        var currentAddFav = {};

        currentAddFav.name = $('#city-search').val();
        currentAddFav.url = window.location.href;

        for (var i = 0; i < weather.favoriteCity.city.length; i++) {
            if (weather.favoriteCity.city[i].name == currentAddFav.name) {
                return;
            }
        }

        weather.favoriteCity.city.push(currentAddFav);

        var serialFavoriteCity = JSON.stringify(weather.favoriteCity); //сериализуем его
        localStorage.setItem("favorite", serialFavoriteCity);

        weather.renderFavorite();

    },

    addToHistory: function () {
        if ($('#city-search').val() == "") {
            return;
        }

        var historyLocalStorage = localStorage.getItem("history");

        if (historyLocalStorage && historyLocalStorage.length > 0) {
            var historyObj = JSON.parse(historyLocalStorage);
            weather.historyCity = historyObj;
        }

        var recentHistory = {};

        recentHistory.name = $('#city-search').val();
        recentHistory.url = window.location.href;

        for (var i = 0; i < weather.historyCity.city.length; i++) {
            if (weather.historyCity.city[i].name == recentHistory.name) {
                return;
            }
        }

        weather.historyCity.city.push(recentHistory);

        var serialHistoryCity = JSON.stringify(weather.historyCity); //сериализуем его
        localStorage.setItem("history", serialHistoryCity);

        weather.renderHistory();
    },

    renderFavorite: function () {

        var returnFavoriteCity = JSON.parse(localStorage.getItem("favorite"));

        if (!returnFavoriteCity || !returnFavoriteCity["city"] || returnFavoriteCity.city.length == 0) {
            return;
        }

        if ($("ul").has("li")) {
            $(".favoriteList").empty();

        }
        for (var i = returnFavoriteCity.city.length; i > 0; i--) {
            var li = $('<li/>').addClass('list').appendTo($(".favoriteList"));
            $('<a/>').addClass('cityForecast').attr('href', returnFavoriteCity.city[i - 1].url)
                .attr('data-name', returnFavoriteCity.city[i - 1].name)
                .text(returnFavoriteCity.city[i - 1].name)
                .appendTo(li);
        }

    },

    renderHistory: function () {

        var returnHistoryCity = JSON.parse(localStorage.getItem("history"));

        if (!returnHistoryCity || !returnHistoryCity["city"] || returnHistoryCity.city.length == 0) {
            return;
        }

        if ($("ul").has("li")) {
            $(".historyList").empty();
        }
        for (var i = returnHistoryCity.city.length; i > 0; i--) {
            var li = $('<li/>').addClass('list').appendTo($(".historyList"));
            $('<a/>').addClass('cityForecast').attr('href', returnHistoryCity.city[i - 1].url)
                .attr("data-name", returnHistoryCity.city[i - 1].name)
                .text(returnHistoryCity.city[i - 1].name)
                .appendTo(li);
        }
    },

    renderWeeklyForecast: function () {

        var daysOfTheWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        var $weeklyForecastContent = $(".weeklyForecastContent");

        $weeklyForecastContent.empty();

        for (var i = 0; i < weather.weeklyForecast.length; i++) {

            var $byDays = $('<div/>').addClass('byDays');

            var $listWeekly = $('<div/>').addClass("list listWeekly").appendTo($byDays);
            $listWeekly.append(
                $('<div/>').addClass("nameOfTheDay").text(daysOfTheWeek[weather.weeklyForecast[i].date.getDay()])
            );
            $listWeekly.append(
                $('<div/>').addClass("dayWeatherIcon").append(
                    $('<canvas/>').addClass("weatherIcon")
                        .attr('data-icon', weather.weeklyForecast[i].icon)
                        .attr('width', 30)
                        .attr('height', 30)
                )
            );
            $listWeekly.append(
                $('<div/>').addClass("humidity").append(
                    $('<img/>').addClass("humidityIcon")
                        .attr('src', "https://s.yimg.com/os/weather/1.0.1/precipitation/54x60/rain_ico_60@2x.png")
                        .attr('alt', "humidity")
                ).append(
                    $('<span/>').addClass("humidityPercent")
                        .text(weather.weeklyForecast[i].humidity * 100).append(
                        $('<span/>').addClass("percentIcon")
                            .text("%")
                    )
                )
            );

            $listWeekly.append(
                $('<div/>').addClass("temperatureContainer").append(
                    $("<div/>").addClass("dayMinTemp")
                        .text(weather.getActualTemp(weather.weeklyForecast[i].temperatureMin))
                ).append(
                    $("<div/>").addClass("dayMaxTemp")
                        .text(weather.getActualTemp(weather.weeklyForecast[i].temperatureMax))
                )
            );

            $weeklyForecastContent.append($byDays);

        }
    },

    getActualTemp: function (temp) {
        if (!weather.isFahrenheit) {
            return ((temp - 32) * 5 / 9).toFixed(0);
        }
        return temp.toFixed(0);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    weather.init();
});




