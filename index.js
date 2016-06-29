var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var Sequelize = require('sequelize');
var pg = require('pg');
var util = require('util');

var sequelize = new Sequelize(process.env.DATABASE_URL);

var Friend = sequelize.define('friend', {
  name: {
    type: Sequelize.STRING,
    field: 'name'
  }
});


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
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('pages/db', {results: result.rows} ); }
    });
  });
});

app.get('/api/friends', function(request, response) {
  Friend.sync()
  Friend.findAll().then(function(result) {
    var jsonArray = [];
    result.forEach(function(row) {
      jsonArray.push({ name : row.name});
    });
    response.json(jsonArray);
  });
});

app.post('/api/friends', function(request, response) {
  var newFriend = {
    name: request.body.name,
    //    frequency: request.body.frequency,
    //    notes: request.body.notes,
  };

  Friend.sync().then(function () {
    return Friend.create({
      name: newFriend.name
    });
  });
});

function onErrorLogResponse(err, response) {
  console.error(err);
  response.send("Error " + err);
};
