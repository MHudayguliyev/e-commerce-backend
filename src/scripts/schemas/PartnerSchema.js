const joi = require('joi')



const AddPartnerAddressSchema = joi.object({
    partner_guid: joi.string().guid().required(),
    phone: joi.string()
    .regex(/^\+993[0-9]{8}$/)
    .required()
    .messages({
      required: "Phone number is required",
      regex: "Phone number must be in the format +993[0-9]{8}",
    }),
    district: joi.string().required(),
    address: joi.string().required(),
    email: joi.string().allow(null, '').email(),
    home_phone: joi.string().allow(null, ''), //.pattern(/^\+\d{11}$/)
    fax: joi.string().allow(null, ''),
    website: joi.string()
    .uri()
    .allow(null, '')
    .messages({
      uri: "Website address must be a valid URL",
    }),
    skype: joi.string().allow(null, ''),
    other: joi.string().allow(null, '')
})



module.exports = {
    AddPartnerAddressSchema,

}