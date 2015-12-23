var last_gamedata_version = -1;
var player_id = -1;

function changePlayer(pid) {
	player_id = pid;
	last_gamedata_version = -1;
	$("#yourName").text("You are player " + (pid + 1));
}

function cardPlay(card) {
	// console.log('Playing card: ', card)
	$.post("/action",
		{
			'action': 'play',
			'card': card,
			'player': player_id
		},
		function (d, s) {}
	);
}

function cardDisc(card) {
	// console.log('Playing card: ', card)
	$.post("/action",
		{
			'action': 'discard',
			'card': card,
			'player': player_id
		},
		function (d, s) {}
	);
}

function uniAction(action_name) {
	$.post('/action',
		{
			'action': action_name,
			'player': player_id
		},
		function (d, s) {}
	);
}

function getGameData() {
	$.get("/gamestate",
		function (data, status) {
			if (player_id != -1 && data.version_id != last_gamedata_version) {
				var myhand = data.hands[player_id];
				var table = data.table;
				table.reverse();
				// console.log(data.kitty, data.kitty.length);
				$('#kittyCards').text(data.kitty.length + ' cards');
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
					var pid = table[i][0];
					var card = table[i][1];
					played_html += '<p>Player ' + (pid + 1) + ': ' + card + '</p>';
				}
				$("#playedCards").html(played_html);
				last_gamedata_version = data.version_id
			}
		}
	);
	setTimeout(getGameData, 300);
}

setTimeout(getGameData, 1000);
