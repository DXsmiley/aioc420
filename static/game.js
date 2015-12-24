var last_gamedata_version = -1;
var player_id = -1;

function makeCardText(card) {
	var result = card;
	if (card.indexOf('Diamonds') != -1 || card.indexOf('Hearts') != -1) {
		result = '<td><span class="red">' + card + '</span></td>';
	} else if (card == 'Joker') {
		result = '<td><span class="blue">' + card + '</span></td>';
	} else {
		result = '<td><span>' + card + '</span></td>';
	}
	return result;
}

function makeTableTable(cards) {
	var played_html = '<table>';
	for (i in cards) {
		var pid = cards[i][0];
		var card = cards[i][1];
		played_html += '<tr>';
		played_html += '<td>Player ' + (pid + 1) + ': ' + makeCardText(card) + '</td>';
		if (pid == player_id) {
			played_html += '<td><button onclick="cardPickup(\'' + card + '\');">Pickup</button></td>';
		} else {
			played_html += '<td></td>';
		}
		played_html += '</tr>';
	}
	played_html += '</table>';
	return played_html;
}

// Update the game view with the given data.
function updateGameView(data, status) {
	if (player_id != -1 && data.version_id != last_gamedata_version) {
		var myhand = data.hands[player_id];
		var table = data.table;
		table.reverse();
		// console.log(data.kitty, data.kitty.length);
		$('#kittyCards').text(data.kitty.length + ' cards');
		hand_html = '<table>';
		for (i in myhand) {
			hand_html += '<tr>';
			hand_html += '<td>' + makeCardText(myhand[i]) + '</td>';
			hand_html += '<td><button onclick="cardPlay(\'' + myhand[i] + '\');">Play</button></td>';
			hand_html += '<td><button onclick="cardDisc(\'' + myhand[i] + '\');">Discard</button></td>';
			hand_html += '</tr>';
			// console.log(myhand[i], t);
		}
		hand_html += '</table>';
		// console.log(hand_html);
		$("#myCards").html(hand_html);
		$("#playedCards").html(makeTableTable(data.table));
		$("#floorCards").html(makeTableTable(data.floor));
		last_gamedata_version = data.version_id
	}
}

// Update the game view and set a timer to check for new data.
function updateGameViewSetTimer(data, status) {
	updateGameView(data, status);
	setTimeout(getGameData, 300);
}

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
		updateGameView
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
		updateGameView
	);
}

function cardPickup(card) {
	$.post("/action",
		{
			'action': 'pickup',
			'card': card,
			'player': player_id
		},
		updateGameView
	);
}

function uniAction(action_name) {
	$.post('/action',
		{
			'action': action_name,
			'player': player_id
		},
		updateGameView
	);
}

function getGameData() {
	$.get("/gamestate",
		updateGameViewSetTimer
	);
}

setTimeout(getGameData, 1000);
