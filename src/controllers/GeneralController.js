const db = require('../db')
const status = require('../scripts/utils/status')
const { ForPostgresIN } = require('../scripts/utils/HelperFunctions')
const fs = require('fs/promises')
const path = require('path')
const ENV = require('../config')



const GetGroups = async (req, res) => {


  const get_query = `
        SELECT G
        .group_guid,
        G.group_name,
        COUNT ( DISTINCT u.mtrl_guid ) AS mtrls_count,
        i.image_name 
      FROM
        tbl_groups
        G JOIN tbl_mtrl_attr_unit u ON G.group_guid = u.group_guid
        LEFT JOIN tbl_materials M ON u.mtrl_guid = M.mtrl_guid
        LEFT JOIN tbl_groups_images gi ON gi.parent_guid = G.group_guid
        LEFT JOIN tbl_images i ON i.image_guid = gi.image_guid 
      WHERE
        NOT M.mark_for_deletion 
        AND u.mtrl_type_row_id = 1 
      GROUP BY
        G.group_guid,
        G.group_name,
        i.image_name 
      ORDER BY
        G.group_name
    `;

  try {
    const groups = await db.query(get_query, [])
    if (groups?.rowCount === 0) {
      return res.status(status.notfound).send('Not found data')
    }
    const all = {
      group_guid: '',
      group_name: 'Hemmesi',
      mtrls_count: groups?.rows.reduce((acc, currentValue) => {
        return acc + Number(currentValue.mtrls_count)
      }, 0).toString(),
      image_url: null
    }
    groups.rows = groups.rows.map((item) => {
      item.image_url = `${ENV.REMOTE_IMAGES_HOST_URL}${ENV.GROUPS_IMAGES_PATH_PREFIX}/${item.image_name}`
      delete item.image_name
      return item
    })
    groups.rows.unshift(all)
    return res.status(status.success).send(groups?.rows)
  } catch (e) {
    console.log(e)
    return res.status(status.error).send('Unknown error')
  }
}

const GetAttributes = async (req, res) => {
  const group_guid = req.query.group_guid

  const get_all_query = `
        select u.attr_guid, a.attribute_name, count(u.mtrl_guid) as mtrls_count
        from tbl_mtrl_attr_unit u join tbl_attributes a on u.attr_guid = a.attribute_guid
        left join tbl_materials m on u.mtrl_guid = m.mtrl_guid where not m.mark_for_deletion
        ${group_guid ? ` and u.group_guid = '${group_guid}'` : ''}
        group by u.attr_guid, a.attribute_name
        order by a.attribute_name
    `

  try {

    const attributes = await db.query(get_all_query, [])
    if (attributes?.rowCount === 0) {
      return res.status(status.notfound).send('Not found data')
    }
    return res.status(status.success).send(attributes?.rows)

  } catch (e) {
    console.log(e)
    return res.status(status.error).send('Unknown error')
  }
}

const GetMaterials = async (req, res) => {
  let { group_guid, attr_guids, limit, page, search } = req.query
  search = search ? search.length > 0 ? search?.replaceAll(' ', '%') : search : ""
  try {

    const parsedAttrGuids = await ForPostgresIN(attr_guids)
    const offset = `offset ${limit * page}`
    const searchPart = search ? `
    AND LOWER (CONCAT(u.row_id,  m.mtrl_code,  m.mtrl_name,  d.unit_det_code, d.unit_det_numerator,  d.unit_det_dominator,  p.price_value, d.unit_det_dominator, d.unit_det_numerator,  d.unit_det_code,  m.mtrl_name,  m.mtrl_code, u.row_id )) LIKE LOWER (N'%${search}%')  
    ` : ' '
    const wherePart = `
    ${group_guid && !attr_guids ? ` and u.group_guid = '${group_guid}' ` : ''}
    ${group_guid && attr_guids ? ` and u.group_guid = '${group_guid}'  ${parsedAttrGuids.llength ? ' and u.attr_guid in (' + parsedAttrGuids.lslice + ')' : ''}` : ''}
    ${!group_guid && attr_guids ? parsedAttrGuids.llength ? ' and u.attr_guid in (' + parsedAttrGuids.lslice + ')' : '' : ''}
    `
    const get_total_row_count_query = `
      select count(u.row_id)::int as total_row_count
      from tbl_mtrl_attr_unit u
      join tbl_materials m on u.mtrl_guid = m.mtrl_guid
      join tbl_unit_details d on d.unit_det_guid = u.unit_det_guid
      left join tbl_prices p on u.row_id = P.mtrl_attr_unit_row_id
      left join tbl_price_types t on p.price_type_guid = t.price_type_guid
      left join tbl_mtrl_images mi on mi.mtrl_attr_unit_row_id = u.row_id and mi.is_image_main 
      left join tbl_images i on i.image_guid = mi.image_guid
      where not m.mark_for_deletion and t.pt_used_in_sale
      ${wherePart}
    `
 
    const get_all_query = `
        select row_number() over (order by u.row_id) as row_num,
        u.row_id as mtrl_attr_unit_row_id,
        m.mtrl_code,
        m.mtrl_name,
        d.unit_det_code,
        d.unit_det_numerator,
        d.unit_det_dominator,
        coalesce(p.price_type_guid, uuid_nil()) as price_type_guid,
        coalesce(p.price_value, 0) as price_value,
				coalesce(i.image_name, '') as image_name
    from tbl_mtrl_attr_unit u
    join tbl_materials m on u.mtrl_guid = m.mtrl_guid
    join tbl_unit_details d on d.unit_det_guid = u.unit_det_guid
    left join tbl_prices p on u.row_id = P.mtrl_attr_unit_row_id
    left join tbl_price_types t on p.price_type_guid = t.price_type_guid
    left join tbl_mtrl_images mi on mi.mtrl_attr_unit_row_id = u.row_id and mi.is_image_main 
		left join tbl_images i on i.image_guid = mi.image_guid
    where not m.mark_for_deletion and t.pt_used_in_sale  ${searchPart}
    ${wherePart}
     limit ${limit} ${offset}`
    const total_row_count_res = await db.query(get_total_row_count_query, [])
    const materials = await db.query(get_all_query, [])
    if (materials?.rowCount === 0) {
      return res.status(status.success).send('Not found data')
    }

    const rows = materials.rows.map(row => {
      row.image_url = row.image_name ? `${ENV.REMOTE_IMAGES_HOST_URL}${ENV.IMAGES_PATH_PREFIX}/${row.image_name}` : null
      delete row.image_name
      return row
    })
    const sendData = {
      total_row_count: total_row_count_res.rows[0].total_row_count,
      data: rows
    }
    return res.status(status.success).send(sendData)

  } catch (e) {
    console.log(e)
    return res.status(status.error).send('Unknown error')
  }
}

const GetMaterialDetails = async (req, res) => {
  const { row_id } = req.query

  const get_query = `
    with images as (
      select 
        json_agg(
          json_build_object(
            'image_url', i.image_name,
            'is_image_main', mi.is_image_main
          )
        ) as images
        from tbl_mtrl_images mi
      left join tbl_images i on i.image_guid = mi.image_guid
      where mi.is_image_active  and mi.mtrl_attr_unit_row_id = $1
    ) 


    select
          u.row_id,
          m.mtrl_code,
          m.mtrl_name,
          m.mtrl_full_name,
          m.mtrl_desc,
          d.unit_det_code,
          g.group_name,
          a.attribute_name,
          m.mtrl_brand,
          m.mtrl_category,
          coalesce(p.price_value, 0) as price_value,
          m.mtrl_weight, m.mtrl_height, m.mtrl_width, m.mtrl_volume,
          (select * from images)
      from tbl_mtrl_attr_unit u
      join tbl_materials m on u.mtrl_guid = m.mtrl_guid
      join tbl_unit_details d on d.unit_det_guid = u.unit_det_guid
      left join tbl_attributes a on u.attr_guid = a.attribute_guid
      left join tbl_groups g on u.group_guid = g.group_guid
      left join tbl_prices p on u.row_id = P.mtrl_attr_unit_row_id
      left join tbl_price_types t on p.price_type_guid = t.price_type_guid
      where t.pt_used_in_sale and u.row_id = $1
    `

  try {

    const material_details = await db.query(get_query, [row_id])
    if (material_details.rowCount === 0) {
      return res.status(status.notfound).send('Not found data')
    }
    const rows = material_details.rows.map((row) => {
      if (row.images !== null || row.images?.length > 0) {
        row.images.map(img => {
          img.image_url = `${ENV.REMOTE_IMAGES_HOST_URL}${ENV.IMAGES_PATH_PREFIX}/${img.image_url}`
          return img
        })
      }
      return row
    })
    return res.status(status.success).send(rows)

  } catch (e) {
    console.log(e)
    return res.status(status.error).send('Unknown error')
  }
}

const GetAllMaterials = async (req, res) => {
  let { start, size, filters, globalFilter, sorting } = req.query

  if (Object.keys(req.query).length === 0) {
    return res.status(status.bad).send('Missing query keys')
  }
  sorting = JSON.parse(sorting)[0]
  filters = JSON.parse(filters)

  let sort_column = sorting !== undefined ? sorting?.id : 'mtrl_name'
  let sort_order = sorting !== undefined ? sorting?.desc ? 'DESC' : 'ASC' : 'ASC'
  const search = globalFilter.length > 0 ? globalFilter?.replaceAll(' ', '%') : globalFilter
  const results = filters?.map((item) => {
    const lowerLike = ` lower(${item.id}) like lower(N'%${item.value?.replaceAll(' ', '%')}%')`;
    return lowerLike;
  });

  const finalResult = results.join(' and ');

  const searchPart = `
    AND LOWER (CONCAT(u.row_id, u.mtrl_guid,  u.group_guid,  u.group_guid, u.attr_guid, u.attr_guid,  m.mtrl_code, m.mtrl_name, d.unit_det_code, g.group_name, a.attribute_name, p.price_type_guid, price_value, p.price_type_guid, a.attribute_name, g.group_name, d.unit_det_code, m.mtrl_name,  m.mtrl_code, u.mtrl_guid, u.row_id )) LIKE LOWER (N'%${search}%')
    `
  const limitAndOffsetPart = ` limit ${size} offset ${start}`
  const wherePart = ` where not m.mark_for_deletion  ${searchPart}
  ${filters?.length > 0 ? ' and ' + finalResult : ''}
  -- and t.pt_used_in_sale `
  const get_total_row_count_query = `
        select count(*)::int as total_row_count
        from tbl_mtrl_attr_unit u
        join tbl_materials m on u.mtrl_guid = m.mtrl_guid
        join tbl_unit_details d on d.unit_det_guid = u.unit_det_guid
        left join tbl_attributes a on u.attr_guid = a.attribute_guid
        left join tbl_groups g on u.group_guid = g.group_guid
        left join tbl_prices p on u.row_id = P.mtrl_attr_unit_row_id
        left join tbl_price_types t on p.price_type_guid = t.price_type_guid
       ${wherePart}
  `

  const get_query = `
        select row_number() over (order by u.row_id)::int as row_num,
        u.row_id as mtrl_attr_unit_row_id,
        u.mtrl_guid,
        u.group_guid,
        u.attr_guid,
        m.mtrl_code,
        m.mtrl_name,
        d.unit_det_code,
        g.group_name,
        a.attribute_name,
        coalesce(p.price_type_guid, uuid_nil()) as price_type_guid,
        coalesce(p.price_value, 0)::float as price_value
      from tbl_mtrl_attr_unit u
      join tbl_materials m on u.mtrl_guid = m.mtrl_guid
      join tbl_unit_details d on d.unit_det_guid = u.unit_det_guid
      left join tbl_attributes a on u.attr_guid = a.attribute_guid
      left join tbl_groups g on u.group_guid = g.group_guid
      left join tbl_prices p on u.row_id = P.mtrl_attr_unit_row_id
      left join tbl_price_types t on p.price_type_guid = t.price_type_guid
      ${wherePart}
      order by ${sort_column}  ${sort_order}
      ${limitAndOffsetPart}
     
    `


  try {
    const total_row_count_res = await db.query(get_total_row_count_query, [])
    const all_materials = await db.query(get_query, [])
    if (all_materials?.rowCount === 0 || total_row_count_res?.rowCount === 0) {
      return res.status(status.notfound).send('Not found data')
    }
    const data_for_send = {
      total_row_count: total_row_count_res.rows[0]?.total_row_count,
      data: all_materials?.rows
    }
    return res.status(status.success).send(data_for_send)

  } catch (e) {
    console.log(e)
    return res.status(status.error).send('Unknown error')
  }
}

const GenerateCode = async (req, res) => {
  const { type } = req.query;
  let inc_type_value = "";
  if (!type === "order" || !type === "client") {
    return res.status(status.bad).send("type value is incorrect");
  }
  switch (type) {
    case "order":
      inc_type_value = "ORD_";
      break;
    case "partner":
      inc_type_value = "PNR_";
      break;
    case "assembly-order":
      inc_type_value = "AORD_";
      break;

    default:
      break;
  }
  try {
    const getCodeGenerate = `SELECT inc_type, inc_value FROM "tbl_increments" WHERE inc_type = $1`;
    const { rows } = await db.query(getCodeGenerate, [inc_type_value]);
    const inc_type = rows[0].inc_type;
    const inc_value = rows[0].inc_value;
    let nulls = "000000";
    const value = inc_value + 1;
    switch (value.toString().length) {
      case 2:
        nulls = "00000";
        break;
      case 3:
        nulls = "0000";
        break;
      case 4:
        nulls = "000";
        break;
      case 5:
        nulls = "00";
        break;
      case 6:
        nulls = "0";
        break;
      case 7:
        nulls = "";
        break;
      default:
        break;
    }
    const updateValue = `update tbl_increments set inc_value = $1, crt_upd_dt = $2 WHERE inc_type = $3`;
    const result = inc_type + nulls + value.toString();
    await db.query(updateValue, [value, new Date(), inc_type_value]);
    return res.status(status.success).send(result);
  } catch (error) {
    console.log("🚀 ~ file: GeneralController.js:198 ~ GenerateCode ~ error:", error)
    return res.status(status.error).send("Unknown error");
  }
};

const GetDummyData = async (req, res) => {
  try {
    const json_path = path.join(process.cwd(), 'src/assets/json/materials_json_data.json')
    const data = await fs.readFile(json_path)
    if (data) {
      return res.status(status.success).send(JSON.parse(data))
    }
  } catch (error) {
    console.log("🚀 ~ file: GeneralController.js:220 ~ GetDummyData ~ error:", error)
    return res.status(status.error).send('Unknown error')
  }
}

const AddFavorites = async (req, res) => {
  const { partner_guid, mtrl_attr_unit_row_id } = req.body
  const insert_query = `
    insert into tbl_favorites (partner_guid, mtrl_attr_unit_row_id) values ($1, $2) returning row_id
  `
  try {
    await db.query(insert_query, [partner_guid, mtrl_attr_unit_row_id])
    return res.status(status.created).send('SUCCESS')
  } catch (error) {
    console.log("🚀 ~ file: GeneralController.js:379 ~ AddFavorites ~ error:", error)
    if (error.routine === '_bt_check_unique') {
      return res.status(status.conflict).send('Duplicate error')
    }
    return res.status(status.error).send('Unknown error')
  }
}


const RemoveFavorites = async (req, res) => {
  const { partner_guid, mtrl_attr_unit_row_id } = req.body

  if(mtrl_attr_unit_row_id !== undefined){
    const check_is_row_id_exist_query = `
    select mtrl_attr_unit_row_id from tbl_favorites where mtrl_attr_unit_row_id = $1 and partner_guid = $2
    `
    const {rows} = await db.query(check_is_row_id_exist_query, [mtrl_attr_unit_row_id, partner_guid])
    if(rows.length === 0){
      return res.status(status.bad).send(`Nothing like this ${mtrl_attr_unit_row_id} material`)
    }
  }

  const delete_query = `
  delete from tbl_favorites where partner_guid = $1 and mtrl_attr_unit_row_id = $2 returning mtrl_attr_unit_row_id as row_id
  `
  const delete_all_favorites_query = `
  delete from tbl_favorites where partner_guid = $1 returning mtrl_attr_unit_row_id as row_id
  `
  try {
    if (mtrl_attr_unit_row_id === undefined) {
      const { rows } = await db.query(delete_all_favorites_query, [partner_guid])
      return res.status(status.success).send(`Successfully removed ${rows.length} materials`)
    } else {
      const { rows } = await db.query(delete_query, [partner_guid, mtrl_attr_unit_row_id])
      return res.status(status.success).send(`Successfully removed ${rows[0].row_id} material`)
    }
  } catch (error) {
    console.log("🚀 ~ file: GeneralController.js:330 ~ AddFavorites ~ error:", error)
    return res.status(status.error).send('Unknown error')
  }
}


const GetFavorites = async (req, res) => {
  const { partner_guid } = req.query
  const get_query = `
    select distinct
      f.row_id,
      f.partner_guid,
      f.mtrl_attr_unit_row_id,
      m.mtrl_code,
      m.mtrl_name,
      d.unit_det_code,
      d.unit_det_numerator,
      d.unit_det_dominator,
      coalesce(p.price_type_guid, uuid_nil()) as price_type_guid,
      coalesce(p.price_value, 0) as price_value,
      i.image_name
    from tbl_favorites f
    left join tbl_mtrl_attr_unit u on u.row_id = f.mtrl_attr_unit_row_id
    join tbl_materials m on u.mtrl_guid = m.mtrl_guid
    join tbl_unit_details d on d.unit_det_guid = u.unit_det_guid
    left join tbl_prices p on u.row_id = P.mtrl_attr_unit_row_id
    left join tbl_price_types t on p.price_type_guid = t.price_type_guid
    left join tbl_mtrl_images mi on mi.mtrl_attr_unit_row_id = u.row_id and mi.is_image_active and mi.is_image_main
    left join tbl_images i on i.image_guid  = mi.image_guid
    where not m.mark_for_deletion and t.pt_used_in_sale  and f.partner_guid = $1

  `
  try {
    const { rows } = await db.query(get_query, [partner_guid])
    const rowsData = rows.map(row => {
      row.image_url = row.image_name ? `${ENV.REMOTE_IMAGES_HOST_URL}${ENV.IMAGES_PATH_PREFIX}/${row.image_name}` : null
      delete row.image_name
      return row
    })
    return res.status(status.success).send(rowsData)
  } catch (error) {
    console.log("🚀 ~ file: GeneralController.js:330 ~ AddFavorites ~ error:", error)
    return res.status(status.error).send('Unknown error')
  }
}


const GetBannerImages = async (req, res) => {
  try {
    const get_banner_images_query = `
    SELECT image_guid, image_name FROM "tbl_images" where parent_guid != '00000000-0000-0000-0000-000000000000'
    `
    const { rows } = await db.query(get_banner_images_query, [])
    console.log('rows banner images', rows)
    rows.forEach(row => {
      row.image_url = `http://${ENV.NODE_ENV==='development' ? 'localhost' : ENV.DB_HOST_VPS}:5002/src/images/compressed/${row.image_name}`
      delete row.image_name
    })
    return res.status(status.success).send(rows)

  } catch (error) {
    console.log(error)
    return res.status(status.error).send('Unknown error')
  }
}

const GetFirmData = async (req, res) => {
  const parnter_guid = req.query.partner_guid
  try {
    const get_firm_data_query = `
    SELECT 
    f.firm_guid, f.firm_name, f.firm_full_name,
    jsonb_object_agg(
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
    ) as contact_data
FROM "tbl_partners" p
LEFT JOIN tbl_firms f ON f.firm_guid = p.firm_guid
LEFT JOIN tbl_contact_info i ON i.parent_guid = f.firm_guid AND i.is_contact_main
WHERE p.partner_guid = $1
GROUP BY f.firm_guid, f.firm_name, f.firm_full_name
    `
    const { rows } = await db.query(get_firm_data_query, [parnter_guid])
    if (rows.length === 0) {
      return res.status(status.notfound).send('Not found')
    }
    return res.status(status.success).send(rows[0])

  } catch (error) {
    console.log(error)
    return res.status(status.error).send('Unknown error')
  }
}




module.exports = {
  GetGroups,
  GetAttributes,
  GetMaterials,
  GetMaterialDetails,
  GenerateCode,
  GetDummyData,
  GetAllMaterials,
  AddFavorites,
  RemoveFavorites,
  GetFavorites,
  GetFirmData,
  GetBannerImages
}



