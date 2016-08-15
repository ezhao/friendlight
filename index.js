var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Sequelize = require('sequelize');
var pg = require('pg');
var util = require('util');

var sequelize = new Sequelize(process.env.DATABASE_URL);

var Friend = sequelize.define('friend', {
  name: {
    type: Sequelize.STRING
  },
  contactInterval: {
    type: Sequelize.INTEGER,
    field: 'contact_interval',
    defaultValue: 0
  },
  nextInteraction: {
    type: Sequelize.DATE,
    field: 'next_interaction',
    defaultValue: Sequelize.NOW
  },
  notes: {
    type: Sequelize.TEXT
  }
});

// TODO(emily) Interactions is untested
var Interactions = sequelize.define('interaction', {
  createdTime: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
    field: 'created_time'
  }
});
Interactions.belongsTo(Friend);

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
  Friend.sync()
  Friend.findAll().then(function(result) {
    var jsonArray = [];
    result.forEach(function(row) {
      jsonArray.push({
        name : row.name,
        id: row.id,
      });
    });
    response.json(jsonArray);
  });
});

/*
 * Get detailed information about a friend given the id
 */
app.get('/api/friends/:id', function(request, response) {
  Friend.sync();
  Friend.findById(request.params.id).then(function(result) {
    var jsonResponse = {
        name : result.name,
        id: result.id,
        notes: result.notes,
      };
    response.json(jsonResponse);
  });
});

/*
 * Add a friend
 * Expected: name
 */
app.post('/api/friends', function(request, response) {
  var newFriend = {
    name: request.body.name
  };

  Friend.sync().then(
    Friend.create({name: newFriend.name}).then(
      response.json({result: "Success"})
    )
  );
});

/*
 * Update a friend
 * Expected: notes
 */
app.post('/api/friends/:id', function(request, response) {
  var updates = {
    notes: request.body.notes
  };

  var options = {
    where: {
      id: request.params.id
    },
  };

  Friend.sync().then(
    Friend.update(updates, options).then(
      response.json({result: "Success"})
    )
  );
});

function onErrorLogResponse(err, response) {
  console.error(err);
  response.send("Error " + err);
};
