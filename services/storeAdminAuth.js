
import passport from 'passport';
import passportJwt from 'passport-jwt';
import passportLocal from 'passport-local';
import config from '../config';
import User from '../models/user/user.model';
import Admin from '../models/admin/admin.model';

const JwtStrategy = passportJwt.Strategy;
const LocalStrategy = passportLocal.Strategy;
const { ExtractJwt } = passportJwt;
const { jwtSecret } = config;


passport.use('jwt-store',new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: jwtSecret
}, async (payload, done) => {
    
    let admin = await Admin.findById(payload.sub).catch(err => {
        return done(null, false);
    });
    console.log({admin})
    if(admin){
        return done(null, admin)
    }
    
    let user = await User.findById(payload.sub).catch(err => {
        return done(null, false);
    });
    console.log({user})
    if(user){
        return done(null, user)
    }

    return done(null, false);
    // .then(admin => {
        
    //     if (!admin)
    //         return done(null, false);

    //     return done(null, admin)
    // }).catch(err => {
    //     console.log('Passport Error: ', err);
    //     return done(null, false);
    // })
}
));

passport.use(new LocalStrategy({
    usernameField: 'phone'
}, (phone,password, done) => {
    // console.log()
    User.findOne({ phone }).then(user => {
        if (!user)
            return done(null, false);
        if(user)
            return done(null, user);

    });
}));
const requireStoreAdminAuth = passport.authenticate('jwt-store', { session: false });

// const requireSignIn = passport.authenticate('local', { session: false });

export {requireStoreAdminAuth};