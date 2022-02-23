import generator from 'password-generator';

export const generateVerifyCode = () => generator(4, false, /\d/);
