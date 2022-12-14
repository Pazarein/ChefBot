const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
    telegramId: {
        type: Number,
        required: true,
    },
    recipes: {
        type: [String],
        default: []
    },
    evaluated: {
        type: [String],
        default: []
    }
})

mongoose.model('user',UserSchema)