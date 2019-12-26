
function generateGraph(StationID, GraphElementID){

	var dataURL = '/api/gethistoric/' + StationID
	var request = new XMLHttpRequest();
	request.open('GET', dataURL);
	request.responseType = 'json';
	request.send();

	request.onload = function() {
		
		var labels = [];
		var NOData = [];
		var size = request.response.length;
		
		//Output a Maximum of 1440 minute values (24 Hours)
		if(size > 1440) {
			size = 1440;
		}
		
		//Filter for valid Data
		for(var i = 0; i < size; i++){
			if (request.response[i].cno2 != null && request.response[i].timestamp != null ){
				labels.push(request.response[i].timestamp.substring(request.response[i].timestamp.length-11, request.response[i].timestamp.length-3));
				NOData.push(request.response[i].cno2);
			};
		};

		
		var Data = {
			labels: labels,
			datasets: [{ 
				data: NOData,
				label: "Konzentration NO2",
				borderColor: "#3e95cd",
				fill: false
			  }
			]
		  };

		new Chart(document.getElementById("myChart"), {
		  type: 'line',
		  data: Data,
		  options: {
			title: {
			  display: true,
			  text: 'NO2 Konzentrationsverlauf'
			}
		  }
		});	
	};
};


