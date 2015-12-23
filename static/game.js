var last_gamedata_version = -1;

function cardPlay(card) {
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

function cardDisc(card) {
	console.log('Playing card: ', card)
	$.post("/action",
		{
			'action': 'discard',
			'card': card,
			'player': 0
		},
		function (d, s) {}
	);
}

function uniAction(action_name) {
	$.post('/action',
		{
			'action': action_name,
			'player': 0
		},
		function (d, s) {}
	);
}

function getGameData() {
	$.get("/gamestate",
		function (data, status) {
			if (data.version_id != last_gamedata_version) {
				var myhand = data.hands[0];
				var table = data.table;
				$('kittyCards').html('<p>' + data.kitty.legnth + '</p>');
				hand_html = '<table style="border: 1px solid">';
				for (i in myhand) {
					hand_html += '<tr>';
					hand_html += '<td>' + myhand[i] + '</td>';
					hand_html += '<td><button onclick="cardPlay(\'' + myhand[i] + '\');">Play</button></td>';
					hand_html += '<td><button onclick="cardDisc(\'' + myhand[i] + '\');">Discard</button></td>';
					hand_html += '</tr>';
					// console.log(myhand[i], t);
				}
				hand_html += '</table>';
				// console.log(hand_html);
				$("#myCards").html(hand_html);
				var played_html = '';
				for (i in table) {
					played_html += '<p>CARD</p>'.replace('CARD', table[i]);
				}
				$("#playedCards").html(played_html);
				last_gamedata_version = data.version_id
			}
		}
	);
	setTimeout(getGameData, 300);
}

setTimeout(getGameData, 1000);
