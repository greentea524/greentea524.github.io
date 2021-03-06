$(document).ready(function() {
	$('#myButton').click(function(){
		$('img').fadeToggle( "slow", "linear" );
	});
	$('#rightButton').click(function(){
		$('img').animate({left: "+=10px"}, 'fast');
	});
	$('#leftButton').click(function(){
		$('img').animate({left: "-=10px"}, 'fast');
	});
	$('img').mouseenter(function(){
		$('img').fadeTo('fast',0.5);
	});
	$('img').mouseleave(function(){
		$('img').fadeTo('fast',1);
	});
	$('img').draggable();
	$('#nav').accordion();
	$('#blog').click(function(){
		$(this).toggleClass('highlighted');
	});
	$('button').click(function() {
    	var toAdd = $("input[name=message]").val();
        $('#messages').append("<p>"+toAdd+"</p>");
    	});
});

$(document).keydown(function(key) {
        switch(parseInt(key.which,10)) {
            
			// Left arrow key pressed
			case 37:
				$('img').animate({left: "-=10px"}, 'fast');
				break;
			// Up Arrow Pressed
			case 38:
				$('img').animate({top: "-=10px"}, 'fast');
				break;
			// Right Arrow Pressed
			case 39:
				$('img').animate({left: "+=10px"}, 'fast');
				break;
			// Down Arrow Pressed
			case 40:
				$('img').animate({top: "+=10px"}, 'fast');
				break;
		}
});
