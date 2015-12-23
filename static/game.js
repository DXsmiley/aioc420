function playcard(card) {
	console.log('Playing card: ', card)
	$.post("/action",
		{
			'action': 'play',
			'card': card,
			'player': 0
		},
		function (d, s) {}
	);
}

function clearTable() {
	console.log('Clearing table...')
	$.post('/action',
		{
			'action': 'clear',
			'player': 0
		},
		function (d, s) {}
	);
}

function getGameData() {
	$.get("/gamestate",
		function (data, status) {
			myhand = data.hands[0];
			table = data.table;
			kiddy = data.kiddy.legnth;
			myhand_html = ' ';
			for (i in myhand) {
				t = '<p><button onclick="playcard(\'CARD\');">CARD</button></p>';
				myhand_html += t.replace("CARD", myhand[i]).replace("CARD", myhand[i]);
				console.log(myhand[i], t);
			}
			$("#myCards").html(myhand_html);
			played_html = ' ';
			for (i in table) {
				played_html += '<p>CARD</p>'.replace('CARD', table[i]);
			}
			$("#playedCards").html(played_html);
		}
	);
	setTimeout(getGameData, 300);
}

setTimeout(getGameData, 1000);
