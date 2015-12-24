# AIOC 500

Online version of 500.

## How to use

Get Python, 3.4 or later.

Run the following comands in terminal:

    pip install bottle
    python server.py

Then have fun.

### Selecting internal server

Bottle relies on an underlying web server (which, by default, it supplies itself). You can change this with the -s command line argument. For example, `python server.py -spaste` will run the server and use paste as the underlying server.

This requires you to install the respective server with pip.

### Setting the port

You can select which port the server connects to from the command line with the `-p` command. For example, to run on port 80, you can use `python server.py -p80`.

## Contibuting

Use Git or something.