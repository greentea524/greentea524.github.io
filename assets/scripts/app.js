Typed.new("#writing-text", {
	strings: [
		"am a Software Engineer.", "love everything about code.", "solve problems."
	],
	// typing speed
	typeSpeed: 1,
	contentType: 'text',
	callback: function() {
		var el = document.getElementById("writing-text");
		el.style.color = "#fff";
		el.style.backgroundColor = "#C8412B";
	}
});
