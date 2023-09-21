const joi = require('joi')


const GetAttributesSchema = joi.object({
    group_guid: joi.string().guid().allow(null, '')
})

const GetAllMaterialsSchema = joi.object({
    group_guid: joi.string().guid().allow(''),
    attr_guids: joi.string().allow(null),
    limit: joi.number().required(),
    page: joi.number().required(),
    type: joi.string().allow('').valid('all')
})
const GetMaterialsSchema = joi.object({
    group_guid: joi.string().guid().allow(null, ''),
    attr_guids: joi.string().allow(null, ''),
    limit: joi.number().required(),
    page: joi.number().required(),
    type: joi.string().allow('').valid('all'),
    search: joi.string().allow(null, '')
})

const GetMaterialDetailsSchema = joi.object({
    row_id: joi.number().required()
})

const GenerateCodeSchema = joi.object({
    type: joi.string().valid('order', 'partner').required()
})



const FavoritesSchema = joi.object({
    mtrl_attr_unit_row_id: joi.number().integer().allow(null, ''),
    partner_guid: joi.string().guid().required()
})

const GetFavoritesSchema = joi.object({
    partner_guid: joi.string().guid().required()
})


module.exports = {
    GetAttributesSchema,
    GetMaterialsSchema,
    GetMaterialDetailsSchema,
    GenerateCodeSchema,
    GetAllMaterialsSchema,
    FavoritesSchema,
    GetFavoritesSchema,

}