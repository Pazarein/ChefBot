const kb = require('./keyboard_buttons')

module.exports = {
    home : [
        [kb.home.recipe, kb.home.categories],
        [kb.home.favourite]
    ],
    categories: [
        [kb.category.lowСalories, kb.category.breakfast],
        [kb.category.withoutMeat, kb.category.withMeat],
        [kb.back]
    ]

}