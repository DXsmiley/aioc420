import bottle

game_data = {
	'hands': [['Joker', 'Seven of Memes'], [], [], []],
	'kiddy': [],
	'table': []
}

@bottle.route('/')
def page_index():
	return page_static('index.html')

# This is the entire information about the game, because I'm lazy.
# You can use it to look at other people's hands and cheat. But whatever.
@bottle.route('/gamestate')
def page_gamestate():
	return game_data

@bottle.route('/action')
def page_action():
	action = bottle.request.forms.get('action')
	card = bottle.redeal.forms.get('card')
	player = int(bottle.redeal.forms.get('player'))
	# Play a card
	if action == 'play':
		game_data['table'].append(card)
		game_data['hands'][player].remove(card)
	# Completely redeal cards
	if action == 'redeal':
		pass
		# Not complete
	# Grab the kiddy
	if action == 'grab':
		game_data['hands'][player] += game_data['kiddy']
		game_data['kiddy'] = []
	# Discard a card
	if action == 'discard':
		game_data['hands'][player].remove(card)
		game_data['table'].append('??')
	# Clear the table
	if action == 'clear':
		game_data['table'] = ['??'] * len(game_data['table'])
	# Return the new game state
	return page_gamestate()

# This is for files that never change.
@bottle.route('/static/<filename>')
def page_static(filename):
	return bottle.static_file(filename, root='./static/')

bottle.run(host = '0.0.0.0', port = 8080)