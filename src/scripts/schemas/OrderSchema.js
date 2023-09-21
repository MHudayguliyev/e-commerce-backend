const joi = require('joi')



const CreateOrderSchema = joi.object({
    order_code: joi.string().required().pattern(/^ORD_.*$/),
    firm_guid: joi.string().guid().required(),
    partner_guid: joi.string().guid().required(),
    order_delivery_dt: joi.date().required(),
    mat_unit_count: joi.number().required(),
    mat_unit_amount: joi.number().required(),
    order_total: joi.number().required(),
    order_nettotal: joi.number().required(),
    order_desc: joi.string().allow(null, ''),
    order_lines: joi.array()
        .items(
            joi.object({
                mtrl_attr_unit_row_id: joi.number().required(),
                ord_line_amount: joi.number().required(),
                ord_line_total: joi.number().required(),
                ord_line_nettotal: joi.number().required(),
                ord_line_desc: joi.string().allow(null, ''),
                ord_line_price: joi.number().required(),
                ord_line_disc_percent: joi.number().allow(null, ''),
                ord_line_disc_amount: joi.number().allow(null, '')
            })
        )
        .min(1)
})


const GetOrderHistorySchema = joi.object({
    partner_guid: joi.string().guid().required()
})


module.exports = {
    CreateOrderSchema,
    GetOrderHistorySchema,
    
}