var last_gamedata_version = -1;
var player_id = -1;
var trump_suit;
var poll_timer = null;
var show_trump = 'colour';
var spectating = false;
var query_timeout = 2000;

function getCardSuit(cardname) {
	if (cardname == 'Jack of Hearts' && trump_suit == 'Diamonds') return 'Diamonds';
	if (cardname == 'Jack of Diamonds' && trump_suit == 'Hearts') return 'Hearts';
	if (cardname == 'Jack of Clubs' && trump_suit == 'Spades') return 'Spades';
	if (cardname == 'Jack of Spades' && trump_suit == 'Clubs') return 'Clubs';
	if (cardname.indexOf('Diamonds') != -1) return 'Diamonds';
	if (cardname.indexOf('Hearts') != -1) return 'Hearts';
	if (cardname.indexOf('Spades') != -1) return 'Spades';
	if (cardname.indexOf('Clubs') != -1) return 'Clubs';
	return trump_suit; // It's the joker, therefore it's a trump.
}

function isMisere(betSuit) {
	return betSuit == 'Misere' || betSuit == 'Open Misere';
}

function getTrump(betSuit) {
	if (isMisere(betSuit) || betSuit == '') return 'No Trump';
	else return betSuit;
}

function getDisplayName(names, i) {
	if (0 <= i && i < 4) return names[i] + ' (' + (i+1) + ')';
	else return 'Invalid Player (tell someone to fix this ~_~) (' + (i+1) + ')';
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

function makeTableTable(cards, can_discard, names) {
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
		played_html += getDisplayName(names, pid) + ": " + makeCardText(cardname);
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

// Returns true if one of your cards is on the table.
function havePlayed(table) {
	var r = false;
	for (i in table) if (table[i].player == player_id) r = true;
	return r;
}

function makeHandTable(hand, buttons, leading_suit, already_played) {
	var hand_html = '<table>';
	var forced_to_follow = false;
	for (i in hand) {
		if (getCardSuit(hand[i]) == leading_suit) forced_to_follow = true;
	}
	for (i in hand) {
		hand_html += '<tr>';
		hand_html += '<td>' + makeCardText(hand[i]) + '</td>';
		if (buttons) {
			if (hand.length > 10) {
				hand_html += '<td><button onclick="cardPlay(\'' + hand[i] + '\');">Discard</button></td>';
			} else {
				if (!already_played && (!forced_to_follow || getCardSuit(hand[i]) == leading_suit)) {
					hand_html += '<td><button onclick="cardPlay(\'' + hand[i] + '\');">Play</button></td>';
				} else {
					hand_html += '<td></td>';
				}
			}
		}
		hand_html += '</tr>';
	}
	hand_html += '</table>';
	return hand_html
}

function makeBetHtml(data) {
	var names = data.names, betPlayer = data.betPlayer, betAmount = data.betAmount,
		betSuit = data.betSuit, isFixed = data.kitty.length == 0;
	var betInfo = 'There is no bet';
	if (betPlayer != -1) {
		var betValue = 0;
		betInfo = getDisplayName(names, betPlayer);
		if (isFixed) betInfo += ' has bet';
		else betInfo += ' is betting';
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
		if (isFixed) betInfo = '<strong>' + betInfo + '</strong>';
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
			var name_class = ".player" + (i + 1) + "Name";
			$(name_class).html(getDisplayName(data.names, i));
			var obj_id = "#player" + (i + 1) + "Cards";
			$(obj_id).html(makeHandTable(data.hands[i], false, 'none', false));
		}
		$("#playedCards").html(makeTableTable(data.table, false, data.names));
		$("#floorCards").html(makeTableTable(data.floor, false, data.names));
		$("#betInfo").html(makeBetHtml(data));
		$("#team1Score").text(data.score[0]+'');
		$("#team2Score").text(data.score[1]+'');
		$("#team1Tricks").text(data.tricks[0]+'');
		$("#team2Tricks").text(data.tricks[1]+'');
		last_gamedata_version = data.version_id;
	}
}

// Update the game view with the given data.
function updateGameView(data, status) {
	if (player_id != -1 && data.version_id != last_gamedata_version) {
		trump_suit = getTrump(data.betSuit);
		var leading_suit = data.table.length == 0 ? null : getCardSuit(data.table[0]['card']);
		data.table.reverse();
		data.floor.reverse();
		$("#yourName").text("You are " + getDisplayName(data.names, player_id));
		$('#kittyCards').text(data.kitty.length + ' cards');
		$("#myCards").html(makeHandTable(
			data.hands[player_id],
			data.kitty.length == 0,
			leading_suit,
			havePlayed(data.table)
		));
		$("#playedCards").html(makeTableTable(data.table, true, data.names));
		$("#floorCards").html(makeTableTable(data.floor, false, data.names));
		$("#betInfo").html(makeBetHtml(data));
		$("#scoreState").html(makeScoreState(data.score));
		$("#trickState").html(makeTrickState(data.betPlayer, data.betSuit, data.tricks));
		$("#buttonGrab").prop('disabled', !getCanGrab(data));
		$("button.bet").prop('disabled', (data.kitty.length == 0));
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
	// As soon as we become an actual player, we can click on these buttons.
	$("#buttonClear").prop("disabled", false);
	$("#buttonRedeal").prop("disabled", false);
	$("#buttonRename").prop("disabled", false);
	player_id = pid;
	last_gamedata_version = -1;
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
	var query = window.confirm("Grab the kitty? You will no longer be able to change the bet.");
	if (query) {
		uniAction('grab');
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

function nameIsValid(name) {
	var allowed_chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789 -_';
	var valid = name.length <= 20;
	for (i in name) {
		if (allowed_chars.indexOf(name[i]) === -1) valid = false;
	}
	return valid;
}

function changeName() {
	if (player_id != -1) {
		var name = prompt("Please enter your name:");
		if (name) { // checks if the user pressed cancel
			if (nameIsValid(name)) {
				$("#yourName").text("You are " + name + " (" + (player_id + 1) + ")");
				postAction({
					'action': 'changeName',
					'name': name
				});
			} else {
				window.alert("Only use alphanumeric characters. Maximum length is 20 characters.");
			}
		}
	}
}

poll_timer = window.setTimeout(getGameData, 1000);
