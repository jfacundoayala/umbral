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
/// Plazo de aviso de las pruebas: el mínimo, 1 hora.
const PLAZO: u64 = 3_600;

struct Mundo {
    env: Env,
    c: UmbralClient<'static>,
    admin: Address,
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
    mundo_con(PARTE_AUTOR)
}

fn mundo_con(parte_autor: u32) -> Mundo {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let tesoro = Address::generate(&env);
    let ana = Address::generate(&env);
    let beto = Address::generate(&env);
    let caro = Address::generate(&env);

    let moneda = nueva_moneda(&env, &[&ana, &beto, &caro]);
    let id = env.register(Umbral, (admin.clone(), tesoro.clone(), parte_autor, PLAZO));
    let c = UmbralClient::new(&env, &id);
    c.fijar_precios(
        &moneda,
        &Precios { huella: P_HUELLA, comentario: P_COMENTARIO },
    );
    let tk = token::TokenClient::new(&env, &moneda);
    Mundo { env, c, admin, tesoro, moneda, tk, ana, beto, caro }
}

/// Pasa el tiempo (en segundos).
fn esperar(m: &Mundo, segundos: u64) {
    use soroban_sdk::testutils::Ledger as _;
    m.env.ledger().with_mut(|l| l.timestamp += segundos);
}

/// Cambia la parte del autor en dos pasos: propone, espera el plazo y aplica.
fn cambiar_parte(m: &Mundo, bps: u32) {
    m.c.proponer_parte_autor(&bps);
    esperar(m, PLAZO);
    m.c.aplicar_parte_autor();
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
fn apoyar_es_voluntario_y_reparte_80_al_artista_y_20_a_umbral() {
    let m = mundo();
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &APOYO);

    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).apoyos, 1);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), APOYO * 80 / 100);
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - APOYO);
    // Umbral se queda con el 20% del apoyo.
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + APOYO * 20 / 100);

    // Se puede apoyar más de una vez.
    m.c.apoyar(&m.caro, &m.c.id_de(&m.ana, &h(&m.env, 101)), &m.moneda, &XLM);
    assert_eq!(m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))).apoyos, 2);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), (APOYO + XLM) * 80 / 100);
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

    let juntado = P_COMENTARIO * 30 / 100 + APOYO * 80 / 100;
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
    let sala = m.c.abrir_sala(&museo, &h(&m.env, 200));
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

    // Ana ya gastó su invitación: una segunda huella en la misma sala no
    // entra (ya no tiene vínculo con la sala) y no se le cobra nada.
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM);
    assert_eq!(m.c.fondo(&sala, &m.moneda), P_HUELLA);

    // Beto usa lo que queda del fondo; a Caro ya no le alcanza y no paga ella.
    assert!(m.c.dejar_huella(&m.beto, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
    let r = m.c.try_dejar_huella(&m.caro, &h(&m.env, 104), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::FondoInsuficiente)));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM);
    assert!(m.c.invitada(&sala, &m.caro));
    assert_eq!(m.tk.balance(&m.c.address), 0);
}

#[test]
fn una_continuacion_queda_en_la_sala_de_la_huella_original() {
    let m = mundo();
    let (_museo, sala) = sala_con_fondo(&m, P_HUELLA);
    m.c.invitar(&sala, &m.ana);
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
    assert_eq!(m.c.try_abrir_sala(&museo, &h(&m.env, 200)), Err(Ok(Error::YaExiste)));
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
    cambiar_parte(&m, 5_000);
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

    m.c.proponer_parte_autor(&5_000);
    assert_eq!(
        m.env.events().all(),
        std::vec![CambioPropuesto { cambio: Cambio::ParteAutor(5_000), aplicable_desde: PLAZO, aplicable_hasta: PLAZO + VIGENCIA }
            .to_xdr(&m.env, &yo)]
    );
    esperar(&m, PLAZO);
    m.c.aplicar_parte_autor();
    assert_eq!(
        m.env.events().all(),
        std::vec![CambioAplicado { cambio: Cambio::ParteAutor(5_000) }.to_xdr(&m.env, &yo)]
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
    // Caro no fue invitada: aunque haya fondo, no puede nombrar la sala. El
    // fondo queda igual y, sin sala, paga ella como siempre.
    let r = m.c.try_dejar_huella(&m.caro, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM);
    assert!(!m.c.dejar_huella(&m.caro, &h(&m.env, 101), &true, &m.moneda, &MAX, &None));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 5 * P_HUELLA);
    // No se puede invitar a una sala que no existe.
    assert_eq!(m.c.try_invitar(&h(&m.env, 250), &m.caro), Err(Ok(Error::SalaNoExiste)));
    // La invitación se gasta al usarla.
    m.c.invitar(&sala, &m.beto);
    assert!(m.c.dejar_huella(&m.beto, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert!(!m.c.invitada(&sala, &m.beto));
    let r = m.c.try_dejar_huella(&m.beto, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
}

#[test]
fn la_parte_de_los_autores_tiene_un_piso() {
    let m = mundo();
    assert_eq!(m.c.try_proponer_parte_autor(&2_999), Err(Ok(Error::PorcentajeInvalido)));
    assert_eq!(m.c.try_proponer_parte_autor(&10_001), Err(Ok(Error::PorcentajeInvalido)));
    assert_eq!(m.c.propuesta(&TipoCambio::ParteAutor), None);
    cambiar_parte(&m, 3_000);
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

/// Un mundo con los números del SPEC: 2 USDC la huella, 1 USDC continuar, 80% al artista.
fn mundo_spec() -> Mundo {
    let m = mundo_con(8_000);
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

    // Continuar la obra: 1 USDC, 0,80 al artista y 0,20 a Umbral.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC + USDC * 2 / 10);

    // Continuar una respuesta: igual. 0,80 al artista, nada para quien respondió.
    m.c.comentar(&m.caro, &h(&m.env, 103), &respuesta, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 8 / 10));
    assert_eq!(m.c.saldo(&m.beto, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC + 2 * (USDC * 2 / 10));

    // Apoyar la respuesta de Beto con 1 USDC: 0,80 al artista, 0,20 a Umbral.
    m.c.apoyar(&m.caro, &respuesta, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 3 * (USDC * 8 / 10));
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
    cambiar_parte(&m, 5_000);
    m.c.fijar_precios(&m.moneda, &Precios { huella: 1, comentario: 3 });
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    m.c.apoyar(&m.caro, &obra, &m.moneda, &1);
    // De 3 unidades: 1 al artista y 2 a Umbral. Del apoyo de 1: todo a Umbral
    // (el redondeo siempre queda de su lado).
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 1);
    assert_eq!(m.tk.balance(&m.c.address), 1);
    assert_eq!(m.tk.balance(&m.tesoro), 1 + 2 + 1);
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
    cambiar_parte(&m, 3_000);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10 + USDC * 3 / 10);
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
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);

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
    // El museo invita a Ana y pone justo lo que cuesta su obra: así la obra
    // tiene un vínculo real con la sala y el fondo queda en cero.
    let (museo, sala) = sala_con_fondo(&m, m.c.precios(&m.moneda).huella);
    m.c.invitar(&sala, &m.ana);
    assert!(m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone())));
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    (m, museo, sala, obra)
}

#[test]
fn durante_la_muestra_la_continuacion_reparte_50_20_30() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    assert_eq!(m.c.muestra(&sala), Some(Muestra { numero: 1, desde: 1_000, hasta: 1_000 + 7 * DIA_S, parte_sala_bps: 2_000 }));

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
    m.c.aceptar_muestra(&m.ana, &sala, &1, &(1_000 + DIA_S), &(1_000 + 2 * DIA_S), &2_000);

    // Todavía no empezó.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);

    // Ya terminó.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 3 * DIA_S);
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 8 / 10));
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn la_muestra_no_cambia_las_obras_de_afuera_ni_el_apoyo() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000);

    // Una obra que no es de la sala: 80 y 20, como siempre.
    m.c.dejar_huella(&m.caro, &h(&m.env, 110), &true, &m.moneda, &MAX, &None);
    let afuera = m.c.id_de(&m.caro, &h(&m.env, 110));
    m.c.comentar(&m.beto, &h(&m.env, 111), &afuera, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.caro, &m.moneda), USDC * 8 / 10);

    // El apoyo a una obra de la sala sigue siendo 80 para el artista.
    m.c.apoyar(&m.beto, &obra, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn en_una_muestra_umbral_se_queda_30_sin_importar_la_parte_del_autor() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &4_000);
    let tesoro_antes = m.tk.balance(&m.tesoro);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    // Con la sala en su tope (40%), el artista queda justo en el piso (30%).
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 3 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 4 / 10);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 3 / 10);
}

#[test]
fn sin_muestra_el_artista_se_queda_80_y_umbral_20() {
    let m = mundo_con(8_000);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    let tesoro_antes = m.tk.balance(&m.tesoro);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), P_COMENTARIO * 80 / 100);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, P_COMENTARIO * 20 / 100);
}

#[test]
fn una_muestra_con_fechas_malas_o_superpuesta_se_rechaza() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, _museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 10 * DIA_S);
    let ahora = 10 * DIA_S;
    let mal = Err(Ok(Error::MuestraInvalida));
    // Termina antes de empezar, ya pasó, o dura más de 180 días.
    assert_eq!(m.c.try_abrir_muestra(&sala, &(ahora + 5), &(ahora + 5), &2_000), mal);
    assert_eq!(m.c.try_abrir_muestra(&sala, &DIA_S, &(2 * DIA_S), &2_000), mal);
    assert_eq!(m.c.try_abrir_muestra(&sala, &ahora, &(ahora + 181 * DIA_S), &2_000), mal);
    // Empieza más de un día antes de hoy, o más de un año después.
    assert_eq!(m.c.try_abrir_muestra(&sala, &(ahora - 2 * DIA_S), &(ahora + DIA_S), &2_000), mal);
    assert_eq!(
        m.c.try_abrir_muestra(&sala, &(ahora + 366 * DIA_S), &(ahora + 367 * DIA_S), &2_000),
        mal
    );
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
    use soroban_sdk::{testutils::{Ledger as _, MockAuth, MockAuthInvoke}, IntoVal};
    let (m, museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    let args = (sala.clone(), 1_000u64, 1_000 + DIA_S, 2_000u32);
    // El museo de la sala o un tercero firman el pedido: no alcanza.
    for quien in [&museo, &m.beto] {
        let r = m
            .c
            .mock_auths(&[MockAuth {
                address: quien,
                invoke: &MockAuthInvoke {
                    contract: &m.c.address,
                    fn_name: "abrir_muestra",
                    args: args.clone().into_val(&m.env),
                    sub_invokes: &[],
                },
            }])
            .try_abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
        assert!(r.is_err());
    }
    // Sin ninguna firma, tampoco.
    m.env.set_auths(&[]);
    assert!(m.c.try_abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000).is_err());
    assert_eq!(m.c.muestra(&sala), None);
    // Con la firma del administrador, sí.
    let r = m
        .c
        .mock_auths(&[MockAuth {
            address: &m.admin,
            invoke: &MockAuthInvoke {
                contract: &m.c.address,
                fn_name: "abrir_muestra",
                args: args.into_val(&m.env),
                sub_invokes: &[],
            },
        }])
        .try_abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    assert!(r.is_ok());
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
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &4_000);
    let tesoro_antes = m.tk.balance(&m.tesoro);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 3 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 4 / 10);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 3 / 10);
}

#[test]
fn una_muestra_con_la_sala_al_0_es_como_no_tener_muestra() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &0);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &0);
    let tesoro_antes = m.tk.balance(&m.tesoro);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    // El artista recibe su parte de siempre (80%) y Umbral el 20%, no el 30%.
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 2 / 10);
}

#[test]
fn sin_la_firma_del_artista_la_muestra_no_le_cambia_el_reparto() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));

    // Ana no aceptó: cobra su 80% y la sala nada.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);

    // Que acepte otro artista no cambia nada para Ana.
    m.c.aceptar_muestra(&m.caro, &sala, &1, &1_000, &(1_000 + DIA_S), &4_000);
    m.c.comentar(&m.beto, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 8 / 10));
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);

    // Cuando Ana acepta, vale desde ahí en adelante.
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &4_000);
    assert!(m.c.acepto_muestra(&sala, &m.ana));
    m.c.comentar(&m.beto, &h(&m.env, 104), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * (USDC * 8 / 10) + USDC * 3 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 4 / 10);
}

#[test]
fn el_artista_acepta_solo_el_porcentaje_que_vio_y_solo_esa_muestra() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    // Todavía no hay muestra.
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000), Err(Ok(Error::MuestraInvalida)));
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    // Vio 10% y la muestra dice 20%: no vale.
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &1_000), Err(Ok(Error::PorcentajeInvalido)));
    // Vio otras fechas: tampoco vale.
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 7 * DIA_S), &2_000), Err(Ok(Error::MuestraInvalida)));
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000);

    // Termina esa muestra y la sala abre otra con 40%: el acuerdo viejo no sirve.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 2 * DIA_S);
    assert_eq!(m.c.try_aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000), Err(Ok(Error::MuestraInvalida)));
    m.c.abrir_muestra(&sala, &(1_000 + 2 * DIA_S), &(1_000 + 3 * DIA_S), &4_000);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
}

#[test]
fn nadie_acepta_una_muestra_por_el_artista() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, _museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    m.env.set_auths(&[]);
    assert!(m.c.try_aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &4_000).is_err());
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
}


#[test]
fn una_muestra_nueva_con_la_misma_fecha_de_inicio_pide_otra_firma() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 100), &0);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 100), &0);
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 200);
    // Misma fecha de inicio, otro porcentaje: el acuerdo viejo no sirve.
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &4_000);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
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
    use soroban_sdk::{testutils::{MockAuth, MockAuthInvoke}, IntoVal};
    let m = mundo();
    let (museo, _sala) = sala_con_fondo(&m, 0);
    m.c.proponer_actualizacion(&h(&m.env, 7));
    esperar(&m, PLAZO);
    // Un museo o un tercero que firman no pueden proponer, aplicar ni cancelar.
    for quien in [&museo, &m.beto] {
        let r = m
            .c
            .mock_auths(&[MockAuth {
                address: quien,
                invoke: &MockAuthInvoke {
                    contract: &m.c.address,
                    fn_name: "proponer_actualizacion",
                    args: (h(&m.env, 8),).into_val(&m.env),
                    sub_invokes: &[],
                },
            }])
            .try_proponer_actualizacion(&h(&m.env, 8));
        assert!(r.is_err());
        let r = m
            .c
            .mock_auths(&[MockAuth {
                address: quien,
                invoke: &MockAuthInvoke {
                    contract: &m.c.address,
                    fn_name: "aplicar_actualizacion",
                    args: ().into_val(&m.env),
                    sub_invokes: &[],
                },
            }])
            .try_aplicar_actualizacion();
        assert!(r.is_err());
        let r = m
            .c
            .mock_auths(&[MockAuth {
                address: quien,
                invoke: &MockAuthInvoke {
                    contract: &m.c.address,
                    fn_name: "cancelar_propuesta",
                    args: (TipoCambio::Codigo,).into_val(&m.env),
                    sub_invokes: &[],
                },
            }])
            .try_cancelar_propuesta(&TipoCambio::Codigo);
        assert!(r.is_err());
    }
    m.env.set_auths(&[]);
    assert!(m.c.try_proponer_actualizacion(&h(&m.env, 8)).is_err());
    assert!(m.c.try_aplicar_actualizacion().is_err());
    assert!(m.c.try_cancelar_propuesta(&TipoCambio::Codigo).is_err());
    assert_eq!(
        m.c.propuesta(&TipoCambio::Codigo),
        Some(Propuesta { cambio: Cambio::Codigo(h(&m.env, 7)), aplicable_desde: PLAZO, aplicable_hasta: PLAZO + VIGENCIA })
    );
}

// ---------- Versión 3: cambios sensibles en dos pasos ----------

#[test]
fn el_constructor_publica_su_aviso_y_guarda_el_plazo() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let env = Env::default();
    let admin = Address::generate(&env);
    let tesoro = Address::generate(&env);
    let id = env.register(Umbral, (admin.clone(), tesoro.clone(), 8_000u32, 72 * 3_600u64));
    assert_eq!(
        env.events().all().filter_by_contract(&id),
        std::vec![Creado { admin: admin.clone(), tesoro: tesoro.clone(), parte_autor_bps: 8_000, plazo_aviso: 72 * 3_600 }
            .to_xdr(&env, &id)]
    );
    let c = UmbralClient::new(&env, &id);
    assert_eq!(c.plazo_aviso(), 72 * 3_600);
    assert_eq!(c.administrador(), admin);
    assert_eq!(c.tesoro(), tesoro);
    assert_eq!(c.parte_autor(), 8_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #17)")]
fn un_plazo_de_aviso_menor_a_una_hora_se_rechaza() {
    let env = Env::default();
    let admin = Address::generate(&env);
    env.register(Umbral, (admin.clone(), admin, 8_000u32, 3_599u64));
}

#[test]
#[should_panic(expected = "Error(Contract, #17)")]
fn un_plazo_de_aviso_de_mas_de_90_dias_se_rechaza() {
    let env = Env::default();
    let admin = Address::generate(&env);
    env.register(Umbral, (admin.clone(), admin, 8_000u32, 91 * 86_400u64));
}

#[test]
fn la_parte_del_autor_no_cambia_antes_del_plazo() {
    let m = mundo_spec();
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::NoHayPropuesta)));
    assert_eq!(m.c.proponer_parte_autor(&5_000), PLAZO);
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::PlazoNoCumplido)));
    esperar(&m, PLAZO - 1);
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::PlazoNoCumplido)));
    assert_eq!(m.c.parte_autor(), 8_000);

    // Mientras tanto se sigue cobrando con la parte vieja.
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);

    esperar(&m, 1);
    m.c.aplicar_parte_autor();
    assert_eq!(m.c.parte_autor(), 5_000);
    assert_eq!(m.c.propuesta(&TipoCambio::ParteAutor), None);
    // Ya se usó: no se puede aplicar dos veces.
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::NoHayPropuesta)));
}

#[test]
fn proponer_de_nuevo_reinicia_el_plazo() {
    let m = mundo_spec();
    m.c.proponer_parte_autor(&5_000);
    esperar(&m, PLAZO - 10);
    m.c.proponer_parte_autor(&6_000);
    esperar(&m, 10);
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::PlazoNoCumplido)));
    esperar(&m, PLAZO);
    m.c.aplicar_parte_autor();
    assert_eq!(m.c.parte_autor(), 6_000);
}

#[test]
fn cancelar_una_propuesta_impide_aplicarla() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    let nuevo = Address::generate(&m.env);
    m.c.proponer_tesoro(&nuevo);
    m.c.cancelar_propuesta(&TipoCambio::Tesoro);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![PropuestaCancelada { cambio: Cambio::Tesoro(nuevo.clone()) }.to_xdr(&m.env, &yo)]
    );
    assert_eq!(m.c.propuesta(&TipoCambio::Tesoro), None);
    esperar(&m, PLAZO);
    assert_eq!(m.c.try_aplicar_tesoro(), Err(Ok(Error::NoHayPropuesta)));
    assert_eq!(m.c.tesoro(), m.tesoro);
    assert_eq!(m.c.try_cancelar_propuesta(&TipoCambio::Tesoro), Err(Ok(Error::NoHayPropuesta)));

    // Cancelar una no toca las de otro tipo.
    m.c.proponer_parte_autor(&5_000);
    m.c.proponer_actualizacion(&h(&m.env, 7));
    m.c.cancelar_propuesta(&TipoCambio::Codigo);
    assert!(m.c.propuesta(&TipoCambio::ParteAutor).is_some());
    esperar(&m, PLAZO);
    assert_eq!(m.c.try_aplicar_actualizacion(), Err(Ok(Error::NoHayPropuesta)));
    m.c.aplicar_parte_autor();
    assert_eq!(m.c.parte_autor(), 5_000);
}

#[test]
fn el_tesoro_nuevo_recibe_los_pagos_solo_despues_del_plazo() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    let nuevo = Address::generate(&m.env);
    m.c.proponer_tesoro(&nuevo);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![CambioPropuesto { cambio: Cambio::Tesoro(nuevo.clone()), aplicable_desde: PLAZO, aplicable_hasta: PLAZO + VIGENCIA }
            .to_xdr(&m.env, &yo)]
    );
    assert_eq!(m.c.try_aplicar_tesoro(), Err(Ok(Error::PlazoNoCumplido)));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC);

    esperar(&m, PLAZO);
    m.c.aplicar_tesoro();
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![CambioAplicado { cambio: Cambio::Tesoro(nuevo.clone()) }.to_xdr(&m.env, &yo)]
    );
    assert_eq!(m.c.tesoro(), nuevo);
    m.c.dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &None);
    assert_eq!(m.tk.balance(&nuevo), 2 * USDC);
    assert_eq!(m.tk.balance(&m.tesoro), 2 * USDC);
}

#[test]
fn el_admin_nuevo_firma_al_aplicar_y_el_viejo_deja_de_mandar() {
    use soroban_sdk::{testutils::{MockAuth, MockAuthInvoke}, IntoVal};
    let m = mundo_spec();
    let nuevo = Address::generate(&m.env);
    m.c.proponer_admin(&nuevo);
    assert_eq!(m.env.auths()[0].0, m.admin);
    assert_eq!(m.c.try_aplicar_admin(), Err(Ok(Error::PlazoNoCumplido)));
    esperar(&m, PLAZO);

    // El admin viejo solo no puede aplicarlo: tiene que firmar el nuevo.
    let r = m
        .c
        .mock_auths(&[MockAuth {
            address: &m.admin,
            invoke: &MockAuthInvoke { contract: &m.c.address, fn_name: "aplicar_admin", args: ().into_val(&m.env), sub_invokes: &[] },
        }])
        .try_aplicar_admin();
    assert!(r.is_err());
    assert_eq!(m.c.administrador(), m.admin);

    m.c.aplicar_admin();
    assert_eq!(m.env.auths()[0].0, nuevo);
    assert_eq!(m.c.administrador(), nuevo);

    // Ahora administra el nuevo.
    m.c.quitar_moneda(&m.moneda);
    assert_eq!(m.env.auths()[0].0, nuevo);
    let precios = Precios { huella: USDC, comentario: USDC };
    let r = m
        .c
        .mock_auths(&[MockAuth {
            address: &m.admin,
            invoke: &MockAuthInvoke {
                contract: &m.c.address,
                fn_name: "fijar_precios",
                args: (m.moneda.clone(), precios.clone()).into_val(&m.env),
                sub_invokes: &[],
            },
        }])
        .try_fijar_precios(&m.moneda, &precios);
    assert!(r.is_err());
}

#[test]
fn la_actualizacion_no_se_aplica_antes_del_plazo() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo();
    let yo = m.c.address.clone();
    assert_eq!(m.c.try_aplicar_actualizacion(), Err(Ok(Error::NoHayPropuesta)));
    m.c.proponer_actualizacion(&h(&m.env, 7));
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![CambioPropuesto { cambio: Cambio::Codigo(h(&m.env, 7)), aplicable_desde: PLAZO, aplicable_hasta: PLAZO + VIGENCIA }
            .to_xdr(&m.env, &yo)]
    );
    assert_eq!(m.c.try_aplicar_actualizacion(), Err(Ok(Error::PlazoNoCumplido)));
    esperar(&m, PLAZO);
    // Pasado el plazo, el contrato ya no lo frena: falla solo porque ese
    // código no está subido a la red de prueba.
    let r = m.c.try_aplicar_actualizacion();
    assert!(r.is_err());
    assert_ne!(r, Err(Ok(Error::PlazoNoCumplido)));
    assert_ne!(r, Err(Ok(Error::NoHayPropuesta)));
}

#[test]
fn sin_firma_del_admin_no_se_propone_ni_se_cancela() {
    let m = mundo();
    m.c.proponer_parte_autor(&5_000);
    m.env.set_auths(&[]);
    assert!(m.c.try_proponer_parte_autor(&6_000).is_err());
    assert!(m.c.try_proponer_admin(&m.ana).is_err());
    assert!(m.c.try_proponer_tesoro(&m.ana).is_err());
    assert!(m.c.try_cancelar_propuesta(&TipoCambio::ParteAutor).is_err());
    assert!(m.c.try_quitar_moneda(&m.moneda).is_err());
    assert!(m.c.propuesta(&TipoCambio::ParteAutor).is_some());
}

// ---------- Versión 3: obra raíz ----------

#[test]
fn cada_huella_guarda_la_obra_raiz() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let r1 = m.c.id_de(&m.beto, &h(&m.env, 102));
    let r2 = m.c.id_de(&m.caro, &h(&m.env, 103));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    m.c.comentar(&m.caro, &h(&m.env, 103), &r1, &true, &m.moneda, &MAX);
    assert_eq!(m.c.obtener(&obra).raiz, obra);
    assert_eq!(m.c.obtener(&r1).raiz, obra);
    assert_eq!(m.c.obtener(&r2).raiz, obra);
}

#[test]
fn moderar_la_obra_raiz_corta_comentar_y_apoyar_en_toda_la_cadena() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let r1 = m.c.id_de(&m.beto, &h(&m.env, 102));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    let saldo = m.c.saldo(&m.ana, &m.moneda);

    m.c.moderar(&obra);
    // La respuesta de Beto sigue activa, pero su obra raíz no.
    assert!(m.c.obtener(&r1).activa);
    let beto_antes = m.tk.balance(&m.beto);
    let caro_antes = m.tk.balance(&m.caro);
    assert_eq!(m.c.try_comentar(&m.caro, &h(&m.env, 103), &r1, &true, &m.moneda, &MAX), Err(Ok(Error::Retirada)));
    assert_eq!(m.c.try_apoyar(&m.caro, &r1, &m.moneda, &USDC), Err(Ok(Error::Retirada)));
    assert_eq!(m.c.try_apoyar(&m.beto, &obra, &m.moneda, &USDC), Err(Ok(Error::Retirada)));
    assert_eq!(m.tk.balance(&m.beto), beto_antes);
    assert_eq!(m.tk.balance(&m.caro), caro_antes);
    // Lo que el artista ya tenía anotado no cambia.
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), saldo);
}

#[test]
fn si_el_autor_retira_la_obra_raiz_tambien_se_corta_la_cadena() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let r1 = m.c.id_de(&m.beto, &h(&m.env, 102));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    m.c.retirar(&m.ana, &obra);
    assert_eq!(m.c.try_comentar(&m.caro, &h(&m.env, 103), &r1, &true, &m.moneda, &MAX), Err(Ok(Error::Retirada)));
    assert_eq!(m.c.try_apoyar(&m.caro, &r1, &m.moneda, &USDC), Err(Ok(Error::Retirada)));
}

#[test]
fn moderar_una_respuesta_no_corta_el_resto_de_la_obra() {
    let m = mundo_spec();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let r1 = m.c.id_de(&m.beto, &h(&m.env, 102));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    m.c.moderar(&r1);
    assert_eq!(m.c.try_comentar(&m.caro, &h(&m.env, 103), &r1, &true, &m.moneda, &MAX), Err(Ok(Error::Retirada)));
    m.c.comentar(&m.caro, &h(&m.env, 104), &obra, &true, &m.moneda, &MAX);
    m.c.apoyar(&m.caro, &obra, &m.moneda, &USDC);
}

// ---------- Versión 3: muestras ----------

#[test]
fn una_muestra_de_180_dias_que_empieza_dentro_de_un_ano_se_acepta() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, _museo, sala, _obra) = sala_con_obra();
    let ahora = 10 * DIA_S;
    m.env.ledger().with_mut(|l| l.timestamp = ahora);
    m.c.abrir_muestra(&sala, &(ahora + 365 * DIA_S), &(ahora + 545 * DIA_S), &2_000);
}

#[test]
fn el_museo_cierra_su_muestra_y_el_reparto_vuelve_al_de_siempre() {
    extern crate std;
    use soroban_sdk::{testutils::{Events as _, Ledger as _}, Event as _};
    let (m, museo, sala, obra) = sala_con_obra();
    let yo = m.c.address.clone();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + DIA_S);

    m.c.cerrar_muestra(&museo, &sala);
    assert_eq!(m.env.auths()[0].0, museo);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![MuestraCerrada { sala: sala.clone(), quien: museo.clone(), hasta: 1_000 + DIA_S - 1 }
            .to_xdr(&m.env, &yo)]
    );
    assert_eq!(m.c.muestra(&sala).unwrap().hasta, 1_000 + DIA_S - 1);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));

    // En el mismo momento ya rige el reparto de siempre.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
    // Ya no hay muestra en curso para cerrar, y se puede abrir otra enseguida.
    assert_eq!(m.c.try_cerrar_muestra(&museo, &sala), Err(Ok(Error::MuestraInvalida)));
    m.c.abrir_muestra(&sala, &(1_000 + DIA_S), &(1_000 + 2 * DIA_S), &1_000);
}

#[test]
fn el_admin_cierra_una_muestra_por_empezar_y_otro_no_puede() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, _museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    // Una muestra que empieza dentro de un año traba la sala hasta que se cierra.
    m.c.abrir_muestra(&sala, &(1_000 + 300 * DIA_S), &(1_000 + 310 * DIA_S), &2_000);
    assert_eq!(m.c.try_abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000), Err(Ok(Error::MuestraInvalida)));

    // Beto no es ni el museo ni el admin.
    assert_eq!(m.c.try_cerrar_muestra(&m.beto, &sala), Err(Ok(Error::NoAutorizado)));
    m.c.cerrar_muestra(&m.admin, &sala);
    let cerrada = m.c.muestra(&sala).unwrap();
    assert_eq!(cerrada.hasta, 999);
    assert!(cerrada.desde <= cerrada.hasta);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);

    // Sin muestra, o en una sala que no existe, no hay nada para cerrar.
    let otra = m.c.abrir_sala(&m.caro, &h(&m.env, 201));
    assert_eq!(m.c.try_cerrar_muestra(&m.caro, &otra), Err(Ok(Error::MuestraInvalida)));
    assert_eq!(m.c.try_cerrar_muestra(&m.admin, &h(&m.env, 250)), Err(Ok(Error::SalaNoExiste)));
}

#[test]
fn nadie_cierra_una_muestra_sin_firmar() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, _obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.env.set_auths(&[]);
    assert!(m.c.try_cerrar_muestra(&museo, &sala).is_err());
    assert_eq!(m.c.muestra(&sala).unwrap().hasta, 1_000 + DIA_S);
}

// ---------- Versión 3: salas ----------

#[test]
fn el_identificador_de_la_sala_lo_calcula_el_contrato() {
    let m = mundo();
    let museo = Address::generate(&m.env);
    let semilla = h(&m.env, 200);
    let sala = m.c.abrir_sala(&museo, &semilla);
    assert_eq!(sala, m.c.id_sala(&museo, &semilla));
    assert_eq!(m.c.museo_de(&sala), museo);
    // Otra cuenta con la misma semilla abre otra sala: no ocupa la del museo.
    let otra = m.c.abrir_sala(&m.beto, &semilla);
    assert_ne!(otra, sala);
    assert_eq!(m.c.museo_de(&sala), museo);
    assert_eq!(m.c.museo_de(&otra), m.beto);
    // Lleva el prefijo "sala": no coincide con el identificador de una huella.
    assert_ne!(m.c.id_sala(&museo, &semilla), m.c.id_de(&museo, &semilla));
    // Y es exactamente sha256("sala" ++ cuenta en XDR ++ semilla).
    let mut datos = soroban_sdk::Bytes::from_slice(&m.env, b"sala");
    datos.append(&soroban_sdk::xdr::ToXdr::to_xdr(museo.clone(), &m.env));
    datos.append(&soroban_sdk::Bytes::from(semilla.clone()));
    assert_eq!(sala, m.env.crypto().sha256(&datos).to_bytes());
}

// ---------- Versión 3: menores ----------

#[test]
fn la_huella_pagada_por_el_fondo_queda_marcada_como_presencial() {
    let m = mundo_spec();
    let (museo, sala) = sala_con_fondo(&m, 4 * USDC);
    m.c.invitar(&sala, &m.ana);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    // El museo deja una obra en su sala y la paga él: no prueba presencia.
    assert!(!m.c.dejar_huella(&museo, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone())));
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    assert!(m.c.obtener(&obra).presencial);
    assert!(!m.c.obtener(&m.c.id_de(&museo, &h(&m.env, 102))).presencial);
    assert!(!m.c.obtener(&m.c.id_de(&m.caro, &h(&m.env, 103))).presencial);
}

#[test]
fn una_invitacion_usada_se_puede_renovar_para_otro_encuentro() {
    let m = mundo_spec();
    let (_museo, sala) = sala_con_fondo(&m, 4 * USDC);
    m.c.invitar(&sala, &m.ana);
    assert!(m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert!(!m.c.invitada(&sala, &m.ana));
    // Otro encuentro: el museo la vuelve a invitar.
    m.c.invitar(&sala, &m.ana);
    assert!(m.c.invitada(&sala, &m.ana));
    // Pero no se puede invitar dos veces sin usarla.
    assert_eq!(m.c.try_invitar(&sala, &m.ana), Err(Ok(Error::YaInvitada)));
    assert!(m.c.dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
}

#[test]
fn se_renuevan_saldos_fondos_y_salas_sin_tocar_los_datos() {
    use soroban_sdk::testutils::{storage::Persistent as _, Ledger as _};
    let m = mundo_spec();
    let (museo, sala) = sala_con_fondo(&m, 4 * USDC);
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &m.c.id_de(&m.ana, &h(&m.env, 101)), &true, &m.moneda, &MAX);

    let ttl = |m: &Mundo, clave: &Clave| m.env.as_contract(&m.c.address, || m.env.storage().persistent().get_ttl(clave));
    let saldo = Clave::Saldo(m.ana.clone(), m.moneda.clone());
    let fondo = Clave::Fondo(sala.clone(), m.moneda.clone());
    let clave_sala = Clave::Sala(sala.clone());
    let muestra = Clave::Muestra(sala.clone());
    m.env.ledger().with_mut(|l| l.sequence_number += 60 * DIA);
    for c in [&saldo, &fondo, &clave_sala, &muestra] {
        assert!(ttl(&m, c) < VIDA);
    }

    m.c.renovar_saldo(&m.ana, &m.moneda);
    m.c.renovar_fondo(&sala, &m.moneda);
    m.c.renovar_sala(&sala);
    for c in [&saldo, &fondo, &clave_sala, &muestra] {
        assert_eq!(ttl(&m, c), VIDA);
    }
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 4 * USDC);
    assert_eq!(m.c.museo_de(&sala), museo);

    // Lo que no existe no se puede renovar.
    assert_eq!(m.c.try_renovar_saldo(&m.caro, &m.moneda), Err(Ok(Error::NadaParaCobrar)));
    assert_eq!(m.c.try_renovar_fondo(&h(&m.env, 250), &m.moneda), Err(Ok(Error::NoExiste)));
    assert_eq!(m.c.try_renovar_sala(&h(&m.env, 250)), Err(Ok(Error::SalaNoExiste)));
}

#[test]
fn quitar_una_moneda_frena_los_pagos_nuevos_pero_no_los_cobros() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let (museo, sala) = sala_con_fondo(&m, 4 * USDC);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);

    m.c.quitar_moneda(&m.moneda);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![MonedaQuitada { moneda: m.moneda.clone() }.to_xdr(&m.env, &yo)]
    );
    let no = Some(Ok(Error::MonedaNoAceptada));
    assert_eq!(m.c.try_precios(&m.moneda).err(), no);
    assert_eq!(m.c.try_dejar_huella(&m.caro, &h(&m.env, 103), &true, &m.moneda, &MAX, &None).err(), no);
    assert_eq!(m.c.try_comentar(&m.caro, &h(&m.env, 104), &obra, &true, &m.moneda, &MAX).err(), no);
    assert_eq!(m.c.try_apoyar(&m.caro, &obra, &m.moneda, &USDC).err(), no);
    assert_eq!(m.c.try_patrocinar(&museo, &sala, &m.moneda, &USDC).err(), no);
    assert_eq!(m.c.try_quitar_moneda(&m.moneda).err(), no);

    // Lo ya guardado se sigue cobrando y retirando.
    assert_eq!(m.c.cobrar(&m.ana, &m.moneda), USDC * 8 / 10);
    m.c.retirar_fondo(&sala, &m.moneda, &(4 * USDC));
    assert_eq!(m.tk.balance(&m.c.address), 0);

    // Se puede volver a aceptar cargándole precios.
    m.c.fijar_precios(&m.moneda, &Precios { huella: 2 * USDC, comentario: USDC });
    m.c.apoyar(&m.caro, &obra, &m.moneda, &USDC);
}

// ---------- Revisión de la versión 3 ----------

/// Cuánto dura una propuesta aplicable en el contrato (14 días).
const VIGENCIA: u64 = 14 * DIA_S;

#[test]
fn una_propuesta_vence_a_los_14_dias_y_se_puede_volver_a_proponer() {
    let m = mundo_spec();
    m.c.proponer_parte_autor(&5_000);
    assert_eq!(m.c.propuesta(&TipoCambio::ParteAutor).unwrap().aplicable_hasta, PLAZO + VIGENCIA);
    // Justo en el último segundo todavía vale (lo probamos con otra propuesta).
    m.c.proponer_tesoro(&m.beto);
    esperar(&m, PLAZO + VIGENCIA);
    m.c.aplicar_tesoro();
    assert_eq!(m.c.tesoro(), m.beto);
    // Un segundo después, vencida.
    esperar(&m, 1);
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::PropuestaVencida)));
    assert_eq!(m.c.parte_autor(), 8_000);
    // Se vuelve a proponer y, con un plazo nuevo, se aplica.
    m.c.proponer_parte_autor(&5_000);
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::PlazoNoCumplido)));
    esperar(&m, PLAZO);
    m.c.aplicar_parte_autor();
    assert_eq!(m.c.parte_autor(), 5_000);
    // Una vencida también se puede cancelar.
    m.c.proponer_actualizacion(&h(&m.env, 7));
    esperar(&m, PLAZO + VIGENCIA + 1);
    assert_eq!(m.c.try_aplicar_actualizacion(), Err(Ok(Error::PropuestaVencida)));
    m.c.cancelar_propuesta(&TipoCambio::Codigo);
    assert_eq!(m.c.propuesta(&TipoCambio::Codigo), None);
}

#[test]
fn aplicar_un_admin_nuevo_borra_las_demas_propuestas() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    let nuevo = Address::generate(&m.env);
    m.c.proponer_actualizacion(&h(&m.env, 7));
    m.c.proponer_tesoro(&m.beto);
    m.c.proponer_parte_autor(&5_000);
    m.c.proponer_admin(&nuevo);
    esperar(&m, PLAZO);
    m.c.aplicar_admin();
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![
            PropuestaCancelada { cambio: Cambio::Codigo(h(&m.env, 7)) }.to_xdr(&m.env, &yo),
            PropuestaCancelada { cambio: Cambio::Tesoro(m.beto.clone()) }.to_xdr(&m.env, &yo),
            PropuestaCancelada { cambio: Cambio::ParteAutor(5_000) }.to_xdr(&m.env, &yo),
            CambioAplicado { cambio: Cambio::Admin(nuevo.clone()) }.to_xdr(&m.env, &yo),
        ]
    );
    for tipo in [TipoCambio::Codigo, TipoCambio::Tesoro, TipoCambio::ParteAutor, TipoCambio::Admin] {
        assert_eq!(m.c.propuesta(&tipo), None);
    }
    assert_eq!(m.c.try_aplicar_tesoro(), Err(Ok(Error::NoHayPropuesta)));
    assert_eq!(m.c.try_aplicar_parte_autor(), Err(Ok(Error::NoHayPropuesta)));
    assert_eq!(m.c.try_aplicar_actualizacion(), Err(Ok(Error::NoHayPropuesta)));
    assert_eq!(m.c.tesoro(), m.tesoro);
    assert_eq!(m.c.parte_autor(), 8_000);
}

#[test]
fn muestra_y_acuerdo_viven_al_menos_hasta_el_fin_de_la_muestra() {
    use soroban_sdk::testutils::{storage::Persistent as _, Ledger as _};
    let (m, _museo, sala, _obra) = sala_con_obra();
    let ahora = 1_000;
    let hasta = ahora + 170 * DIA_S;
    m.env.ledger().with_mut(|l| l.timestamp = ahora);
    m.c.abrir_muestra(&sala, &ahora, &hasta, &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &ahora, &hasta, &2_000);
    let ttl = |m: &Mundo, clave: &Clave| m.env.as_contract(&m.c.address, || m.env.storage().persistent().get_ttl(clave));
    let muestra = Clave::Muestra(sala.clone());
    let acuerdo = Clave::Acuerdo(sala.clone(), m.ana.clone());
    // 170 días en ledgers de 5 segundos, más un día de margen: más que la vida de siempre.
    let esperado = (170 * DIA_S / 5) as u32 + DIA;
    assert!(esperado > VIDA);
    assert!(ttl(&m, &muestra) >= esperado - 1);
    assert!(ttl(&m, &acuerdo) >= esperado - 1);
    // Pasan 150 días sin tocar la muestra ni el acuerdo: con la vida de
    // siempre (120) ya se habrían archivado. A los 100 alguien renueva otra
    // cosa (una huella), así la instancia del contrato sigue viva.
    m.env.ledger().with_mut(|l| l.sequence_number += 100 * DIA);
    m.c.renovar(&_obra);
    m.env.ledger().with_mut(|l| {
        l.sequence_number += 50 * DIA;
        l.timestamp = ahora + 150 * DIA_S;
    });
    assert!(ttl(&m, &muestra) > 0);
    assert!(m.c.acepto_muestra(&sala, &m.ana));
    // renovar_acuerdo lo lleva de nuevo hasta el fin de la muestra (o la vida de siempre).
    m.c.renovar_acuerdo(&sala, &m.ana);
    assert_eq!(ttl(&m, &acuerdo), VIDA);
    assert_eq!(m.c.try_renovar_acuerdo(&sala, &m.beto), Err(Ok(Error::NoExiste)));
}

#[test]
fn comentar_durante_la_muestra_renueva_muestra_acuerdo_y_sala() {
    use soroban_sdk::testutils::{storage::Persistent as _, Ledger as _};
    let (m, _museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000);
    let ttl = |m: &Mundo, clave: &Clave| m.env.as_contract(&m.c.address, || m.env.storage().persistent().get_ttl(clave));
    let claves = [
        Clave::Muestra(sala.clone()),
        Clave::Acuerdo(sala.clone(), m.ana.clone()),
        Clave::Sala(sala.clone()),
    ];
    m.env.ledger().with_mut(|l| l.sequence_number += 30 * DIA);
    for c in &claves {
        assert!(ttl(&m, c) < VIDA - DIA);
    }
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    for c in &claves {
        assert_eq!(ttl(&m, c), VIDA);
    }
}

#[test]
fn reabrir_una_muestra_igual_pide_una_firma_nueva() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    let hasta = 1_000 + 7 * DIA_S;
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &hasta, &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &hasta, &2_000);
    m.env.ledger().with_mut(|l| l.timestamp = 2_000);
    m.c.cerrar_muestra(&museo, &sala);
    // La sala reabre una muestra con los mismos valores: es la número 2.
    m.c.abrir_muestra(&sala, &1_000, &hasta, &2_000);
    assert_eq!(m.c.muestra(&sala).unwrap().numero, 2);
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
    // El acuerdo viejo no revive: Ana cobra su 80% y la sala nada.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 0);
    // Aceptar con el número viejo no vale; con el nuevo, sí.
    assert_eq!(
        m.c.try_aceptar_muestra(&m.ana, &sala, &1, &1_000, &hasta, &2_000),
        Err(Ok(Error::MuestraInvalida))
    );
    m.c.aceptar_muestra(&m.ana, &sala, &2, &1_000, &hasta, &2_000);
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10 + USDC * 5 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 2 / 10);
}

/// Wasm de Umbral compilado con `stellar contract build` y copiado acá.
const WASM_UMBRAL: &[u8] = include_bytes!("../testdata/umbral.wasm");

#[test]
fn una_actualizacion_real_se_aplica_despues_del_plazo_y_conserva_los_datos() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let (museo, sala) = sala_con_fondo(&m, 4 * USDC);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    let huella = m.c.obtener(&obra);

    let hash = m.env.deployer().upload_contract_wasm(WASM_UMBRAL);
    m.c.proponer_actualizacion(&hash);
    assert_eq!(m.c.try_aplicar_actualizacion(), Err(Ok(Error::PlazoNoCumplido)));
    esperar(&m, PLAZO);
    m.c.aplicar_actualizacion();
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![CambioAplicado { cambio: Cambio::Codigo(hash.clone()) }.to_xdr(&m.env, &yo)]
    );
    assert_eq!(m.c.propuesta(&TipoCambio::Codigo), None);

    // Ahora corre el código subido, con los mismos datos.
    assert_eq!(m.c.obtener(&obra), huella);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 4 * USDC);
    assert_eq!(m.c.museo_de(&sala), museo);
    assert_eq!(m.c.administrador(), m.admin);
    assert_eq!(m.c.parte_autor(), 8_000);
    assert_eq!(m.c.plazo_aviso(), PLAZO);
    // Y sigue funcionando: Ana cobra lo suyo.
    assert_eq!(m.c.cobrar(&m.ana, &m.moneda), USDC * 8 / 10);
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
}

// ---------- Arreglos de sala, invitaciones y redondeo ----------

/// Lo que el contrato tiene en custodia tiene que ser exactamente lo que debe:
/// los saldos a cobrar más lo que queda en los fondos.
fn custodia_cierra(m: &Mundo, saldos: &[&Address], salas: &[&BytesN<32>]) {
    let mut debe: i128 = 0;
    for cuenta in saldos {
        debe += m.c.saldo(cuenta, &m.moneda);
    }
    for sala in salas {
        debe += m.c.fondo(sala, &m.moneda);
    }
    assert_eq!(m.tk.balance(&m.c.address), debe);
}

// B. Invitado sin fondo no paga de su bolsillo.

#[test]
fn un_invitado_sin_fondo_no_paga_de_su_bolsillo() {
    let m = mundo();
    let (museo, sala) = sala_con_fondo(&m, P_HUELLA - 1);
    m.c.invitar(&sala, &m.ana);

    // Al fondo le falta una unidad: falla en vez de cobrarle a Ana.
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::FondoInsuficiente)));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM);
    assert_eq!(m.tk.balance(&m.tesoro), 0);
    assert_eq!(m.c.fondo(&sala, &m.moneda), P_HUELLA - 1);
    assert!(m.c.invitada(&sala, &m.ana));
    assert_eq!(m.c.try_obtener(&m.c.id_de(&m.ana, &h(&m.env, 101))), Err(Ok(Error::NoExiste)));

    // Cuando el fondo alcanza, la misma invitación sirve.
    m.c.patrocinar(&museo, &sala, &m.moneda, &1);
    assert!(m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA);
    custodia_cierra(&m, &[&m.ana], &[&sala]);
}

#[test]
fn un_invitado_no_paga_si_el_fondo_esta_en_otra_moneda() {
    let m = mundo();
    let otra = nueva_moneda(&m.env, &[&m.ana]);
    m.c.fijar_precios(&otra, &Precios { huella: P_HUELLA, comentario: P_COMENTARIO });
    let otra_tk = token::TokenClient::new(&m.env, &otra);
    // El fondo está en la primera moneda; Ana intenta en la segunda.
    let (_museo, sala) = sala_con_fondo(&m, 3 * P_HUELLA);
    m.c.invitar(&sala, &m.ana);
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 101), &true, &otra, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::FondoInsuficiente)));
    assert_eq!(otra_tk.balance(&m.ana), 1_000 * XLM);
    assert!(m.c.invitada(&sala, &m.ana));
    // Sin sala, paga ella como siempre y la invitación queda sin usar.
    assert!(!m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &otra, &MAX, &None));
    assert_eq!(otra_tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
    assert!(m.c.invitada(&sala, &m.ana));
}

// E. Nadie dice que su obra es de una sala sin un vínculo real.

#[test]
fn sin_vinculo_con_la_sala_no_se_puede_nombrarla() {
    let m = mundo();
    let (_museo, sala) = sala_con_fondo(&m, 5 * P_HUELLA);
    let r = m.c.try_dejar_huella(&m.caro, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 5 * P_HUELLA);
    assert_eq!(m.c.try_obtener(&m.c.id_de(&m.caro, &h(&m.env, 101))), Err(Ok(Error::NoExiste)));

    // Una invitación a otra sala no sirve para esta.
    let otro_museo = Address::generate(&m.env);
    token::StellarAssetClient::new(&m.env, &m.moneda).mint(&otro_museo, &(1_000 * XLM));
    let otra_sala = m.c.abrir_sala(&otro_museo, &h(&m.env, 201));
    m.c.invitar(&otra_sala, &m.caro);
    let r = m.c.try_dejar_huella(&m.caro, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
    // Y el museo de otra sala tampoco puede nombrar esta.
    let r = m.c.try_dejar_huella(&otro_museo, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
    assert_eq!(m.tk.balance(&otro_museo), 1_000 * XLM);
}

#[test]
fn el_museo_y_el_artista_con_muestra_aceptada_nombran_la_sala_y_pagan_ellos() {
    use soroban_sdk::testutils::Ledger as _;
    let m = mundo();
    let (museo, sala) = sala_con_fondo(&m, 5 * P_HUELLA);
    let museo_antes = m.tk.balance(&museo);

    // El museo dueño de la sala: paga él, el fondo no se toca.
    assert!(!m.c.dejar_huella(&museo, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&museo), museo_antes - P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 5 * P_HUELLA);

    // Ana todavía no aceptó la muestra: no puede.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &(1_000 + DIA_S), &(1_000 + 3 * DIA_S), &2_000);
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));

    // La acepta (aunque no haya empezado) y ya puede; paga ella.
    m.c.aceptar_muestra(&m.ana, &sala, &1, &(1_000 + DIA_S), &(1_000 + 3 * DIA_S), &2_000);
    assert!(!m.c.dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
    let obra = m.c.obtener(&m.c.id_de(&m.ana, &h(&m.env, 102)));
    assert_eq!(obra.sala, Some(sala.clone()));
    assert!(!obra.presencial);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 5 * P_HUELLA);

    // Terminada la muestra, el acuerdo ya no la vincula con la sala.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000 + 4 * DIA_S);
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
}

// D. El artista puede salirse de una muestra que aceptó.

#[test]
fn el_artista_se_sale_de_la_muestra_y_vuelve_el_reparto_de_siempre() {
    extern crate std;
    use soroban_sdk::{testutils::{Events as _, Ledger as _}, Event as _};
    let (m, museo, sala, obra) = sala_con_obra();
    let yo = m.c.address.clone();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 5 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 2 / 10);

    // cerrar_muestra es del museo o del administrador: el artista no puede.
    assert_eq!(m.c.try_cerrar_muestra(&m.ana, &sala), Err(Ok(Error::NoAutorizado)));

    m.c.salir_de_muestra(&m.ana, &sala);
    assert_eq!(m.env.auths()[0].0, m.ana);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![MuestraAbandonada { sala: sala.clone(), artista: m.ana.clone() }.to_xdr(&m.env, &yo)]
    );
    assert!(!m.c.acepto_muestra(&sala, &m.ana));
    // La muestra de la sala sigue igual para los demás.
    assert_eq!(m.c.muestra(&sala).unwrap().hasta, 1_000 + 7 * DIA_S);

    // Desde ese momento: 80 para el artista, nada para la sala.
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 5 / 10 + USDC * 8 / 10);
    assert_eq!(m.c.saldo(&museo, &m.moneda), USDC * 2 / 10);
    // Ya sin acuerdo, tampoco puede sumar obras nuevas a esa sala.
    let r = m.c.try_dejar_huella(&m.ana, &h(&m.env, 104), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::NoAutorizado)));

    // Puede volver a aceptar la misma muestra.
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    assert!(m.c.acepto_muestra(&sala, &m.ana));
}

#[test]
fn salir_de_una_muestra_sin_acuerdo_o_sin_firma_falla() {
    use soroban_sdk::{testutils::{Ledger as _, MockAuth, MockAuthInvoke}, IntoVal};
    let (m, _museo, sala, _obra) = sala_con_obra();
    // Sala que no existe, y sala sin acuerdo de esa cuenta.
    assert_eq!(m.c.try_salir_de_muestra(&m.ana, &h(&m.env, 250)), Err(Ok(Error::SalaNoExiste)));
    assert_eq!(m.c.try_salir_de_muestra(&m.ana, &sala), Err(Ok(Error::MuestraInvalida)));
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    assert_eq!(m.c.try_salir_de_muestra(&m.ana, &sala), Err(Ok(Error::MuestraInvalida)));
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000);
    // Beto no tiene acuerdo, aunque Ana sí.
    assert_eq!(m.c.try_salir_de_muestra(&m.beto, &sala), Err(Ok(Error::MuestraInvalida)));

    // Beto firma la salida de Ana: no vale.
    let r = m
        .c
        .mock_auths(&[MockAuth {
            address: &m.beto,
            invoke: &MockAuthInvoke {
                contract: &m.c.address,
                fn_name: "salir_de_muestra",
                args: (m.ana.clone(), sala.clone()).into_val(&m.env),
                sub_invokes: &[],
            },
        }])
        .try_salir_de_muestra(&m.ana, &sala);
    assert!(r.is_err());
    assert!(m.c.acepto_muestra(&sala, &m.ana));

    // Salir dos veces: la segunda ya no tiene acuerdo.
    m.env.mock_all_auths();
    m.c.salir_de_muestra(&m.ana, &sala);
    assert_eq!(m.c.try_salir_de_muestra(&m.ana, &sala), Err(Ok(Error::MuestraInvalida)));
}

// I. Redondeo parejo: lo que sobra queda del lado de Umbral.

#[test]
fn en_un_apoyo_el_redondeo_queda_del_lado_de_umbral() {
    let m = mundo();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    // 7 unidades: el 80% es 5,6. El artista recibe 5 y Umbral 2.
    m.c.apoyar(&m.caro, &obra, &m.moneda, &7);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 5);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + 2);
    // 4 unidades: 3,2. El artista recibe 3 y Umbral 1.
    m.c.apoyar(&m.caro, &obra, &m.moneda, &4);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 5 + 3);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + 2 + 1);
    // No se pierde ni aparece nada.
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - 11);
    custodia_cierra(&m, &[&m.ana], &[]);
}

#[test]
fn un_apoyo_de_una_sola_unidad_no_falla_y_va_entero_a_umbral() {
    let m = mundo();
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &None);
    m.c.apoyar(&m.caro, &obra, &m.moneda, &1);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 0);
    assert_eq!(m.tk.balance(&m.c.address), 0);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + 1);
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - 1);
    assert_eq!(m.c.obtener(&obra).apoyos, 1);
    // No queda un saldo en cero anotado: no hay nada para cobrar.
    assert_eq!(m.c.try_cobrar(&m.ana, &m.moneda), Err(Ok(Error::NadaParaCobrar)));
    // Con 5 unidades ya le tocan 4 al artista.
    m.c.apoyar(&m.caro, &obra, &m.moneda, &5);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 4);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA + 1 + 1);
}

// A. El encuentro en persona también le paga a quien hizo la obra.

#[test]
fn un_invitado_comenta_y_el_fondo_paga_con_el_reparto_de_siempre() {
    extern crate std;
    use soroban_sdk::{testutils::Events as _, Event as _};
    let m = mundo_spec();
    let yo = m.c.address.clone();
    // Fondo: 2 USDC para la obra de Ana y 3 más.
    let (_museo, sala) = sala_con_fondo(&m, 5 * USDC);
    m.c.invitar(&sala, &m.ana);
    m.c.dejar_huella(&m.ana, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone()));
    let obra = m.c.id_de(&m.ana, &h(&m.env, 101));
    let comentario = m.c.id_de(&m.beto, &h(&m.env, 102));
    let tesoro_antes = m.tk.balance(&m.tesoro);

    m.c.invitar(&sala, &m.beto);
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &USDC);
    assert_eq!(
        m.env.events().all().filter_by_contract(&yo),
        std::vec![
            FondoUsado { sala: sala.clone(), cuenta: m.beto.clone(), moneda: m.moneda.clone(), monto: USDC }
                .to_xdr(&m.env, &yo),
            SaldoAcreditado { beneficiario: m.ana.clone(), moneda: m.moneda.clone(), monto: USDC * 8 / 10 }
                .to_xdr(&m.env, &yo),
            HuellaDejada {
                id: comentario.clone(),
                autor: m.beto.clone(),
                artista: m.ana.clone(),
                digest: h(&m.env, 102),
                padre: Some(obra.clone()),
                sala: Some(sala.clone()),
            }
            .to_xdr(&m.env, &yo),
        ]
    );

    // Beto no pagó; el fondo bajó 1 USDC; Ana tiene su 80% y Umbral el 20%.
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 2 * USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 2 / 10);
    assert!(!m.c.invitada(&sala, &m.beto));
    assert!(m.c.obtener(&comentario).presencial);
    assert_eq!(m.c.obtener(&obra).respuestas, 1);
    custodia_cierra(&m, &[&m.ana], &[&sala]);

    // La invitación se gastó: el siguiente comentario lo paga Beto.
    m.c.comentar(&m.beto, &h(&m.env, 103), &obra, &true, &m.moneda, &USDC);
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM - USDC);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 2 * USDC);
    assert!(!m.c.obtener(&m.c.id_de(&m.beto, &h(&m.env, 103))).presencial);

    // También vale sobre una respuesta: la sala es la de la obra raíz.
    m.c.invitar(&sala, &m.caro);
    m.c.comentar(&m.caro, &h(&m.env, 104), &comentario, &true, &m.moneda, &USDC);
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM);
    assert_eq!(m.c.fondo(&sala, &m.moneda), USDC);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 3 * (USDC * 8 / 10));
    assert!(m.c.obtener(&m.c.id_de(&m.caro, &h(&m.env, 104))).presencial);
    custodia_cierra(&m, &[&m.ana], &[&sala]);

    // Ana cobra todo y el contrato se queda solo con el fondo.
    assert_eq!(m.c.cobrar(&m.ana, &m.moneda), 3 * (USDC * 8 / 10));
    assert_eq!(m.tk.balance(&m.c.address), USDC);
}

#[test]
fn la_contabilidad_cierra_cuando_el_fondo_paga_un_comentario_en_muestra() {
    use soroban_sdk::testutils::Ledger as _;
    let (m, museo, sala, obra) = sala_con_obra();
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + 7 * DIA_S), &2_000);
    // Un precio impar, para que haya redondeo: 1 USDC y 3 unidades.
    let precio = USDC + 3;
    m.c.fijar_precios(&m.moneda, &Precios { huella: 2 * USDC, comentario: precio });
    m.c.patrocinar(&museo, &sala, &m.moneda, &(3 * USDC));
    m.c.invitar(&sala, &m.beto);
    let tesoro_antes = m.tk.balance(&m.tesoro);
    let contrato_antes = m.tk.balance(&m.c.address);
    assert_eq!(contrato_antes, 3 * USDC);

    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);

    // Mismo reparto que un comentario pago en muestra: 50 / 20 / 30.
    let para_ana = precio * 5 / 10;
    let para_sala = precio * 2 / 10;
    let para_umbral = precio - para_ana - para_sala;
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), para_ana);
    assert_eq!(m.c.saldo(&museo, &m.moneda), para_sala);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, para_umbral);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 3 * USDC - precio);
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM);
    // Del contrato solo salió lo de Umbral.
    assert_eq!(contrato_antes - m.tk.balance(&m.c.address), para_umbral);
    // Saldo del contrato == suma de saldos + fondo restante.
    custodia_cierra(&m, &[&m.ana, &museo], &[&sala]);

    // Un comentario pago por Caro reparte igual y la cuenta sigue cerrando.
    m.c.comentar(&m.caro, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), 2 * para_ana);
    assert_eq!(m.c.saldo(&museo, &m.moneda), 2 * para_sala);
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - precio);
    custodia_cierra(&m, &[&m.ana, &museo], &[&sala]);

    // Todos retiran lo suyo y el contrato queda en cero.
    m.c.cobrar(&m.ana, &m.moneda);
    m.c.cobrar(&museo, &m.moneda);
    m.c.retirar_fondo(&sala, &m.moneda, &(3 * USDC - precio));
    assert_eq!(m.tk.balance(&m.c.address), 0);
}

#[test]
fn el_comentario_de_un_invitado_sin_fondo_lo_paga_el_y_la_invitacion_sigue() {
    let (m, museo, sala, obra) = sala_con_obra();
    // El fondo quedó en cero después de la obra de Ana.
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
    m.c.invitar(&sala, &m.beto);
    m.c.patrocinar(&museo, &sala, &m.moneda, &(USDC - 1));
    let tesoro_antes = m.tk.balance(&m.tesoro);

    // Al fondo le falta una unidad: Beto no queda trabado, paga él como
    // siempre, y la invitación le queda para otra vez.
    m.c.comentar(&m.beto, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM - USDC);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 2 / 10);
    assert_eq!(m.c.fondo(&sala, &m.moneda), USDC - 1);
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert!(m.c.invitada(&sala, &m.beto));
    assert_eq!(m.c.obtener(&obra).respuestas, 1);
    assert!(!m.c.obtener(&m.c.id_de(&m.beto, &h(&m.env, 102))).presencial);
    custodia_cierra(&m, &[&m.ana], &[&sala]);

    // Con el fondo completo, la misma invitación sirve.
    m.c.patrocinar(&museo, &sala, &m.moneda, &1);
    m.c.comentar(&m.beto, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM - USDC);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
    assert!(!m.c.invitada(&sala, &m.beto));
    assert!(m.c.obtener(&m.c.id_de(&m.beto, &h(&m.env, 103))).presencial);
    custodia_cierra(&m, &[&m.ana], &[&sala]);
}

#[test]
fn un_invitado_que_comenta_su_propia_obra_paga_de_su_bolsillo() {
    let (m, museo, sala, obra) = sala_con_obra();
    // Hay fondo de sobra y el museo vuelve a invitar a Ana.
    m.c.patrocinar(&museo, &sala, &m.moneda, &(3 * USDC));
    m.c.invitar(&sala, &m.ana);
    let ana_antes = m.tk.balance(&m.ana);
    let tesoro_antes = m.tk.balance(&m.tesoro);

    // Ana comenta su propia obra: el fondo no se usa para pagarle a ella.
    m.c.comentar(&m.ana, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.tk.balance(&m.ana), ana_antes - USDC);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 3 * USDC);
    assert!(m.c.invitada(&sala, &m.ana));
    assert_eq!(m.c.saldo(&m.ana, &m.moneda), USDC * 8 / 10);
    assert_eq!(m.tk.balance(&m.tesoro) - tesoro_antes, USDC * 2 / 10);
    let comentario = m.c.id_de(&m.ana, &h(&m.env, 102));
    assert!(!m.c.obtener(&comentario).presencial);
    custodia_cierra(&m, &[&m.ana], &[&sala]);

    // Tampoco sobre una respuesta de otro en su obra: la artista sigue siendo ella.
    m.c.comentar(&m.beto, &h(&m.env, 103), &obra, &true, &m.moneda, &MAX);
    let de_beto = m.c.id_de(&m.beto, &h(&m.env, 103));
    m.c.comentar(&m.ana, &h(&m.env, 104), &de_beto, &true, &m.moneda, &MAX);
    assert_eq!(m.tk.balance(&m.ana), ana_antes - 2 * USDC);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 3 * USDC);
    assert!(m.c.invitada(&sala, &m.ana));
    custodia_cierra(&m, &[&m.ana], &[&sala]);
}

#[test]
fn el_museo_con_invitacion_y_sin_fondo_publica_pagando() {
    use soroban_sdk::testutils::Ledger as _;
    let m = mundo();
    let (museo, sala) = sala_con_fondo(&m, P_HUELLA - 1);
    let museo_antes = m.tk.balance(&museo);

    // El museo se invitó a sí mismo y el fondo no alcanza: publica igual,
    // pagando él, sin marca de presencial y sin gastar la invitación.
    m.c.invitar(&sala, &museo);
    assert!(!m.c.dejar_huella(&museo, &h(&m.env, 101), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&museo), museo_antes - P_HUELLA);
    assert_eq!(m.tk.balance(&m.tesoro), P_HUELLA);
    assert_eq!(m.c.fondo(&sala, &m.moneda), P_HUELLA - 1);
    assert!(m.c.invitada(&sala, &museo));
    assert!(!m.c.obtener(&m.c.id_de(&museo, &h(&m.env, 101))).presencial);
    custodia_cierra(&m, &[&museo], &[&sala]);

    // Lo mismo para una artista con muestra aceptada e invitación.
    m.env.ledger().with_mut(|l| l.timestamp = 1_000);
    m.c.abrir_muestra(&sala, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.aceptar_muestra(&m.ana, &sala, &1, &1_000, &(1_000 + DIA_S), &2_000);
    m.c.invitar(&sala, &m.ana);
    assert!(!m.c.dejar_huella(&m.ana, &h(&m.env, 102), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert_eq!(m.tk.balance(&m.ana), 1_000 * XLM - P_HUELLA);
    assert!(m.c.invitada(&sala, &m.ana));

    // Con la invitación como único vínculo, sigue fallando sin cobrar.
    m.c.invitar(&sala, &m.beto);
    let r = m.c.try_dejar_huella(&m.beto, &h(&m.env, 103), &true, &m.moneda, &MAX, &Some(sala.clone()));
    assert_eq!(r, Err(Ok(Error::FondoInsuficiente)));
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM);

    // Cuando el fondo alcanza, al museo también le paga el fondo.
    m.c.patrocinar(&museo, &sala, &m.moneda, &1);
    assert!(m.c.dejar_huella(&museo, &h(&m.env, 104), &true, &m.moneda, &MAX, &Some(sala.clone())));
    assert!(!m.c.invitada(&sala, &museo));
    assert_eq!(m.c.fondo(&sala, &m.moneda), 0);
    custodia_cierra(&m, &[&museo, &m.ana], &[&sala]);
}

#[test]
fn sin_invitacion_a_esa_sala_el_comentario_se_paga_como_siempre() {
    let (m, museo, sala, obra) = sala_con_obra();
    m.c.patrocinar(&museo, &sala, &m.moneda, &(3 * USDC));

    // Caro no fue invitada: paga ella, el fondo no se toca.
    m.c.comentar(&m.caro, &h(&m.env, 102), &obra, &true, &m.moneda, &MAX);
    assert_eq!(m.tk.balance(&m.caro), 1_000 * XLM - USDC);
    assert_eq!(m.c.fondo(&sala, &m.moneda), 3 * USDC);
    assert!(!m.c.obtener(&m.c.id_de(&m.caro, &h(&m.env, 102))).presencial);

    // Beto tiene invitación a esta sala, pero comenta una obra de afuera:
    // paga él y la invitación queda sin usar.
    m.c.invitar(&sala, &m.beto);
    m.c.dejar_huella(&m.caro, &h(&m.env, 110), &true, &m.moneda, &MAX, &None);
    let afuera = m.c.id_de(&m.caro, &h(&m.env, 110));
    m.c.comentar(&m.beto, &h(&m.env, 111), &afuera, &true, &m.moneda, &MAX);
    assert_eq!(m.tk.balance(&m.beto), 1_000 * XLM - USDC);
    assert!(m.c.invitada(&sala, &m.beto));
    assert_eq!(m.c.fondo(&sala, &m.moneda), 3 * USDC);
    assert!(!m.c.obtener(&m.c.id_de(&m.beto, &h(&m.env, 111))).presencial);
    custodia_cierra(&m, &[&m.ana, &m.caro], &[&sala]);
}
