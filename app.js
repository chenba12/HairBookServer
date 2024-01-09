const {firebaseAdmin, db} = require('./firebase-admin-init'); // Import the Firebase Admin SDK initialization
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fs = require('fs');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const barbersRouter = require('./routes/barbers')
const loginRouter = require('./routes/login')
const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Function to delete the log file
const deleteLogFile = (filePath) => {

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting log file:', err);
    } else {
      console.log('Log file deleted:',filePath );
    }
  });
};

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

// Schedule log file deletion after 30 minutes
setInterval(() => {
  const logDir = path.join(__dirname, 'logs');
  // Read the logs directory
  fs.readdir(logDir, (err, files) => {
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
        const stats = fs.statSync(filePath);
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


// Set up custom logging middleware
app.use(customLogger);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/barbers', barbersRouter);
app.use('/login', loginRouter)

app.post('/barbers', async (req, res) => {
  // Reference to the location in the database where you want to insert the string
  const data = {
    barber_name: 'Or Ben Ami',
    business_name: 'OBA Barber',
    city: 'Afula'
  };
  const write_result = await db.collection('Barbers').doc().set(data);
  res.status(200).json({message: 'String inserted into the database'});
})
//Get barber by id
app.get('/barbers', async (req, res) => {
  const id = req.query.id;
  console.log(id)
  const doc = await db.collection('Barbers').doc(id).get();
  if (!doc.exists) {
    console.log('No such document!');
  } else {
    console.log('Document data:', doc.data());
    res.send(doc.data());
  }
})

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




