function getGameData() {
	$.get("/gamestate",
		function (data, status) {
			myhand = data.hands[0];
			table = data.table[0];
			kiddy = data.kiddy.legnth;
			myhand_html = ' ';
			for (i in myhand) {
				myhand_html += '<p>' + myhand[i] + '</p>';
			}
			$("#myCards").html(myhand_html);
			console.log(data);
		}
	);
	setTimeout(getGameData, 1000);
}

setTimeout(getGameData, 1000);
