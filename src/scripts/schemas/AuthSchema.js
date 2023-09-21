const joi = require('joi')

const length_value = 12;

const LoginSchema = joi.object({
    phone_number: joi.string().length(length_value).pattern(/^\+[0-9]+$/).required(),
})
const RegisterSchema = joi.object({
    fullname: joi.string().required(),
    partner_code: joi.string().required(),
    home_phone_number: joi.string().length(length_value).pattern(/^\+[0-9]+$/).allow(''),
    phone_number_main: joi.string().length(length_value).pattern(/^\+[0-9]+$/).required(),
    phone_number_second: joi.string().length(length_value).pattern(/^\+[0-9]+$/).allow(''),
    region: joi.string().allow(''),
    address: joi.string().required(),
    email: joi.string().email().allow(''),
    firm_guid: joi.string().uuid().required(),
})




module.exports = {
    LoginSchema,
    RegisterSchema,
}