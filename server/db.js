// Generated by CoffeeScript 1.6.3
(function() {
  var credentials, mySqlService;

  eval("var services = " + process.env.VCAP_SERVICES + ";");

  mySqlService = services ? {
    credentials: {
      hostname: "",
      port: 3306,
      name: "",
      user: "",
      password: ""
    }
  } : {
    credentials: {
      hostname: "localhost",
      port: 3306,
      name: "wappu",
      user: "root",
      password: ""
    }
  };

  credentials = {
    host: mySqlService.credentials.hostname,
    port: mySqlService.credentials.port,
    database: mySqlService.credentials.name,
    user: mySqlService.credentials.user,
    password: mySqlService.credentials.password
  };

  exports.connect = function() {
    var e, mySqlConnection;
    mySqlConnection = null;
    try {
      mySqlConnection = require("mysql").createConnection(credentials);
      mySqlConnection.connect();
    } catch (_error) {
      e = _error;
      console.error(e);
    }
    mySqlConnection.on("error", function(err) {
      console.error(err.code);
    });
    return mySqlConnection;
  };

}).call(this);
