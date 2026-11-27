#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

const XLM: i128 = 10_000_000; // 1 unidad con 7 decimales
const P_HUELLA: i128 = 5 * XLM;
const P_COMENTARIO: i128 = 2 * XLM;
const APOYO: i128 = 3 * XLM;
const PARTE_AUTOR: u32 = 3_000; // 30%
/// Quien paga acepta cualquier precio (para las pruebas que no miran eso).
const MAX: i128 = i128::MAX;

struct Mundo {
    env: Env,
    c: UmbralClient<'static>,
    tesoro: Address,
    moneda: Address,
    tk: token::TokenClient<'static>,
    ana: Address,
    beto: Address,
    caro: Address,
}

fn nueva_moneda(env: &Env, cuentas: &[&Address]) -> Address {
    let emisor = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(emisor);
    let admin = token::StellarAssetClient::new(env, &sac.address());
    for cuenta in cuentas {
        admin.mint(cuenta, &(1_000 * XLM));
    }
    sac.address()
}

fn mundo() -> Mundo {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let tesoro = Address::generate(&env);
    let ana = Address::generate(&env);
    let beto = Address::generate(&env);
    let caro = Address::generate(&env);

    let moneda = nueva_moneda(&env, &[&ana, &beto, &caro]);
    let id = env.register(Umbral, (admin.clone(), tesoro.clone(), PARTE_AUTOR));
    let c = UmbralClient::new(&env, &id);
    c.fijar_precios(
        &moneda,
        &Precios { huella: P_HUELLA, comentario: P_COMENTARIO },
    );
    let tk = token::TokenClient::new(&env, &moneda);
    Mundo { env, c, tesoro, moneda, tk, ana, beto, caro }
}

fn h(env: &Env, n: u8) -> BytesN<32> {
    BytesN::from_array(env, &[n; 32])
}

#[test]
fn dejar_huella_registra_y_cobra_para_el_museo() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);

    let huella = m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    assert_eq!(huella.autor, m.ana);
    assert_eq!(huella.digest, h(&m.env, 101));
    assert_eq!(huella.padre, None);
    assert!(huella.activa);

    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA);
}

#[test]
fn comentar_reparte_entre_autor_original_y_museo() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);

    let parte = P_COMENTARIO * 30 / 100;
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), parte);
    assert_eq!(m.tk.balance(&m.c.address), parte);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + P_COMENTARIO - parte);
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM - P_COMENTARIO);

    let comentario = m.c.obtener(&m.c.id_de(&m.beto, &h(&m.env, 102)));
    assert_eq!(comentario.padre, Some(m.c.id_de(&m.ana, &h(&m.env, 101))));
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).respuestas, 1);
}

#[test]
fn comentar_una_huella_inexistente_falla() {
    let m = mundo();
    let r = m.c.try_comentar(&m.beto, &h(&m.env, 102), &h(&m.env, 9), &true, &m.moneda, &MAX);
    assert_eq!(r, Err(Ok(Error::NoExiste)));
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM);
}

#[test]
fn comentar_una_huella_retirada_falla() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.retirar(&m.ana, &m.c.id_de(&m.ana, &h(&m.env, 101)));
    let r = m.c.try_comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    assert_eq!(r, Err(Ok(Error::Retirada)));
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM);
}

#[test]
fn comentar_una_huella_que_no_admite_respuestas_falla() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &false, &m.moneda, &MAX, &None);
    let r = m.c.try_comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    assert_eq!(r, Err(Ok(Error::NoAdmiteRespuestas)));
}

#[test]
fn repetir_un_identificador_falla_y_no_cobra_dos_veces() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    assert_eq!(r, Err(Ok(Error::YaExiste)));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
}

#[test]
fn apoyar_es_voluntario_y_reparte_70_al_artista_y_30_a_umbral() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &APOYO);

    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).apoyos, 1);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), APOYO * 70 / 100);
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - APOYO);
    // Umbral se queda con el 30% del apoyo.
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + APOYO * 30 / 100);

    // Se puede apoyar más de una vez.
    m.c.apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &XLM);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).apoyos, 2);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), (APOYO + XLM) * 70 / 100);
}

#[test]
fn un_apoyo_de_cero_o_negativo_se_rechaza() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    assert_eq!(m.c.try_apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &0), Err(Ok(Error::MontoInvalido)));
    assert_eq!(m.c.try_apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &-5), Err(Ok(Error::MontoInvalido)));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM);
}

#[test]
fn no_se_puede_apoyar_una_huella_inexistente_ni_con_moneda_no_aceptada() {
    let m = mundo();
    assert_eq!(m.c.try_apoyar(&m.caro, &h(&m.env, 9), &m.moneda, &APOYO), Err(Ok(Error::NoExiste)));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let otra = nueva_moneda(&m.env, &[&m.caro]);
    assert_eq!(m.c.try_apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &otra, &APOYO), Err(Ok(Error::MonedaNoAceptada)));
}

#[test]
fn el_autor_cobra_lo_que_junto() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    m.c.apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &APOYO);

    let juntado = P_COMENTARIO * 30 / 100 + APOYO * 70 / 100;
    let antes = m.tk.balance(&m.ana);
    assert_eq!(m.c.cobrar(&m.ana, &m.moneda), juntado);
    assert_eq!(m.tk.balance(&m.ana), antes + juntado);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.c.address), 0);

    assert_eq!(m.c.try_cobrar(&m.ana, &m.moneda), Err(Ok(Error::NadaParaCobrar)));
}

#[test]
fn solo_el_autor_puede_retirar_su_huella() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    assert_eq!(m.c.try_retirar(&m.beto, &m.c.id_de(&m.ana, &h(&m.env, 101))), Err(Ok(Error::NoEsElAutor)));
    assert!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).activa);

    m.c.retirar(&m.ana, &m.c.id_de(&m.ana, &h(&m.env, 101)));
    assert!(!m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).activa);
    // El registro sigue existiendo y conserva su código.
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).digest, h(&m.env, 101));
    // Y ya no admite apoyos.
    assert_eq!(m.c.try_apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &APOYO), Err(Ok(Error::Retirada)));
}

#[test]
fn una_moneda_sin_precios_no_se_acepta() {
    let m = mundo();
    let otra = nueva_moneda(&m.env, &[&m.ana]);
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &otra, &MAX, &None);
    assert_eq!(r, Err(Ok(Error::MonedaNoAceptada)));
}

#[test]
fn se_puede_pagar_en_una_segunda_moneda() {
    let m = mundo();
    let usdc = nueva_moneda(&m.env, &[&m.ana, &m.beto]);
    m.c.fijar_precios(&usdc, &Precios { huella: XLM, comentario: XLM / 2 });
    let tk_usdc = token::TokenClient::new(&m.env, &usdc);

    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &usdc, &MAX);

    // El saldo de Ana queda separado por moneda.
    assert_eq!(m.c.saldo(&m.ana, &usdc), (XLM / 2) * 30 / 100);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 0);
    assert_eq!(tk_usdc.balance(&m.beto), 1_000 * XLM - XLM / 2);
}

#[test]
fn sin_firma_no_se_puede_publicar_ni_administrar() {
    let m = mundo();
    m.env.set_auths(&[]);
    assert!(m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None).is_err());
    assert!(m
        .c
        .try_fijar_precios(&m.moneda, &Precios { huella: 0, comentario: 0 })
        .is_err());
    assert!(m.c.try_moderar(&m.c.id_de(&m.ana, &h(&m.env, 101))).is_err());
}

#[test]
fn el_museo_puede_moderar_una_huella() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.moderar(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    assert!(!m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).activa);
}

#[test]
fn un_precio_negativo_se_rechaza() {
    let m = mundo();
    let r = m.c.try_fijar_precios(&m.moneda, &Precios { huella: -1, comentario: 0 });
    assert_eq!(r, Err(Ok(Error::PrecioInvalido)));
}

#[test]
fn la_firma_que_se_pide_es_la_de_quien_paga() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    assert_eq!(m.env.auths()[0].0, m.ana);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    assert_eq!(m.env.auths()[0].0, m.beto);
    m.c.apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &APOYO);
    assert_eq!(m.env.auths()[0].0, m.caro);
}

fn sala_con_fondo(m: &Mundo, monto: i128) -> (Address, BytesN<32>) {
    let museo = Address::generate(&m.env);
    token::StellarAssetClient::new(&m.env, &m.moneda).mint(&museo, &(1_000 * XLM));
    let sala = h(&m.env, 200);
    m.c.abrir_sala(&museo, &sala);
    if monto > 0 {
        m.c.patrocinar(&museo, &sala, &m.moneda, &monto);
    }
    (museo, sala)
}

#[test]
fn una_sala_patrocina_la_primera_huella_de_cada_visitante() {
    let m = mundo();
    let (museo, sala) = sala_con_fondo(&m, 2 * P_HUELLA);
    assert_eq!(m.c.museo_de(&sala), museo);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 2 * P_HUELLA);

    // El museo invita a los tres visitantes.
    m.c.invitar(&sala, &m.ana);
    assert_eq!(m.env.auths()[0].0, museo);
    m.c.invitar(&sala, &m.beto);
    m.c.invitar(&sala, &m.caro);
    assert!(m.c.invitada(&sala, &m.ana));
    assert_eq!(m.c.try_invitar(&sala, &m.ana), Err(Ok(Error::YaInvitada)));

    // Ana no paga: paga el fondo de la sala, y el dinero llega al museo Umbral.
    let pagada = m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert!(pagada);
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), P_HUELLA);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).sala, Some(sala.clone()));

    // La segunda huella de Ana en la misma sala la paga ella.
    let pagada = m.c.dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert!(!pagada);
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), P_HUELLA);

    // Beto usa lo que queda del fondo; a Caro ya no le alcanza y paga ella.
    assert!(m.c.dejar_huella(&m.beto, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
    assert!(!m.c.dejar_huella(&m.caro, &h(&m.env, 104), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - P_HUELLA);
    assert_eq!(m.tk.balance(&m.c.address), 0);
}

#[test]
fn una_continuacion_queda_en_la_sala_de_la_huella_original() {
    let m = mundo();
    let (_museo, sala) = sala_con_fondo(&m, 0);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.beto, &h(&m.env, 102))).sala, Some(sala));
}

#[test]
fn salas_inexistentes_o_repetidas_se_rechazan() {
    let m = mundo();
    let fantasma = h(&m.env, 250);
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(fantasma.clone()));
    assert_eq!(r, Err(Ok(Error::SalaNoExiste)));
    assert_eq!(m.c.try_patrocinar(&m.ana, &fantasma, &m.moneda, &XLM), Err(Ok(Error::SalaNoExiste)));

    let (museo, sala) = sala_con_fondo(&m, 0);
    assert_eq!(m.c.try_abrir_sala(&museo, &sala), Err(Ok(Error::YaExiste)));
    assert_eq!(m.c.try_patrocinar(&museo, &sala, &m.moneda, &0), Err(Ok(Error::MontoInvalido)));
}

#[test]
fn el_artista_original_cobra_en_toda_la_cadena() {
    let m = mundo();
    // Ana abre la obra, Beto la continúa, Caro continúa a Beto.
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    m.c.comentar(&m.caro, &h(&m.env, 103), &m.c.id_de(&m.beto, &h(&m.env, 102)), &true, &m.moneda, &MAX);

    let parte = P_COMENTARIO * 30 / 100;
    // Ana cobra lo mismo en las dos continuaciones. Beto, que solo respondió, no cobra.
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * parte);
    assert_eq!(m.c.saldo(&m.beto, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.c.address), 2 * parte);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.caro, &h(&m.env, 103))).artista, m.ana);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).artista, m.ana);
}

#[test]
fn moderar_una_huella_no_bloquea_el_cobro() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    m.c.moderar(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    let parte = P_COMENTARIO * 30 / 100;
    assert_eq!(m.c.cobrar(&m.ana, &m.moneda), parte);
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA + parte);
}

#[test]
fn cualquiera_puede_renovar_la_vigencia_de_una_huella() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let antes = m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    m.c.renovar(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))), antes);
    assert_eq!(m.c.try_renovar(&h(&m.env, 9)), Err(Ok(Error::NoExiste)));
}

#[test]
fn cambiar_la_parte_del_autor_y_renovar_una_huella_inexistente() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    m.c.fijar_parte_autor(&5_000);
    assert_eq!(m.c.parte_autor(), 5_000);
    m.c.renovar(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    assert_eq!(m.c.try_renovar(&h(&m.env, 99)), Err(Ok(Error::NoExiste)));
}

#[test]
fn los_avisos_del_contrato_tienen_la_forma_esperada() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo();
    let yo = m.c.address.clone();

    m.c.fijar_parte_autor(&5_000);
    assert_eq!(
        m.env.events().all(),
        std::vec![ParteAutorFijada { parte_autor_bps: 5_000 }.to_xdr(&m.env, &yo)]
    );

    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    // Solo los avisos de Umbral (los del token van aparte): el saldo de Ana y la huella nueva.
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![
            SaldoAcreditado { beneficiario: m.ana.clone(), moneda: m.moneda.clone(), monto: P_COMENTARIO / 2 }
                .to_xdr(&m.env, &yo),
            HuellaDejada { id: m.c.id_de(&m.beto, &h(&m.env, 102)), autor: m.beto.clone(), artista: m.ana.clone(), digest: h(&m.env, 102), padre: Some(m.c.id_de(&m.ana, &h(&m.env, 101))), sala: None }
                .to_xdr(&m.env, &yo),
        ]
    );
}

#[test]
fn renovar_extiende_la_vigencia_sin_tocar_el_dato() {
    use soroban_sdk::testutils::{storage::Persistent as _, Ledger as _};
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let antes = m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    let clave = Clave::Huella(m.c.id_de(&m.ana, &h(&m.env, 101)));
    let ttl = |m: &Mundo| m.env.as_contract(&m.c.address, || m.env.storage().persistent().get_ttl(&clave));
    let inicial = ttl(&m);
    // Pasan 60 días sin movimiento.
    m.env.ledger().with_mut(|l| l.sequence_number += 60 * DIA);
    assert!(ttl(&m) < inicial);
    m.c.renovar(&m.c.id_de(&m.ana, &h(&m.env, 101)));
    assert_eq!(ttl(&m), VIDA);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))), antes);
}

#[test]
fn sin_invitacion_del_museo_el_fondo_no_paga() {
    let m = mundo();
    let (_museo, sala) = sala_con_fondo(&m, 5 * P_HUELLA);
    // Caro no fue invitada: aunque haya fondo, paga ella y el fondo queda igual.
    assert!(!m.c.dejar_huella(&m.caro, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 5 * P_HUELLA);
    // No se puede invitar a una sala que no existe.
    assert_eq!(m.c.try_invitar(&h(&m.env, 250), &m.caro), Err(Ok(Error::SalaNoExiste)));
    // La invitación se gasta al usarla.
    m.c.invitar(&sala, &m.beto);
    assert!(m.c.dejar_huella(&m.beto, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert!(!m.c.invitada(&sala, &m.beto));
    assert!(!m.c.dejar_huella(&m.beto, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone())));
}

#[test]
fn la_parte_de_los_autores_tiene_un_piso() {
    let m = mundo();
    assert_eq!(m.c.try_fijar_parte_autor(&2_999), Err(Ok(Error::PorcentajeInvalido)));
    assert_eq!(m.c.try_fijar_parte_autor(&10_001), Err(Ok(Error::PorcentajeInvalido)));
    m.c.fijar_parte_autor(&3_000);
    assert_eq!(m.c.parte_autor(), 3_000);
}

#[test]
fn el_identificador_depende_del_autor_y_del_contenido() {
    let m = mundo();
    let d = h(&m.env, 101);
    assert_ne!(m.c.id_de(&m.ana, &d), m.c.id_de(&m.beto, &d));
    assert_ne!(m.c.id_de(&m.ana, &d), m.c.id_de(&m.ana, &h(&m.env, 102)));
    // Beto copia el contenido de Ana: queda como otra huella, no le saca la suya.
    m.c.dejar_huella(&m.ana, &d, &true, &m.moneda, &MAX, &None);
    m.c.dejar_huella(&m.beto, &d, &true, &m.moneda, &MAX, &None);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &d)).autor, m.ana);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.beto, &d)).autor, m.beto);
}

// ---------- Pruebas sumadas después de las auditorías ----------

const USDC: i128 = 10_000_000; // 1 USDC con 7 decimales

/// Un mundo con los números del SPEC: 2 USDC la huella, 1 USDC continuar, 70% al artista.
fn mundo_spec() -> Mundo {
    let m = mundo();
    m.c.fijar_parte_autor(&7_000);
    m.c.fijar_precios(&m.moneda, &Precios { huella: 2 * USDC, comentario: USDC });
    m
}

#[test]
fn los_numeros_del_spec_cierran() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let respuesta = m.c.id_de(&m.beto, &h(&m.env, 102));

    // Dejar una huella: 2 USDC, todo para Umbral.
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &(2 * USDC), &None);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 0);

    // Continuar la obra: 1 USDC, 0,70 al artista y 0,30 a Umbral.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC + USDC * 3 / 10);

    // Continuar una respuesta: igual. 0,70 al artista, nada para quien respondió.
    m.c.comentar(&m.caro, &h(&m.env, 103), &respuesta, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 7 / 10));
    assert_eq!(m.c.saldo(&m.beto, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC + 2 * (USDC * 3 / 10));

    // Apoyar la respuesta de Beto con 1 USDC: 0,70 al artista, 0,30 a Umbral.
    m.c.apoyar(&m.caro, &respuesta, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 3 * (USDC * 7 / 10));
    assert_eq!(m.c.saldo(&m.beto, &m.moneda), 0);

    // Lo que guarda el contrato es exactamente lo que le debe al artista.
    assert_eq!(m.tk.balance(&m.c.address), m.c.saldo(&m.ana, &m.moneda));
    // Ana cobra todo y el contrato queda en cero.
    let antes = m.tk.balance(&m.ana);
    let cobrado = m.c.cobrar(&m.ana, &m.moneda);
    assert_eq!(m.tk.balance(&m.ana), antes + cobrado);
    assert_eq!(m.tk.balance(&m.c.address), 0);
}

#[test]
fn si_el_precio_subio_la_accion_falla_y_no_cobra() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    // Ana vio 2 USDC, pero el precio pasó a 3 antes de que firmara.
    m.c.fijar_precios(&m.moneda, &Precios { huella: 3 * USDC, comentario: 2 * USDC });
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &(2 * USDC), &None);
    assert_eq!(r, Err(Ok(Error::PrecioSuperado)));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM);
    assert_eq!(m.c.try_obtener(&obra), Err(Ok(Error::NoExiste)));

    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &(3 * USDC), &None);
    let r = m.c.try_comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(r, Err(Ok(Error::PrecioSuperado)));
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM);
}

#[test]
fn un_precio_de_cero_se_rechaza() {
    let m = mundo();
    for p in [Precios { huella: 0, comentario: XLM }, Precios { huella: XLM, comentario: 0 }] {
        assert_eq!(m.c.try_fijar_precios(&m.moneda, &p), Err(Ok(Error::PrecioInvalido)));
    }
}

#[test]
fn sin_plata_suficiente_la_huella_no_queda_guardada() {
    let m = mundo_spec();
    let pobre = Address::generate(&m.env);
    assert!(m.c.try_dejar_huella(&pobre, &h(&m.env, 101), &true, &m.moneda, &MAX, &None).is_err());
    assert_eq!(m.c.try_obtener(&m.c.id_de(&pobre, &h(&m.env, 101))), Err(Ok(Error::NoExiste)));
    assert_eq!(m.tk.balance(&m.tesoro), 0);
}

#[test]
fn un_monto_absurdo_da_un_error_claro() {
    let m = mundo_spec();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let r = m.c.try_apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &i128::MAX);
    assert_eq!(r, Err(Ok(Error::Desborde)));
}

#[test]
fn con_montos_impares_no_se_pierde_ni_aparece_ninguna_unidad() {
    let m = mundo();
    m.c.fijar_parte_autor(&5_000);
    m.c.fijar_precios(&m.moneda, &Precios { huella: 1, comentario: 3 });
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    m.c.apoyar(&m.caro, &obra, &m.moneda, &1);
    // De 3 unidades: 1 al artista y 2 a Umbral. Del apoyo de 1: todo al artista.
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2);
    assert_eq!(m.tk.balance(&m.c.address), 2);
    assert_eq!(m.tk.balance(&m.tesoro), 1 + 2);
    let pagado = (1_000 * XLM - m.tk.balance(&m.ana))
        + (1_000 * XLM - m.tk.balance(&m.beto))
        + (1_000 * XLM - m.tk.balance(&m.caro));
    assert_eq!(pagado, m.tk.balance(&m.c.address) + m.tk.balance(&m.tesoro));
}

#[test]
fn un_saldo_ya_anotado_no_cambia_si_cambia_el_porcentaje() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    m.c.fijar_parte_autor(&3_000);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10 + USDC * 3 / 10);
}

#[test]
fn nadie_cobra_ni_invita_con_la_firma_de_otro() {
    use soroban_sdk::{testutils::{MockAuth, MockAuthInvoke}, IntoVal};
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    let (_museo, sala) = sala_con_fondo(&m, 2 * USDC);

    // Beto firma un pedido para cobrar el saldo de Ana: no vale.
    let r = m
        .c
        .mock_auths(&[MockAuth {
            address: &m.beto,
            invoke: &MockAuthInvoke {
                contract: &m.c.address,
                fn_name: "cobrar",
                args: (m.ana.clone(), m.moneda.clone()).into_val(&m.env),
                sub_invokes: &[],
            },
        }])
        .try_cobrar(&m.ana, &m.moneda);
    assert!(r.is_err());
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);

    // Beto firma una invitación en la sala del museo: no vale.
    let r = m
        .c
        .mock_auths(&[MockAuth {
            address: &m.beto,
            invoke: &MockAuthInvoke {
                contract: &m.c.address,
                fn_name: "invitar",
                args: (sala.clone(), m.beto.clone()).into_val(&m.env),
                sub_invokes: &[],
            },
        }])
        .try_invitar(&sala, &m.beto);
    assert!(r.is_err());
    assert!(!m.c.invitada(&sala, &m.beto));
}

#[test]
fn los_avisos_distinguen_moderacion_de_retiro_y_muestran_el_uso_del_fondo() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    let a = m.c.id_de(&m.ana, &h(&m.env, 101));
    let b = m.c.id_de(&m.beto, &h(&m.env, 102));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.dejar_huella(&m.beto, &h(&m.env, 102), &true, &m.moneda, &MAX, &None);

    m.c.retirar(&m.ana, &a);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![HuellaRetirada { id: a, por_moderacion: false }.to_xdr(&m.env, &yo)]
    );
    m.c.moderar(&b);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![HuellaRetirada { id: b, por_moderacion: true }.to_xdr(&m.env, &yo)]
    );

    let (_museo, sala) = sala_con_fondo(&m, 4 * USDC);
    m.c.invitar(&sala, &m.caro);
    assert!(m.c.dejar_huella(&m.caro, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![
            FondoUsado { sala: sala.clone(), cuenta: m.caro.clone(), moneda: m.moneda.clone(), monto: 2 * USDC }
                .to_xdr(&m.env, &yo),
            HuellaDejada {
                id: m.c.id_de(&m.caro, &h(&m.env, 103)),
                autor: m.caro.clone(),
                artista: m.caro.clone(),
                digest: h(&m.env, 103),
                padre: None,
                sala: Some(sala.clone()),
            }
            .to_xdr(&m.env, &yo),
        ]
    );
}

#[test]
fn cobrar_y_apoyar_tambien_renuevan_la_vigencia_del_contrato() {
    use soroban_sdk::testutils::{storage::Instance as _, Ledger as _};
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let ttl = |m: &Mundo| m.env.as_contract(&m.c.address, || m.env.storage().instance().get_ttl());
    m.env.ledger().with_mut(|l| l.sequence_number += 30 * DIA);
    assert!(ttl(&m) < VIDA);
    m.c.apoyar(&m.caro, &obra, &m.moneda, &USDC);
    assert_eq!(ttl(&m), VIDA);
    m.env.ledger().with_mut(|l| l.sequence_number += 30 * DIA);
    m.c.cobrar(&m.ana, &m.moneda);
    assert_eq!(ttl(&m), VIDA);
}

/// La app calcula el identificador en el navegador antes de pagar. Este valor
/// sale de esa misma cuenta hecha con el SDK de JavaScript: tienen que coincidir.
#[test]
fn el_identificador_coincide_con_el_que_calcula_la_app() {
    let m = mundo();
    let cuenta = Address::from_str(&m.env, "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
    let esperado: [u8; 32] = [
        0x56, 0xbf, 0xc9, 0xf0, 0x59, 0x5c, 0x71, 0xa8, 0xd5, 0xf1, 0x3a, 0xef, 0x5f, 0x55, 0x4c, 0x12,
        0x5e, 0x30, 0xde, 0x0a, 0x9b, 0xe1, 0xe1, 0x06, 0x98, 0xbf, 0xe7, 0x30, 0xd6, 0xdb, 0x6d, 0xfd,
    ];
    assert_eq!(m.c.id_de(&cuenta, &h(&m.env, 7)), BytesN::from_array(&m.env, &esperado));
}

// ---------- Muestra con fecha de una sala ----------

const DIA_S: u64 = 86_400;

/// Una sala con una obra de Ana adentro, con los números del SPEC.
fn sala_con_obra() -> (Mundo, Address, BytesN<32>, BytesN<32>) {
    let m = mundo_spec();
    let (museo, sala) = sala_con_fondo(&m, 0);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    (m, museo, sala, obra)
}

#[test]
fn durante_la_muestra_la_continuacion_reparte_50_20_30() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &2_000);
    assert_eq!(m.c.muestra(&sala), Some(Muestra { desde: 1_000, hasta: 1_000 + 7 * DIA_S, parte_sala_bps: 2_000 }));

    let tesoro_antes = m.tk.balance(&m.tesoro);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 5 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 2 / 10);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 3 / 10);
    // Lo que guarda el contrato es exactamente lo que deben cobrar artista y sala.
    assert_eq!(m.tk.balance(&m.c.address), USDC * 7 / 10);

    // La sala cobra su parte como cualquier artista.
    let antes = m.tk.balance(&museo);
    assert_eq!(m.c.cobrar(&museo, &m.moneda), USDC * 2 / 10);
    assert_eq!(m.tk.balance(&museo) - antes, USDC * 2 / 10);
}

#[test]
fn antes_y_despues_de_la_muestra_el_reparto_es_el_de_siempre() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &(1_000 + DIA_S), &(1_000 + 2 * DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &2_000);

    // Todavía no empezó.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);

    // Ya terminó.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 3 * DIA_S);
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 7 / 10));
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn la_muestra_no_cambia_las_obras_de_afuera_ni_el_apoyo() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &2_000);

    // Una obra que no es de la sala: 70 y 30, como siempre.
    m.c.dejar_huella(&m.caro, &h(&m.env, 110), &true, &m.moneda, &MAX, &None);
    let afuera = m.c.id_de(&m.caro, &h(&m.env, 110));
    m.c.comentar(&m.beto, &h(&m.env, 111), &afuera, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.caro, &m.moneda), USDC * 7 / 10);

    // El apoyo a una obra de la sala sigue siendo 70 para el artista.
    m.c.apoyar(&m.beto, &obra, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn en_una_muestra_el_artista_nunca_baja_del_piso() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.c.fijar_parte_autor(&4_000);
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &2_000);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    // 40% menos 20% daría 20%: se queda en el piso de 30%.
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 3 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 2 / 10);
}

#[test]
fn una_muestra_con_fechas_malas_o_superpuesta_se_rechaza() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, _museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 10 * DIA_S);
    let ahora = 10 * DIA_S;
    let mal = Err(Ok(Error::MuestraInvalida));
    // Termina antes de empezar, ya pasó, o dura más de 90 días.
    assert_eq!(m.c.try_abrir_muestra(&sala, &(ahora + 5), &(ahora + 5), &2_000), mal);
    assert_eq!(m.c.try_abrir_muestra(&sala, &DIA_S, &(2 * DIA_S), &2_000), mal);
    assert_eq!(m.c.try_abrir_muestra(&sala, &ahora, &(ahora + 91 * DIA_S), &2_000), mal);
    // Una sala que no existe.
    assert_eq!(m.c.try_abrir_muestra(&h(&m.env, 250), &ahora, &(ahora + DIA_S), &2_000), Err(Ok(Error::SalaNoExiste)));

    m.c.abrir_muestra(&sala, &ahora, &(ahora + DIA_S), &2_000);
    // Mientras dura no se puede abrir otra.
    assert_eq!(m.c.try_abrir_muestra(&sala, &(ahora + 10), &(ahora + 2 * DIA_S), &2_000), mal);
    // Cuando terminó, sí.
    m.env.ledger().with_mut(|l| l.timestamp = ahora + 2 * DIA_S);
    m.c.abrir_muestra(&sala, &(ahora + 2 * DIA_S), &(ahora + 3 * DIA_S), &2_000);
}

#[test]
fn solo_umbral_abre_una_muestra() {
    let (m, museo, sala, _obra) = sala_con_obra();
    // Sin ninguna firma válida, ni el museo puede.
    m.env.set_auths(&[]);
    assert!(m.c.try_abrir_muestra(&sala, &1, &1_000, &2_000).is_err());
    let _ = museo;
}

#[test]
fn la_parte_de_la_sala_se_elige_en_cada_muestra_con_tope_de_40() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    // Más de 40% se rechaza.
    assert_eq!(
        m.c.try_abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_001),
        Err(Ok(Error::PorcentajeInvalido))
    );
    // Un museo de mucho peso: 40% sala, 30% artista, 30% Umbral.
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    m.c.aceptar_muestra(&m.ana, &sala, &4_000);
    let tesoro_antes = m.tk.balance(&m.tesoro);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 3 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 4 / 10);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 3 / 10);
}

#[test]
fn una_muestra_puede_dejarle_todo_al_artista() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &0);
    m.c.aceptar_muestra(&m.ana, &sala, &0);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn sin_la_firma_del_artista_la_muestra_no_le_cambia_el_reparto() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));

    // Ana no aceptó: cobra su 70% y la sala nada.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);

    // Que acepte otro artista no cambia nada para Ana.
    m.c.aceptar_muestra(&m.caro, &sala, &4_000);
    m.c.comentar(&m.beto, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 7 / 10));
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);

    // Cuando Ana acepta, vale desde ahí en adelante.
    m.c.aceptar_muestra(&m.ana, &sala, &4_000);
    assert!(m.c.acepto_muestra(&sala, &m.ana));
    m.c.comentar(&m.beto, &h(&m.env, 104), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 7 / 10) + USDC * 3 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 4 / 10);
}

#[test]
fn el_artista_acepta_solo_el_porcentaje_que_vio_y_solo_esa_muestra() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    // Todavía no hay muestra.
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &2_000), Err(Ok(Error::MuestraInvalida)));
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    // Vio 10% y la muestra dice 20%: no vale.
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &1_000), Err(Ok(Error::PorcentajeInvalido)));
    m.c.aceptar_muestra(&m.ana, &sala, &2_000);

    // Termina esa muestra y la sala abre otra con 40%: el acuerdo viejo no sirve.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 2 * DIA_S);
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &2_000), Err(Ok(Error::MuestraInvalida)));
    m.c.abrir_muestra(&sala, &(1_000 + 2 * DIA_S), &(1_000 + 3 * DIA_S), &4_000);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn nadie_acepta_una_muestra_por_el_artista() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, _museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    m.env.set_auths(&[]);
    assert!(m.c.try_aceptar_muestra(&m.ana, &sala, &4_000).is_err());
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
}


#[test]
fn una_muestra_nueva_con_la_misma_fecha_de_inicio_pide_otra_firma() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 100), &0);
    m.c.aceptar_muestra(&m.ana, &sala, &0);
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 200);
    // Misma fecha de inicio, otro porcentaje: el acuerdo viejo no sirve.
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 7 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn el_museo_retira_lo_que_no_se_uso_del_fondo() {
    let m = mundo();
    let (museo, sala) = sala_con_fondo(&m, 3 * P_HUELLA);
    let antes = m.tk.balance(&museo);
    m.c.retirar_fondo(&sala, &m.moneda, &P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 2 * P_HUELLA);
    assert_eq!(m.tk.balance(&museo) - antes, P_HUELLA);
    assert_eq!(m.c.try_retirar_fondo(&sala, &m.moneda, &(3 * P_HUELLA)), Err(Ok(Error::FondoInsuficiente)));
    assert_eq!(m.c.try_retirar_fondo(&sala, &m.moneda, &0), Err(Ok(Error::MontoInvalido)));
    m.c.retirar_fondo(&sala, &m.moneda, &(2 * P_HUELLA));
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.c.address), 0);
}

#[test]
fn solo_el_museo_retira_el_fondo_de_su_sala() {
    let m = mundo();
    let (_museo, sala) = sala_con_fondo(&m, P_HUELLA);
    m.env.set_auths(&[]);
    assert!(m.c.try_retirar_fondo(&sala, &m.moneda, &P_HUELLA).is_err());
    assert_eq!(m.c.fondo(&sala, &m.moneda), P_HUELLA);
}

#[test]
fn solo_el_administrador_actualiza_el_contrato() {
    let m = mundo();
    m.env.set_auths(&[]);
    assert!(m.c.try_actualizar(&h(&m.env, 7)).is_err());
}
