import ApiSuccess from '../../helpers/ApiSuccess';
import NotificationMessage from '../../models/notifyMessage/notifyMessage';


let NotificationMessageController = { 

    async createMessage(req,res,next){
        try {

            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }

            if (!req.body.type) {
                return res.send(new ApiSuccess(false, 400, 'type field is required', {}))
            }

            let findNotificationMessage = await NotificationMessage.findOne({ createdBy: req.body.createdBy,type:req.body.type  });
            if(findNotificationMessage){
                return res.send(new ApiSuccess(false, 400, 'this type is availble', {}))
            }

            let data = {
                createdBy: req.body.createdBy,
                type: req.body.type,
                text: req.body.text,
                arText: req.body.arText,
                isNotify: req.body.isNotify,
                inputLabel: req.body.inputLabel,
                arInputLabel: req.body.arInputLabel,
                notifyTag: req.body.notifyTag
            }

           
            let notiMessage = await NotificationMessage.create(data);
            

            return res.send(new ApiSuccess(true, 200, 'message created successfully', notiMessage))


        }catch(err){
                return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }

    },

    async updateMessage(req,res,next){
        try {

            if (!req.body.id) {
                return res.send(new ApiSuccess(false, 400, 'id field is required', {}))
            } 
            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }

            if (!req.body.type) {
                return res.send(new ApiSuccess(false, 400, 'type field is required', {}))
            }

            let data = {
                // createdBy: req.body.createdBy,
                // type: req.body.type,
                text: req.body.text,
                arText: req.body.arText,
                isNotify: req.body.isNotify,
                inputLabel: req.body.inputLabel,
                arInputLabel: req.body.arInputLabel,
                notifyTag: req.body.notifyTag
            }

           
            let notiMessage = await NotificationMessage.updateOne({_id: req.body.id},data);
            

            return res.send(new ApiSuccess(true, 200, 'message update successfully', notiMessage))


        }catch(err){
                return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }

    },

    async getMessage(req,res,next){
        try {  
            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }         
            let notiMessage = await NotificationMessage.find({createdBy: req.body.createdBy,isDeleted: false});            
            return res.send(new ApiSuccess(true, 200, 'message update successfully', notiMessage))

        }catch(err){
                return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }

    },
    async getMessageByType(req,res,next){
        try {

            if (!req.body.createdBy) {
                return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
            }
            if (!req.body.type) {
                return res.send(new ApiSuccess(false, 400, 'type field is required', {}))
            }
            
            let notiMessage = await NotificationMessage.findOne({type: req.body.type,createdBy: req.body.createdBy,isDeleted: false});
            

            return res.send(new ApiSuccess(true, 200, 'message update successfully', notiMessage))


        }catch(err){
                return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }

    },

    async multipleUpdateMessage(req,res,next){
        try {

            if (!req.body.messages && !Array.isArray(req.body.messages)) {
                return res.send(new ApiSuccess(false, 400, 'messages field is required', {}))
            } 

            for(let i=0;i<req.body.messages.length;i++){
                if (!req.body.messages[i].id) {
                    return res.send(new ApiSuccess(false, 400, 'id field is required', {}))
                } 
                if (!req.body.messages[i].createdBy) {
                    return res.send(new ApiSuccess(false, 400, 'createdBy field is required', {}))
                }
    
                if (!req.body.messages[i].type) {
                    return res.send(new ApiSuccess(false, 400, 'type field is required', {}))
                }
    
                let data = {
                    // createdBy: req.body.messages[i].createdBy,
                    // type: req.body.messages[i].type,
                    text: req.body.messages[i].text,
                    arText: req.body.messages[i].arText,
                    isNotify: req.body.messages[i].isNotify,
                    inputLabel: req.body.messages[i].inputLabel,
                    arInputLabel: req.body.messages[i].arInputLabel,
                    notifyTag: req.body.messages[i].notifyTag
                }
    
               
                let notiMessage = await NotificationMessage.updateOne({_id: req.body.messages[i].id},data);
                
    
            }
            
            return res.send(new ApiSuccess(true, 200, 'message update successfully', {}))


        }catch(err){
                return res.send(new ApiSuccess(false, 400, 'Unknown Error', err))
        }

    },

}

module.exports = NotificationMessageController;