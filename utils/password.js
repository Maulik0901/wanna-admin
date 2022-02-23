import config from '../config';


const { jwtSecret } = config;

const bcrypt = require('bcrypt');
const saltRounds = 10;


export const genratePassword = async (password) => await bcrypt.hash(password, saltRounds);