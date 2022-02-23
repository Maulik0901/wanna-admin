const config = {};
config.mongoUrl = 'mongodb://localhost:27017/wanna-test'

config.jwtSecret = 'stockat';
config.countrykey='+096';

config.twilio = {
  accountSid: 'AC3e776d904d4ec62b40487e517eec6819',
  authToken: 'fbd342770748a5fe66e608c99513753c'
}

config.confirmMessage = 'verify code: ';
config.cloudinary = {
  cloud_name: 'ishabrawy',
  api_key: '335363764195827',
  api_secret: 'MCvXmLOze0_QaUiOVdy4zVjXlUo'
};

config.iosBundelID = {
  customerApp: 'com.wannaCustomer.cpp',
  driverApp: 'com.wannaDriver.app',
  storeApp: 'com.wannastore.app'
}
config.App={
  Name:'Wanna'
}

config.HyperPayConfig = {
  "AccessToken": "OGFjN2E0Yzg3ODRhZjljNjAxNzg1OGJjNGJiZjE0MTJ8c2dZTUhiMlpQaA==",
  "EntityIDVISA": "8ac7a4c8784af9c6017858bfdf5a1416",
  "EntityIDMADA": "8ac7a4c8784af9c6017858c0f91a141c",
  "EntityAPPLEPAY": "8ac7a4c878a5c95d0178a5eaee77002e"
}

// appUrl attr is set in the request
export default config;
