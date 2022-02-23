import cookieParser from 'cookie-parser';
import logger from'morgan';
import express from 'express';
import path from 'path';
import bodyparser from 'body-parser';
import expressValidator from 'express-validator';
import mongoose from 'mongoose';
import url from 'url';
import cors from 'cors';
import helmet from 'helmet';
import mongoose_delete from 'mongoose-delete';
import i18n from 'i18n';
import autoIncrement from 'mongoose-auto-increment';
import config from './config';
import router from './routes'; 
import ApiError from './helpers/ApiError';
import  { checkUser } from './services/agenda-service';
// import cron from './services/cron/offerExpire';
import orderExpire from './services/cron/orderExpire';
import DriverNotAcceptRequed from './services/cron/DriverNotAcceptRequed';



var app = express();
mongoose.Promise = global.Promise;

autoIncrement.initialize(mongoose.connection);
//connect to mongodb
mongoose.connect(config.mongoUrl, { useNewUrlParser: true });
mongoose.connection.on('connected', () => {
    console.log('\x1b[32m%s\x1b[0m', '[DB] Connected...');
    checkUser();
});
mongoose.connection.on('error', err => console.log('\x1b[31m%s\x1b[0m', '[DB] Error : ' + err));
mongoose.connection.on('disconnected', () => console.log('\x1b[31m%s\x1b[0m', '[DB] Disconnected...'));


mongoose.plugin(mongoose_delete, { overrideMethods: true });
app.use(cors());
app.use(helmet());


i18n.configure({
    locales: ['en', 'ar'],
    directory: __dirname + '/locales'
});


app.use(i18n.init);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'docs')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(expressValidator());

// make the file publically accessable 
app.use('/uploads',express.static('uploads'));

//Routes
app.use('/api/v1', router);

// Ensure Content Type
app.use('/', (req, res, next) => {

    // check content type
    let contype = req.headers['content-type'];
    if (contype && !((contype.includes('application/json') || contype.includes('multipart/form-data'))))
        return res.status(415).send({ error: 'Unsupported Media Type (' + contype + ')' });


    // set current host url
    config.appUrl = url.format({
        protocol: req.protocol,
        host: req.get('host')
    });

    next();
});

app.use(bodyparser.json({ limit: '100mb' }));
app.use(bodyparser.urlencoded({ limit: '100mb', extended: true, parameterLimit: 50000 }));

app.use((req, res, next) => {
  next(new ApiError(404, 'Not Found...'));
});


//ERROR Handler
app.use((err, req, res, next) => {
  if (err instanceof mongoose.CastError)
      err = new ApiError.NotFound(err.model.modelName);

  res.status(err.status || 500).json({
      errors: err.message
  });

  // console.log(err);
  // console.log(JSON.stringify(err));
});

// // New CronJob run a task every 5 seconds
// var job = new CronJob('0 */1 * * * *',task);
// // task to execute from cron job
// function task(){
// console.log('My First Cron Job task run at: '+new Date());
// }
// // start the cron 
// job.start()

module.exports = app;
