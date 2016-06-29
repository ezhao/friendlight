var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var pg = require('pg');
var util = require('util');

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
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM friends', function(err, result) {
      done();
      if (err) { onErrorLogResponse(err, response); }
      else {
        var jsonArray = [];
        (result.rows).forEach(function(row) {
          jsonArray.push(row);
        });
        response.json(jsonArray);
      }
    });
  });
});

app.post('/api/friends', function(request, response) {
  var newFriend = {
    name: request.body.name,
    //    frequency: request.body.frequency,
    //    notes: request.body.notes,
  };

  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    var query = util.format('insert into friends (name) values (\'%s\');', newFriend.name);
    console.log(query);
    client.query(query, function(err, result) {
      done();
      if (err) { onErrorLogResponse(err, response); }
      else {
        response.end('Success'); // TODO(emily)
      }
    });
  });
});

function onErrorLogResponse(err, response) {
  console.error(err);
  response.send("Error " + err);
};
