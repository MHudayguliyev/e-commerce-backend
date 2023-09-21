const db = require('../db')
const status = require('../scripts/utils/status')
const ENV = require('../config/index')




const CreateOrder = async (req, res) => {

    const { order_code, firm_guid, partner_guid, contact_number, order_delivery_dt, mat_unit_count, mat_unit_amount, order_total, order_nettotal, order_desc, order_lines, order_discount_percent, order_discount_amount } = req.body

    try {

        const warehouse_query = `
            select wh_guid, wh_name, wh_sequence from  tbl_warehouses
            where wh_sequence = ( select MIN(wh_sequence) from tbl_warehouses )
        `

        const insert_parent = `
            insert into tbl_orders (firm_guid, partner_guid,  warehouse_guid, status_guid, user_guid, order_code, order_valid_dt, order_delivery_dt, mat_unit_count, mat_unit_amount, order_total, order_nettotal, order_desc, contact_number, order_discount_percent, order_discount_amount)  values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) returning order_guid
        `


        const warehouse_res = await db.queryTransaction([
            {
                queryText: warehouse_query,
                params: []
            }
        ])
        let warehouse_guid = warehouse_res[0].wh_guid,
            status_guid = "be99f40e-0e8f-4205-9c2d-556ca6543888"; // Garasylyar
        const parent_res = await db.queryTransaction([
            {
                queryText: insert_parent,
                params: [firm_guid, partner_guid, warehouse_guid, status_guid, '00000000-0000-0000-0000-000000000000', order_code, 'now()', order_delivery_dt, mat_unit_count, mat_unit_amount, order_total, order_nettotal, order_desc, contact_number, order_discount_percent, order_discount_amount]
            }
        ])
        let ord_parent_guid = parent_res[0].order_guid
        const insert_line = `
            insert into tbl_orders_line (ord_parent_guid, mtrl_attr_unit_row_id, ord_line_amount, ord_line_total, ord_line_nettotal, ord_line_desc, ord_line_price, ord_line_price_type_guid, ord_line_disc_percent, ord_line_disc_amount, line_row_id_front)  values ${order_lines.map((line) => `(
                '${ord_parent_guid}', ${line.mtrl_attr_unit_row_id}, ${line.ord_line_amount}, ${line.ord_line_total}, ${line.ord_line_nettotal}, '${line.ord_line_desc}', ${line.ord_line_price}, uuid_nil(), ${line.ord_line_disc_percent}, ${line.ord_line_disc_amount}, 0
            )`)} returning ord_line_guid
        `
        const line_res = await db.queryTransaction([
            {
                queryText: insert_line,
                params: []
            }
        ])

        if (line_res.length === order_lines.length) {
            return res.status(status.created).send(`Order successfully created`)
        }
    } catch (e) {
        console.log(e)
        if (e.routine === '_bt_check_unique') return res.status(status.conflict).send('Already exist')
        return res.status(status.error).send('Unknown error')
    }
}


const GetOrderHistory = async (req, res) => {
    const partner_guid = req.query.partner_guid
    const get_query = `
    with partner_contact_data as (
        SELECT 
                    contact_number,
                    is_contact_main,
                    (
                        SELECT json_agg(obj)
                        FROM (
                            SELECT json_object_agg(
                                CASE 
                                    WHEN contact_type_id = 1 THEN 'address'
                                    WHEN contact_type_id = 2 THEN 'phone'
                                    WHEN contact_type_id = 3 THEN 'email'
                                    WHEN contact_type_id = 4 THEN 'home_phone'
                                    WHEN contact_type_id = 5 THEN 'website'
                                    WHEN contact_type_id = 6 THEN 'fax'
                                    WHEN contact_type_id = 7 THEN 'district'
                                    WHEN contact_type_id = 8 THEN 'skype'
                                    WHEN contact_type_id = 9 THEN 'other'
                                    ELSE 'contact_value' 
                                END, contact_value
                            ) AS obj
                            FROM tbl_contact_info
                            WHERE parent_guid =  $1
                                AND contact_number = t.contact_number
                        ) AS subquery
                    ) AS contact_data
                FROM tbl_contact_info t
                WHERE parent_guid =  $1 and contact_number = 1
                    AND contact_number IN (
                        SELECT DISTINCT contact_number 
                        FROM tbl_contact_info 
                        WHERE parent_guid =  $1
                    )
                GROUP BY contact_number, is_contact_main 
                ORDER BY is_contact_main DESC
     )
     
     
     
     select o.order_guid, o.order_code, s.status_name, o.order_valid_dt, o.order_delivery_dt, o.order_total, o.order_nettotal, o.order_discount_percent, o.order_discount_amount, o.order_desc,
            json_agg(
                json_build_object(
                    'ord_line_guid', l.ord_line_guid,
                    'mtrl_name', m.mtrl_name,
                    'ord_line_price', l.ord_line_price,
                    'ord_line_amount', l.ord_line_amount,
                    'mtrl_attr_unit_row_id', l.mtrl_attr_unit_row_id,
                    'ord_line_desc', l.ord_line_desc,
                    'ord_line_total', l.ord_line_total,
                    'ord_line_nettotal', l.ord_line_nettotal,
                    'ord_line_disc_percent', l.ord_line_disc_percent,
                    'ord_line_disc_amount', l.ord_line_disc_amount,
										'unit_det_code', ud.unit_det_code,
                    'image_name', img.image_name
                    
                )
            ) as order_lines,
            (select contact_data from partner_contact_data) as contact_data
        from tbl_orders o 
        left join tbl_orders_line l on l.ord_parent_guid = o.order_guid
        left join tbl_statuses s on s.status_guid = o.status_guid
        left join tbl_mtrl_images mi on mi.mtrl_attr_unit_row_id = l.mtrl_attr_unit_row_id
				left join tbl_mtrl_attr_unit mau on mau.row_id = l.mtrl_attr_unit_row_id
				left join tbl_materials m on m.mtrl_guid = mau.mtrl_guid
        left join tbl_images img on img.image_guid = mi.image_guid
				left join tbl_unit_details ud on ud.unit_det_guid = mau.unit_det_guid
        where o.partner_guid = $1
        group by o.order_guid, o.order_code, s.status_name
    `

    try {

        const order_history_res = await db.query(get_query, [partner_guid])
        // if (order_history_res.rowCount === 0) {
        //     return res.status(status.notfound).send('Not found data')
        // }
       order_history_res.rows?.forEach(item => {
            item.contact_data = item.contact_data[0]
            item.order_lines.map(line => {
                line.image_url = line.image_name ? `${ENV.REMOTE_IMAGES_HOST_URL}${ENV.IMAGES_PATH_PREFIX}/${line.image_name}` : null
                delete line.image_name
                return line
            })
        })
        return res.status(status.success).send(order_history_res.rows)

    } catch (e) {
        console.log(e)
        return res.status(status.error).send('Unknown error')
    }
}





module.exports = {
    CreateOrder,
    GetOrderHistory,

}