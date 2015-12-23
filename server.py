import bottle
import random

deck_init = ["Joker", "5 of Clubs", "6 of Clubs", "7 of Clubs",
			"8 of Clubs", "9 of Clubs", "10 of Clubs", "Jack of Clubs",
			"Queen of Clubs", "King of Clubs", "Ace of Clubs",
			"4 of Hearts", "5 of Hearts", "6 of Hearts", "7 of Hearts",
			"8 of Hearts", "9 of Hearts", "10 of Hearts", "Jack of Hearts",
			"Queen of Hearts", "King of Hearts", "Ace of Hearts",
			"5 of Spades", "6 of Spades", "7 of Spades", "8 of Spades",
			"9 of Spades", "10 of Spades", "Jack of Spades",
			"Queen of Spades", "King of Spades", "Ace of Spades",
			"4 of Diamonds", "5 of Diamonds", "6 of Diamonds",
			"7 of Diamonds", "8 of Diamonds", "9 of Diamonds",
			"10 of Diamonds", "Jack of Diamonds", "Queen of Diamonds",
			"King of Diamonds", "Ace of Diamonds"]

game_data = {
	'hands': [[], [], [], []],
	'kitty': [],
	'table': [],
	'version_id': 0
}

# Thanks, Gongy!
def actionDeal():
	print('Dealing...')
	game_data['hands'] = [[], [], [], []]
	game_data['kitty'].clear()
	game_data['table'].clear()
	random.shuffle(deck_init)
	for player in range(1, 5):
		for c in range(10*(player-1), 10*player):
			game_data['hands'][player-1].append(deck_init[c])
	for c in range(40, 43):
		game_data['kitty'].append(deck_init[c])

@bottle.route('/')
def page_index():
	return page_static('index.html')

# This is the entire information about the game, because I'm lazy.
# You can use it to look at other people's hands and cheat. But whatever.
@bottle.route('/gamestate')
def page_gamestate():
	return game_data

@bottle.post('/action')
def page_action():
	action = bottle.request.forms.get('action')
	card = bottle.request.forms.get('card')
	player = int(bottle.request.forms.get('player'))
	# Play a card
	if action == 'play':
		if card in game_data['hands'][player]:
			game_data['table'].append([player, card])
			game_data['hands'][player].remove(card)
	# Completely redeal cards
	if action == 'redeal':
		actionDeal()
	# Grab the kitty
	if action == 'grab':
		game_data['hands'][player] += game_data['kitty']
		game_data['kitty'] = []
	# Discard a card
	if action == 'discard':
		if card in game_data['hands'][player]:
			game_data['hands'][player].remove(card)
			game_data['table'].append([player, '(discarded)'])
	# Clear the table
	if action == 'clear':
		game_data['table'].clear()
		# game_data['table'] = [-1] * len(game_data['table'])
	# Increment version counter
	game_data['version_id'] += 1
	# Return the new game state
	return page_gamestate()

# This is for files that never change.
@bottle.route('/static/<filename>')
def page_static(filename):
	return bottle.static_file(filename, root='./static/')

bottle.run(host = '0.0.0.0', port = 8080)