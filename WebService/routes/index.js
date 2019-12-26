var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
});

/* GET index page. */
router.get('/index', function(req, res, next) {
  res.render('index', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
});

/* GET login page. */
router.get('/login', function(req, res, next) {
  res.render('login', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
});

/* GET about page. */
router.get('/about', function(req, res, next) {
  res.render('about', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
});

/* GET map page. */
router.get('/map', function(req, res, next) {
  res.render('map', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID});
});

/* GET map register. */
router.get('/register', function(req, res, next) {
  res.render('register', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID });
});

/* GET map register. */
router.get('/mystation', function(req, res, next) {
  res.render('mystation', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID, activated: req.session.activated });
});

/* GET Impressum. */
router.get('/impressum', function(req, res, next) {
  res.render('impressum', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID });
});

/* GET Impressum. */
router.get('/manual', function(req, res, next) {
  res.render('manual', {sessionid:  req.session.UserID, logedin: req.session.logedIn, stationID: req.session.StationID });
});


module.exports = router;
