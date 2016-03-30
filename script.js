$(document).ready(function() {
	$('#myButton').click(function(){
		$('img').fadeTo('slow',0.5);
	});
	$('#rightButton').click(function(){
		$('img').animate({left: "+=10px"}, 'fast');
	});
	$('#leftButton').click(function(){
		$('img').animate({left: "-=10px"}, 'fast');
	});
	$('img').mouseenter(function(){
		$('div').fadeTo('fast',1);
	});
	$('img').mouseleave(function(){
		$('div').fadeTo('fast',0.5);
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
});
