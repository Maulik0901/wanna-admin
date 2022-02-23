import config from '../config';


const { jwtSecret } = config;

const bcrypt = require('bcrypt');

export const comparePassword = async (password,hash) => await bcrypt.compare(password, hash);