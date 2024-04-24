import mongoose, {Schema} from "mongoose";

const subscriptionModel = new Schema({
    subcriber:{
        // who subscribe channel
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    channel: {
        // which channel is subscribed by user
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {timestamps: true})

export const Subscription = mongoose.model('Subscription', subscriptionModel)