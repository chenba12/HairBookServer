var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fs = require('fs');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const  customLogger = (req, res, next)=>  {
  // Get request details
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const queryParams = req.query;
  const headers = req.headers;
  const body = req.body;
  // Log details to the console
  console.log(`[${timestamp}] ${method} ${url}`);
  console.log('Query Parameters:', queryParams);
  console.log('Headers:', headers);
  console.log('Body:', body);
  // Save log to a file with timestamp
  const logData = `[${timestamp}] ${method} ${url}\nQuery Parameters: ${JSON.stringify(queryParams)}\nHeaders: ${JSON.stringify(headers)}\nBody: ${JSON.stringify(body)}\n\n`;
  const logFileName = `request_log_${timestamp.replace(/[^0-9]/g, '')}.txt`; // Remove non-numeric characters from timestamp
  const logFilePath = path.join(__dirname, 'logs', logFileName);

  fs.appendFile(logFilePath, logData, (err) => {
    if (err) {
      console.error('Error saving log to file:', err);
    }
  });

  // Continue to the next middleware
  next();
}


// Set up custom logging middleware
app.use(customLogger);
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
