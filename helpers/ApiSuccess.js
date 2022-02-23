import url from 'url';

class ApiSuccess {

    constructor(status, code, message, data) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.data = data;
       
    }

    
}

export default ApiSuccess;