import bottle
import random
import sys
import json
import copy

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

card_val_init = {"5 of Clubs": 0, "6 of Clubs": 1, "7 of Clubs": 2,
			"8 of Clubs": 3, "9 of Clubs": 4, "10 of Clubs": 5,
			"Jack of Clubs": 6, "Queen of Clubs": 7, "King of Clubs": 8,
			"Ace of Clubs": 9, "4 of Hearts": 10, "5 of Hearts": 11,
			"6 of Hearts": 12, "7 of Hearts": 13, "8 of Hearts": 14,
			"9 of Hearts": 15, "10 of Hearts": 16, "Jack of Hearts": 17,
			"Queen of Hearts": 18, "King of Hearts": 19, "Ace of Hearts": 20,
			"5 of Spades": 21, "6 of Spades": 22, "7 of Spades": 23,
			"8 of Spades": 24, "9 of Spades": 25, "10 of Spades": 26,
			"Jack of Spades": 27, "Queen of Spades": 28,
			"King of Spades": 29, "Ace of Spades": 30, "4 of Diamonds": 31,
			"5 of Diamonds": 32, "6 of Diamonds": 33, "7 of Diamonds": 34,
			"8 of Diamonds": 35, "9 of Diamonds": 36, "10 of Diamonds": 37,
			"Jack of Diamonds": 38, "Queen of Diamonds": 39,
			"King of Diamonds": 40, "Ace of Diamonds": 41, "Joker": 200}

card_val = copy.copy(card_val_init)

game_data = {
	'hands': [[], [], [], []],
	'kitty': [],
	'table': [],
	'floor': [],
	'tricks': [],
	'version_id': 0,
	'betAmount': -1,
	'betSuit': ''
}

do_save_data = False

def gameStateSave():
	if do_save_data:
		with open('game_state.json', 'w') as f:
			f.write(json.dumps(game_data))

def sort_hands():
	for i in game_data['hands']:
		i.sort(key = lambda x: card_val.get(x, -1), reverse = True)


def isMisere(string):
	return string == 'Misere' or string == 'Open Misere'

def getTrump(betSuit):
	if isMisere(betSuit) or betSuit == '': return 'No Trump'
	else: return betSuit

def set_trump(suit):
	global card_val
	card_val = copy.copy(card_val_init)
	for i in card_val:
		if suit in i:
			card_val[i] += 100
	if suit == 'Hearts':
		card_val['Jack of Hearts'] = 199
		card_val['Jack of Diamonds'] = 198
	if suit == 'Diamonds':
		card_val['Jack of Diamonds'] = 199
		card_val['Jack of Hearts'] = 198
	if suit == 'Spades':
		card_val['Jack of Spades'] = 199
		card_val['Jack of Clubs'] = 198
	if suit == 'Clubs':
		card_val['Jack of Clubs'] = 199
		card_val['Jack of Spades'] = 198

# Thanks, Gongy!
def actionDeal():
	print('Dealing...')
	game_data['hands'] = [[], [], [], []]
	game_data['kitty'] = []
	game_data['table'] = []
	game_data['floor'] = []
	game_data['tricks'] = [0, 0]
	random.shuffle(deck_init)
	for player in range(1, 5):
		for c in range(10*(player-1), 10*player):
			game_data['hands'][player-1].append(deck_init[c])
	for c in range(40, 43):
		game_data['kitty'].append(deck_init[c])
	set_trump('No Trump')
	# game_data['betSuit'] also can take on 'Misere' and 'Open Misere' values
	game_data['betAmount'] = -1
	game_data['betSuit'] = ''

def cardGetSuit(cardname):
	suit = 'Joker'
	if cardname != 'Joker':
		suit = cardname.split()[2]
	return suit

def markWinningCard():
	if len(game_data['table']) > 0:
		first_suit = cardGetSuit(game_data['table'][0]['card'])
		highest = -1
		for i in game_data['table']:
			i['winning'] = False
			if i['state'] != 'discarded':
				if cardGetSuit(i['card']) == first_suit or card_val[i['card']] >= 100:
					highest = max(highest, card_val[i['card']])
		for i in game_data['table']:
			if card_val[i['card']] == highest:
				i['winning'] = True

@bottle.route('/')
def page_index():
	return page_static('index.html')

# This is the entire information about the game, because I'm lazy.
# You can use it to look at other people's hands and cheat. But whatever.
@bottle.route('/gamestate')
def page_gamestate():
	sort_hands()
	return game_data

@bottle.post('/action')
def page_action():
	action = bottle.request.forms.get('action')
	card = bottle.request.forms.get('card')
	player = int(bottle.request.forms.get('player'))
	# Make sure that only actual players perform actions.
	if 0 <= player < 4:
		# Play or discard a card
		if action == 'play':
			if card in game_data['hands'][player]:
				if len(game_data['hands'][player]) <= 10:
					# in this case, play a card
					# make sure that only one card is played per turn
					can_play = True
					for i in game_data['table']:
						if i['player'] == player:
							can_play = False
					if can_play:
						game_data['table'].append({
							'player': player,
							'card': card,
							'state': 'normal'
							})
						game_data['hands'][player].remove(card)
						markWinningCard()
				else:
					# in this case, discard
					game_data['hands'][player].remove(card)
					game_data['table'].append({
						'player': player,
						'card': card,
						'state': 'discarded'
					})
		# Completely redeal cards
		if action == 'redeal':
			actionDeal()
		# Grab the kitty
		if action == 'grab':
			game_data['hands'][player] += game_data['kitty']
			game_data['kitty'] = []
		# Clear the table
		if action == 'clear':
			if (game_data['table']):
				for i in game_data['table']:
					if i['state'] != 'discarded' and i['winning']:
						if i['player'] == 0 or i['player'] == 2:
							game_data['tricks'][0] += 1
						else:
							game_data['tricks'][1] += 1
				game_data['floor'] = game_data['table']
				game_data['floor'].reverse();
				game_data['table'] = []
				# game_data['table'] = [-1] * len(game_data['table'])
		if action == 'pickup':
			# Remove the thing from the table and the floor.
			for i in game_data['table']:
				if i['card'] == card:
					game_data['table'].remove(i)
					break
			for i in game_data['floor']:
				if i['card'] == card:
					game_data['floor'].remove(i)
					break
			game_data['hands'][player].append(card)
			markWinningCard()			
		# When changing between Misere/Open Misere, and any other type of bet
		# all the relevant data has to be reset
		if action == 'setBetAmount':
			betAmount = int(bottle.request.forms.get('betAmount'))
			game_data['betAmount'] = betAmount
			# If the bet suit/type was a misere, then setting the bet amount
			# should reset it
			if isMisere(game_data['betSuit']):
				game_data['betSuit'] = ''
			markWinningCard()
		if action == 'setBetSuit':
			betSuit = bottle.request.forms.get('betSuit')
			# If the bet suit/type is changing to, from or between misere bets,
			# the bet amount should be reset
			if isMisere(game_data['betSuit']) or isMisere(betSuit):
				game_data['betAmount'] = -1
			game_data['betSuit'] = betSuit
			# Set the trump suit
			set_trump(getTrump(betSuit))
			markWinningCard()
		# Increment version counter
		game_data['version_id'] += 1
		# Save it to disk
		gameStateSave()
	# Return the new game state
	return page_gamestate()

# This is for files that never change.
@bottle.route('/static/<filename>')
def page_static(filename):
	return bottle.static_file(filename, root='./static/')

# Select underlying server
server = 'wsgiref'
port = 8080

for i in sys.argv[1:]:
	if i[:2] == '-s':
		server = i[2:]
	if i[:2] == '-p':
		port = int(i[2:])
	if i == '-f':
		do_save_data = True

if do_save_data:
	# Load the game state if one was previously saved.
	try:
		with open('game_state.json') as f:
			# You can actually put anything you want in that file...
			game_data = json.loads(f.read())
	except FileNotFoundError:
		print('State file does not exist.')

bottle.run(host = '0.0.0.0', port = port, server = server)
