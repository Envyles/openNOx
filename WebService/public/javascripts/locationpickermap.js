function BindPickerMap(MapElementID, txtBoxLatID, txtBoxLngID, stationId) {

	var lat, lng;
	var txtLatID, txtLngID;
	var marker;

	txtLatID = txtBoxLatID;
	txtLngID = txtBoxLngID;

	var baseLayer = L.tileLayer(
		'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
			attribution: 'Kartendaten &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> Mitwirkende',
			maxZoom: 18
		}
	);

	var map = new L.Map(MapElementID, {
		center: new L.LatLng(51.154607, 6.42561),
		zoom: 14,
		layers: [baseLayer]
	});


	map.addEventListener('mousemove', function(ev) {
	   lat = ev.latlng.lat;
	   lng = ev.latlng.lng;
	});


	map.locate({setView: true, maxZoom: 18});


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


	marker = L.marker([51.154607, 6.42561])
	marker.addTo(map);

	document.getElementById(MapElementID).addEventListener('contextmenu', function (event) {
		event.preventDefault();

		marker.setLatLng([lat, lng]);
		document.getElementById(txtLatID).value = lat;
		document.getElementById(txtLngID).value = lng;
		
		return false;
	});
	
	
	var dataURL = '/api/getmeasurements'
	var request = new XMLHttpRequest();
	request.open('GET', dataURL);
	request.responseType = 'json';
	request.send();
	
	request.onload = function() {
		

		var stationCount = request.response.length;
		for (var i = 0; i < stationCount; i++) {
			if (request.response[i].stationid == stationId) {
				map.panTo([request.response[i].latitude, request.response[i].longitude]);
				marker.setLatLng([request.response[i].latitude, request.response[i].longitude]);
				document.getElementById(txtLatID).value = request.response[i].latitude;
				document.getElementById(txtLngID).value = request.response[i].longitude;
			}
		}
	}
}