const db = require('../db')
const status = require('../scripts/utils/status')
const { ContactTypeIDs } = require('../scripts/utils/HelperFunctions')



const AddPartnerAddress = async (req, res) => {

    let { partner_guid, ...contact_data } = req.body;

    try {
        contact_data = Object.keys(contact_data).map(item => {
            return {
                key: item,
                value: contact_data[item],
            }
        })

        const contact_number = (await db.queryTransaction([
            {
                queryText: `select max(contact_number) as contact_number from tbl_contact_info where parent_guid = $1`,
                params: [partner_guid]
            }
        ]))[0].contact_number
        const is_contact_main = contact_number === 0 || contact_number === null ? true : false
        const next_contact_number = contact_number + 1
        
        const insert_partner_contact_info_query = `
            insert into tbl_contact_info (parent_guid, contact_value, contact_type_id, is_contact_main, contact_number)
            values ${contact_data.map(item => `(
                '${partner_guid}', '${item.value}', ${ContactTypeIDs(item.key)}, ${is_contact_main}, ${next_contact_number}
            )`)}
            on conflict(parent_guid, contact_value, contact_type_id, contact_number)
            do update set parent_guid = excluded.parent_guid, contact_value = excluded.contact_value,  contact_type_id = excluded.contact_type_id, contact_number = excluded.contact_number
            returning row_id
        `
                console.log('insert_partner_contact_info_query: ', insert_partner_contact_info_query)

        const insertRes = (await db.queryTransaction([
            {
                queryText: insert_partner_contact_info_query,
                params: []
            }
        ]))[0]
        if (insertRes.row_id) {
            return res.status(status.created).send('SUCCESS')
        }

    } catch (e) {
        console.log(e)
        if (e.routine === '_bt_check_unique') return res.status(status.conflict).send('Already exist')
        return res.status(status.error).send('Unknown error')
    }
}




const GetPartnerAddresses = async (req, res) => {
    const { partner_guid } = req.query
    try {

        const get_partner_addresses_query = `
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
                        WHERE parent_guid = $1
                            AND contact_number = t.contact_number
                    ) AS subquery
                ) AS contact_data
            FROM tbl_contact_info t
            WHERE parent_guid = $1 
                AND contact_number IN (
                    SELECT DISTINCT contact_number 
                    FROM tbl_contact_info 
                    WHERE parent_guid = $1
                )
            GROUP BY contact_number, is_contact_main 
            ORDER BY is_contact_main DESC
        
        `
        const { rows } = await db.query(get_partner_addresses_query, [partner_guid])
        if(rows.length  === 0){
            return res.status(status.success).send('No address')
        }
        return res.status(status.success).send(rows)

    } catch (error) {
        console.log(error)
        return res.status(status.error).send('Unknown error')
    }
}




const UpdatePartnerAddress = async (req, res) => {
    let { partner_guid, contact_number, contact_data } = req.body

    try {
        console.log('req.body: ', req.body)
        const temp_contact_number = contact_number
        const is_contact_main = Number(contact_number) === 1 ? true : false

        contact_data = Object.keys(contact_data).map(item => {
            return {
                value: contact_data[item],
                key: item
            }
        })

        const delete_query = `
        delete from tbl_contact_info where parent_guid = '${partner_guid}' and contact_number = ${contact_number} returning row_id
        `


        await db.queryTransaction([
            {
                queryText: delete_query,
                params: []
            }
        ])

        const insert_partner_contact_info_query = `
        insert into tbl_contact_info(parent_guid, contact_value, contact_type_id, is_contact_main, contact_number) values ${contact_data.map((pdata, idx) => (`('${partner_guid}', '${pdata.value}', ${ContactTypeIDs(pdata.key)}, ${is_contact_main}, ${temp_contact_number})`))}
        `

        await db.queryTransaction([
            {
                queryText: insert_partner_contact_info_query,
                params: []
            }
        ])
        return res.status(status.success).send('SUCCESS')
    } catch (error) {
        console.log(error)
        return res.status(status.error).send('Unknown error')
    }
}



const DeletePartnerAddress = async (req, res) => {
    const { partner_guid, contact_number } = req.query
    try {

        const check_query = `
            select max(contact_number) as contact_number from tbl_contact_info where parent_guid = $1 and contact_number = $2
        `

        const checkRes = (await db.query(check_query, [partner_guid, contact_number])).rows[0].contact_number
        if (checkRes === null) {
            return res.status(status.bad).send(`No data with "${contact_number}" this contact number`)
        }

        const check_is_contact_main_query = `
            select distinct is_contact_main from tbl_contact_info where parent_guid = $1 and  contact_number = $2 
        `

        const checkIsMainRes = (await db.query(check_is_contact_main_query, [partner_guid, contact_number])).rows[0].is_contact_main
        if(checkIsMainRes === true){
            return res.status(status.bad).send("You can't delete main address")
        }
        const delete_query = `
            delete from tbl_contact_info where parent_guid = $1 and contact_number = $2 returning row_id
        `
        const deleteRes = (await db.query(delete_query, [partner_guid, contact_number])).rowCount

        if (deleteRes > 0) {
            return res.status(status.success).send('SUCCESS')
        }


    } catch (error) {
        console.log(error)
        return res.status(status.error).send('Unknown error')
    }
}



const SetMainAddress = async (req, res) => {
    const { partner_guid, contact_number } = req.body
    console.log('req.body set main: ', req.body)

    try {
        const check_query = `
        select max(contact_number) as contact_number from tbl_contact_info where parent_guid = $1 and contact_number = $2
    `

        const checkRes = (await db.query(check_query, [partner_guid, contact_number])).rows[0].contact_number
        if (checkRes === null) {
            return res.status(status.bad).send(`Nothing data with "${contact_number}" this contact number`)
        }

        const update_query = `
            with updateFalse as (
                update tbl_contact_info set is_contact_main = false where parent_guid = $1 and contact_number = (
                select max(contact_number) from tbl_contact_info where parent_guid = $1 and is_contact_main
            ) returning row_id
            )
            update tbl_contact_info set is_contact_main = true where parent_guid = $1 and contact_number = $2 returning row_id
        `

        const updateRes = (await db.query(update_query, [partner_guid, contact_number])).rows

        if (updateRes.length > 0) {
            return res.status(status.success).send('SUCCESS')
        }
    } catch (error) {
        console.log(error)
        return res.status(status.error).send('Unknown error')
    }
}




module.exports = {
    AddPartnerAddress,
    GetPartnerAddresses,
    UpdatePartnerAddress,
    DeletePartnerAddress,
    SetMainAddress,
}