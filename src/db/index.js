const Pool = require("pg").Pool;
const ENV = require("../config");

const db = new Pool({
    host: ENV.NODE_ENV === 'development' ? ENV.DB_HOST_LOCAL : ENV.DB_HOST_VPS,
    port: ENV.NODE_ENV === 'development' ? ENV.DB_PORT_LOCAL : ENV.DB_PORT_VPS,
    password: ENV.NODE_ENV === 'development' ? ENV.DB_PASSWORD_LOCAL : ENV.DB_PASSWORD_VPS,
    user: ENV.NODE_ENV === 'development' ? ENV.DB_USER_LOCAL : ENV.DB_USER_VPS,
    database: ENV.NODE_ENV === 'development' ? ENV.DB_NAME_LOCAL : ENV.DB_NAME_VPS,
});

module.exports = {
    db,
    async query(text, params) {
        return await db.query(text, params);
    },
    async queryTransaction(query_list) {
        const client = await db.connect();
        try {
            await client.query("BEGIN");
            let response = [];
            for (const query of query_list) {
                const { rows } = await client.query(query.queryText, query.params);
                response = response.concat(rows);
            }
            await client.query("COMMIT");
            return response;
        } catch (e) {
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    },
};
