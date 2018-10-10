'use strict';

const Hapi = require('hapi');

const config   = require('./config.json');
const Universe = require('./ogame.js');
const universe = new Universe(config);

const server = Hapi.server({
  host: 'localhost',
  port: '8000'
});

server.route({
  method: 'GET',
  path:   '/',
  handler: (req,h) => {
    return h.file('./login/index.html');
  }
});

server.route({
  method: 'GET',
  path:   '/game/{player}',
  handler: (req,h) => {
    return server.info.uri;
  }
});

server.route({
  method: 'POST',
  path:   '/players/create',
  handler: (req,h) => {
    universe.addPlayer(req.payload.name);
    return {name: req.payload.name};
  }
});

server.route({
  method: 'POST',
  path:   '/buildings/upgrade',
  handler: (req,h) => {
    universe.players[req.payload.name].upgrade(req.payload.type);
    return "";
  }
});

server.route({
  method: 'GET',
  path:   '/players/state/{player}',
  handler: (req,h) => {
    return universe.players[req.params.player].getState();
  }
});

server.route({
  method: 'GET',
  path:   '/data/static',
  handler: (req,h) => {
    return universe.config;
  }
});

async function start() {
  await server.register({
    plugin: require('inert')
  });

  try {
    await server.start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
};

start();
