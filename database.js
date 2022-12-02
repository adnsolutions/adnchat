const { log } = require('console');
var mysql = require('mysql');
const util = require('util');
var connection = mysql.createConnection({
    host: '201.148.107.48',
    user: 'pruebaad_admin',
    password: 'galHU(q(P+K~',
    database: 'pruebaad_db_adnsolsis'
});


connection.connect();

function listar_sesiones(callback) {
    connection.query('SELECT * FROM sesion;', function(error, results, fields) {
        if (error) throw error;
        return callback(results);
    });
}

function buscar_sesion(data, callback) {
    connection.query("SELECT * FROM sesion s WHERE s.id_sesion LIKE '" + data.id_sesion_b + "';", function(error, results, fields) {
        if (error) throw error;
        return callback(results);
    });
}

async function listar_sesiones_remarketing_async(obj_filtros) {
    const query = util.promisify(connection.query).bind(connection);
    try {
        const rows = await query(`select * from sesion s WHERE s.fecha_ult_conv between '${obj_filtros.fecha_inicio}' AND '${obj_filtros.fecha_fin}' AND s.etapa = '${obj_filtros.etapa}' AND s.estado_sesion LIKE '${obj_filtros.estado_sesion}';`);
        return rows;
    } finally {
        //connection.end();
    }
}

async function cantidad_sesiones_remarketing_async(obj_filtros) {
    const query = util.promisify(connection.query).bind(connection);
    try {
        const rows = await query(`select * from sesion s WHERE s.estado_sesion LIKE '${obj_filtros.estado_sesion}';`);
        return rows;
    } finally {
        //connection.end();
    }
}

async function listar_sesiones_para_completar_info_async(obj_filtros) {
    const query = util.promisify(connection.query).bind(connection);
    try {
        // const rows = await query(`select * from sesion s WHERE s.etapa <= ${obj_filtros.etapa} AND s.estado_sesion LIKE '${obj_filtros.estado_sesion}';`);
        const rows = await query(`select * from sesion s WHERE s.etapa <= ${obj_filtros.etapa} AND s.estado_sesion LIKE '${obj_filtros.estado_sesion}' AND s.fecha_ult_conv > '2022-04-18 00:00:01';`);
        return rows;
    } finally {
        //connection.end();
    }
}

async function buscar_sesion_async(data) {
    let row_rpta;
    const query = util.promisify(connection.query).bind(connection);
    try {
        const rows = await query("SELECT * FROM sesion s WHERE s.id LIKE '" + data.id + "';");
        return rows[0];
    } finally {
        //connection.end();
    }
}

async function buscar_sesiones_completar_async(data_filtro) {
    const query = util.promisify(connection.query).bind(connection);
    try {
        const rows = await query(`SELECT * FROM sesion s WHERE s.estado_sesion LIKE '${data_filtro.estado}' AND s.etapa >= ${data_filtro.e_i} AND s.etapa <= ${data_filtro.e_f} AND s.fecha_creacion BETWEEN '${data_filtro.h_i}' AND '${data_filtro.h_f}' ORDER BY s.fecha_creacion DESC;`);
        return rows;
    } finally {
        //connection.end();
    }
}

async function registrar_sesion_async(obj_sesion_n) {
    const query = util.promisify(connection.query).bind(connection);
    try {
        const rpta = await query(`INSERT INTO sesion (id,etapa,estado_conv,fecha_sesion,fecha_ult_conv,dejo_numero,estado_sesion,nro_telfono,fanpage,comentario) VALUES
        ('${obj_sesion_n.id}','${obj_sesion_n.etapa}','${obj_sesion_n.estado_conv}','${obj_sesion_n.fecha_sesion}','${obj_sesion_n.fecha_ult_conv}','${obj_sesion_n.dejo_numero}','${obj_sesion_n.estado_sesion}','${obj_sesion_n.nro_telfono}','${obj_sesion_n.fanpage}','${obj_sesion_n.comentario}');`);
        return rpta;
    } finally {
        //connection.end();
    }
}

async function actualizar_sesion_async(id_sesion, obj_datos_actualizables) {
    const query = util.promisify(connection.query).bind(connection);

    let indice = 0;
    let a_claves = Object.keys(obj_datos_actualizables);
    let consulta_set = '';

    for (const property in obj_datos_actualizables) {
        indice++;
        consulta_set += `${property} = '${obj_datos_actualizables[property]}'`;

        if (indice != a_claves.length) {
            consulta_set += ', ';
        }
    }
    //console.log(consulta_set);
    try {
        const rpta = await query("UPDATE sesion SET " + consulta_set + " WHERE id = " + id_sesion + ";");
        // console.log(rows);
        return rpta;
    } finally {
        //connection.end();
    }
}

async function eliminar_sesion_async(obj_sesion_d) {
    const query = util.promisify(connection.query).bind(connection);
    try {
        const rpta = await query("DELETE FROM sesion WHERE id = '" + obj_sesion_d.id + "';");
        return rpta;
    } finally {
        //connection.end();
    }
}

async function test() {
    //let d = await buscar_sesion_async({ id: 0 });
    // let d = await actualizar_sesion_async(3, { dejo_numero: 1, estado_conv: 3, fecha_sesion: '2022-12-12 01:00:00' });
    // let d = await registrar_sesion_async({ id: 3, etapa: 0, estado_conv: 1, fecha_sesion: '2022-01-01 01:00:00', fecha_ult_conv: '2022-01-01 01:00:00', dejo_numero: 0, estado_sesion: 'A' });
    // let d = await eliminar_sesion_async({ id: 2 });
    let d = await listar_sesiones_remarketing_async({ fecha_inicio: '2022-01-01 00:00:00', fecha_fin: '2022-01-02 23:59:59', etapa: 10, estado_sesion: 'ARMK' });
    console.log(d);
}

module.exports = {
    listar_sesiones_remarketing_async: listar_sesiones_remarketing_async,
    buscar_sesion_async: buscar_sesion_async,
    registrar_sesion_async: registrar_sesion_async,
    actualizar_sesion_async: actualizar_sesion_async,
    eliminar_sesion_async: eliminar_sesion_async,
    cantidad_sesiones_remarketing_async: cantidad_sesiones_remarketing_async,
    listar_sesiones_para_completar_info_async: listar_sesiones_para_completar_info_async,
    buscar_sesiones_completar_async: buscar_sesiones_completar_async
};