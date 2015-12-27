var last_gamedata_version = -1;
var player_id = -1;
var trump_suit;
var poll_timer = null;
var show_trump = 'colour';
var spectating = false;
var query_timeout = 2000;
var can_grab = false;

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
	if (is_trump && show_trump == 'colour') {
		result = '<span class="blue">' + cardname + '</span>';
	} else if (cardname.indexOf('Diamonds') != -1 || cardname.indexOf('Hearts') != -1) {
		if (is_trump && show_trump == 'text')
			result = '<span class="red">' + cardname + ' (T)</span>';
		else
			result = '<span class="red">' + cardname + '</span>';
	} else {
		if (is_trump && show_trump == 'text')
			result = '<span>' + cardname + ' (T)</span>';
		else
			result = '<span>' + cardname + '</span>';
	}
	return result;
}

function makeTableTable(cards, can_discard) {
	var played_html = '<table>';
	for (i in cards) {
		var pid = cards[i].player;
		var card = cards[i].card;
		var cardname = card;
		if (cards[i].state == 'discarded') {
			cardname += ' (discarded)';
			if (pid != player_id && !spectating) cardname = '(discarded)';
		}
		played_html += '<tr><td>';
		if (cards[i].winning) played_html += '<strong>';
		played_html += 'Player ' + (pid + 1) + ': ' + makeCardText(cardname);
		if (cards[i].winning) played_html += '</strong>';
		played_html += '</td>';
		if (pid == player_id && can_discard) {
			played_html += '<td><button onclick="cardPickup(\'' + card + '\');">Pickup</button></td>';
		} else {
			played_html += '<td></td>';
		}
		played_html += '</tr>';
	}
	played_html += '</table>';
	return played_html;
}


function makeScoreState(score) {
	var my_score = score[player_id % 2], other_score = score[(player_id + 1) % 2];
	return '<p>You: ' + my_score + '<br>Opponents: ' + other_score + '</p>';
}

function makeTrickState(betPlayer, betSuit, tricks) {
	var tshtml, my_score = tricks[player_id % 2], other_score = tricks[(player_id + 1) % 2];
	tshtml = '<p>You: ' + my_score + '<br>Opponents: ' + other_score + '</p>';
	var canFinishRound = false;
	if (isMisere(betSuit)) {
		if (tricks[(betPlayer + 1) % 2] == 10) canFinishRound = true;
		if (tricks[betPlayer % 2] > 0) canFinishRound = true;
	} else {
		if (my_score + other_score == 10) canFinishRound = true;
	}
	if (canFinishRound) tshtml += '<button onclick="finishRound();">Finish Round</button>';
	return tshtml;
}

function makeHandTable(hand, buttons) {
	var hand_html = '<table>';
	for (i in hand) {
		hand_html += '<tr>';
		hand_html += '<td>' + makeCardText(hand[i]) + '</td>';
		if (buttons) {
			var button_label = 'Play';
			if (hand.length > 10) {
				button_label = 'Discard';
			}
			hand_html += '<td><button onclick="cardPlay(\'' + hand[i] + '\');">' + button_label + '</button></td>';
		}
		hand_html += '</tr>';
	}
	hand_html += '</table>';
	return hand_html
}

function makeBetText(betPlayer, betAmount, betSuit) {
	var betInfo = 'There is no bet';
	if (betPlayer != -1) {
		var betValue = 0;
		betInfo = 'Player ' + (betPlayer + 1) + ' has bet';
		// calculate bet name
		if (betAmount != -1) betInfo += ' ' + betAmount;
		if (betSuit != '') betInfo += ' ' + betSuit;
		// calculate bet value
		if (betSuit == 'Misere') betValue = 250;
		else if (betSuit == 'Open Misere') betValue = 500;
		else if (betAmount != -1 && betSuit != '') {
			betValue = 100 * (betAmount - 6);
			if (betSuit == 'Spades') betValue += 40;
			if (betSuit == 'Clubs') betValue += 60;
			if (betSuit == 'Diamonds') betValue += 80;
			if (betSuit == 'Hearts') betValue += 100;
			if (betSuit == 'No Trump') betValue += 120;
		}
		// betValue == 0 means to not display it
		if (betValue) betInfo += ' (' + betValue + ' points)';
	}
	return betInfo;
}

function isProperBet(betAmount, betSuit) {
	return isMisere(betSuit) || (betAmount != -1 && betSuit != '');
}

function getCanGrab(data) {
	return data.kitty.length == 3 &&
		isProperBet(data.betAmount, data.betSuit) &&
		player_id == data.betPlayer;
}

function updateSpectatorView(data, status) {
	if (data.version_id != last_gamedata_version) {
		trump_suit = getTrump(data.betSuit);
		data.table.reverse();
		data.floor.reverse();
		for (var i = 0; i < 4; i++) {
			var obj_id = "#player" + (i + 1) + "Cards";
			$(obj_id).html(makeHandTable(data.hands[i]), false);
		}
		$("#playedCards").html(makeTableTable(data.table, false));
		$("#floorCards").html(makeTableTable(data.floor, false));
		$("#betInfo").text(makeBetText(data.betPlayer, data.betAmount, data.betSuit));
		$("#player1Score").text(data.tricks[0] + ' tricks');
		$("#player2Score").text(data.tricks[1] + ' tricks');
		$("#player3Score").text(data.tricks[0] + ' tricks');
		$("#player4Score").text(data.tricks[1] + ' tricks');
		last_gamedata_version = data.version_id;
	}
}

// Update the game view with the given data.
function updateGameView(data, status) {
	if (player_id != -1 && data.version_id != last_gamedata_version) {
		trump_suit = getTrump(data.betSuit);
		data.table.reverse();
		data.floor.reverse();
		$('#kittyCards').text(data.kitty.length + ' cards');
		$("#myCards").html(makeHandTable(data.hands[player_id], data.kitty.length == 0));
		$("#playedCards").html(makeTableTable(data.table, true));
		$("#floorCards").html(makeTableTable(data.floor, false));
		$("#betInfo").text(makeBetText(data.betPlayer, data.betAmount, data.betSuit));
		$("#scoreState").html(makeScoreState(data.score));
		$("#trickState").html(makeTrickState(data.betPlayer, data.betSuit, data.tricks));
		can_grab = getCanGrab(data);
		last_gamedata_version = data.version_id;
	}
}

function updateTheView(data, status) {
	$("p.alert").hide();
	poll_timer = window.setTimeout(getGameData, 400);
	if (spectating) {
		updateSpectatorView(data, status);
	} else {
		updateGameView(data, status);
	}
}

function handleUpdateError(request, status, error) {
	poll_timer = window.setTimeout(getGameData, 800);
	$("p.alert").show();
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
		'timeout': query_timeout,
		'success': updateTheView,
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
	postAction({
		'action': 'play',
		'card': card
	});
}

function cardPickup(card) {
	window.clearTimeout(poll_timer);
	postAction({
		'action': 'pickup',
		'card': card
	});
}

function actionRedeal() {
	var query = window.confirm("Redeal the cards?");
	if (query) {
		uniAction('redeal');
	}
}

function actionGrab() {
	if (can_grab) {
		var query = window.confirm("Grab the kitty? You will no longer be able to change the bet.");
		if (query) {
			uniAction('grab');
		}
	}
}

function uniAction(action_name) {
	window.clearTimeout(poll_timer);
	postAction({'action': action_name});
}

function setBetAmount(betAmount) {
	window.clearTimeout(poll_timer);
	postAction({
		'action': 'setBetAmount',
		'betAmount': betAmount
	});
}

function setBetSuit(betSuit) {
	window.clearTimeout(poll_timer);
	postAction({
		'action': 'setBetSuit',
		'betSuit': betSuit
	});
}

function finishRound() {
	uniAction('finishRound');
}

function getGameData() {
	window.clearTimeout(poll_timer);
	$.ajax({
		'type': 'GET',
		'url': '/gamestate',
		'timeout': query_timeout,
		'success': updateTheView,
		'error': handleUpdateError,
	});
}

function setTrumpDisplay(displayType) {
	show_trump = displayType;
	last_gamedata_version = -1;
	getGameData();
}

poll_timer = window.setTimeout(getGameData, 1000);
