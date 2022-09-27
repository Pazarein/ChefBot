const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const config = require('./config')
const helpers = require('./helpers')
const kb = require ('./keyboard_buttons')
const keyboard = require('./keyboard')
const database = require('./database.json')


mongoose.connect(config.DB_URL,
    {useNewUrlParser:true, useUnifiedTopology:true})
    .then(() => console.log('MongoDB connected'))
    .catch ((err) => console.log(err))



require('./models/recipe.model.js')
require('./models/user.model.js')


const Recipe = mongoose.model('recipe')
const User = mongoose.model('user')

const ACTION_TYPE = {
    TOGGLE_FAV_RECIPE: 'tfr',
    RATE_THIS_RECIPE: 'rtr'

}




//mongoose.connection.dropDatabase()

//database.recipe.forEach(r => new Recipe(r).save().catch(e => console.log(e)))

// =================================

const bot = new TelegramBot(config.TOKEN, {
    polling: {  // ожидание действий от пользователя
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
})

bot.on('message', msg => {
    console.log('Working')
    const chatId = helpers.getChatId(msg)
    switch (msg.text) {
        case kb.home.favourite:
            showFavouriteRecipes(chatId, msg.from.id)
            break
        case kb.home.recipe:
            showLastRecipe(chatId, msg.from.id)
            break
        case kb.home.categories:
            bot.sendMessage(chatId, `Выберите категорию: `, {
                reply_markup: {keyboard: keyboard.categories}
            })
            break 
        case kb.category.lowСalories:
            sendRecipesByQuery(chatId, {type:'lowСalories'})
            break
        case kb.category.breakfast:
            sendRecipesByQuery(chatId, {type:'breakfast'})
            break
        case kb.category.withMeat:
            sendRecipesByQuery(chatId, {type:'withMeat'})
            break
        case kb.category.withoutMeat:
            sendRecipesByQuery(chatId, {type:'withoutMeat'})
            break    
        case kb.back:
            bot.sendMessage(chatId, `Возвращаю назад... `, {
                reply_markup: {keyboard: keyboard.home}
            })
            break   
    }

})


bot.onText(/\/start/,msg => {
      const {id} = msg.chat
      
    const html = `
<strong>Привет, ${msg.from.first_name}!</strong>
<i>Я бот здорового питания👨‍🍳</i>
<i>Здесь ты можешь найти множество рецептов для поддержания хорошей фигуры и отличного самочувствия на каждый день!</i>    
<pre>Воспользуйся клавиатурой для взаимодействия с моим функционалом</pre>    
`
    bot.sendMessage(helpers.getChatId(msg), html, {parse_mode: 'HTML',
        reply_markup: {
        keyboard: keyboard.home
        }   
    })  
    
})

bot.on('callback_query', query =>{
    const userId = query.from.id
    let data

    try {
        data = JSON.parse(query.data)
    } catch (e) {
        throw new Error('Data is not an object')
    }

    const { type } = data

    if (type === ACTION_TYPE.TOGGLE_FAV_RECIPE ){
        toggleFavouriteRecipe(userId, query.id, data)
    } else if (type === ACTION_TYPE.RATE_THIS_RECIPE){
        rateThisRecipe(userId,  query.id, data)
    }
    
})

bot.onText(/\/f(.+)/, (msg, [source, match]) => {

    const recipeId = helpers.getItemId(source)
    const chatId = helpers.getChatId(msg)
    console.log(recipeId)
    Promise.all([
        Recipe.findOne({r_id:recipeId}),
        User.findOne({telegramId:msg.from.id})
    ]).then(([r,user]) => {

        let isFav = false
        let isRated = false
        if (user) {
            isFav = user.recipes.indexOf(r.r_id) !== -1
            isRated = user.evaluated.indexOf(r.r_id) !== -1
        }

        const favText = isFav ? 'Удалить из избранного' : 'Добавить в избранное'
        const rateText = isRated ? 'Удалить оценку' : 'Оценить 👍'

        let ing = ""
        r.ingredients.forEach(element=>{
            ing = ing + "\n - " + element
            })
        let method = ""
        r.cooking_method.forEach(element=>{
            method = method + "\n 🔸 - " + element
            })
        const caption = `Рецепт: ${r.name}\n\n${r.desc}\n\nОценок: ${r.rating} 👍\n\nИнгредиенты: ${ing}\n\nМетод приготовления: ${method}`
        str = r.name.replace(/\s+/g, '+');
        bot.sendPhoto(chatId, r.picture, {
            caption: caption,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: favText,
                            callback_data: JSON.stringify({
                                type: ACTION_TYPE.TOGGLE_FAV_RECIPE,
                                recipeId: r.r_id,
                                isFav: isFav
                            })
                        },
                        {
                            text: rateText,
                            callback_data: JSON.stringify({
                                type: ACTION_TYPE.RATE_THIS_RECIPE,
                                recipeId: r.r_id,
                                isRated: isRated
                            })
                        }
                    ],
                    [
                        {
                            text: 'Посмотреть другие версии рецепта на YouTube',
                            url: `https://www.youtube.com/results?search_query=приготовление+${str}`
                            
                        }
                    ]
                ]
            }
        })
    })
    User.findOne({telegramId:msg.from.id})
    Recipe.findOne({r_id:recipeId}).then (r => {
        
        
    })
}) 


//=======================================

function sendRecipesByQuery(chatId,query) {
    Recipe.find(query).then(recipe => {

        const html = recipe.map((r, i) => {
            return `<b>${i+1}</b> ${r.name} - Оценок: <b>${r.rating}</b> - /f${r.r_id}`

        }).join('\n')
        
        sendHTML(chatId,html,'category')
    })
}

function sendHTML(chatId, html, kbName = null){
    const options = {
        parse_mode: 'HTML'
    }
    if (kbName) {
        options['reply_markup'] = {
            keyboard: keyboard[kbName]
        }
    }

    bot.sendMessage(chatId, html, options)
}

function toggleFavouriteRecipe(userId, queryId, {recipeId, isFav}) {

    let userPromise

    User.findOne({telegramId:userId})
    .then(user => {
        if (user) {
            if (isFav) {
                user.recipes = user.recipes.filter(rId => rId !== recipeId)
                
            } else {
                user.recipes.push(recipeId)
            }
            userPromise = user
        } else {
            userPromise = new User({
                telegramId: userId,
                recipes: [recipeId]
            })
        }

        const answerText = isFav ? 'Удалено из избранного' : 'Добавлено в избранное'
        
        userPromise.save().then(_ => {
            bot.answerCallbackQuery(queryId, `${answerText}`)
            }).catch((err) => console.log(err))
        }).catch((err) => console.log(err))
    }

function showFavouriteRecipes(chatId, telegramId) {
    User.findOne({telegramId})
    .then(user => {
        
        if (user){
            Recipe.find({r_id:{'$in':user.recipes}}).then(recipes => {
                let html = 'ИЗБРАННОЕ:\n'

                if (recipes.length) {
                    html += recipes.map((r,i) => {
                        return `<b>${i+1}</b> ${r.name} - Оценок: <b>${r.rating}</b> - /f${r.r_id}`
                    }).join('\n')
                } else {
                    html += 'Вы пока ничего не добавили'
                }
                sendHTML(chatId, html, 'home')
            }).catch(e => console.log(e))
        } else {
            sendHTML(chatId, 'Вы пока ничего не добавили', 'home')
        }
    }).catch(e => console.log(e))
}
   
function rateThisRecipe(userId, queryId, {recipeId, isRated}) {

    let userPromise

    User.findOne({telegramId:userId})
    .then(user => {
        if (user) {
            if (isRated) {
                user.evaluated = user.evaluated.filter(rId => rId !== recipeId)
                Recipe.updateOne({r_id:recipeId}, {$inc: {rating:-1}}).catch(e => console.log(e))
                
            } else {
                user.evaluated.push(recipeId)
                Recipe.updateOne({r_id:recipeId},  {$inc: {rating:+1}}).catch(e => console.log(e))
            }
            userPromise = user
        } else {
            userPromise = new User({
                telegramId: userId,
                evaluated: [recipeId]
            })
        }

        const answerText = isRated ? 'Оценка удалена' : 'Ваша оценка учтена!'
        
        userPromise.save().then(_ => {
            bot.answerCallbackQuery(queryId, `${answerText}`)
            }).catch((err) => console.log(err))
        }).catch((err) => console.log(err))
    }

function showLastRecipe(chId,telId){
    
    Promise.all([
            Recipe.findOne().sort({_id:-1}).limit(1),
            User.findOne({telegramId:telId})
        ]).then(([r,user]) => {
    
            let isFav = false
            let isRated = false
            if (user) {
                isFav = user.recipes.indexOf(r.r_id) !== -1
                isRated = user.evaluated.indexOf(r.r_id) !== -1
            }
    
            const favText = isFav ? 'Удалить из избранного' : 'Добавить в избранное'
            const rateText = isRated ? 'Удалить оценку' : 'Оценить 👍'
    
            let ing = ""
            r.ingredients.forEach(element=>{
                ing = ing + "\n - " + element
                })
            let method = ""
            r.cooking_method.forEach(element=>{
                method = method + "\n 🔸 - " + element
                })
            const caption = `Рецепт: ${r.name}\n\n${r.desc}\n\nОценок: ${r.rating} 👍\n\nИнгредиенты: ${ing}\n\nМетод приготовления: ${method}`
            str = r.name.replace(/\s+/g, '+');
            bot.sendPhoto(chId, r.picture, {
                caption: caption,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: favText,
                                callback_data: JSON.stringify({
                                    type: ACTION_TYPE.TOGGLE_FAV_RECIPE,
                                    recipeId: r.r_id,
                                    isFav: isFav
                                })
                            },
                            {
                                text: rateText,
                                callback_data: JSON.stringify({
                                    type: ACTION_TYPE.RATE_THIS_RECIPE,
                                    recipeId: r.r_id,
                                    isRated: isRated
                                })
                            }
                        ],
                        [
                            {
                                text: 'Посмотреть другие версии рецепта на YouTube',
                                url: `https://www.youtube.com/results?search_query=приготовление+${str}`
                                
                            }
                        ]
                    ]
                }
            })
        })
    
}






