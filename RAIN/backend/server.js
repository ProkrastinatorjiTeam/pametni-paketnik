require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors'); // <--- 1. REQUIRE CORS MIDDLEWARE

var mongoose = require('mongoose');
var mongoDB = process.env.MONGODB_URI;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

var indexRouter = require('./routes/index');
var userRouter = require('./routes/userRoutes');
var boxRouter = require('./routes/boxRoutes');
var unlockEventRouter = require('./routes/unlockEventRoutes');
var model3DRouter = require('./routes/model3DRoutes');
var orderRouter = require('./routes/orderRoutes');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// --- 2. USE CORS MIDDLEWARE ---
// This should be placed before your routes and session middleware if sessions rely on cookies sent cross-origin.
app.use(cors({
  origin: true, // Allow requests specifically from your frontend
  credentials: true                // Allow cookies and authorization headers to be sent
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var session = require('express-session');
var MongoStore = require('connect-mongo');
app.use(session({
    secret: 'secret', // Should be a strong secret from .env in production
    resave: true,     // Consider setting to false if your store supports touch
    saveUninitialized: false, // Set to false, login will initialize it
    store: MongoStore.create({mongoUrl: mongoDB}),
    cookie: {
        // secure: process.env.NODE_ENV === "production", // Use true if served over HTTPS
        // sameSite: 'lax' // 'lax' is a good default, 'none' if cross-site with secure:true
    }
}));


app.use('/', indexRouter);
app.use('/user', userRouter);
app.use('/box', boxRouter);
app.use('/unlockEvent', unlockEventRouter);
app.use('/model3D', model3DRouter);
app.use('/order', orderRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) { // Corrected 'next' parameter
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;