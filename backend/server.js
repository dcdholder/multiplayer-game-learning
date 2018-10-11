'use strict';

const Hapi = require('hapi');

const config   = require('./config.json');
const Universe = require('./ogame.js');
const universe = new Universe(config);

let host = '0.0.0.0';
let port = '8000';

const frontendUrl = process.env.FRONTEND_URL;

const server = Hapi.server({
  host:   host,
  port:   port,
  routes: {cors: true}
});

//create a new player
server.route({
  method: 'POST',
  path:   '/players/create',
  handler: (req,h) => {
    universe.addPlayer(req.payload.name);
    return {name: req.payload.name};
  }
});

//upgrade a player's building
server.route({
  method: 'POST',
  path:   '/buildings/upgrade',
  handler: (req,h) => {
    universe.players[req.payload.name].upgrade(req.payload.type);
    return "";
  }
});

//check if a player exists
server.route({
  method: 'GET',
  path:   '/players/exists/{player}',
  handler: (req,h) => {
    return {exists: typeof universe.players[req.params.player]!=="undefined"};
  }
});

//get the game state for a player
server.route({
  method: 'GET',
  path:   '/players/state/{player}',
  handler: (req,h) => {
    if (universe.players[req.params.player]) {
      return universe.players[req.params.player].getState();
    } else {
      throw Error("Player does not exist");
    }
  }
});

//retrieve static game data
server.route({
  method: 'GET',
  path:   '/data/static',
  handler: (req,h) => {
    return universe.config;
  }
});

async function start() {
  try {
    await server.start();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
};

start();
