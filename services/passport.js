
import passport from 'passport';
import passportJwt from 'passport-jwt';
import passportLocal from 'passport-local';
import config from '../config';
import User from '../models/user/user.model';

const JwtStrategy = passportJwt.Strategy;
const LocalStrategy = passportLocal.Strategy;
const { ExtractJwt } = passportJwt;
const { jwtSecret } = config;


passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret
}, (payload, done) => {
    
    User.findById(payload.sub).then(user => {
        
        if (!user)
            return done(null, false);

        return done(null, user)
    }).catch(err => {
        console.log('Passport Error: ', err);
        return done(null, false);
    })
}
));


passport.use(new LocalStrategy({
    usernameField: 'phone'
}, (phone,password, done) => {
    
    User.findOne({ phone }).then(user => {
        if (!user)
            return done(null, false);
        if(user)
            return done(null, user);

    });
}));
const requireAuth = passport.authenticate('jwt', { session: false });

const requireSignIn = passport.authenticate('local', { session: false });

export {requireAuth,requireSignIn};