'use strict';

const Hapi    = require('hapi');
const request = require('request-promise-native');

let host = 'localhost';
let port = '8000';

const backendUrl = 'http://localhost:8001';
const authUrl    = backendUrl;

const server = Hapi.server({
  host:   host,
  port:   port,
  routes: {cors: {origin: ['http://' + host]}}
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
    path: 'views/templates'
  });

  //serves the login view
  server.route({
    method: 'GET',
    path:   '/',
    handler: (req,h) => {
      let context = {
        authUrl:              authUrl,
        registrationEndpoint: '/players/create',

        gameFrontendUrl:      server.info.uri,
        gameFrontendEndpoint: '/game',

        imagesUrl:         server.info.uri + '/images/',
        marsImageFilename: 'mars.png'
      };

      return h.view('login/index', context);
    }
  });

  //serves the main game view
  server.route({
    method: 'GET',
    path:   '/game/{player}',
    handler: (req,h) => {
      let context = {};

      return request({
        "method": "GET",
        "uri": backendUrl + "/players/exists/" + req.params.player,
        "json": true
      }).then((response) => {
        if (response.exists) {
          context.text = "Welcome back, " + req.params.player + ".";
        } else {
          context.text = "Register first.";
        }

        return h.view('game/index', context);
      }).catch((err) => {
        console.log(err);
      });
    }
  });

  //serves images
  server.route({
    method: 'GET',
    path:   '/images/{params}',
    handler: {
      directory: {
        path: 'views/images'
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