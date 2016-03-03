var last_gamedata_version = -1;
var player_id = -1;
var trump_suit;
var poll_timer = null;
var show_trump = 'colour';
var spectating = false;
var query_timeout = 2000;
var myBetAmount = -1;
var myBetSuit = '';
var viewing_opponent = false;

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

function makeTrickState(betPlayer, betSuit, tricks, roundOver) {
	var tshtml, my_score = tricks[player_id % 2], other_score = tricks[(player_id + 1) % 2];
	tshtml = '<p>You: ' + my_score + '<br>Opponents: ' + other_score + '</p>';
	var roundFinished = false;
	if (my_score + other_score == 10) roundFinished = true;
	if (isMisere(betSuit) && tricks[betPlayer % 2] > 0) roundFinished = true;
	if (roundOver) roundFinished = true;
	if (roundFinished) tshtml += '<button onclick="finishRound();">Finish Round</button>';
	return tshtml;
}

function makeHandTable(hand, buttons) {
	var hand_html = '<table class=\"hands\">';
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

function makeBetTextNoPlayer(betAmount, betSuit) {
	var betValue = 0;
	var betInfo = '';
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
	return betInfo;
}

function makeBetText(betPlayer, betAmount, betSuit, names) {
	if (betPlayer == -1) return 'There is no bet.';
	else return getDisplayName(names, betPlayer) + ' has bet' + makeBetTextNoPlayer(betAmount, betSuit);
}

function makeBetTable(all_bets, names) {
	var betInfo = "";
	for (i in all_bets) {
		var thisBet = makeBetText(all_bets[i].betPlayer, all_bets[i].betAmount, all_bets[i].betSuit, names);
		betInfo = "<tr><td>" + thisBet + "</td></tr>" + betInfo;
	}
	betInfo = "<table>" + betInfo + "</table>";
	return betInfo;
}

function isProperBet(betAmount, betSuit) {
	return isMisere(betSuit) || (betAmount != -1 && betSuit != '') || (betSuit == 'Pass');
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
			$(obj_id).html(makeHandTable(data.hands[i]), false);
		}
		if (data.kitty.length == 0)
			$("#playedCards").html(makeTableTable(data.table, false, data.names));
		else
			$("#playedCards").html(makeBetTable(data.allBets, data.names));
		$("#floorCards").html(makeTableTable(data.floor, false, data.names));
		$("#betInfo").text(makeBetText(data.betPlayer, data.betAmount, data.betSuit, data.names));
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
		data.table.reverse();
		data.floor.reverse();
		$("#yourName").text("You are " + getDisplayName(data.names, player_id));
		$('#kittyCards').text(data.kitty.length + ' cards');

		// Support for open misere
		var can_see_opponent = false;
		if (data.betSuit == 'Open Misere' && data.betPlayer != player_id) {
			// somebody else has bet open misere
			// make sure they have already discarded kitty
			if (data.hands[data.betPlayer].length <= 10) {
				// but maybe the table still has the kitty
				if (data.table.length == 0) {
					// there is nothing on the table so all g
					can_see_opponent = true;
				} else if (data.table[0].state != 'discarded') {
					// the cards on the table are not the kitty
					can_see_opponent = true;
				}
			}
		}
		if (!can_see_opponent) viewing_opponent = false;
		var my_hand_html = makeHandTable(data.hands[player_id], data.kitty.length == 0);
		if (viewing_opponent)
			my_hand_html = makeHandTable(data.hands[data.betPlayer], false);
		if (can_see_opponent)
			my_hand_html = my_hand_html + "<br><button onclick=\"changeView();\">Change view</button>";
		$("#myCards").html(my_hand_html);

		if (viewing_opponent) $("#myCardsTitle").text("Opponent's hand");
		else $("#myCardsTitle").text("Your hand");

		if (data.kitty.length == 0) // bet exists so in play mode
			$("#playedCards").html(makeTableTable(data.table, true, data.names));
		else // in betting phase, display bets on table
			$("#playedCards").html(makeBetTable(data.allBets, data.names));

		$("#floorCards").html(makeTableTable(data.floor, false, data.names));

		if (data.kitty.length == 0) { // bet exists and is confirmed
			$("#betInfo").text(makeBetText(data.betPlayer, data.betAmount, data.betSuit, data.names));
			myBetAmount = -1; // reset things
			myBetSuit = '';
		} else { // still in betting phase
			var betInfoHtml = "You are considering betting "+makeBetTextNoPlayer(myBetAmount, myBetSuit);
			if (isProperBet(myBetAmount, myBetSuit))
				betInfoHtml = betInfoHtml + " <button onclick=confirmBet()>Confirm</button>";
			$("#betInfo").html(betInfoHtml);
		}
		$("#scoreState").html(makeScoreState(data.score));
		$("#trickState").html(makeTrickState(data.betPlayer, data.betSuit, data.tricks, data.roundOver));
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

function actionNewGame() {
	var query = window.confirm("Start a new game?\nThis will reset all scores.");
	if (query) {
		uniAction('newgame');
	}
}

function uniAction(action_name) {
	window.clearTimeout(poll_timer);
	postAction({'action': action_name});
}

function setBetAmount(betAmount) {
	if (player_id != -1)
	{
		last_gamedata_version = -1;
		myBetAmount = betAmount;
		if (isMisere(myBetSuit) || myBetSuit == 'Pass')
			myBetSuit = '';
	}
}

function setBetSuit(betSuit) {
	if (player_id != -1)
	{
		last_gamedata_version = -1;
		myBetSuit = betSuit;
		if (isMisere(betSuit) || betSuit == 'Pass')
			myBetAmount = -1;
	}
}

function confirmBet() {
	window.clearTimeout(poll_timer);
	if (player_id != -1)
	{
		last_gamedata_version = -1;
		if (isProperBet(myBetAmount, myBetSuit))
		{
			postAction({
				'action': 'setBet',
				'betAmount': myBetAmount,
				'betSuit': myBetSuit
			});
		}
	}
}

function finishRound() {
	var query = window.confirm("Finish the round? This will redeal the cards.");
	if (query) {
		uniAction('finishRound');
	}
}

function getGameData() {
	window.clearTimeout(poll_timer);
	$.ajax({
		'type': 'GET',
		'url': '/gamestate',
		'dataType': 'json',
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

function changeView() {
	viewing_opponent = !viewing_opponent;
	last_gamedata_version = -1;
	getGameData();
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
