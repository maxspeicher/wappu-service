
/**
 * Module dependencies.
 */

var express = require('express')
  , http = require('http')
  , path = require('path')

  , global = require("./globals")
  , wappu = require("./routes/wappu")
  , wappuAnalysis = require("./routes/wappu_analysis");

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// WaPPU routes

app.get("/wappu", wappu.index);
app.get("/wappu/analysis", wappu.analysis);
app.get("/wappu/analysis2", wappu.analysis2);
app.get("/wappu/getFeatures", wappu.getFeatures);
app.get("/wappu/getRelativeUsability", wappuAnalysis.getRelativeUsability);
app.get("/wappu/getUsability", wappuAnalysis.getUsability);

app.post("/wappu/getSignificance", wappuAnalysis.getSignificance);
app.post("/wappu/saveData", wappu.saveData);
app.post("/wappu/saveIntention", wappu.saveIntention);
app.post("/wappu/saveQuestionnaire", wappu.saveQuestionnaire);
app.post("/wappu/saveParticipant", wappu.saveParticipant);
app.post("/wappu/saveProject", wappu.saveProject);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
