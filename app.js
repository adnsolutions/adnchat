const express = require('express');
const bodyParser = require('body-parser');
const { response } = require('express');
const request = require('request');
const moment = require('moment');
const schedule = require('node-schedule');

var db = require('./database');

const app = express().use(bodyParser.json());
const ID_FANPAGE_1 = process.env.ID_FANPAGE_1;
const ID_FANPAGE_2 = process.env.ID_FANPAGE_2;
const ID_FANPAGE_3 = process.env.ID_FANPAGE_3;

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_ACCESS_TOKEN_1 = process.env.PAGE_ACCESS_TOKEN_1;
const PAGE_ACCESS_TOKEN_2 = process.env.PAGE_ACCESS_TOKEN_2;
const PAGE_ACCESS_TOKEN_3 = process.env.PAGE_ACCESS_TOKEN_3;
var a_sesiones = new Array();
var a_test_sesiones = new Array();
var modo_debug = false;
var hrs_dif_reinicio_flux = 24;

//verifica si ya hemos platicado con ese usuario

app.post('/webhook', async(req, res) => {
    const body = req.body;
    if (body.object == 'page') {
        body.entry.forEach(async(entry) => {
            //procesado de mensajes
            // console.log(entry.hop_context);
            const webhookEvent = entry.messaging[0];
            //console.log(entry.messaging);

            const sender_psid = webhookEvent.sender.id;
            const page_id = webhookEvent.recipient.id;
            // console.log('sender_psid =>', sender_psid);
            // console.log('page_id =>', page_id);

            //validar si se recibe mensaje
            // if (webhookEvent.message) {
            //     console.log('msje_enviado =>', webhookEvent.message.text);
            //     handleMessage(sender_psid, webhookEvent.message);
            // } else if (webhookEvent.postback) {
            //     handlePostback(sender_psid, webhookEvent.postback);
            // }
            // console.log('>>>>> EVENTO >>>>>');
            // console.log(webhookEvent);
            // console.log('>>>>> EVENTO >>>>>');

            //validar si se recibe mensaje
            if (webhookEvent.message) {
                if (webhookEvent.message.is_echo == true && webhookEvent.message.text) {
                    let rpta_busc;
                    let user_receptor = webhookEvent.recipient.id;
                    let fanpage_id = webhookEvent.sender.id;
                    let fanpage_n = 1;
                    console.log('--------- PETICION ECHO [ ' + user_receptor + ' ] ---------');
                    //validar que fanpage
                    switch (fanpage_id) {
                        case ID_FANPAGE_1:
                            fanpage_n = 1;
                            break;
                        case ID_FANPAGE_2:
                            fanpage_n = 2;
                            break;
                        case ID_FANPAGE_3:
                            fanpage_n = 3;
                            break;
                    }

                    if (webhookEvent.message.text.match(/\D?(ADN SOLUTIONS, Centro Especializado en Genética 😊)\D*/gm)) {
                        console.log('MANDASTE LA BIENVENIDA A [ ', user_receptor, ' ] DESDE FP-', fanpage_id, '-', fanpage_n);
                        rpta_busc = await db.buscar_sesion_async({ id: user_receptor });

                        if (rpta_busc == undefined) {

                            let sesion = { id: user_receptor, etapa: 1, estado_conv: 2, fecha_sesion: null, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), dejo_numero: 0, estado_sesion: 'A', nro_telfono: '', fanpage: fanpage_n, comentario: 'CIUDAD:' };
                            let rpta_insert = await db.registrar_sesion_async(sesion);

                            if (rpta_insert.serverStatus) {
                                console.log("[ IN - SERVER ] => [ " + user_receptor + " ] Se envio la bienvenida. Se agrego a la db con estado conv 2. Etapa up: 1");
                            }
                        }
                    } else if (webhookEvent.message.text.match(/\D?(Se realiza de 02 maneras privadamente|Prueba de Paternidad JUDICIAL)\D*/gm) || webhookEvent.message.text.match(/\D?(Todos esos datos con uno de los peritos)\D*/gm)) {
                        console.log('MANDASTE COMPLETO PRIVADA-JUDICIALES');
                        rpta_busc = await db.buscar_sesion_async({ id: user_receptor });

                        if (rpta_busc == undefined) {
                            let sesion = { id: user_receptor, etapa: 10, estado_conv: 2, fecha_sesion: null, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), dejo_numero: 0, estado_sesion: 'AR', nro_telfono: '', fanpage: fanpage_n, comentario: 'CMP:MANUAL_IN' };
                            let rpta_insert = await db.registrar_sesion_async(sesion);

                            if (rpta_insert.serverStatus) {
                                console.log("[ IN - SERVER ] => [ " + user_receptor + " ] Se completo tipo de prueba y numeros. Etapa in: 10.");
                            }
                        } else {
                            //Actualiza fecha de ultima conversacion
                            let rpta_up = await db.actualizar_sesion_async(user_receptor, { etapa: 10, estado_conv: 2, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), estado_sesion: 'AR', comentario: rpta_busc.comentario + ';CMP:MANUAL_UP' });
                            if (rpta_up.changedRows >= 1) {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] Se completo tipo de prueba y numeros. Etapa up: 10.");
                            } else {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] NO SE ACTUALIZO.");

                            }
                        }
                    } else if (webhookEvent.message.text.match(/\D?(Síganos en la fanpage)\D*/gm)) {
                        console.log('RMK MANUAL');
                        rpta_busc = await db.buscar_sesion_async({ id: user_receptor });

                        if (rpta_busc == undefined) {
                            let sesion = { id: user_receptor, etapa: 11, estado_conv: 3, fecha_sesion: null, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), dejo_numero: 0, estado_sesion: 'ARL', nro_telfono: '', fanpage: fanpage_n, comentario: 'SEG:MANUAL_IN' };
                            let rpta_insert = await db.registrar_sesion_async(sesion);
                            if (rpta_insert.serverStatus) {
                                console.log("[ IN - SERVER ] => [ " + user_receptor + " ] Se envio RMK Manual.");
                            }
                        } else {
                            //Actualiza fecha de ultima conversacion
                            let rpta_up = await db.actualizar_sesion_async(user_receptor, { etapa: 11, estado_conv: 3, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), estado_sesion: 'ARL', comentario: rpta_busc.comentario + ';SEG:MANUAL_UP' });
                            if (rpta_up.changedRows >= 1) {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] Se envio RMK Manual a conv existente.");
                            } else {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] NO SE ACTUALIZO.");
                            }
                        }
                    } else if (webhookEvent.message.text.match(/\D?(hola)\D*/gm)) {
                        console.log('BOT APAGADO - CONV. CERRADA - POR RMK');
                        rpta_busc = await db.buscar_sesion_async({ id: user_receptor });

                        if (rpta_busc == undefined) {
                            let sesion = { id: user_receptor, etapa: 11, estado_conv: 3, fecha_sesion: null, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), dejo_numero: 0, estado_sesion: 'AR', nro_telfono: '', fanpage: fanpage_n, comentario: 'RMK:PEND;CMP:MANUAL_IN;BOT:OFF' };
                            let rpta_insert = await db.registrar_sesion_async(sesion);
                            if (rpta_insert.serverStatus) {
                                console.log("[ IN - SERVER ] => [ " + user_receptor + " ] Se cerro la conv. por intervencion hum.");
                            }
                        } else {
                            //Actualiza fecha de ultima conversacion
                            let rpta_up = await db.actualizar_sesion_async(user_receptor, { etapa: 11, estado_conv: 3, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), estado_sesion: 'AR', comentario: rpta_busc.comentario + ';RMK:PEND;CMP:MANUAL_UP;BOT:OFF' });
                            if (rpta_up.changedRows >= 1) {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] Se cerro la conv. por intervencion hum.");
                            } else {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] NO SE ACTUALIZO.");

                            }
                        }
                    } else if (webhookEvent.message.text.match(/\D?(gracias)\D*/gm)) {
                        console.log('BOT ENCENDIDO - CONV. CERRADA - POR RMK.');
                        rpta_busc = await db.buscar_sesion_async({ id: user_receptor });

                        if (rpta_busc == undefined) {
                            let sesion = { id: user_receptor, etapa: 10, estado_conv: 2, fecha_sesion: null, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), dejo_numero: 0, estado_sesion: 'AR', nro_telfono: '', fanpage: fanpage_n, comentario: 'CMP:MANUAL_IN;BOT:ON' };
                            let rpta_insert = await db.registrar_sesion_async(sesion);
                            if (rpta_insert.serverStatus) {
                                console.log("[ IN - SERVER ] => [ " + user_receptor + " ] Se activo el bot desde etapa 10.");
                            }
                        } else {
                            //Actualiza fecha de ultima conversacion
                            let rpta_up = await db.actualizar_sesion_async(user_receptor, { etapa: 10, estado_conv: 2, fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), estado_sesion: 'AR', comentario: rpta_busc.comentario + ';BOT:ON' });
                            if (rpta_up.changedRows >= 1) {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] Se activo el bot desde etapa 10.");
                            } else {
                                console.log("[ UP - SERVER ] => [ " + user_receptor + " ] NO SE ACTUALIZO.");
                            }
                        }
                    }
                    /*else {
                                           console.log('[ MSJE - SERVER ] => OTRO MSJE ECHO ');
                                       }*/
                } else {
                    console.log('--------- PETICION MSJE [ ' + sender_psid + ' ] ---------');
                    // console.log('msje_enviado =>', webhookEvent.message.text);
                    handleMessageDinamico(sender_psid, page_id, webhookEvent.message);
                }
            } else if (webhookEvent.postback) {
                handlePostback(sender_psid, webhookEvent.postback);
            }
        });

        res.status(200).send('EVENTO RECIBIDO');
    } else {
        res.sendStatus(404);
    }
});

app.get('/webhook', (req, res) => {
    //console.log('GET: webhook');

    const VERIFY_TOKEN = 'ADNTokenAPI599';
    //const VERIFY_TOKEN = process.env.VERIFICATION_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK VERIFICADO');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(404);
        }
    } else {
        res.sendStatus(404);
    }
});

function handlePostback(sender_psid, received_postback) {
    // check if it is a location message
    console.log('handleMEssage message:', JSON.stringify(message));
}

async function handleMessageDinamico(sender_psid, page_id, received_message) {
    // administra los mensajes
    let muestras = `Hay varios tipos de ADN, muestras y costos:

**Hisopado Bucal
Frotar 2 hisopos estériles por la parte interna de las mejillas, encías, lengua por dos minutos. Colocarlos en un sobre de papel.
    
**Sangre
Recoger unas gotas de sangre (en hisopos, algodón, gasa) luego que se ha pinchado el dedo con una aguja. También puede ser sangre proveniente del sangrado nasal recogido en un papel.
    
**Cabello (Pelo)
Se deben tomar 10 CABELLOS COMO MÍNIMO (ARRANCADOS DE RAÍZ) y colocarlos dentro de en un sobre de papel. No hay necesidad de refrigerar.
    
**Cepillo de Dientes
Recoger un cepillo personal usado de 1 mes mínimo de uso y colocarlo en un sobre de papel.
    
**Goma de mascar “Chicle”
Masticar por 10 min un chicle, luego colocarlo en un sobre de papel.

**Uñas (Manos)
Cortar de preferencia las uñas de los 10 dedos de manos.

**Semen, uñas, colillas de cigarro, cera del oído, pañuelo con mucosidad, cordón umbilical. Otras Consultar al asesor`;

    let pprivada = `Se realiza de 02 maneras privadamente:

    ***👨‍👦Prueba de ADN Anónima:
    
    Esta Prueba NO requiere DNIs y NO requiere que estén presentes ambos padres. El resultado no cuenta con valor legal, pero tiene un valor informativo y científico para confirmar la paternidad entre 2 personas.
    *Las muestras pueden tomarse en el Laboratorio o llevarse el KIT DE ADN a su casa , para mejor comodidad y así guardar mucho más la reserva de la identidad.
    
    ***👨‍👩‍👧Prueba de ADN Legal:
    
    Esta prueba SI requiere documentos de identidad y que estén presentes ambos padres para identificar a las partes interesadas. Es necesaria la autorización del apoderado en caso se realice la Prueba a un menor de edad. 
    *El resultado puede ser usado como evidencia para iniciar un futuro proceso legal.
    
    A tener en cuenta:
    ** Se requiere una muestra del 🧑presunto padre y del 👶hijo.
    ** No se requiere estar en ayunas.
    ** La boca debe estar sin restos de 🍗comida.`;

    let pjudicial = `*** Prueba de Paternidad JUDICIAL 👩‍⚖️

    Este tipo de prueba se lleva a cabo en el Juzgado/Fiscalía, en audiencia y en presencia del Juez/Fiscal. Nuestro profesional colegiado tomará las muestras judiciales de ADN.
    Esta Prueba cumple con la Ley publicada por El Estado el 3 de Agosto de 2017 en el Diario Oficial El Peruano, Ley N° 30628: Ley que modifica el PROCESO DE FILIACIÓN JUDICIAL DE PATERNIDAD EXTRAMATRIMONIAL; donde se explica que la prueba es Gratuita para la parte Demandante, debiendo asumir el costo de la prueba la parte Demandada.
    
    Se requiere que se firme un Contrato entre el interesado y el Laboratorio para llevar a cabo la Prueba de ADN, en fecha y hora que será luego señalada por el Juez/Fiscal.
    
    A tener en cuenta:
    ** Se realiza a: 🧑PRESUNTO PADRE, 👶HIJO y/o 🙍‍♀️MADRE.
    ** No se requiere estar en ayunas.
    ** Muestra de sangre capilar por duplicado y contramuestra.
    (No hisopado bucal por el estado de emergencia).`;

    var m_remarketing = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "¡Síguenos en nuestras redes!",
                    "image_url": "https://www.pruebaadnpaternidad.com/wp-content/uploads/2021/05/img-adn-links-1200x630_mayo_21_v2.1.png",
                    "subtitle": "PARA COSTOS, más información, citas:",
                    "default_action": {
                        "type": "web_url",
                        "url": "https://www.pruebaadnpaternidad.com/",
                        "webview_height_ratio": "tall",
                    },
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.facebook.com/adnsolutionspe/",
                        "title": "👍 Danos un LIKE!"
                    }, {
                        "type": "phone_number",
                        "title": "📞 Llamar ahora",
                        "payload": "+51949748588"
                    }, {
                        "type": "web_url",
                        "url": "https://www.pruebaadnpaternidad.com/contactanos/",
                        "title": "🌐 Más telfs. y direcciones"
                    }]
                }]
            }
        }
    };

    let m_prenatal = `La prueba de ADN solo obtiene resultados 100% seguros con personas nacidas 🤱​, no hacemos la prenatal 🤰 porque además de ser costosa esta prueba tiene muchas limitaciones, a pesar que sea solo de sangre de la gestante en el test no invasivo. También es un riesgo para la salud del niño y de la madre misma en el test invasivo. Luego de tanto gasto siempre les recomiendan igual hacer una prueba de ADN con bebe nacido.`;

    let m_hay_costos = `Hay varios tipos de ADN🧬, muestras y costos, PARA LOS COSTOS, más información, citas de ADN llamar al 📞 973-817-332,  949-748-588.`;
    let m_para_costos = `PARA LOS COSTOS, más información, citas de ADN llamar al 📞 973-817-332,  949-748-588.`;
    let m_hay_direcc = `📌 PARA MÁS DIRECCIONES, LOS COSTOS, más información, citas de ADN llamar al 📞 973-817-332,  949-748-588.`;
    let m_o_dejenos = `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.`;

    let m_no_enviamos_costos = `No enviamos costos por mensaje estimado(a) 🙅‍♂️, son varios tipos de Test de ADN con requisitos distintos, aquí no manejamos costos`;
    let m_todos_esos_datos = `Todos esos datos con uno de los peritos por teléfono estimado cliente.`;
    let m_dir_molina = `🇵🇪 Estamos en Av. La Molina #805 Of. 10 - 3er Piso (Cerca a Paradero Constructores) - La Molina (LIMA). Sede central.`;
    let m_resultado = `Resultado en *15 días hábiles sin contar sábados, domingos, ni feriados*, una vez que las muestras llegaron a Lima 1-2 días luego de la toma de muestras. De tenerlo antes de la fecha nos comunicaremos con Ud.`;
    let m_estamos_atentos = `Estamos atentos a su caso 👍, que tenga un buen día.😁`;
    let response;
    let a_respuestas = [];

    var etapa_n = 0;
    var estado_conv_n = 1;
    var fecha_ult_conv_n = moment().format('YYYY-MM-DD HH:m:s');
    var dejo_numero_n = 0;
    var nro_telfono_n = '';
    var estado_sesion_n = 'A';
    var fanpage_n = 1;
    var comentario_n = '';
    var es_comando = false;

    var usuario_nombres = 'Sin nombre.';

    const regex = /\D?([9]{1}[0-9]{2}[0-9]{6}|[9]{1}[0-9]{2}\-[0-9]{3}\-[0-9]{3}|[9]{1}[0-9]{2} [0-9]{3} [0-9]{3})\D*/gm;
    const regex_telf = /([9]{1}[0-9]{2}[0-9]{6}|[9]{1}[0-9]{2}\-[0-9]{3}\-[0-9]{3}|[9]{1}[0-9]{2} [0-9]{3} [0-9]{3})/gm;
    // const estado_sesion_rm = 'ARK'; //para remarketing
    // const estado_sesion_rml = 'ARKL'; //remarketing listo
    const estado_sesion_rm = 'AR'; //para remarketing
    const estado_sesion_rml = 'ARL'; //remarketing listo
    let a_result;
    var sesion = null;

    //validar que fanpage es
    switch (page_id) {
        case ID_FANPAGE_1:
            fanpage_n = 1;
            break;
        case ID_FANPAGE_2:
            fanpage_n = 2;
            break;
        case ID_FANPAGE_3:
            fanpage_n = 3;
            break;
    }

    //integrar base de datos
    let rpta_busc = await db.buscar_sesion_async({ id: sender_psid });

    if (rpta_busc == undefined) {
        //Evalua si trae el nombre del usuario. Solo es la primera vez
        // let info_usu_rpta = await traer_informacion_usuario(sender_psid);

        // if (info_usu_rpta.first_name) {
        //     usuario_nombres = info_usu_rpta.first_name;
        //     if (info_usu_rpta.last_name) {
        //         usuario_nombres += ' ' + info_usu_rpta.last_name;
        //     }
        // }

        // comentario_n += 'NOMBRE_FB:' + usuario_nombres + ';CIUDAD:';
        comentario_n += 'CIUDAD:';

        sesion = { id: sender_psid, etapa: 0, estado_conv: 1, fecha_sesion: moment().format('YYYY-MM-DD HH:m:s'), fecha_ult_conv: moment().format('YYYY-MM-DD HH:m:s'), dejo_numero: 0, estado_sesion: 'A', nro_telfono: '', fanpage: fanpage_n, comentario: comentario_n };
        let rpta_insert = await db.registrar_sesion_async(sesion);
        if (rpta_insert.serverStatus) {
            console.log(rpta_insert);
        }
        estado_conv_n = 2;
        // console.log('--- SESION NO ENCONTRADA EN DB => ', sender_psid);
    } else {
        // console.log('+++ SESION ENCONTRADA EN DB => ', sender_psid);
        sesion = rpta_busc;
        estado_sesion_n = sesion.estado_sesion;
        estado_conv_n = sesion.estado_conv;
        nro_telfono_n = sesion.nro_telfono;
        dejo_numero_n = sesion.dejo_numero;
        comentario_n = sesion.comentario;
    }

    var sentence = "ok";
    if (received_message.text) {
        sentence = received_message.text.toLowerCase();
    } else {
        if (sesion.etapa == 0) {
            sentence = "hola";
        } else {
            //sesion.etapa = 10;
            estado_conv_n = 2;
            sentence = "ok";
        }
    }

    if (sesion.etapa == 0) {
        estado_conv_n = 2;
        ciudad = '.';
        estado_sesion_n = 'A';
        etapa_n = 1;
        a_respuestas.push({ 'text': `Hola` });
        //a_respuestas.push({ 'text': `` });
        // a_respuestas = [{ 'text': `ADN SOLUTIONS, Centro Especializado en Genética 👨‍⚕️, le ofrece Examen Genético Completo de Paternidad ADN 24STRplus 🧬, lo más avanzado a nivel mundial, para aclarar cualquier vínculo biológico. Resultados 100% SEGUROS E IRREFUTABLES. Sin recargo adicional.🤗` }, { 'text': `🇵🇪 Estamos en Av. La Molina #805 Of. 10 - 3er Piso (Cerca a Paradero Constructores) - La Molina (LIMA). Sede central.📌` }, { 'text': `También atendemos en otras ciudades.\n¿En qué ciudad esta Ud 🤔?` }];
        a_respuestas.push({ 'text': `ADN SOLUTIONS, Centro Especializado en Genética 👨‍⚕️, le ofrece Examen Genético Completo de Paternidad ADN 24STRplus 🧬, lo más avanzado a nivel mundial, para aclarar cualquier vínculo biológico. Resultados 100% SEGUROS E IRREFUTABLES. Sin recargo adicional.🤗` });
        a_respuestas.push({ 'text': `🇵🇪 Estamos en Av. La Molina #805 Of. 10 - 3er Piso (Cerca a Paradero Constructores) - La Molina (LIMA). Sede central.📌` });
        a_respuestas.push({ 'text': `También atendemos en otras ciudades.\n¿En qué ciudad esta Ud 🤔?` });
        //estado_conv_n = 2;
        //etapa_n = 2;
        if (sentence.match(/(prenatal|embaraz|gestacion|gestaci[o,ó]n|gestando|fetal|barriga|vientre)/gm)) {
            a_respuestas.push({ 'text': m_prenatal });
            estado_conv_n = 3;
            etapa_n = 11;
        } else if (sentence.match(/\D?(publicación|días|informac|consult|cuánto|precio|cuesta|como|hola|buenos)\D*/gm)) {
            //nada//
        } else if (sentence.match(/\D?(chiclayo|cix|ferreñafe|lambayeque|chep[e,é]n|motupe|olmos|illimo|San Jos[e,é]|oyot[u,ú]n|t[u,ú]cume|m[o,ó]rrope|jayanca|mochum[i,í]|[i,í]llimo|pacora|ciudad de Dios|salas|mocce|eten|monsefú|picsi|pimentel|pomalca|reque)\D*/gm)) {
            ciudad = " en CHICLAYO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(lima|san miguel|cañete|surco|sjl|molina|miraflores|comas|los olivos|carabayllo|el agustino|surquillo|breña|huacho|san isidro|lurigancho)\D*/gm)) {
            ciudad = " en LIMA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ja[e,é]n|hornos|siles|noalejo|pontones|huesas)\D*/gm)) {
            ciudad = " en JAÉN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(piura|catacaos|huancabamba|huarmaca|sullana|talara|sechura|ayabaca|pacaipampa|paita|chulucanas|tambo grande|tambogrande)\D*/gm)) {
            ciudad = " en PIURA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cajamarca|celend[i,í]n|san ignacio)\D*/gm)) {
            ciudad = " en CAJAMARCA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(arequipa)\D*/gm)) {
            ciudad = " en AREQUIPA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(andahuaylas)\D*/gm)) {
            ciudad = " en ANDAHUAYLAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(bagua)\D*/gm)) {
            ciudad = " en BAGUA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ayacucho|huamanga)\D*/gm)) {
            ciudad = " en AYACUCHO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cusco|cuzco)\D*/gm)) {
            ciudad = " en CUSCO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(huancavelica)\D*/gm)) {
            ciudad = " en HUANCAVELICA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(hu[a,á]nuco)\D*/gm)) {
            ciudad = " en HUÁNUCO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ica|parcona|pisco|chincha|na[z,c]ca)\D*/gm)) {
            ciudad = " en ICA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(huancayo|hyo)\D*/gm)) {
            ciudad = " en HUANCAYO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(jun[i,í]n|tarma|merced|chanchamayo)\D*/gm)) {
            ciudad = " en JUNÍN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(trujillo)\D*/gm)) {
            ciudad = " en TRUJILLO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(iquitos)\D*/gm)) {
            ciudad = " en IQUITOS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(yurimaguas)\D*/gm)) {
            ciudad = " en YURIMAGUAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(mdd|maldonado|tambopata)\D*/gm)) {
            ciudad = " en MADRE DE DIOS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(moquegua)\D*/gm)) {
            ciudad = " en MOQUEGUA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(puno|juliaca)\D*/gm)) {
            ciudad = " en PUNO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(moyobamba)\D*/gm)) {
            ciudad = " en MOYOBAMBA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tarapoto)\D*/gm)) {
            ciudad = " en TARAPOTO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tacna)\D*/gm)) {
            ciudad = " en TACNA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chachapoyas)\D*/gm)) {
            ciudad = " en CHACHAPOYAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ucayali|pucallpa|pucalpa)\D*/gm)) {
            ciudad = " en UCAYALI.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chimbote|chinbote)\D*/gm)) {
            ciudad = " en CHIMBOTE.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?([a,á]ncash|huaraz|huarmey|santa|nepeña)\D*/gm)) {
            ciudad = " en ÁNCASH.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tumbes)\D*/gm)) {
            ciudad = " en TUMBES.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chota)\D*/gm)) {
            ciudad = " en CHOTA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(san mart[i,í]n)\D*/gm)) {
            ciudad = " en SAN MARTÍN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cutervo)\D*/gm)) {
            ciudad = " en CUTERVO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ecuador|santo domingo|mexico|comayagua|chile|honduras|chone|cartagena|cartajena|venezuela|Neiva huila|bolivia)\D*/gm)) {
            a_respuestas.push({ 'text': `No podemos atenderle, por el momento solo atendemos en Perú 🇵🇪 ` });
            etapa_n = 11;
        } else if (sentence.includes("quito")) {
            a_respuestas.push({ 'text': `No podemos atenderle, por el momento solo atendemos en Perú 🇵🇪 ` });
            etapa_n = 11;
        } else if (sentence.match(/(gratis|grati)/gm)) {
            a_respuestas.push({ 'text': 'todas las muestras tienen costos diferentes' });
            a_respuestas.push({ 'text': 'más información, citas de ADN llamar al 📱 973-817-332,  949-748-588.' });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(a partir|que edad)/gm)) {
            a_respuestas.push({ 'text': 'la muestras, se pueden tomar desde el primer día de nacido' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(no nace|gestante|prenatal|pre natal)/gm)) {
            a_respuestas.push({ 'text': m_prenatal });
            a_respuestas.push({ 'text': m_hay_costos });
        } else if (sentence.match(/(no)/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/\D?(facilidades|pago)\D*/gm)) {
            a_respuestas.push({ 'text': `claro que hay facilidades estimado(a)` });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 11;
        } else if (sentence.match(/\D?(falsificar|cambiar)\D*/gm)) {
            a_respuestas.push({ 'text': `ADN SOLUTIONS , Centro Especializado en Genética 🧬, le ofrece Examen Genético Completo de Paternidad ADN` }, { 'text': `Nuestros examenes son 100% seguros y no hay cabida a un cambio de resultado bajo ningun motivo` });
        } else if (sentence.match(/\D?(whatsapp|whasapp|wsp)\D*/gm)) {
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': `Todos los numeros tienen Whatsapp puede escribirnos a cualquiera estos número` });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(privad|priva|normal|pribad|previad|previa|adn|particular|personal|an[o,ó]nimo|discreto|confidencial|pribado|preva|preba|vajo|bajo|callad|(que\D?\D*se\D?\D*enter))/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            etapa_n = 10;
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(judicial|juicio|demanda|denuncia|proceso judicial|Juducialmente|tramite)/gm)) {
            a_respuestas.push({ 'text': pjudicial });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse|domicilio|casa)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else {
            if (sentence.match(/(prenatal|embaraz|gestacion|gestaci[o,ó]n|gestando|fetal|barriga|vientre)/gm)) {
                a_respuestas.push({ 'text': m_prenatal });
                estado_conv_n = 3;
                etapa_n = 11;
            } else if (sentence.includes("!seguimiento") || sentence.includes("!seg")) {
                let d = await db.cantidad_sesiones_remarketing_async({ estado_sesion: estado_sesion_rm });
                let a_cmp = await db.listar_sesiones_para_completar_info_async({ etapa: 9, estado_sesion: 'A' });
                a_respuestas.push({ 'text': `- Hay ${d.length} para remarketing.\n- Hay ${a_cmp.length} conversaciones por completar.` });
                estado_conv_n = 3;
                etapa_n = 0;
            } else if (sentence.includes("!remarketing") || sentence.includes("!rmk")) {
                es_comando = true;
                let a_lista_rmk = await db.cantidad_sesiones_remarketing_async({ estado_sesion: estado_sesion_rm });
                let fp_id;

                if (a_lista_rmk.length > 0) {
                    a_respuestas.push({ 'text': 'Por favor, déjenos un Like en la fanpage\nhttps://www.facebook.com/adnsolutionspe' });
                    a_respuestas.push(m_remarketing);
                    let cont_ok = 0;
                    let cont_error = 0;
                    for (let index = 0; index < a_lista_rmk.length; index++) {
                        //console.log(a_lista_rmk[index]);
                        switch (a_lista_rmk[index].fanpage) {
                            case 1:
                                fp_id = ID_FANPAGE_1;
                                break;
                            case 2:
                                fp_id = ID_FANPAGE_2;
                                break;
                            case 2:
                                fp_id = ID_FANPAGE_3;
                                break;
                        }
                        console.log('<==== RMK INICIO ====>');
                        // for (let j = 0; j < a_respuestas.length; j++) {
                        //     await callSendAPIDinamico(a_lista_rmk[index].id, fp_id, a_respuestas[j]);
                        // }

                        // let k_mensaje = 0;
                        // let msjes_env_cmplts = false;
                        // do {
                        //     let rpta_msje = await callSendAPIDinamicoPromesa(a_lista_rmk[index].id, fp_id, a_respuestas[k_mensaje]);
                        //     if (rpta_msje.estado == 200) {
                        //         msjes_env_cmplts = true;
                        //         console.log('MSJE_OK - NRO_' + k_mensaje + ' => [' + a_lista_rmk[index].id + ' ]');
                        //         k_mensaje++;
                        //     } else {
                        //         msjes_env_cmplts = false;
                        //         console.log('MSJE_ERROR - NRO_' + k_mensaje + ' => [' + a_lista_rmk[index].id + ' ]');
                        //         console.log(rpta_msje);
                        //     }
                        // } while (k_mensaje < a_respuestas.length);

                        let k_mensaje = 0;
                        let msjes_env_cmplts = false;
                        let rpta_msje = await callSendAPIDinamicoPromesa(a_lista_rmk[index].id, fp_id, m_remarketing);
                        if (rpta_msje.estado == 200) {
                            msjes_env_cmplts = true;
                            console.log('MSJE_OK - NRO_' + k_mensaje + ' => [' + a_lista_rmk[index].id + ' ]');
                            k_mensaje++;
                        } else {
                            msjes_env_cmplts = false;
                            console.log('MSJE_ERROR - NRO_' + k_mensaje + ' => [' + a_lista_rmk[index].id + ' ]');
                            console.log(rpta_msje);
                        }

                        if (msjes_env_cmplts) {
                            let rpta_up_r = await db.actualizar_sesion_async(a_lista_rmk[index].id, { estado_sesion: estado_sesion_rml });

                            if (rpta_up_r.changedRows >= 1) {
                                console.log('+++ SI se actualizo sesion');
                                cont_ok++;
                            } else {
                                console.log('--- NO se actualizo sesion');
                                console.log(rpta_up_r);
                                cont_error++;
                            }
                        } else {
                            console.log('ERROR AL ENVIAR MENSAJES RMK');
                        }


                        // let rpta_up_r = await db.actualizar_sesion_async(a_lista_rmk[index].id, { estado_sesion: estado_sesion_rml });

                        // if (rpta_up_r.changedRows >= 1) {
                        //     console.log('se actualizo sesion');
                        //     cont_ok++;
                        // } else {
                        //     cont_error++;
                        //     console.log('No se actualizo sesion');
                        // }

                        console.log('<==== RMK FIN ====>');
                    }
                    await callSendAPIDinamico(sender_psid, page_id, { 'text': 'Conversaciones con remarketing:\nCompletada: ' + cont_ok + '\nErrores: ' + cont_error });
                } else {
                    await callSendAPIDinamico(sender_psid, page_id, { 'text': 'No hay conversaciones para remarketing.' });
                }
                estado_conv_n = 3;
                etapa_n = 0;
            } else if (sentence.includes("!completar") || sentence.includes("!cmp")) {
                es_comando = true;
                let a_lista_cmp = await db.listar_sesiones_para_completar_info_async({ etapa: 9, estado_sesion: 'A' });
                let fp2_id;
                let contador = 0;

                if (a_lista_cmp.length > 0) {
                    a_respuestas.push({ 'text': pprivada });
                    a_respuestas.push({ 'text': m_hay_costos });
                    a_respuestas.push({ 'text': m_o_dejenos });

                    for (let index = 0; index < a_lista_cmp.length; index++) {
                        switch (a_lista_cmp[index].fanpage) {
                            case 1:
                                fp2_id = ID_FANPAGE_1;
                                break;
                            case 2:
                                fp2_id = ID_FANPAGE_2;
                                break;
                            case 2:
                                fp2_id = ID_FANPAGE_3;
                                break;
                        }

                        console.log('<==== COMP INICIO ====>');
                        for (let j = 0; j < a_respuestas.length; j++) {
                            await callSendAPIDinamico(a_lista_cmp[index].id, fp2_id, a_respuestas[j]);
                        }
                        let rpta_up_r2 = await db.actualizar_sesion_async(a_lista_cmp[index].id, { etapa: 10, estado_conv: 2, estado_sesion: 'AR' });
                        if (rpta_up_r2.changedRows >= 1) {
                            console.log('se actualizo sesion');
                        } else {
                            console.log('No se actualizo sesion');
                        }

                        console.log('<==== COMP FIN ====>');
                        contador++;
                    }

                    await callSendAPIDinamico(sender_psid, page_id, { 'text': `Conversaciones completadas: ${contador}` });

                } else {
                    await callSendAPIDinamico(sender_psid, page_id, { 'text': 'No hay conversaciones por completar.' });
                }

            }
            /*else {
                           a_respuestas = [{ 'text': `ADN SOLUTIONS, Centro Especializado en Genética 👨‍⚕️, le ofrece Examen Genético Completo de Paternidad ADN 24STRplus 🧬, lo más avanzado a nivel mundial, para aclarar cualquier vínculo biológico. Resultados 100% SEGUROS E IRREFUTABLES. Sin recargo adicional.🤗` }, { 'text': `🇵🇪 Estamos en Av. La Molina #805 Of. 10 - 3er Piso (Cerca a Paradero Constructores) - La Molina (LIMA). Sede central.📌` }, { 'text': `También atendemos en otras ciudades.\n¿En qué ciudad esta Ud 🤔?` }]; //inicio
                           etapa_n = 1;
                       }*/
        }

        if (ciudad == '.') {
            comentario_n += '';
        } else {
            comentario_n += ciudad.trim() + ',';
        }
    } else if (sesion.etapa == 1) {
        etapa_n = 2;
        ciudad = '.';
        if (sentence.match(/\D?(ecuador|santo domingo|mexico|comayagua|chile|honduras|chone|cartagena|cartajena|venezuela|Neiva huila|bolivia)\D*/gm)) {
            a_respuestas.push({ 'text': `No podemos atenderle, por el momento solo atendemos en Perú 🇵🇪 ` });
            etapa_n = 11;
        } else if (sentence.match(/\D?(chiclayo|cix|ferreñafe|lambayeque|chep[e,é]n|motupe|olmos|illimo|San Jos[e,é]|oyot[u,ú]n|t[u,ú]cume|m[o,ó]rrope|jayanca|mochum[i,í]|[i,í]llimo|pacora|ciudad de Dios|salas|mocce|eten|monsefú|picsi|pimentel|pomalca|reque)\D*/gm)) {
            ciudad = " en CHICLAYO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(lima|san miguel|cañete|surco|sjl|molina|miraflores|comas|los olivos|carabayllo|el agustino|surquillo|breña|huacho|san isidro|lurigancho)\D*/gm)) {
            ciudad = " en LIMA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ja[e,é]n|hornos|siles|noalejo|pontones|huesas)\D*/gm)) {
            ciudad = " en JAÉN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(piura|catacaos|huancabamba|huarmaca|sullana|talara|sechura|ayabaca|pacaipampa|paita|chulucanas|tambo grande|tambogrande)\D*/gm)) {
            ciudad = " en PIURA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cajamarca|celend[i,í]n|san ignacio)\D*/gm)) {
            ciudad = " en CAJAMARCA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(arequipa|Mollendo|Chivay|Chuquibamba)\D*/gm)) {
            ciudad = " en AREQUIPA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(andahuaylas)\D*/gm)) {
            ciudad = " en ANDAHUAYLAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(bagua)\D*/gm)) {
            ciudad = " en BAGUA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ayacucho|huamanga)\D*/gm)) {
            ciudad = " en AYACUCHO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cusco|cuzco)\D*/gm)) {
            ciudad = " en CUSCO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(huancavelica)\D*/gm)) {
            ciudad = " en HUANCAVELICA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(hu[a,á]nuco)\D*/gm)) {
            ciudad = " en HUÁNUCO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ica|parcona|pisco|chincha|na[z,c]ca)\D*/gm)) {
            ciudad = " en ICA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(huancayo|hyo)\D*/gm)) {
            ciudad = " en HUANCAYO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(jun[i,í]n|tarma|merced|chanchamayo)\D*/gm)) {
            ciudad = " en JUNÍN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(trujillo)\D*/gm)) {
            ciudad = " en TRUJILLO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(iquitos)\D*/gm)) {
            ciudad = " en IQUITOS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(yurimaguas)\D*/gm)) {
            ciudad = " en YURIMAGUAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(mdd|maldonado|tambopata)\D*/gm)) {
            ciudad = " en MADRE DE DIOS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(moquegua)\D*/gm)) {
            ciudad = " en MOQUEGUA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(puno|juliaca)\D*/gm)) {
            ciudad = " en PUNO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(moyobamba|yobamba)\D*/gm)) {
            ciudad = " en MOYOBAMBA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tarapoto)\D*/gm)) {
            ciudad = " en TARAPOTO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tacna)\D*/gm)) {
            ciudad = " en TACNA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chachapoyas)\D*/gm)) {
            ciudad = " en CHACHAPOYAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ucayali|pucallpa|pucalpa)\D*/gm)) {
            ciudad = " en UCAYALI.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chimbote|chinbote)\D*/gm)) {
            ciudad = " en CHIMBOTE.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?([a,á]ncash|huaraz|huarmey|santa|nepeña)\D*/gm)) {
            ciudad = " en ÁNCASH.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tumbes)\D*/gm)) {
            ciudad = " en TUMBES.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chota)\D*/gm)) {
            ciudad = " en CHOTA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(san mart[i,í]n)\D*/gm)) {
            ciudad = " en SAN MARTÍN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cutervo)\D*/gm)) {
            ciudad = " en CUTERVO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/(a partir|que edad)/gm)) {
            a_respuestas.push({ 'text': 'la muestras, se pueden tomar desde el primer día de nacido' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(gratis|grati)/gm)) {
            a_respuestas.push({ 'text': 'todas las muestras tienen costos diferentes' });
            a_respuestas.push({ 'text': 'más información, citas de ADN llamar al  973-817-332,  949-748-588.' });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(no nace|gestante|prenatal|pre natal)/gm)) {
            a_respuestas.push({ 'text': m_prenatal });
            a_respuestas.push({ 'text': m_hay_costos });
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(no|NO|No|nO|n0|N0)/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/\D?(facilidades|pago)\D*/gm)) {
            a_respuestas.push({ 'text': `claro que hay facilidades estimado(a)` });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10; //hol
        } else if (sentence.match(/(resultado|dura|tiempo|demora|tarda|entrega|cu[a,á]nto\D*resultado)/gm)) {
            a_respuestas.push({ 'text': m_resultado });
            a_respuestas.push({ 'text': m_todos_esos_datos });
            etapa_n = 10;
        } else if (sentence.match(/\D?(falsificar|cambiar)\D*/gm)) {
            a_respuestas.push({ 'text': `ADN SOLUTIONS , Centro Especializado en Genética 👨‍⚕️, le ofrece Examen Genético Completo de Paternidad ADN` }, { 'text': `Nuestros examenes son 100% seguros y no hay cabida a un cambio de resultado bajo ningun motivo` });
        } else if (sentence.match(/\D?(whatsapp|whasapp|wsp)\D*/gm)) {
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': `Todos los numeros tienen Whatsapp puede escribirnos a cualquiera estos número` });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(privad|priva|normal|pribad|previad|previa|adn|particular|personal|an[o,ó]nimo|discreto|confidencial|pribado|preva|preba|vajo|bajo|callad|(que\D?\D*se\D?\D*enter))/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            etapa_n = 10;
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(judicial|juicio|demanda|denuncia|proceso judicial|Juducialmente|tramite)/gm)) {
            a_respuestas.push({ 'text': pjudicial });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10;
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse|domicilio|casa)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else {
            /*if (sentence.match(/(pre[c,s,z]io|[c,k]osto|co[s,z]to|cuesta|monto|coti[s,z]a|proforma|apr[o,ó]ximad|[v,b]ale)/gm)) {
                a_respuestas.push({ 'text': pprivada });
                a_respuestas.push({ 'text': m_hay_costos });
                a_respuestas.push({ 'text': m_o_dejenos });
                etapa_n = 10;
            } else */
            if (sentence.match(/(prenatal|embaraz|gestacion|gestando|gestaci[o,ó]n|fetal|barriga|vientre)/gm)) {
                a_respuestas.push({ 'text': m_prenatal });
                estado_conv_n = 3;
                etapa_n = 11;
            } else if (sentence.match(/(resultado|dura|tiempo|demora|tarda|entrega|cu[a,á]nto\D*resultado)/gm)) {
                a_respuestas.push({ 'text': m_resultado });
                a_respuestas.push({ 'text': m_todos_esos_datos });
                etapa_n = 10;
            } else if (sentence.match(/(muestra|muestras|cabello|pelo|pelito)/gm)) {
                a_respuestas.push({ 'text': muestras });
                a_respuestas.push({ 'text': m_para_costos });
                etapa_n = 10;
            } else if (sentence.includes("!salir")) {
                a_respuestas.push({ 'text': 'Conversación terminada.' });
                estado_sesion_n = 'ARK';
                etapa_n = 0;
            } else {
                a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
                a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });

                etapa_n = 2;
            }
        }

        // if (ciudad == '.') {
        comentario_n += '';
        // } else {
        comentario_n += ciudad.trim() + ',';
        // }
    } else if (sesion.etapa == 2) {
        etapa_n = 10;
        estado_sesion_n = 'AR';
        //estado_conv_n = 2;
        if (sentence.match(/(prenatal|embaraz|gestacion|gestaci[o,ó]n|gestando|fetal|barriga|vientre)/gm)) {
            a_respuestas.push({ 'text': m_prenatal });
            a_respuestas.push({ 'text': 'Hay que esperar que nazca para realizar un examen seguro.' });
            a_respuestas.push({ 'text': m_para_costos });
            estado_conv_n = 3;
            etapa_n = 11;
        } else if (sentence.match(/\D?(ecuador|santo domingo|mexico|comayagua|chile|honduras|chone|cartagena|cartajena|venezuela|Neiva huila)\D*/gm)) {
            a_respuestas.push({ 'text': `No podemos atenderle, por el momento solo atendemos en Perú 🇵🇪 ` });
            etapa_n = 11;
        } else if (sentence.match(/\D?(chiclayo|cix|ferreñafe|lambayeque|chep[e,é]n|motupe|olmos|illimo|San Jos[e,é]|oyot[u,ú]n|t[u,ú]cume|m[o,ó]rrope|jayanca|mochum[i,í]|[i,í]llimo|pacora|ciudad de Dios|salas|mocce|eten|monsefú|picsi|pimentel|pomalca|reque)\D*/gm)) {
            ciudad = " en CHICLAYO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(lima|san miguel|cañete|surco|sjl|molina|miraflores|comas|olivos|carabayllo|agustino|surquillo|breña|huacho|san isidro|lurigancho)\D*/gm)) {
            ciudad = " en LIMA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ja[e,é]n|hornos|siles|noalejo|pontones|huesas)\D*/gm)) {
            ciudad = " en JAÉN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(piura|catacaos|huancabamba|huarmaca|sullana|talara|sechura|ayabaca|pacaipampa|paita|chulucanas|tambo grande|tambogrande)\D*/gm)) {
            ciudad = " en PIURA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cajamarca|celend[i,í]n|san ignacio)\D*/gm)) {
            ciudad = " en CAJAMARCA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(arequipa|Mollendo|Chivay|Chuquibamba)\D*/gm)) {
            ciudad = " en AREQUIPA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(andahuaylas)\D*/gm)) {
            ciudad = " en ANDAHUAYLAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(bagua)\D*/gm)) {
            ciudad = " en BAGUA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ayacucho|huamanga)\D*/gm)) {
            ciudad = " en AYACUCHO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cusco|cuzco)\D*/gm)) {
            ciudad = " en CUSCO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(huancavelica)\D*/gm)) {
            ciudad = " en HUANCAVELICA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(hu[a,á]nuco)\D*/gm)) {
            ciudad = " en HUÁNUCO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ica|parcona|pisco|chincha|na[z,c]ca)\D*/gm)) {
            ciudad = " en ICA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(huancayo|hyo)\D*/gm)) {
            ciudad = " en HUANCAYO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(jun[i,í]n|tarma|merced|chanchamayo)\D*/gm)) {
            ciudad = " en JUNÍN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(trujillo)\D*/gm)) {
            ciudad = " en TRUJILLO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(iquitos)\D*/gm)) {
            ciudad = " en IQUITOS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(yurimaguas)\D*/gm)) {
            ciudad = " en YURIMAGUAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(mdd|maldonado|tambopata)\D*/gm)) {
            ciudad = " en MADRE DE DIOS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(moquegua)\D*/gm)) {
            ciudad = " en MOQUEGUA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(puno|juliaca)\D*/gm)) {
            ciudad = " en PUNO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(moyobamba|yobamba)\D*/gm)) {
            ciudad = " en MOYOBAMBA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tarapoto)\D*/gm)) {
            ciudad = " en TARAPOTO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tacna)\D*/gm)) {
            ciudad = " en TACNA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chachapoyas)\D*/gm)) {
            ciudad = " en CHACHAPOYAS.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(ucayali|pucallpa|pucalpa)\D*/gm)) {
            ciudad = " en UCAYALI.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chimbote|chinbote)\D*/gm)) {
            ciudad = " en CHIMBOTE.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?([a,á]ncash|huaraz|huarmey|santa|nepeña)\D*/gm)) {
            ciudad = " en ÁNCASH.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(tumbes)\D*/gm)) {
            ciudad = " en TUMBES.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(chota)\D*/gm)) {
            ciudad = " en CHOTA.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(san mart[i,í]n)\D*/gm)) {
            ciudad = " en SAN MARTÍN.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/\D?(cutervo)\D*/gm)) {
            ciudad = " en CUTERVO.";
            a_respuestas.push({ 'text': `Sí podemos atenderle también, con total discreción, garantía y confiabilidad${ciudad}` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        } else if (sentence.match(/(a partir|que edad)/gm)) {
            a_respuestas.push({ 'text': 'la muestras, se pueden tomar desde el primer día de nacido' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(gratis|grati)/gm)) {
            a_respuestas.push({ 'text': 'todas las muestras tienen costos diferentes' });
            a_respuestas.push({ 'text': 'más información, citas de ADN llamar al  973-817-332,  949-748-588.' });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse|domicilio|casa)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita ' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/\D?(falsificar|cambiar)\D*/gm)) {
            a_respuestas.push({ 'text': `ADN SOLUTIONS , Centro Especializado en Genética 🧬, le ofrece Examen Genético Completo de Paternidad ADN` }, { 'text': `Nuestros examenes son 100% seguros y no hay cabida a un cambio de resultado bajo ningun motivo` });
        } else if (sentence.match(/(resultado|dura|tiempo|demora|tarda|entrega|cu[a,á]nto\D*resultado)/gm)) {
            a_respuestas.push({ 'text': m_resultado });
            a_respuestas.push({ 'text': m_para_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(muestra|muestras|cabello|pelo|pelito)/gm)) {
            a_respuestas.push({ 'text': muestras });
            a_respuestas.push({ 'text': m_para_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(hola|https|buenos|buenos)/gm)) {
            a_respuestas = [{ 'text': `ADN SOLUTIONS, Centro Especializado en Genética 👨‍⚕️, le ofrece Examen Genético Completo de Paternidad ADN 24STRplus 🧬, lo más avanzado a nivel mundial, para aclarar cualquier vínculo biológico. Resultados 100% SEGUROS E IRREFUTABLES. Sin recargo adicional.🤗` }, { 'text': `🇵🇪 Estamos en Av. La Molina #805 Of. 10 - 3er Piso (Cerca a Paradero Constructores) - La Molina (LIMA). Sede central.📌` }, { 'text': `También atendemos en otras ciudades.\n¿En qué ciudad esta Ud 🤔?` }];
        } else if (sentence.match(/(direcci[o,ó]n|ubicad[o,a]|d[o,ó]nde|est[a,á]n|encuentran|encuentr[a,o]|ubic[a,o])/gm)) {
            a_respuestas.push({ 'text': m_dir_molina + `\nTambién atendemos en otras ciudades.` });
            a_respuestas.push({ 'text': m_hay_direcc });
        } else if (sentence.match(/\D?(adn|solo|cu[a,á]nto|costo)\D*/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': `Hay varios tipos de ADN🧬, muestras y costos, PARA LOS COSTOS, más información, citas de ADN llamar al  📞 973-817-332,  949-748-588.` });
            a_respuestas.push({ 'text': `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.` });
        } else if (sentence.match(/(pre[c,s,z]io|[c,k]osto|co[s,z]to|cuesta|monto|coti[s,z]a|proforma|apr[o,ó]ximad|[v,b]ale)/gm)) {
            if (sentence.match(regex)) {
                a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
                a_result = regex_telf.exec(sentence);
                nro_telfono_n = a_result[0];
                estado_sesion_n = 'AR';
                dejo_numero_n = 1;
            } else {
                a_respuestas.push({ 'text': pprivada });
                a_respuestas.push({ 'text': m_hay_costos });
                a_respuestas.push({ 'text': m_o_dejenos });
                estado_sesion_n = 'AR';
            }
        } else if (sentence.match(/\D?(facilidades|pago)\D*/gm)) {
            a_respuestas.push({ 'text': `claro que hay facilidades estimado(a)` });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 11;
        } else if (sentence.match(/(no|NO|No|nO|n0)/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(/(privad|priva|normal|pribad|previad|previa|adn|particular|personal|an[o,ó]nimo|discreto|confidencial|pribado|preva|preba|vajo|bajo|callad|(que\D?\D*se\D?\D*enter))/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            etapa_n = 10;
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(judicial|juicio|demanda|denuncia|proceso judicial|Juducialmente|tramite)/gm)) {
            a_respuestas.push({ 'text': pjudicial });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10;
        } else if (sentence.match(/(ok|gracias|muchas gracias|llamar[e,é]|llamando|comunicando|llamo)/gm)) {
            a_respuestas.push({ 'text': `Estamos atentos a su caso, que tenga un buen día.` });
        } else if (sentence.match(regex)) {
            if (!sentence.match(/(pre[c,s,z]io|[c,k]osto|co[s,z]to|cuesta|monto|coti[s,z]a|proforma|apr[o,ó]ximad|[v,b]ale)/gm)) {
                a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
                a_result = regex_telf.exec(sentence); //busca el numero
                nro_telfono_n = a_result[0];
                estado_sesion_n = 'AR';
                dejo_numero_n = 1;
            }
        } else if (sentence.match(/\D?(adn|solo|cu[a,á]nto|costo)\D*/gm)) {
            a_respuestas.push({ 'text': m_no_enviamos_costos });
            a_respuestas.push({ 'text': `Hay varios tipos de ADN🧬, muestras y costos, PARA LOS COSTOS, más información, citas de ADN llamar al  📞 973-817-332,  949-748-588.` });
            a_respuestas.push({ 'text': `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.` });
        } else if (sentence.match(/\D?(whatsapp|whasapp|wsp)\D*/gm)) {
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': `Todos los numeros tienen Whatsapp puede escribirnos a cualquiera estos número` });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
        } else if (sentence.match(/(privad|normal|priva|pribad|previad|previa|adn|particular|personal|an[o,ó]nimo|discreto|confidencial|pribado|preva|preba|vajo|bajo|callad|(que\D?\D*se\D?\D*enter))/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10;
        } else if (sentence.match(/(judicial|juicio|demanda|denuncia|proceso judicial|Juducialmente|tramite)/gm)) {
            a_respuestas.push({ 'text': pjudicial });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10;
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse|domicilio|casa)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.includes("!salir")) {
            a_respuestas.push({ 'text': 'Conversación terminada.' });
            estado_sesion_n = 'ARK';
            etapa_n = 0;
        } else {
            a_respuestas.push({ 'text': `Disculpa no te entendi` });
            a_respuestas.push({ 'text': `¿Busca hacer el ADN privadamente 👨‍👦​ o está en algún trámite judicial 🧑‍⚖️?` });
        }
    } else if (sesion.etapa == 3) {
        etapa_n = 3;
        if (sentence.match(/(pre[c,s,z]io|[c,k]osto|co[s,z]to|cuesta|monto|coti[s,z]a|proforma|apr[o,ó]ximad|[v,b]ale)/gm)) {
            if (sentence.match(regex)) {
                a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
                a_result = regex_telf.exec(sentence); //busca el numero
                nro_telfono_n = a_result[0]; //captura el numero
                estado_sesion_n = 'AR';
                dejo_numero_n = 1;
                etapa_n = 10;
            } else {
                a_respuestas.push({ 'text': m_no_enviamos_costos });
                a_respuestas.push({ 'text': m_todos_esos_datos });
                estado_conv_n = 3;
                etapa_n = 11;
            }
        } else if (sentence.match(/(prenatal|embaraz|gestacion|gestaci[o,ó]n|gestando|fetal|barriga|vientre)/gm)) {
            a_respuestas.push({ 'text': m_prenatal });
            estado_conv_n = 3;
            etapa_n = 11;
        } else if (sentence.match(/(resultado|dura|tiempo|demora|tarda|entrega|cu[a,á]nto\D*resultado)/gm)) {
            a_respuestas.push({ 'text': m_resultado });
            a_respuestas.push({ 'text': `¿Tiene otra consulta?.` });
            etapa_n = 2;
        } else if (sentence.match(/(muestra|muestras|cabello|pelo|pelito)/gm)) {
            a_respuestas.push({ 'text': muestras });
            a_respuestas.push({ 'text': m_para_costos });
            etapa_n = 10;
        } else if (sentence.match(/(direcci[o,ó]n|ubicad[o,a]|d[o,ó]nde|est[a,á]n|encuentran|encuentr[a,o]|ubic[a,o])/gm)) {
            a_respuestas.push({ 'text': m_dir_molina });
            a_respuestas.push({ 'text': m_hay_direcc });
            etapa_n = 10;
        } else if (sentence.match(/(ok|gracias|muchas gracias|llamar[e,é]|llamando|comunicando|llamo)/gm)) {
            a_respuestas.push({ 'text': `Estamos atentos a su caso.` });
            etapa_n = 10;
        } else if (sentence.match(regex)) {
            a_respuestas.push({ 'text': 'Listo. Le llamaremos.' });
            a_result = regex_telf.exec(sentence); //busca el numero
            nro_telfono_n = a_result[0]; //captura el numero
            estado_sesion_n = 'AR';
            dejo_numero_n = 1;
            etapa_n = 10;
        } else if (sentence.includes("!salir")) {
            a_respuestas.push({ 'text': 'Conversación terminada.' });
            estado_sesion_n = 'ARK';
            etapa_n = 0;
        } else if (sentence.match(/\D?(adn|solo|cu[a,á]nto|costo)\D*/gm)) {
            a_respuestas.push({ 'text': m_no_enviamos_costos });
            a_respuestas.push({ 'text': `Hay varios tipos de ADN🧬, muestras y costos, PARA LOS COSTOS, más información, citas de ADN llamar al  📞 973-817-332,  949-748-588.` });
            a_respuestas.push({ 'text': `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.` });
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse|domicilio|casa)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else {
            etapa_n = 2;
        }
    } else if (sesion.etapa == 4 || sesion.etapa == 5 || sesion.etapa == 6) {
        //Para insistentes
        if (sentence.match(/(pre[c,s,z]io|[c,k]osto|co[s,z]to|cuesta|monto|coti[s,z]a|proforma|apr[o,ó]ximad|[v,b]ale)/gm)) {
            etapa_n = 10;
            if (sentence.match(regex)) {
                a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
                a_result = regex_telf.exec(sentence); //busca el numero
                nro_telfono_n = a_result[0]; //captura el numero
                estado_sesion_n = 'AR';
                dejo_numero_n = 1;
            } else {
                a_respuestas.push({ 'text': m_no_enviamos_costos });
                a_respuestas.push({ 'text': m_todos_esos_datos });
            }
        } else {
            etapa_n = 10;
            if (sentence.match(/(prenatal|embaraz|gestacion|gestaci[o,ó]n|gestando|fetal|barriga|vientre)/gm)) {
                estado_conv_n = 3;
                etapa_n = 11;
                a_respuestas.push({ 'text': m_prenatal });
            } else if (sentence.match(/(resultado|dura|tiempo|demora|tarda|entrega|cu[a,á]nto\D*resultado)/gm)) {
                estado_conv_n = 3;
                etapa_n = 11;
                a_respuestas.push({ 'text': m_resultado });
                a_respuestas.push({ 'text': `¿Tiene otra consulta?.` });
            } else if (sentence.match(/(muestra|muestras|cabello|pelo|pelito)/gm)) {
                a_respuestas.push({ 'text': muestras });
                a_respuestas.push({ 'text': m_para_costos });
            } else if (sentence.match(/(direcci[o,ó]n|ubicad[o,a]|d[o,ó]nde|est[a,á]n|encuentran|encuentr[a,o]|ubic[a,o])/gm)) {
                a_respuestas.push({ 'text': m_dir_molina + `\nTambién atendemos en otras ciudades.` });
                a_respuestas.push({ 'text': m_hay_direcc });
            } else if (sentence.match(/(ok|gracias|muchas gracias|llamar[e,é]|llamando|comunicando|llamo)/gm)) {
                a_respuestas.push({ 'text': `Estamos atentos a su caso, que tenga un buen día.` });
            } else if (sentence.includes("!salir")) {
                a_respuestas.push({ 'text': 'Conversación terminada.' });
                estado_sesion_n = 'ARK';
                etapa_n = 0;
            } else if (sentence.match(/\D?(adn|solo|cu[a,á]nto|costo)\D*/gm)) {
                a_respuestas.push({ 'text': m_no_enviamos_costos });
                a_respuestas.push({ 'text': `Hay varios tipos de ADN 🧬, muestras y costos, PARA LOS COSTOS, más información, citas de ADN llamar al  📞 973-817-332,  949-748-588.` });
                a_respuestas.push({ 'text': `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.` });
            } else {
                etapa_n = 10;
                estado_sesion_n = 'AR';
                if (sentence.match(regex)) {
                    a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
                    a_result = regex_telf.exec(sentence); //busca el numero
                    nro_telfono_n = a_result[0]; //captura el numero
                    dejo_numero_n = 1;
                } else {
                    a_respuestas.push({ 'text': m_para_costos });
                    a_respuestas.push({ 'text': m_estamos_atentos });
                    estado_conv_n = 3;
                }
            }
        }
    } else if (sesion.etapa == 10 || sesion.etapa == 11) {
        etapa_n = 10;
        estado_sesion_n = 'AR';
        if (sentence.includes("!salir")) {
            a_respuestas.push({ 'text': 'Conversación terminada.' });
            estado_sesion_n = 'ARK';
            etapa_n = 0;
        } else if (sentence.match(/(no)/gm)) {
            if (sesion.estado_conv == 2) {
                a_respuestas.push({ 'text': `déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso. ` });
                estado_conv_n = 3;
            }
            etapa_n = 10;
        } else if (sentence.match(/(ok|gracias|muchas gracias|llamar[e,é]|llamando|comunicando|llam[a,e,é,o])/gm)) {
            if (sesion.estado_conv == 2) {
                a_respuestas.push({ 'text': `Estamos atentos a su caso para darle más detalles. ` });
                estado_conv_n = 3; //cierras conversacion
            }
            etapa_n = 10;
        } else if (sentence.match(/(whatsapp|whasapp|whasap|wasap|wsp|watsap|wasap|wasapp|wasa)/gm)) {
            a_respuestas.push({ 'text': `Todos los numeros tienen Whatsapp puede escribirnos a cualquiera estos número` });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            etapa_n = 10;
        } else if (sentence.match(/(pre[c,s,z]io|[c,k]osto|co[s,z]to|cuesta|monto|coti[s,z]a|proforma|apr[o,ó]ximad|[v,b]ale)/gm)) {
            etapa_n = 10;
            if (sentence.match(regex)) {
                a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
                a_result = regex_telf.exec(sentence); //busca el numero
                nro_telfono_n = a_result[0]; //captura el numero
                estado_sesion_n = 'AR';
                dejo_numero_n = 1;
            } else {
                a_respuestas.push({ 'text': m_no_enviamos_costos });
                a_respuestas.push({ 'text': m_todos_esos_datos });
                estado_conv_n = 3;
                etapa_n = 11;
            }
        } else if (sentence.match(/(privad|priva|normal|pribad|previad|previa|particular|personal|an[o,ó]nimo|discreto|confidencial|pribado|preva|preba|vajo|bajo|callad|(que\D?\D*se\D?\D*enter))/gm)) {
            a_respuestas.push({ 'text': pprivada });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10;
        } else if (sentence.match(/(judicial|juicio|demanda|denuncia|proceso judicial|Juducialmente|tramite)/gm)) {
            a_respuestas.push({ 'text': pjudicial });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
            estado_sesion_n = 'AR';
            etapa_n = 10;
        } else if (sentence.match(/\D?(adn|solo|cuanto|costo)\D*/gm)) {
            a_respuestas.push({ 'text': m_no_enviamos_costos });
            a_respuestas.push({ 'text': `Hay varios tipos de ADN 🧬, muestras y costos, PARA LOS COSTOS, más información, citas de ADN llamar al  📞 973-817-332,  949-748-588.` });
            a_respuestas.push({ 'text': `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.` });
        } else if (sentence.match(/(prenatal|embaraz|gestacion|gestaci[o,ó]n|gestando|fetal|barriga|vientre)/gm)) {
            a_respuestas.push({ 'text': m_prenatal });
            a_respuestas.push({ 'text': 'Hay que esperar que nazca para realizar un examen seguro.' });
            a_respuestas.push({ 'text': m_para_costos });
            estado_conv_n = 3;
            etapa_n = 11;
        } else if (sentence.match(/(resultado|dura|tiempo|demora|tarda|entrega|cu[a,á]nto\D*resultado)/gm)) {
            a_respuestas.push({ 'text': m_resultado });
            a_respuestas.push({ 'text': m_todos_esos_datos });
            estado_conv_n = 3;
            etapa_n = 11;
        } else if (sentence.match(/(muestra|muestras|cabello|pelo|pelito)/gm)) {
            a_respuestas.push({ 'text': muestras });
            a_respuestas.push({ 'text': m_para_costos });
        } else if (sentence.match(/(direcci[o,ó]n|ubicad[o,a]|d[o,ó]nde|est[a,á]n|encuentran|encuentr[a,o]|ubic[a,o])/gm)) {
            a_respuestas.push({ 'text': m_dir_molina + `\nTambién atendemos en otras ciudades.` });
            a_respuestas.push({ 'text': m_hay_direcc });
        } else if (sentence.match(/(tel[e,é]fono|n[u,ú]mero|contacto)/gm)) {
            a_respuestas.push({ 'text': m_para_costos });
            a_respuestas.push({ 'text': `o déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.` });
            estado_conv_n = 3;
        } else if (sentence.match(/(venir|a direcci[o,ó]n|acercarse|domicilio|casa)/gm)) {
            a_respuestas.push({ 'text': 'Sí podemos atenderle también, habría que separar cita' });
            a_respuestas.push({ 'text': m_hay_costos });
            a_respuestas.push({ 'text': m_o_dejenos });
        } else if (sentence.match(regex)) {
            a_respuestas.push({ 'text': 'Perfecto. Le llamaremos.' });
            a_result = regex_telf.exec(sentence); //busca el numero
            nro_telfono_n = a_result[0]; //captura el numero
            dejo_numero_n = 1;
            etapa_n = 10;
        } else {
            //Etapa para cuando llamaron
            let modo_debug_e10 = false;
            let f_u_conv = moment(sesion.fecha_ult_conv);
            let f_actual = moment();
            let hrs_diff = f_actual.diff(f_u_conv, 'hours');

            if (sesion.dejo_numero) {
                if (sesion.etapa == 10) {
                    if (hrs_diff >= 1 && hrs_diff <= 3) {
                        //Si paso una hora
                        a_respuestas.push({ 'text': 'Hola, ¿le llamaron?' });
                        etapa_n = 11;
                    }
                } else if (sesion.etapa == 11) {
                    if (hrs_diff >= 4 && hrs_diff <= 8) {
                        a_respuestas.push({ 'text': '¿Le dieron la información necesaria estimado?' });
                        estado_conv_n = 2;
                        etapa_n = 2;
                    }
                }
            } else {
                if (hrs_diff >= hrs_dif_reinicio_flux) {
                    a_respuestas = [{ 'text': `ADN SOLUTIONS, Centro Especializado en Genética 👨‍⚕️, le ofrece Examen Genético Completo de Paternidad ADN 24STRplus 🧬, lo más avanzado a nivel mundial, para aclarar cualquier vínculo biológico. Resultados 100% SEGUROS E IRREFUTABLES. Sin recargo adicional.🤗` }, { 'text': `🇵🇪 Estamos en Av. La Molina #805 Of. 10 - 3er Piso (Cerca a Paradero Constructores) - La Molina (LIMA). Sede central.📌` }, { 'text': `También atendemos en otras ciudades.\n¿En qué ciudad esta Ud 🤔?` }];
                    estado_sesion_n = 'A';
                    estado_conv_n = 2;
                    etapa_n = 1;
                } else {
                    if (sesion.estado_conv == 2) {
                        if (hrs_diff > 1) {
                            a_respuestas = [{ 'text': 'Sí podemos atenderle también.' }, { 'text': 'Todos esos datos con uno de los peritos por teléfono estimado cliente, para que le asesore en detalle según sea su caso.' }];
                            estado_conv_n = 3; //cierras conversacion
                        }
                        etapa_n = 10;
                    }
                }
                if (modo_debug_e10) {
                    a_respuestas.push({ 'text': `Etapa sesion => ${sesion.etapa}\nEtapa sgte => ${etapa_n}\nFecha sesion => ${sesion.fecha_sesion}\nFecha ultima platica => ${sesion.fecha_ult_conv}` });
                    a_respuestas.push({ 'text': 'Diferencia en horas ' + hrs_diff });
                }
            }
        }
    }

    if (modo_debug) {
        a_respuestas.push({ 'text': `Etapa sesion => ${sesion.etapa}\nEtapa sgte =>${etapa_n}\nEstado conv => ${sesion.estado_conv}\nDejo telf. => ${sesion.dejo_numero}\nF. sesion => ${sesion.fecha_sesion}\nF. ult. conv => ${sesion.fecha_ult_conv}` });
    }

    if (es_comando == false) {
        for (let index = 0; index < a_respuestas.length; index++) {
            //callSendAPI(sender_psid, a_respuestas[index]);
            await callSendAPIDinamico(sender_psid, page_id, a_respuestas[index]);
        }

        //Actualiza fecha de ultima conversacion
        let rpta_up = await db.actualizar_sesion_async(sender_psid, { etapa: etapa_n, estado_conv: estado_conv_n, fecha_sesion: fecha_ult_conv_n, fecha_ult_conv: fecha_ult_conv_n, dejo_numero: dejo_numero_n, estado_sesion: estado_sesion_n, nro_telfono: nro_telfono_n, comentario: comentario_n });
        if (rpta_up.changedRows >= 1) {
            console.log('[ MSJE-SERVER ] Se respondio y se actualizo sesion');
        } else {
            console.log('[ MSJE-SERVER ] No se actualizo sesion.');
        }
        a_respuestas = [];
    }
}

function callSendAPIDinamico(sender_psid, page_id, response) {

    var token = PAGE_ACCESS_TOKEN;

    switch (page_id) {
        case ID_FANPAGE_1:
            token = PAGE_ACCESS_TOKEN_1;
            break;
        case ID_FANPAGE_2:
            token = PAGE_ACCESS_TOKEN_2;
            break;
        case ID_FANPAGE_3:
            token = PAGE_ACCESS_TOKEN_3;
            break;
    }

    // if (page_id === ID_FANPAGE_1) {
    //     console.log('=====> MSJE PAG 1- [ ' + ID_FANPAGE_1 + ' ]');
    // } else if (page_id === ID_FANPAGE_2) {
    //     console.log('=====> MSJE PAG 2 - [ ' + ID_FANPAGE_2 + ' ]');
    // } else if (page_id === ID_FANPAGE_3) {
    //     console.log('=====> MSJE PAG 3 - [ ' + ID_FANPAGE_3 + ' ]');
    // } else {
    //     console.log('=====> NO HAY PAGINA');
    // }

    return new Promise((resolve, reject) => {
        let requestBody = {
            'recipient': {
                'id': sender_psid
            },
            'message': response
        };

        request({
            'uri': 'https://graph.facebook.com/v13.0/me/messages',
            'qs': { 'access_token': token },
            'method': 'POST',
            'json': requestBody
        }, (err, res, body) => {
            if (!err) {
                resolve(res);
            } else {
                reject(err);
            }
        });

    });
}

function callSendAPIDinamicoPromesa(sender_psid, page_id, response) {

    var token = PAGE_ACCESS_TOKEN;

    switch (page_id) {
        case ID_FANPAGE_1:
            token = PAGE_ACCESS_TOKEN_1;
            break;
        case ID_FANPAGE_2:
            token = PAGE_ACCESS_TOKEN_2;
            break;
        case ID_FANPAGE_3:
            token = PAGE_ACCESS_TOKEN_3;
            break;
    }

    return new Promise((resolve, reject) => {
        let requestBody = {
            'recipient': {
                'id': sender_psid
            },
            'message': response
        };

        request({
            'uri': 'https://graph.facebook.com/v13.0/me/messages',
            'qs': { 'access_token': token },
            'method': 'POST',
            'json': requestBody
        }, (err, res, body) => {
            if (!err) {
                // resolve(res);
                resolve({ 'estado': 200, 'msje': 'ok', 'data': '>> Enviado msje a ' + sender_psid });
            } else {
                //reject(err);
                reject({ 'estado': 500, 'msje': 'ERROR_PROMESA [ ' + sender_psid + ' ]', 'data': err });
            }
        });

    });
}

async function traer_informacion_usuario(sender_psid) {
    try {
        let peticion = await new Promise((resolve, reject) => {
            request({
                url: "https://graph.facebook.com/v2.6/" + sender_psid + "?",
                qs: {
                    access_token: PAGE_ACCESS_TOKEN_1
                },
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8',
                    'User-Agent': 'bot'
                },
                method: "GET",
                json: true,
                time: true
            }, (err, res, body) => {
                if (!err) {
                    console.log(res.body);
                    resolve(res.body);
                    //resolve({ 'estado': 200 });
                } else {
                    reject({ 'estado': 500 });
                    //reject(err);
                }
            });

        });
        return await peticion;
    } catch (error) {
        console.log('ERROR ', error);
    }
}
//Ejecuta RMK cada 4 horas
schedule.scheduleJob('0 */2 * * *', async function() {
    var h_actual = moment().format('H');
    var hf_i = moment().format('YYYY-MM-DD');
    var hf_f = moment().format('YYYY-MM-DD');
    let a_respuestas = [];

    let a_hora_programacion = [
        { 'rango': 0, 'h_i': 0, 'h_f': 2 },
        { 'rango': 1, 'h_i': 0, 'h_f': 5 },
        { 'rango': 2, 'h_i': 0, 'h_f': 8 },
        { 'rango': 3, 'h_i': 0, 'h_f': 11 },
        { 'rango': 4, 'h_i': 0, 'h_f': 14 },
        { 'rango': 5, 'h_i': 0, 'h_f': 17 },
        { 'rango': 6, 'h_i': 0, 'h_f': 20 },
        { 'rango': 7, 'h_i': 0, 'h_f': 23 }
    ];

    for (let index = 0; index < a_hora_programacion.length; index++) {
        if (parseInt(h_actual) <= a_hora_programacion[index].h_f) {
            hf_i += " " + a_hora_programacion[index].h_i + ":00:00";
            hf_f += " " + a_hora_programacion[index].h_f + ":59:59";
            break;
        }
    }

    let rpta_lista_cmp = await db.buscar_sesiones_completar_async({ 'e_i': 10, 'e_f': 11, 'h_i': hf_i, 'h_f': hf_f, 'estado': 'AR' });
    console.log("[" + moment().format('YYYY-MM-DD H:mm:ss') + "]" + '[ RMK-MSJE-SERVER-SCHEDULE] => ' + "RANGO: " + hf_i + " ENTRE " + hf_f + "; CANT: " + rpta_lista_cmp.length);
    // await callSendAPIDinamico('4868380439948171', ID_FANPAGE_1, { 'text': 'Pasaron 1 min\nCantidad: ' + rpta_lista_cmp.length });

    let m_remarketing = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "¡Síguenos en nuestras redes!",
                    "image_url": "https://www.pruebaadnpaternidad.com/wp-content/uploads/2021/05/img-adn-links-1200x630_mayo_21_v2.1.png",
                    "subtitle": "PARA COSTOS, más información, citas:",
                    "default_action": {
                        "type": "web_url",
                        "url": "https://www.pruebaadnpaternidad.com/",
                        "webview_height_ratio": "tall",
                    },
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.facebook.com/adnsolutionspe/",
                        "title": "👍 Danos un LIKE!"
                    }, {
                        "type": "phone_number",
                        "title": "📞 Llamar ahora",
                        "payload": "+51949748588"
                    }, {
                        "type": "web_url",
                        "url": "https://www.pruebaadnpaternidad.com/contactanos/",
                        "title": "🌐 Más telfs. y direcciones"
                    }]
                }]
            }
        }
    };

    if (rpta_lista_cmp.length > 0) {
        a_respuestas.push({ 'text': 'Por favor, déjenos un Like en la fanpage\nhttps://www.facebook.com/adnsolutionspe' });
        a_respuestas.push(m_remarketing);
        for (let index = 0; index < rpta_lista_cmp.length; index++) {
            switch (rpta_lista_cmp[index].fanpage) {
                case 1:
                    fp_id = ID_FANPAGE_1;
                    break;
                case 2:
                    fp_id = ID_FANPAGE_2;
                    break;
                case 3:
                    fp_id = ID_FANPAGE_3;
                    break;
            }

            for (let j = 0; j < a_respuestas.length; j++) {
                await callSendAPIDinamico(rpta_lista_cmp[index].id, fp_id, a_respuestas[j]);
            }

            let rpta_up_r = await db.actualizar_sesion_async(rpta_lista_cmp[index].id, { estado_sesion: 'ARL', fecha_ult_conv: moment().format('YYYY-MM-DD H:mm:ss') });
            if (rpta_up_r.changedRows >= 1) {
                console.log('[ RMK-MSJE-SERVER-SCHEDULE-UP-SESION--OK ] => Se actualizo sesion [ ' + rpta_lista_cmp[index].id + ' ]');
            } else {
                console.log('[ RMK-MSJE-SERVER-SCHEDULE-UP-SESION--ERROR ] => No se actualizo sesion [ ' + rpta_lista_cmp[index].id + ' ]');
            }
        }
    }

    await callSendAPIDinamico('2813600595357798', ID_FANPAGE_1, { 'text': 'RMK-OK cada 2 horas.\nHora: ' + moment().format('YYYY-MM-DD H:mm:ss') + '\nCantidad: ' + rpta_lista_cmp.length });
});

//Ejecuta cada minuto para completar el flujo
// schedule.scheduleJob('*/1 * * * *', async function() {
//     await callSendAPIDinamico('4868380439948171', ID_FANPAGE_1, { 'text': 'Pasaron 1 min' });
// });

//Ejecuta el CMP cada 3 horas
schedule.scheduleJob('0 */1 * * *', async function() {

    let pprivada = `Se realiza de 02 maneras privadamente:

    ***👨‍👦Prueba de ADN Anónima:
    
    Esta Prueba NO requiere DNIs y NO requiere que estén presentes ambos padres. El resultado no cuenta con valor legal, pero tiene un valor informativo y científico para confirmar la paternidad entre 2 personas.
    *Las muestras pueden tomarse en el Laboratorio o llevarse el KIT DE ADN a su casa , para mejor comodidad y así guardar mucho más la reserva de la identidad.
    
    ***👨‍👩‍👧Prueba de ADN Legal:
    
    Esta prueba SI requiere documentos de identidad y que estén presentes ambos padres para identificar a las partes interesadas. Es necesaria la autorización del apoderado en caso se realice la Prueba a un menor de edad. 
    *El resultado puede ser usado como evidencia para iniciar un futuro proceso legal.
    
    A tener en cuenta:
    ** Se requiere una muestra del 🧑presunto padre y del 👶hijo.
    ** No se requiere estar en ayunas.
    ** La boca debe estar sin restos de 🍗comida.`;
    let m_para_costos = `PARA LOS COSTOS, más información, citas de ADN llamar al  973-817-332,  949-748-588.`;
    let m_o_dejenos = `O déjenos un número telefónico para que un perito le llame y asesore en detalle según sea su caso.`;

    let hf_i = moment().format('YYYY-MM-DD');
    let hf_f = moment().format('YYYY-MM-DD');
    let a_respuestas = [];

    hf_i += " 00:00:00";
    hf_f += " 23:59:59";

    let rpta_lista_cmp = await db.buscar_sesiones_completar_async({ 'e_i': 0, 'e_f': 4, 'h_i': hf_i, 'h_f': hf_f, 'estado': 'A' });
    console.log("[" + moment().format('YYYY-MM-DD H:mm:ss') + "]" + '[ CMP-MSJE-SERVER-SCHEDULE ] => ' + "RANGO: " + hf_i + " ENTRE " + hf_f + "; CANT: " + rpta_lista_cmp.length);

    if (rpta_lista_cmp.length > 0) {
        a_respuestas.push({ 'text': pprivada });
        a_respuestas.push({ 'text': m_para_costos });
        a_respuestas.push({ 'text': m_o_dejenos });
        for (let index = 0; index < rpta_lista_cmp.length; index++) {
            switch (rpta_lista_cmp[index].fanpage) {
                case 1:
                    fp_id = ID_FANPAGE_1;
                    break;
                case 2:
                    fp_id = ID_FANPAGE_2;
                    break;
                case 3:
                    fp_id = ID_FANPAGE_3;
                    break;
            }

            for (let j = 0; j < a_respuestas.length; j++) {
                await callSendAPIDinamico(rpta_lista_cmp[index].id, fp_id, a_respuestas[j]);
            }

            let rpta_up_r = await db.actualizar_sesion_async(rpta_lista_cmp[index].id, { 'etapa': 10, 'estado_conv': 2, 'estado_sesion': 'AR', 'fecha_ult_conv': moment().format('YYYY-MM-DD H:mm:ss'), 'comentario': 'CMP:MANUAL_UP;' + rpta_lista_cmp[index].comentario });
            if (rpta_up_r.changedRows >= 1) {
                console.log('[ CMP-MSJE-SERVER-SCHEDULE-UP-SESION--OK ] => Se actualizo sesion [ ' + rpta_lista_cmp[index].id + ' ]');
            } else {
                console.log('[ CMP-MSJE-SERVER-SCHEDULE-UP-SESION--ERROR ] => No se actualizo sesion [ ' + rpta_lista_cmp[index].id + ' ]');
            }
        }
    }

    await callSendAPIDinamico('2813600595357798', ID_FANPAGE_1, { 'text': 'CMP-OK Cada 1 hrs.\nHora: ' + moment().format('YYYY-MM-DD H:mm:ss') + '\nCantidad: ' + rpta_lista_cmp.length });
});

app.listen((process.env.PORT || 5000));
