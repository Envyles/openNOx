function BindNOXMap(MapElementID) {
	var baseLayer = L.tileLayer(
		'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
			attribution: 'Kartendaten &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Mitwirkende',
			maxZoom: 18
		}
	);

	var cfg = {
		// radius should be small ONLY if scaleRadius is true (or small radius is intended)
		"radius": 0.005,
		"maxOpacity": .5,
		// scales the radius based on map zoom
		"scaleRadius": true,
		// if set to false the heatmap uses the global maximum for colorization
		// if activated: uses the data maximum within the current map boundaries
		//   (there will always be a red spot with useLocalExtremas true)
		"useLocalExtrema": false,
		// which field name in your data represents the latitude - default "lat"
		latField: 'latitude',
		// which field name in your data represents the longitude - default "lng"
		lngField: 'longitude',
		// which field name in your data represents the data value - default "value"
		valueField: 'cno2'
	};

	var heatmapLayer = new HeatmapOverlay(cfg);

	var map = new L.Map(MapElementID, {
		center: new L.LatLng(51.154607, 6.42561),
		zoom: 14,
		layers: [baseLayer,heatmapLayer]
	});


	var dataURL = '/api/getmeasurements'
	var request = new XMLHttpRequest();
	request.open('GET', dataURL);
	request.responseType = 'json';
	request.send();

	//Adds the search control to the map
	map.addControl( new L.Control.Search({
		url: 'https://nominatim.openstreetmap.org/search?format=json&q={s}',
		jsonpParam: 'json_callback',
		propertyName: 'display_name',
		propertyLoc: ['lat','lon'],
		marker: L.circleMarker([0,0],{radius:30}),
		autoCollapse: true,
		autoType: false,
		minLength: 2
	}) );


	map.locate({setView: true, maxZoom: 18});

	//Wait for the Mapdata to arrive before adding it to the Heatmaplayer of the Map
	request.onload = function() {
		
		var greenMarker = L.icon({
			iconUrl: 'stylesheets/images/marker-icon-green.png',
			shadowUrl: 'stylesheets/images/marker-shadow.png',

			iconSize:     [25, 41],
			shadowSize:   [41, 41],
			iconAnchor:   [12, 41],
			shadowAnchor: [12, 41],  
			popupAnchor:  [0, -41]
		});
		
		
		
		var stationCount = request.response.length;
		for (var i = 0; i < stationCount; i++) {
			if (request.response[i].official == false) {
				L.marker([request.response[i].latitude, request.response[i].longitude]).bindPopup("Gemessene NO2 Konzentration: " + request.response[i].cno2 + " µg/m³").addTo(map);
			}else{
				L.marker([request.response[i].latitude, request.response[i].longitude],{icon: greenMarker}).bindPopup("Gemessene NO2 Konzentration: " + request.response[i].cno2 + " µg/m³").addTo(map);
			}
		}
		
		var Data = {
			max: 100,
			data: request.response
		};
		heatmapLayer.setData(Data);
			
	}
}
