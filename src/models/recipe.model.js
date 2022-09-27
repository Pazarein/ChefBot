const mongoose = require('mongoose')
const Schema = mongoose.Schema

const RecipeSchema = new Schema ({
    name: {
        type: String,
        require: true
    },
    r_id: {
        type: String,
        require: true
    },
    rating: {
        type: Number,
        require: true
    },
    type: { 
        type: String,
        require: true
    },
    picture: { 
        type: String,
        require: true
    },
    ingredients: {
        type: [String],
        default: []
    },
    desc: {
        type: String,
        require: true
    },
    cooking_method: {
        type: [String],
        default: []
    }
})

mongoose.model('recipe',RecipeSchema)