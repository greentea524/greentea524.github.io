
const PlayData = function() {

    function jsonPlaceHolder() {
        displayDataTableUser();
    }

    function fetchMockend() {
        displayDataTablePost();
    }

	return {
		jsonPlaceHolder: jsonPlaceHolder,
		fetchMockend: fetchMockend
	}

}();

PlayData.jsonPlaceHolder();
PlayData.fetchMockend();

function displayDataTableUser() {

    $('#myTableOne').DataTable({
        ajax: {
            url: "https://jsonplaceholder.typicode.com/users",
            type: "GET",
            dataSrc: ""
        },
        columns: [
            { "data": "id" },
            { "data": "name" },
            { "data": "username" },
            { "data": "email" },
            { "data": "website" }
        ],
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            'colvis'
        ]
    });

    // fetch('https://jsonplaceholder.typicode.com/todos/1')
    // .then(response => response.json())
    // .then(json => console.log(json))
}
function displayDataTablePost() {

    $('#myTableTwo').DataTable({
        ajax: {
            url: "https://mockend.com/greentea524/greentea524.github.io/posts",
            type: "GET",
            dataSrc: ""
        },
        columns: [
            { "data": "title" },
            { "data": "views" },
            { "data": "published" },
            { "data": "createdAt" }
        ],
        responsive: true,
        dom: 'Bfrtip',
        buttons: [
            'colvis'
        ]
    });

    // fetch('https://mockend.com/greentea524/greentea524.github.io/posts')
    // .then(response => response.json())
    // .then(json => {
    //     console.log(json)
    //     //displayDataTablePost(json);
    // })
    //
    // fetch('https://mockend.com/greentea524/greentea524.github.io/users/1')
    // .then(response => response.json())
    // .then(json => {
    //     console.log(json)
    // })

}
