const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const indexRouter = require('./routes/index');
const customerRouter = require('./routes/customer');
const barbersRouter = require('./routes/barber')
const authRouter = require('./routes/auth')
const reviewsRouter = require('./routes/review')
const bookingRouter = require('./routes/booking')
const {readdir, statSync} = require("fs");
const {customLogger, deleteLogFile} = require("./utils");

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Set up custom logging middleware
app.use(customLogger);
app.use('/', indexRouter);
app.use('/customer', customerRouter);
app.use('/barber', barbersRouter);
app.use('/auth', authRouter);
app.use('/review', reviewsRouter);
app.use('/booking', bookingRouter);

// Schedule log file deletion after 30 minutes
setInterval(() => {
    const logDir = path.join(__dirname, 'logs');
    // Read the logs directory
    readdir(logDir, (err, files) => {
        if (err) {
            console.error('Error reading logs directory:', err);
            return;
        }

        // Iterate through the files in the logs directory
        files.forEach((file) => {
            const filePath = path.join(logDir, file);

            // Check if the file is a combined log file
            if (file.startsWith('combined_log_')) {
                // Get the file's creation time
                const stats = statSync(filePath);
                const creationTime = new Date(stats.birthtime);

                // Calculate the age of the file in milliseconds
                const ageInMilliseconds = new Date() - creationTime;

                // Check if the file is older than 30 minutes (30 * 60 * 1000 milliseconds)
                if (ageInMilliseconds > 30 * 60 * 1000) {
                    // Delete the log file
                    deleteLogFile(filePath);
                }
            }
        });
    });
}, 30 * 60 * 1000);

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




