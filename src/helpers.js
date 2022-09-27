function debug(obj = {}){
    return JSON.stringify(obj,null, 4)
}

function getChatId(msg) {
    return msg.chat.id
}

function getItemId(source){
    return source.substr(2, source.length)
}

module.exports = {
    debug,
    getChatId,
    getItemId

} 