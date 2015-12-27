var last_gamedata_version = -1;
var player_id = -1;
var trump_suit;
var poll_timer = null;
var show_trump = 'colour';
var query_timeout = 2000;

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
		if (cards[i].state == 'discarded' && (pid != player_id || !can_discard)) cardname = '(discarded)';
		else if (cards[i].state == 'discarded') cardname += ' (discarded)';
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
	var my_score, other_score;
	if (player_id == 0 || player_id == 2) {
		my_score = score[0];
		other_score = score[1];
	} else {
		my_score = score[1];
		other_score = score[0];
	}
	return '<p>You: ' + my_score + '<br>Opponents: ' + other_score + '</p>';
}

function makeTrickState(betPlayer, betSuit, tricks) {
		var tshtml, my_score, other_score;
		if (player_id == 0 || player_id == 2) {
			my_score = tricks[0];
			other_score = tricks[1];
		} else {
			my_score = tricks[1];
			other_score = tricks[0];
		}
		tshtml = '<p>You: ' + my_score + '<br>Opponents: ' + other_score + '</p>';
		var canFinishRound = false
		if (isMisere(betSuit)) {
			if (my_score + other_score == 10) canFinishRound = true;
			if (betPlayer == 0 || betPlayer == 2) {
				if (tricks[0]) canFinishRound = true;
			} else {
				if (tricks[1]) canFinishRound = true;
			}
		} else {
			if (my_score + other_score == 10) canFinishRound = true;
		}
		if (canFinishRound) tshtml += '<button onclick="finishRound();">Finish Round</button>';
		return tshtml;
}

// Update the game view with the given data.
function updateGameView(data, status) {
	$("p.alert").hide();
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
		$("#playedCards").html(makeTableTable(data.table, true));
		$("#floorCards").html(makeTableTable(data.floor, false));
		$("#scoreState").html(makeScoreState(data.score));
		$("#trickState").html(makeTrickState(data.betPlayer, data.betSuit, data.tricks));
		var betInfo = 'There is no bet';
		if (data.betPlayer != -1) {
			var betValue = 0;
			betInfo = 'Player ' + (data.betPlayer + 1) + ' has bet';
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
	console.log("finishing round...");
	uniAction('finishRound');
}

function getGameData() {
	window.clearTimeout(poll_timer);
	$.ajax({
		'type': 'GET',
		'url': '/gamestate',
		'timeout': query_timeout,
		'success': updateGameView,
		'error': handleUpdateError,
	});
}

function setTrumpDisplay(displayType) {
	show_trump = displayType;
	last_gamedata_version = -1;
	$.get("/gamestate",
		updateGameView
	);
}

poll_timer = window.setTimeout(getGameData, 1000);
