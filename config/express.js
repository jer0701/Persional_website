const express = require('express')
const mongoose = require('mongoose')
const glob = require('glob')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const flash = require('connect-flash')
const messages = require('express-messages')
const validator =require('express-validator')
const passport = require('passport')
const favicon = require('serve-favicon')
const moment = require('moment')
const truncate = require('truncate');
let User = mongoose.model('User')
let Category = mongoose.model('Category')

module.exports = function (app, config) {
  //设置模板引擎
  app.set('views', config.root + '/app/views');
  app.set('view engine', 'jade');

  //资源路径
  app.use(express.static(config.root + '/dist'));


  app.use(function(req, res, next){ //没有挂载路径的中间件，应用的每个请求都会执行该中间件
    app.locals.pageName = req.path;
    app.locals.moment = moment;
    app.locals.truncate = truncate;
    Category.find({}).sort('created').exec(function(err, categories){
  		if(err) return next(err);
  		app.locals.categories = categories;
  	});
    next();
  });
  app.use(favicon(config.root + '/dist/images/favicon.ico'));
	app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.use(cookieParser());

  app.use(session({
		name: 'blog-session',
  	secret: 'study',
  	resave: false,
  	saveUnitialized: true,
  	cookie: {secure: false}
  }));
	app.use(function(req, res, next){
	   req.user = null;
		 //console.log(req.session);
	   if(req.session.passport && req.session.passport.user){
	     User.findById(req.session.passport.user, function(err, result){
	       if(err) return next(err);
	       result.password = null; //防止别人看到这个密码
	       req.user = result;
	       next();
	     })
	   } else {
	     next();
	   }
	 })

  app.use(flash());
  app.use(function(req, res, next){
    res.locals.messages = messages(req, res);
    app.locals.user = req.user;   //用来记住用户名的
    //console.log(req.path);
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session()); //这个去掉好像也可以

  app.use(validator({
	   errorFormatter: function(param, msg, value) {
	      //console.log(msg);
		   return {
		       param : param,
		       msg   : msg,
		       value : value
		   };
		}
	}));


  //引入系统逻辑处理js
  let controllers = glob.sync(config.root + '/app/controllers/**/*.js');
  controllers.forEach(function (controller) {
    require(controller)(app);
  });
}
