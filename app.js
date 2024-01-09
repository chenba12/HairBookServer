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
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
const customLogger = (req, res, next) => {
    // Get request details
    const startTimestamp = new Date();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const queryParams = req.query;
    const headers = req.headers;
    const body = req.body;

    // Log request details to the console
    console.log(`[${startTimestamp.toLocaleTimeString()}] [Request] ${method} ${url}`);
    console.log('Query Parameters:', queryParams);
    console.log('Headers:', headers);
    console.log('Request Body:', body);


    // Save request and response log to the same file with timestamp
    const logData = `[${startTimestamp.toLocaleTimeString()}] [Request] ${method} ${url}\nQuery Parameters: ${JSON.stringify(queryParams)}\nHeaders: ${JSON.stringify(headers)}\nRequest Body: ${JSON.stringify(body)}\n\n`;

    // Override res.send to capture response data
    const originalSend = res.send;
    res.send = function (responseBody) {
        // Log response details to the console
        const endTimestamp = new Date();
        const timeTaken = endTimestamp - startTimestamp;

        console.log(`[${endTimestamp.toLocaleTimeString()}] [Response] ${method} ${url}`);
        console.log('Response Body:', responseBody);
        console.log(`Status: ${res.statusCode} \n`);
        console.log(`Time taken: ${timeTaken}ms`);

        // Append response log to the existing log file
        const responseLogData = `\n[${endTimestamp.toLocaleTimeString()}] [Response] ${method} ${url}\nResponse Body: ${JSON.stringify(responseBody)}\nStatus: ${res.statusCode} \n\nTime taken: ${timeTaken}ms\n\n`;
        const logFileName = `combined_log_${startTimestamp.getTime()}.txt`; // Use the start timestamp for the log file name

        // Save the combined log to a file
        const logFilePath = path.join(__dirname, 'logs', logFileName);
        fs.appendFile(logFilePath, logData + responseLogData, (err) => {
            if (err) {
                console.error('Error saving log to file:', err);
            }
        });

        // Call the original res.send
        originalSend.apply(res, arguments);
    };

    // Continue to the next middleware
    next();
};


// Set up custom logging middleware
app.use(customLogger);
app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
