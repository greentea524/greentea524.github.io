google.charts.load("current", {packages:["corechart"]});
google.charts.setOnLoadCallback(drawChart);
function drawChart() {
	var data = google.visualization.arrayToDataTable([
		['Task', 'Hours per Day'],
		['Work',     8],
		['Eat',      1],
		['Read',  1],
		['Entertainment', 7],
		['Sleep',    7]
	]);

	var options = {
		title: 'My Daily Activities',
		pieHole: 0,
	};

	var chart = new google.visualization.PieChart(document.getElementById('donutchart'));
	chart.draw(data, options);
}
