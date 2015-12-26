var last_gamedata_version = -1;
var player_id = -1;
var trump_suit;
var poll_timer = null;

function isMisere(betSuit) {
	return betSuit == 'Misere' || betSuit == 'Open Misere';
}
function getTrump(betSuit) {
	if (isMisere(betSuit) || betSuit == '') return 'No Trump';
	else return betSuit;
}

function makeCardText(cardname) {
	var result = cardname;
	var is_trump = false;
	if (cardname == 'Joker') is_trump = true;
	if (cardname.indexOf(trump_suit) != -1) is_trump = true;
	if (trump_suit == 'Hearts' && cardname == 'Jack of Diamonds') is_trump = true; 
	if (trump_suit == 'Diamonds' && cardname == 'Jack of Hearts') is_trump = true; 
	if (trump_suit == 'Spades' && cardname == 'Jack of Clubs') is_trump = true; 
	if (trump_suit == 'Clubs' && cardname == 'Jack of Spades') is_trump = true; 
	if (is_trump) {
		result = '<span class="blue">' + cardname + '</span>';
	} else if (cardname.indexOf('Diamonds') != -1 || cardname.indexOf('Hearts') != -1) {
		result = '<span class="red">' + cardname + '</span>';
	} else {
		result = '<span>' + cardname + '</span>';
	}
	return result;
}

function makeTableTable(cards) {
	var played_html = '<table>';
	for (i in cards) {
		var pid = cards[i].player;
		var card = cards[i].card;
		var cardname = card;
		if (cards[i].state == 'discarded') cardname = '(discarded)';
		played_html += '<tr><td>';
		if (cards[i].winning) played_html += '<strong>';
		played_html += 'Player ' + (pid + 1) + ': ' + makeCardText(cardname);
		if (cards[i].winning) played_html += '</strong>';
		played_html += '</td>';
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
	poll_timer = window.setTimeout(getGameData, 400);
	if (player_id != -1 && data.version_id != last_gamedata_version) {
		trump_suit = getTrump(data.betSuit);
		var myhand = data.hands[player_id];
		var table = data.table;
		table.reverse();
		// console.log(data.kitty, data.kitty.length);
		$('#kittyCards').text(data.kitty.length + ' cards');
		hand_html = '<table>';
		for (i in myhand) {
			hand_html += '<tr>';
			hand_html += '<td>' + makeCardText(myhand[i]) + '</td>';
			var button_label = 'Play';
			if (myhand.length > 10) {
				button_label = 'Discard';
			}
			hand_html += '<td><button onclick="cardPlay(\'' + myhand[i] + '\');">' + button_label + '</button></td>';
			hand_html += '</tr>';
			// console.log(myhand[i], t);
		}
		hand_html += '</table>';
		// console.log(hand_html);
		$("#myCards").html(hand_html);
		$("#playedCards").html(makeTableTable(data.table));
		$("#floorCards").html(makeTableTable(data.floor));
		var betInfo = 'There is no bet';
		if (data.betAmount != -1 || data.betSuit != '') {
			var betValue = 0;
			betInfo = 'The bet is';
			// calculate bet name
			if (data.betAmount != -1) betInfo += ' ' + data.betAmount;
			if (data.betSuit != '') betInfo += ' ' + data.betSuit;
			// calculate bet value
			if (data.betSuit == 'Misere') betValue = 250;
			else if (data.betSuit == 'Open Misere') betValue = 500;
			else if (data.betAmount != -1 && data.betSuit != '') {
				betValue = 100 * (data.betAmount - 6);
				if (data.betSuit == 'Spades') betValue += 40;
				if (data.betSuit == 'Clubs') betValue += 60;
				if (data.betSuit == 'Diamonds') betValue += 80;
				if (data.betSuit == 'Hearts') betValue += 100;
				if (data.betSuit == 'No Trump') betValue += 120;
			}
			// betValue == 0 means to not display it
			if (betValue) betInfo += ' (' + betValue + ' points)';
		}
		$("#betInfo").text(betInfo);
		last_gamedata_version = data.version_id;
	}
}

function handleUpdateError(request, status, error) {
	poll_timer = window.setTimeout(getGameData, 800);
	console.log('Ajax request failed:', status, ', ', error)
}

function postAction(action_data) {
	window.clearTimeout(poll_timer);
	action_data.player = player_id;
	$.ajax({
		'type': 'POST',
		'url': '/action',
		'data': action_data,
		'dataType': 'json',
		'timeout': 500,
		'success': updateGameView,
		'error': handleUpdateError,
	});
}

function changePlayer(pid) {
	player_id = pid;
	last_gamedata_version = -1;
	$("#yourName").text("You are player " + (pid + 1));
	getGameData();
}

function cardPlay(card) {
	window.clearTimeout(poll_timer);
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
	window.clearTimeout(poll_timer);
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
	window.clearTimeout(poll_timer);
	$.post("/action",
		{
			'action': 'pickup',
			'card': card,
			'player': player_id
		},
		updateGameView
	);
}

function actionRedeal() {
	var query = window.confirm("Redeal the cards?");
	if (query) {
		uniAction('redeal');
	}
}

function uniAction(action_name) {
	window.clearTimeout(poll_timer);
	$.post('/action',
		{
			'action': action_name,
			'player': player_id
		},
		updateGameView
	);
}

function setBetAmount(betAmount) {
	window.clearTimeout(poll_timer);
	$.post('/action',
		{
			'action': 'setBetAmount',
			'player': player_id,
			'betAmount': betAmount
		},
		updateGameView
	);
}

function setBetSuit(betSuit) {
	window.clearTimeout(poll_timer);
	$.post('/action',
		{
			'action': 'setBetSuit',
			'player': player_id,
			'betSuit': betSuit
		},
		updateGameView
	);
}

function getGameData() {
	window.clearTimeout(poll_timer);
	$.ajax({
		'type': 'GET',
		'url': '/gamestate',
		'timeout': 500,
		'success': updateGameView,
		'error': handleUpdateError,
	});
}

poll_timer = setTimeout(getGameData, 1000);
