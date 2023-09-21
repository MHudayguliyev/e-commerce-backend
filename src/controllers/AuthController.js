const db = require('../db')
const status = require('../scripts/utils/status')
const { GenerateAccessToken, GenerateRefreshToken, VerifyRefreshToken } = require('../scripts/helpers/AuthHelpers')
const log = require('../log/logger')



const Login = async (req, res) => {
    const { phone_number } = req.body

    const partner_check_query = `
                        select p.partner_guid, p.partner_code, p.partner_full_name, i.contact_value  as phone_number_main  from tbl_partners p
                    left join tbl_contact_info i on i.parent_guid = p.partner_guid
                    where  i.contact_type_id = 2 and i.is_contact_main and i.contact_value = $1
    `
    try {
        const isExistPartner = await db.query(partner_check_query, [phone_number])
        if (isExistPartner.rowCount === 0) {
            return res.status(status.notfound).send('No partner with this phone number')
        } else {
            const partner = isExistPartner.rows[0]
            const access_token = await GenerateAccessToken(partner)
            const refresh_token = await GenerateRefreshToken(partner)
            const data = {
                partner,
                access_token,
                refresh_token
            }
            return res.status(status.success).send(data)
        }
    } catch (e) {
        log.error(`AuthController.js ~ Login: ${e}`)
        return res.status(status.error).send('Unknown error')
    }
}



const Register = async (req, res) => {
    const { fullname, partner_code, home_phone_number, phone_number_main, phone_number_second, region, address, email, firm_guid } = req.body
    try {
        const pnr_check_query = `select count(i.parent_guid) as cnt from tbl_contact_info i
                                     join tbl_partners p on i.parent_guid = p.partner_guid
                                     where i.contact_value = $1 and i.is_contact_main`;

        const isExistPartner = await db.query(pnr_check_query, [phone_number_main])
        if (isExistPartner.rows[0]?.cnt == 0) {
            const client = await db.db.connect()
            const insert_to_partners = `INSERT INTO tbl_partners(firm_guid, partner_name, partner_code,
                                        partner_full_name, pnr_name_for_print, partner_balance)
                                        VALUES($1, $2, $3, $4, $5, $6) RETURNING partner_guid`;
            try {
                await client.query("BEGIN");
                log.info('Register transaction BEGIN')
                const partner_result = await client.query(insert_to_partners,
                    [firm_guid, '-', partner_code, fullname, '-', 0])
                const partner_guid = partner_result.rows[0]?.partner_guid
                const values = [
                    { partner_guid, contact_type_id: 2, contact_value: phone_number_main, is_contact_main: true },
                    { partner_guid, contact_type_id: 1, contact_value: address, is_contact_main: true },
                    { partner_guid, contact_type_id: 7, contact_value: region, is_contact_main: false },
                    { partner_guid, contact_type_id: 8, contact_value: home_phone_number, is_contact_main: false },
                    { partner_guid, contact_type_id: 2, contact_value: phone_number_second, is_contact_main: false },
                    { partner_guid, contact_type_id: 3, contact_value: email, is_contact_main: true }
                ];
                const insert_to_info = `INSERT INTO tbl_contact_info(parent_guid, contact_type_id,
                                        contact_value, is_contact_main) VALUES ${values.map(item => `(
                                            '${item.partner_guid}', '${item.contact_type_id}', '${item.contact_value}', '${item.is_contact_main}'
                                        )`)}`
                await client.query(insert_to_info, [])
                const get_partner_query = `
                                        select p.partner_guid, p.partner_code, p.partner_full_name, i.contact_value as phone_number_main from tbl_partners p
                                        left join tbl_contact_info i on i.parent_guid = p.partner_guid
                                        where  i.contact_type_id = 2 and i.is_contact_main and p.partner_guid = $1`;
                const partner = await client.query(get_partner_query, [partner_guid])
                const partner_data = partner.rows[0]
                const access_token = await GenerateAccessToken(partner_data)
                const refresh_token = await GenerateRefreshToken(partner_data)
                const data = {
                    partner: partner_data,
                    access_token,
                    refresh_token
                }
                await client.query("COMMIT");
                log.info('Register transaction COMMITED')
                return res.status(status.success).send(data)
            } catch (e) {
                log.error(`AuthController.js ~ Register: ${e}`)
                await client.query("ROLLBACK");
                return res.status(status.error).send('Unkown error')
            } finally {
                client.release();
            }
        } else {
            log.warn('Conflict: Partner already exist')
            return res.status(status.conflict).send('Partner already exist')
        }
    } catch (e) {
        log.error(`AuthController.js ~ Register: ${e}`)        
        return res.status(status.error).send('Unknown error')
    }
}


const LoadPartnerData = async (req, res) => {
    let authorization = req.headers.authorization

    try {
        if (!authorization) {
            log.warn('Token Not Provided')
            return res.status(status.unauthorized).send('Token Not Provided');
        }
        let authorization_array = authorization.split(' ')
        let token = '';
        for (let i = 0; i < authorization_array.length; i++) {
            if (authorization_array[i] === 'Bearer') {
                token = authorization_array[i + 1];
                break;
            }
        }

        if (token === '') {
            log.warn('Token Not Provided')
            return res.status(status.unauthorized).send('Token Not Provided');
        } else {
            const verified = await VerifyRefreshToken(token)
            if (verified.status === 'Unauthorized' || verified.status === 'Bad') {
                log.warn('Unauthorized')
                return res.status(status.unauthorized).send('Unauthorized');
            } else {
                return res.status(status.success).send({
                    partner: verified.data.partner,
                    access_token: verified.data.access_token
                })

            }
        }

    } catch (e) {
        log.error(` AuthController.js ~ LoadPartnerData: ${e}`)
        return res.status(status.error).send('Unknown error')

    }
}



module.exports = {
    Login,
    Register,
    LoadPartnerData,
}