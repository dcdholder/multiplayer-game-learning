'use strict';

const Hapi = require('hapi');

const config   = require('./config.json');
const Universe = require('./ogame.js');
const universe = new Universe(config);

let host = 'localhost';
let port = '8000';

const server = Hapi.server({
  host:   host,
  port:   port,
  routes: {cors: {origin: ['http://' + host]}}
});

server.route({
  method: 'GET',
  path:   '/',
  handler: (req,h) => {
    let context = {
      authUrl:              server.info.uri,
      registrationEndpoint: '/players/create',

      gameFrontendUrl:      server.info.uri,
      gameFrontendEndpoint: '/game',

      imagesUrl:         server.info.uri + '/images/',
      marsImageFilename: 'mars.png'
    };

    return h.view('index', context);
  }
});

server.route({
  method: 'GET',
  path:   '/game/{player}',
  handler: (req,h) => {
    if (universe.players[req.params.player]) {
      return "Welcome back, " + req.params.player + ".";
    } else {
      return "Register first.";
    }
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

  await server.register({
    plugin: require('vision')
  });

  server.views({
    engines: {
      html: require('handlebars')
    },
    path: 'login'
  });

  server.route({
    method: 'GET',
    path:   '/images/{params}',
    handler: {
      directory: {
        path: 'login/images'
      }
    }
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
