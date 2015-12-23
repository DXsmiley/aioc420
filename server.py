import bottle

@bottle.route('/')
def page_index():
	return 'hello, world!'

bottle.run(host = '0.0.0.0', port = 8080)