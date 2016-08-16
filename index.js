var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Sequelize = require('sequelize');
var pg = require('pg');
var util = require('util');
var moment = require('moment');

var sequelize = new Sequelize(process.env.DATABASE_URL);

var Friends = sequelize.define('friends', {
  name: {
    type: Sequelize.STRING
  },
  contactInterval: {
    type: Sequelize.INTEGER,
    defaultValue: 0
  },
  nextInteraction: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  notes: {
    type: Sequelize.TEXT
  }
});

var Interactions = sequelize.define('interactions', {
  // nothing for now
});

Friends.hasMany(Interactions);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


// Additional middleware which will set headers that we need on each request.
app.use(function(req, res, next) {
    // Set permissive CORS header - this allows this server to be used only as
    // an API server in conjunction with something like webpack-dev-server.
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Disable caching so we'll always get the latest comments.
    res.setHeader('Cache-Control', 'no-cache');
    next();
});

app.get('/', function(request, response) {
  // Hack to create tables when they don't exist
  Friends.sync()
    .then(() => Interactions.sync());

  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err) {
        console.error(err);
        response.send("Error " + err);
      } else {
        response.render('pages/db', {results: result.rows});
      }
    });
  });
});

/*
 * List all the friends, just friend and id for now
 */
app.get('/api/friends', function(request, response) {
  var options = {
    order: [['nextInteraction', 'ASC']],
  };
  Friends.sync()
    .then(() => Friends.findAll(options))
    .then((result) => {
      var jsonArray = [];
      result.forEach(function(row) {
        jsonArray.push({
          name : row.name,
          id: row.id,
          nextInteraction: row.nextInteraction,
        });
      });
      response.json(jsonArray);
    });
});

/*
 * Get detailed information about a friend given the id,
 * including a list of all interactions
 */
app.get('/api/friends/:id', function(request, response) {
  var res = {};
  Friends.sync()
    .then(() => Friends.findById(request.params.id))
    .then(friend => {
      res = {
        name : friend.name,
        id: friend.id,
        notes: friend.notes,
        contactInterval: friend.contactInterval,
      };
      return friend.getInteractions();
    })
    .then(interactions => {
      res.interactions = interactions;
      response.json(res);
    });
});

/*
 * Add a friend
 * Expected: name
 */
app.post('/api/friends', function(request, response) {
  Friends.sync()
    .then(() => Friends.create({name: request.body.name}))
    .then(friend => response.json({result: "Success"}));
});

/*
 * Update a friend
 * Optional: notes, contactInterval
 */
app.post('/api/friends/:id', function(request, response) {
  var updates = {
    notes: request.body.notes, // handles undef
  };
  var contactInterval = request.body.contactInterval;
  if (contactInterval) {
    updates.contactInterval = contactInterval; // doesn't handle undef for some reason
  }

  var friendId = request.params.id;
  var interactionsOptions = {where: {friendId: friendId}};
  var friendsOptions = {where: {id: friendId}};

  Friends.sync()
    .then(() => updates.contactInterval ? Interactions.max('createdAt', interactionsOptions) : null)
    .then((maxInteraction) => {
      if (maxInteraction) {
        updates.nextInteraction = moment(new Date(maxInteraction))
          .add(updates.contactInterval, 'day')
          .toDate();
      }
      return Friends.update(updates, friendsOptions);
    })
    .then(() => response.json({result: "Success"}));
});

/*
 * Add an interaction
 * Expected: friendId
 */
app.post('/api/interactions', function(request, response) {
  Interactions.sync()
    .then(() => Interactions.create({friendId: request.body.friendId}))
    .then(() => response.json({result: "Success"}));
});

function onErrorLogResponse(err, response) {
  console.error(err);
  response.send("Error " + err);
};
