//! Umbral: registro de huellas con valor (versión 3).
//!
//! Cada huella (un texto, una foto o un audio) queda anotada con su autor, el
//! código que identifica su contenido y, si es un comentario, la huella de la
//! que nació y la obra raíz de la cadena. Dejar una huella y continuarla se
//! pagan en una moneda aceptada (USDC o XLM). Al continuar, una parte queda a
//! nombre del artista que abrió la obra, en toda la cadena. Apoyar es un pago
//! voluntario de monto libre que también va al artista. Quien responde no
//! cobra. El contenido nunca se guarda acá: solo su código (SHA-256).
//!
//! Los cambios sensibles (código, parte del artista, administrador y tesoro)
//! se hacen en dos pasos: primero se proponen, con un aviso público, y solo se
//! pueden aplicar después del plazo fijado en el constructor. Así cualquiera
//! ve el cambio venir y puede cobrar antes.
#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, xdr::ToXdr, Address,
    Bytes, BytesN, Env,
};

/// Un día en ledgers (uno cada 5 segundos, aprox.).
const DIA: u32 = 17_280;
/// Cuánto se extiende la vida de cada dato al tocarlo.
const VIDA: u32 = 120 * DIA;
/// Por debajo de este resto de vida, se renueva.
const UMBRAL_VIDA: u32 = VIDA - DIA;
/// Un día en segundos.
const SEGUNDOS_DIA: u64 = 86_400;
/// 100% en puntos básicos.
const TOTAL_BPS: u32 = 10_000;
/// Parte de cada apoyo voluntario que queda para Umbral (20%).
const APOYO_UMBRAL_BPS: u32 = 2_000;
/// Parte fija de Umbral durante una muestra en la que la sala cobra algo
/// (30%): ahí Umbral participa armando la muestra. La sala cobra la suya y el
/// artista, el resto. Si la sala no cobra nada, rige el reparto de siempre.
const MUESTRA_UMBRAL_BPS: u32 = 3_000;
/// Piso de la parte del artista en una continuación (30%). Ningún
/// administrador puede bajarla de acá.
const PISO_AUTOR_BPS: u32 = 3_000;
/// Tope de la parte que puede recibir una sala durante su muestra (40%).
/// La parte de la sala se elige al abrir cada muestra; con el 30% de Umbral,
/// el artista se queda con el resto, que nunca baja del piso.
const MUESTRA_SALA_MAX_BPS: u32 = 4_000;
/// Duración máxima de una muestra (180 días).
const MUESTRA_MAX: u64 = 180 * SEGUNDOS_DIA;
/// Cuánto antes de hoy puede empezar una muestra que se abre (1 día).
const MUESTRA_ATRASO_MAX: u64 = SEGUNDOS_DIA;
/// Cuánto después de hoy puede empezar una muestra que se abre (365 días).
const MUESTRA_ANTICIPO_MAX: u64 = 365 * SEGUNDOS_DIA;
/// Plazo mínimo entre proponer un cambio sensible y aplicarlo (1 hora).
const PLAZO_MIN: u64 = 3_600;
/// Plazo máximo, para que un error al crear el contrato no lo deje sin
/// poder cambiar nada (90 días).
const PLAZO_MAX: u64 = 90 * SEGUNDOS_DIA;
/// Cuánto tiempo, después de cumplido el plazo, se puede aplicar una
/// propuesta (14 días). Pasado eso vence y hay que volver a proponerla.
const VIGENCIA_PROPUESTA: u64 = 14 * SEGUNDOS_DIA;
/// Segundos por ledger, aproximado, para pasar fechas a vigencia.
const SEGUNDOS_LEDGER: u64 = 5;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Ya hay una huella (o una sala) con ese identificador.
    YaExiste = 1,
    /// No hay ninguna huella (o dato) con ese identificador.
    NoExiste = 2,
    /// La huella, o la obra raíz de su cadena, fue retirada.
    Retirada = 3,
    /// El autor no permite comentarios sobre esa huella.
    NoAdmiteRespuestas = 4,
    /// Esa moneda no tiene precios cargados.
    MonedaNoAceptada = 5,
    /// El monto de un apoyo tiene que ser mayor que cero.
    MontoInvalido = 6,
    /// No hay saldo para cobrar.
    NadaParaCobrar = 7,
    /// Solo el autor puede hacer esto.
    NoEsElAutor = 8,
    /// El porcentaje del artista tiene que estar entre el piso y el 100%.
    PorcentajeInvalido = 9,
    /// Un precio tiene que ser mayor que cero.
    PrecioInvalido = 10,
    /// Una suma se pasó del máximo.
    Desborde = 11,
    /// No hay ninguna sala con ese identificador.
    SalaNoExiste = 12,
    /// Esa cuenta ya tiene una invitación sin usar en esa sala.
    YaInvitada = 13,
    /// El precio vigente es mayor que el máximo que aceptó quien paga.
    PrecioSuperado = 14,
    /// Las fechas de la muestra no sirven: ya pasó, empieza muy lejos, dura
    /// más de 180 días, la sala tiene otra que todavía no terminó, o no hay
    /// muestra en curso para cerrar.
    MuestraInvalida = 15,
    /// El fondo de la sala no alcanza para ese retiro.
    FondoInsuficiente = 16,
    /// El plazo de aviso tiene que estar entre 1 hora y 90 días.
    PlazoInvalido = 17,
    /// Todavía no pasó el plazo de aviso de esa propuesta.
    PlazoNoCumplido = 18,
    /// No hay ninguna propuesta de ese tipo pendiente.
    NoHayPropuesta = 19,
    /// Esa cuenta no puede hacer esto.
    NoAutorizado = 20,
    /// La propuesta venció sin aplicarse: hay que volver a proponerla.
    PropuestaVencida = 21,
}

/// Precios en la unidad mínima de la moneda (7 decimales en XLM y USDC).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Precios {
    pub huella: i128,
    pub comentario: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Huella {
    pub autor: Address,
    /// Quien abrió la obra de la que desciende esta huella. En la obra
    /// original es el mismo autor. Es el único que cobra, en toda la cadena.
    pub artista: Address,
    /// SHA-256 del documento exacto. El contenido vive fuera de la red.
    pub digest: BytesN<32>,
    /// Huella de la que nació, si es un comentario.
    pub padre: Option<BytesN<32>>,
    /// Obra con la que empezó la cadena. En la obra original es su propio
    /// identificador. Si la raíz se retira, la cadena entera deja de admitir
    /// continuaciones y apoyos.
    pub raiz: BytesN<32>,
    /// Sala de museo a la que pertenece, si pertenece a alguna.
    pub sala: Option<BytesN<32>>,
    /// `true` solo si la pagó el fondo de la sala por una invitación del
    /// museo (una huella o una continuación): prueba que la persona estuvo ahí.
    pub presencial: bool,
    pub admite_respuestas: bool,
    pub activa: bool,
    /// Cantidad de apoyos voluntarios recibidos.
    pub apoyos: u32,
    pub respuestas: u32,
    /// Fecha del ledger en que se registró.
    pub creada: u64,
}

/// Muestra con fecha de una sala. Las fechas son segundos desde 1970.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Muestra {
    /// Número de apertura en esa sala (1, 2, 3...). Sube cada vez que se
    /// abre una muestra, así reabrir una igual no revive acuerdos viejos.
    pub numero: u32,
    pub desde: u64,
    pub hasta: u64,
    /// Parte de cada continuación que recibe la sala, en puntos básicos.
    pub parte_sala_bps: u32,
}

/// Tipo de cambio sensible. Hay como mucho una propuesta pendiente por tipo.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TipoCambio {
    Codigo,
    ParteAutor,
    Admin,
    Tesoro,
}

/// Un cambio sensible con su valor nuevo.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Cambio {
    /// Hash del código nuevo, ya subido a la red.
    Codigo(BytesN<32>),
    /// Parte nueva del artista, en puntos básicos.
    ParteAutor(u32),
    /// Cuenta del administrador nuevo.
    Admin(Address),
    /// Cuenta del tesoro nuevo.
    Tesoro(Address),
}

/// Un cambio propuesto y entre qué fechas se puede aplicar (segundos desde
/// 1970, ambas incluidas).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Propuesta {
    pub cambio: Cambio,
    pub aplicable_desde: u64,
    pub aplicable_hasta: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum Clave {
    Admin,
    Tesoro,
    ParteAutor,
    /// Segundos entre proponer un cambio sensible y poder aplicarlo.
    PlazoAviso,
    /// Propuesta pendiente de un tipo de cambio.
    Propuesta(TipoCambio),
    Precios(Address),
    Huella(BytesN<32>),
    /// Sala de un museo o institución: guarda quién la abrió.
    Sala(BytesN<32>),
    /// Muestra con fecha de una sala.
    Muestra(BytesN<32>),
    /// Acuerdo de un artista con la muestra de una sala: (sala, artista).
    /// Guarda la muestra exacta que aceptó (fechas y parte de la sala).
    Acuerdo(BytesN<32>, Address),
    /// Fondo de patrocinio de una sala: (sala, moneda).
    Fondo(BytesN<32>, Address),
    /// Invitación de una sala a una cuenta: (sala, cuenta). `true` mientras
    /// está disponible, `false` cuando ya se usó (y se puede volver a invitar).
    Invitacion(BytesN<32>, Address),
    /// Saldo a cobrar: (autor, moneda).
    Saldo(Address, Address),
}

/// Se creó el contrato: quién lo administra, adónde va lo de Umbral, qué
/// parte recibe el artista y cuánto aviso se da antes de un cambio sensible.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Creado {
    pub admin: Address,
    pub tesoro: Address,
    pub parte_autor_bps: u32,
    pub plazo_aviso: u64,
}

/// Se propuso un cambio sensible. Se puede aplicar entre `aplicable_desde`
/// y `aplicable_hasta`.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CambioPropuesto {
    pub cambio: Cambio,
    pub aplicable_desde: u64,
    pub aplicable_hasta: u64,
}

/// Se aplicó un cambio sensible que había sido propuesto.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CambioAplicado {
    pub cambio: Cambio,
}

/// Se canceló un cambio sensible propuesto.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PropuestaCancelada {
    pub cambio: Cambio,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HuellaDejada {
    #[topic]
    pub id: BytesN<32>,
    pub autor: Address,
    pub artista: Address,
    pub digest: BytesN<32>,
    pub padre: Option<BytesN<32>>,
    pub sala: Option<BytesN<32>>,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HuellaApoyada {
    #[topic]
    pub id: BytesN<32>,
    pub quien: Address,
    pub moneda: Address,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HuellaRetirada {
    #[topic]
    pub id: BytesN<32>,
    /// `true` si la retiró la moderación de Umbral, `false` si fue su autor.
    pub por_moderacion: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cobro {
    #[topic]
    pub autor: Address,
    pub moneda: Address,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SalaAbierta {
    #[topic]
    pub sala: BytesN<32>,
    pub museo: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SalaPatrocinada {
    #[topic]
    pub sala: BytesN<32>,
    pub quien: Address,
    pub moneda: Address,
    pub monto: i128,
}

/// Una sala tiene una muestra con fecha: mientras dura, recibe una parte de
/// cada continuación hecha sobre sus obras.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MuestraAbierta {
    #[topic]
    pub sala: BytesN<32>,
    pub numero: u32,
    pub desde: u64,
    pub hasta: u64,
    pub parte_sala_bps: u32,
}

/// La muestra de una sala se cerró antes de tiempo. `quien` es el museo o el
/// administrador; `hasta` es la nueva fecha de fin.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MuestraCerrada {
    #[topic]
    pub sala: BytesN<32>,
    pub quien: Address,
    pub hasta: u64,
}

/// Un artista aceptó el reparto de la muestra de una sala para sus obras.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MuestraAceptada {
    #[topic]
    pub sala: BytesN<32>,
    pub artista: Address,
    pub numero: u32,
    pub desde: u64,
    pub parte_sala_bps: u32,
}

/// Un artista se salió de la muestra de una sala: su acuerdo ya no vale.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MuestraAbandonada {
    #[topic]
    pub sala: BytesN<32>,
    pub artista: Address,
}

/// El museo de una sala invitó a un visitante a dejar una huella.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VisitanteInvitado {
    #[topic]
    pub sala: BytesN<32>,
    pub cuenta: Address,
}

/// El fondo de una sala pagó la huella o la continuación de una cuenta invitada.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FondoUsado {
    #[topic]
    pub sala: BytesN<32>,
    pub cuenta: Address,
    pub moneda: Address,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FondoRetirado {
    #[topic]
    pub sala: BytesN<32>,
    pub museo: Address,
    pub moneda: Address,
    pub monto: i128,
}

/// Una parte de un pago quedó anotada a nombre de alguien.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SaldoAcreditado {
    #[topic]
    pub beneficiario: Address,
    pub moneda: Address,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PreciosFijados {
    #[topic]
    pub moneda: Address,
    pub huella: i128,
    pub comentario: i128,
}

/// Una moneda dejó de aceptarse para pagos nuevos. Los saldos y fondos ya
/// guardados en esa moneda se pueden seguir cobrando y retirando.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MonedaQuitada {
    #[topic]
    pub moneda: Address,
}

#[contract]
pub struct Umbral;

#[contractimpl]
impl Umbral {
    /// `parte_autor_bps`: qué parte de una continuación va al artista que
    /// abrió la obra, en puntos básicos (5000 = 50%). El resto va a Umbral.
    /// `plazo_aviso`: segundos entre proponer un cambio sensible y poder
    /// aplicarlo (entre 3600 y 90 días). Queda fijo.
    pub fn __constructor(
        env: Env,
        admin: Address,
        tesoro: Address,
        parte_autor_bps: u32,
        plazo_aviso: u64,
    ) {
        if parte_autor_bps < PISO_AUTOR_BPS || parte_autor_bps > TOTAL_BPS {
            soroban_sdk::panic_with_error!(&env, Error::PorcentajeInvalido);
        }
        if !(PLAZO_MIN..=PLAZO_MAX).contains(&plazo_aviso) {
            soroban_sdk::panic_with_error!(&env, Error::PlazoInvalido);
        }
        let inst = env.storage().instance();
        inst.set(&Clave::Admin, &admin);
        inst.set(&Clave::Tesoro, &tesoro);
        inst.set(&Clave::ParteAutor, &parte_autor_bps);
        inst.set(&Clave::PlazoAviso, &plazo_aviso);
        Self::renovar_instancia(&env);
        Creado { admin, tesoro, parte_autor_bps, plazo_aviso }.publish(&env);
    }

    // ---------- Administración ----------

    /// Carga o cambia los precios de una moneda. Con esto la moneda pasa a ser aceptada.
    pub fn fijar_precios(env: Env, moneda: Address, precios: Precios) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        if precios.huella <= 0 || precios.comentario <= 0 {
            return Err(Error::PrecioInvalido);
        }
        env.storage().instance().set(&Clave::Precios(moneda.clone()), &precios);
        Self::renovar_instancia(&env);
        PreciosFijados { moneda, huella: precios.huella, comentario: precios.comentario }
            .publish(&env);
        Ok(())
    }

    /// Deja de aceptar una moneda para pagos nuevos (huellas, continuaciones,
    /// apoyos y patrocinios). No toca lo ya guardado: los saldos se siguen
    /// cobrando y los fondos se siguen retirando.
    pub fn quitar_moneda(env: Env, moneda: Address) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        let clave = Clave::Precios(moneda.clone());
        if !env.storage().instance().has(&clave) {
            return Err(Error::MonedaNoAceptada);
        }
        env.storage().instance().remove(&clave);
        Self::renovar_instancia(&env);
        MonedaQuitada { moneda }.publish(&env);
        Ok(())
    }

    /// Moderación: el administrador de Umbral retira una huella. No borra el
    /// registro y el aviso dice que fue por moderación. Si es una obra raíz,
    /// toda su cadena deja de admitir continuaciones y apoyos.
    pub fn moderar(env: Env, id: BytesN<32>) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        Self::desactivar(&env, id, true)
    }

    // ---------- Cambios sensibles en dos pasos ----------

    /// Propone reemplazar el código del contrato por uno ya subido a la red.
    /// Devuelve desde cuándo se puede aplicar.
    pub fn proponer_actualizacion(env: Env, wasm_hash: BytesN<32>) -> Result<u64, Error> {
        Self::proponer(&env, TipoCambio::Codigo, Cambio::Codigo(wasm_hash))
    }

    /// Aplica la actualización propuesta, si ya pasó el plazo. Sin perder
    /// huellas, saldos ni fondos. Solo el administrador.
    pub fn aplicar_actualizacion(env: Env) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        if let Cambio::Codigo(wasm_hash) = Self::tomar_propuesta(&env, TipoCambio::Codigo)? {
            CambioAplicado { cambio: Cambio::Codigo(wasm_hash.clone()) }.publish(&env);
            env.deployer()
                .update_current_contract(soroban_sdk::ContractExecutable::Wasm(wasm_hash));
        }
        Ok(())
    }

    /// Propone cambiar la parte que recibe el artista. Nunca por debajo del piso.
    pub fn proponer_parte_autor(env: Env, parte_autor_bps: u32) -> Result<u64, Error> {
        if parte_autor_bps < PISO_AUTOR_BPS || parte_autor_bps > TOTAL_BPS {
            return Err(Error::PorcentajeInvalido);
        }
        Self::proponer(&env, TipoCambio::ParteAutor, Cambio::ParteAutor(parte_autor_bps))
    }

    /// Aplica la parte del artista propuesta, si ya pasó el plazo. Los saldos
    /// ya anotados no cambian.
    pub fn aplicar_parte_autor(env: Env) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        if let Cambio::ParteAutor(bps) = Self::tomar_propuesta(&env, TipoCambio::ParteAutor)? {
            env.storage().instance().set(&Clave::ParteAutor, &bps);
            CambioAplicado { cambio: Cambio::ParteAutor(bps) }.publish(&env);
        }
        Ok(())
    }

    /// Propone un administrador nuevo (por ejemplo, una cuenta multifirma).
    pub fn proponer_admin(env: Env, nuevo: Address) -> Result<u64, Error> {
        Self::proponer(&env, TipoCambio::Admin, Cambio::Admin(nuevo))
    }

    /// Aplica el administrador propuesto, si ya pasó el plazo. Lo firma el
    /// administrador nuevo, para no entregarle el contrato a una cuenta que
    /// nadie controla. Borra las demás propuestas pendientes (código, tesoro
    /// y parte del artista): el administrador nuevo empieza sin herencias.
    pub fn aplicar_admin(env: Env) -> Result<(), Error> {
        let p = Self::leer_propuesta(&env, TipoCambio::Admin)?;
        if let Cambio::Admin(nuevo) = p.cambio {
            nuevo.require_auth();
            Self::tomar_propuesta(&env, TipoCambio::Admin)?;
            for tipo in [TipoCambio::Codigo, TipoCambio::Tesoro, TipoCambio::ParteAutor] {
                let clave = Clave::Propuesta(tipo);
                let pendiente: Option<Propuesta> = env.storage().instance().get(&clave);
                if let Some(vieja) = pendiente {
                    env.storage().instance().remove(&clave);
                    PropuestaCancelada { cambio: vieja.cambio }.publish(&env);
                }
            }
            env.storage().instance().set(&Clave::Admin, &nuevo);
            CambioAplicado { cambio: Cambio::Admin(nuevo) }.publish(&env);
        }
        Ok(())
    }

    /// Propone una cuenta nueva para el tesoro de Umbral.
    pub fn proponer_tesoro(env: Env, nuevo: Address) -> Result<u64, Error> {
        Self::proponer(&env, TipoCambio::Tesoro, Cambio::Tesoro(nuevo))
    }

    /// Aplica el tesoro propuesto, si ya pasó el plazo. Solo el administrador.
    pub fn aplicar_tesoro(env: Env) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        if let Cambio::Tesoro(nuevo) = Self::tomar_propuesta(&env, TipoCambio::Tesoro)? {
            env.storage().instance().set(&Clave::Tesoro, &nuevo);
            CambioAplicado { cambio: Cambio::Tesoro(nuevo) }.publish(&env);
        }
        Ok(())
    }

    /// El administrador cancela una propuesta pendiente.
    pub fn cancelar_propuesta(env: Env, tipo: TipoCambio) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        let p = Self::leer_propuesta(&env, tipo.clone())?;
        env.storage().instance().remove(&Clave::Propuesta(tipo));
        Self::renovar_instancia(&env);
        PropuestaCancelada { cambio: p.cambio }.publish(&env);
        Ok(())
    }

    // ---------- Salas de museos y patrocinio ----------

    /// Un museo o institución abre su sala dentro de Umbral. El identificador
    /// lo calcula el contrato a partir de la cuenta del museo y una `semilla`
    /// (ver `id_sala`), así nadie puede ocupar el de otro. Lo devuelve.
    pub fn abrir_sala(env: Env, museo: Address, semilla: BytesN<32>) -> Result<BytesN<32>, Error> {
        museo.require_auth();
        let sala = Self::id_sala(env.clone(), museo.clone(), semilla);
        let clave = Clave::Sala(sala.clone());
        if env.storage().persistent().has(&clave) {
            return Err(Error::YaExiste);
        }
        env.storage().persistent().set(&clave, &museo);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::renovar_instancia(&env);
        SalaAbierta { sala: sala.clone(), museo }.publish(&env);
        Ok(sala)
    }

    /// Umbral abre la muestra con fecha de una sala, a pedido de su museo.
    /// Mientras dura, cada continuación sobre una obra de esa sala le deja
    /// a la sala `parte_sala_bps` (de 0 a 40%), que se acuerda para cada
    /// muestra y queda publicado. El artista nunca baja del piso. Empieza
    /// como mucho 1 día antes de hoy y 365 días después, dura como mucho 180
    /// días y una sala no puede tener dos muestras a la vez.
    pub fn abrir_muestra(
        env: Env,
        sala: BytesN<32>,
        desde: u64,
        hasta: u64,
        parte_sala_bps: u32,
    ) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        if parte_sala_bps > MUESTRA_SALA_MAX_BPS {
            return Err(Error::PorcentajeInvalido);
        }
        Self::museo_de(env.clone(), sala.clone())?;
        let ahora = env.ledger().timestamp();
        if hasta <= desde
            || hasta <= ahora
            || hasta - desde > MUESTRA_MAX
            || desde.saturating_add(MUESTRA_ATRASO_MAX) < ahora
            || desde > ahora.saturating_add(MUESTRA_ANTICIPO_MAX)
        {
            return Err(Error::MuestraInvalida);
        }
        let clave = Clave::Muestra(sala.clone());
        let anterior: Option<Muestra> = env.storage().persistent().get(&clave);
        let mut numero: u32 = 1;
        if let Some(m) = anterior {
            if m.hasta >= ahora {
                return Err(Error::MuestraInvalida);
            }
            numero = m.numero.checked_add(1).ok_or(Error::Desborde)?;
        }
        env.storage()
            .persistent()
            .set(&clave, &Muestra { numero, desde, hasta, parte_sala_bps });
        Self::extender_hasta(&env, &clave, hasta);
        Self::extender_sala(&env, &sala);
        MuestraAbierta { sala, numero, desde, hasta, parte_sala_bps }.publish(&env);
        Ok(())
    }

    /// Cierra ya la muestra de una sala (en curso o por empezar). La firma el
    /// museo de la sala o el administrador. Los acuerdos firmados con esa
    /// muestra dejan de valer solos y la sala puede abrir otra enseguida.
    pub fn cerrar_muestra(env: Env, quien: Address, sala: BytesN<32>) -> Result<(), Error> {
        quien.require_auth();
        let museo = Self::museo_de(env.clone(), sala.clone())?;
        if quien != museo && quien != Self::admin(&env) {
            return Err(Error::NoAutorizado);
        }
        let clave = Clave::Muestra(sala.clone());
        let mut m: Muestra = env.storage().persistent().get(&clave).ok_or(Error::MuestraInvalida)?;
        let ahora = env.ledger().timestamp();
        if m.hasta < ahora {
            return Err(Error::MuestraInvalida);
        }
        // Termina un segundo antes de ahora: deja de valer en este mismo ledger.
        m.hasta = ahora.saturating_sub(1);
        if m.desde > m.hasta {
            m.desde = m.hasta;
        }
        env.storage().persistent().set(&clave, &m);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::extender_sala(&env, &sala);
        MuestraCerrada { sala, quien, hasta: m.hasta }.publish(&env);
        Ok(())
    }

    /// El artista acepta, con su firma, el reparto de la muestra de una sala
    /// para sus obras de esa sala. Sin esta firma, sus obras siguen con el
    /// reparto de siempre aunque la sala esté en muestra. `numero`, `desde`,
    /// `hasta` y `parte_sala_bps` son la muestra que el artista vio: si no
    /// coinciden, falla.
    pub fn aceptar_muestra(
        env: Env,
        artista: Address,
        sala: BytesN<32>,
        numero: u32,
        desde: u64,
        hasta: u64,
        parte_sala_bps: u32,
    ) -> Result<(), Error> {
        artista.require_auth();
        let clave_muestra = Clave::Muestra(sala.clone());
        let m: Muestra = env
            .storage()
            .persistent()
            .get(&clave_muestra)
            .ok_or(Error::MuestraInvalida)?;
        if m.hasta < env.ledger().timestamp() {
            return Err(Error::MuestraInvalida);
        }
        if m.parte_sala_bps != parte_sala_bps {
            return Err(Error::PorcentajeInvalido);
        }
        if m.numero != numero || m.desde != desde || m.hasta != hasta {
            return Err(Error::MuestraInvalida);
        }
        let clave = Clave::Acuerdo(sala.clone(), artista.clone());
        env.storage().persistent().set(&clave, &m);
        Self::extender_hasta(&env, &clave, m.hasta);
        Self::extender_hasta(&env, &clave_muestra, m.hasta);
        Self::extender_sala(&env, &sala);
        MuestraAceptada { sala, artista, numero, desde: m.desde, parte_sala_bps }.publish(&env);
        Ok(())
    }

    /// El artista se sale de la muestra de una sala que había aceptado. Desde
    /// ese momento sus obras de esa sala vuelven al reparto de siempre. Puede
    /// volver a aceptarla con `aceptar_muestra`. Falla si no tiene acuerdo.
    pub fn salir_de_muestra(env: Env, artista: Address, sala: BytesN<32>) -> Result<(), Error> {
        artista.require_auth();
        Self::museo_de(env.clone(), sala.clone())?;
        let clave = Clave::Acuerdo(sala.clone(), artista.clone());
        if !env.storage().persistent().has(&clave) {
            return Err(Error::MuestraInvalida);
        }
        env.storage().persistent().remove(&clave);
        Self::extender_sala(&env, &sala);
        MuestraAbandonada { sala, artista }.publish(&env);
        Ok(())
    }

    /// El museo que abrió la sala invita a una cuenta: el fondo de la sala le
    /// paga una huella en la sala o una continuación sobre una obra de la
    /// sala (que no sea suya), una sola vez por invitación. Solo el museo decide a
    /// quién invita, así nadie puede vaciar el fondo creando cuentas. Una
    /// invitación ya usada se puede renovar para otro encuentro.
    pub fn invitar(env: Env, sala: BytesN<32>, cuenta: Address) -> Result<(), Error> {
        let museo = Self::museo_de(env.clone(), sala.clone())?;
        museo.require_auth();
        let clave = Clave::Invitacion(sala.clone(), cuenta.clone());
        let disponible: bool = env.storage().persistent().get(&clave).unwrap_or(false);
        if disponible {
            return Err(Error::YaInvitada);
        }
        env.storage().persistent().set(&clave, &true);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::extender_sala(&env, &sala);
        VisitanteInvitado { sala, cuenta }.publish(&env);
        Ok(())
    }

    /// Cualquiera (el museo o quien lo apoye) pone plata en el fondo de una
    /// sala. Ese fondo le paga a cada visitante que el museo invitó una
    /// huella en la sala o una continuación sobre una obra de la sala.
    pub fn patrocinar(
        env: Env,
        quien: Address,
        sala: BytesN<32>,
        moneda: Address,
        monto: i128,
    ) -> Result<(), Error> {
        quien.require_auth();
        Self::precios(env.clone(), moneda.clone())?;
        if monto <= 0 {
            return Err(Error::MontoInvalido);
        }
        Self::museo_de(env.clone(), sala.clone())?;
        token::TokenClient::new(&env, &moneda).transfer(
            &quien,
            &env.current_contract_address(),
            &monto,
        );
        let clave = Clave::Fondo(sala.clone(), moneda.clone());
        let actual: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        let nuevo = actual.checked_add(monto).ok_or(Error::Desborde)?;
        env.storage().persistent().set(&clave, &nuevo);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::extender_sala(&env, &sala);
        SalaPatrocinada { sala, quien, moneda, monto }.publish(&env);
        Ok(())
    }

    /// El museo de la sala retira plata del fondo que no se usó. No vuelve a
    /// quien patrocinó: va al museo, que es quien decide a quién invita.
    pub fn retirar_fondo(
        env: Env,
        sala: BytesN<32>,
        moneda: Address,
        monto: i128,
    ) -> Result<(), Error> {
        let museo = Self::museo_de(env.clone(), sala.clone())?;
        museo.require_auth();
        if monto <= 0 {
            return Err(Error::MontoInvalido);
        }
        let clave = Clave::Fondo(sala.clone(), moneda.clone());
        let fondo: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        if fondo < monto {
            return Err(Error::FondoInsuficiente);
        }
        if fondo == monto {
            env.storage().persistent().remove(&clave);
        } else {
            env.storage().persistent().set(&clave, &(fondo - monto));
            env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        }
        token::TokenClient::new(&env, &moneda).transfer(
            &env.current_contract_address(),
            &museo,
            &monto,
        );
        Self::extender_sala(&env, &sala);
        FondoRetirado { sala, museo, moneda, monto }.publish(&env);
        Ok(())
    }

    // ---------- Acciones de los usuarios ----------

    /// Deja una huella nueva. El precio completo va al museo Umbral.
    /// Para nombrar una sala hace falta un vínculo real con ella: una
    /// invitación sin usar, ser el museo que la abrió o haber aceptado su
    /// muestra (en curso o por empezar). Si no, falla con `NoAutorizado`.
    /// Con invitación y fondo suficiente paga el fondo de la sala y no el
    /// autor, y la huella queda marcada como presencial. Si el fondo no
    /// alcanza y la invitación es su único vínculo, falla con
    /// `FondoInsuficiente` en vez de cobrarle; el museo y el artista con
    /// muestra aceptada pagan ellos y la invitación queda sin gastar.
    /// Devuelve `true` si la pagó el fondo.
    /// El identificador lo calcula el contrato (ver `id_de`).
    /// `precio_max`: lo máximo que acepta pagar quien firma. Si el precio
    /// cambió y es mayor, la acción falla en vez de cobrar de más.
    pub fn dejar_huella(
        env: Env,
        autor: Address,
        digest: BytesN<32>,
        admite_respuestas: bool,
        moneda: Address,
        precio_max: i128,
        sala: Option<BytesN<32>>,
    ) -> Result<bool, Error> {
        autor.require_auth();
        let precios = Self::precios(env.clone(), moneda.clone())?;
        if precios.huella > precio_max {
            return Err(Error::PrecioSuperado);
        }
        let id = Self::id_de(env.clone(), autor.clone(), digest.clone());
        Self::exigir_id_libre(&env, &id)?;

        let mut patrocinada = false;
        if let Some(s) = sala.clone() {
            let museo = Self::museo_de(env.clone(), s.clone())?;
            Self::extender_sala(&env, &s);
            let invitada = Self::invitacion_disponible(&env, &s, &autor);
            if invitada && Self::fondo_alcanza(&env, &s, &moneda, precios.huella) {
                Self::usar_patrocinio(&env, &s, &autor, &moneda, precios.huella)?;
                patrocinada = true;
            } else if autor != museo && !Self::acuerdo_vigente(&env, &s, &autor) {
                // Si su único vínculo es la invitación y el fondo no alcanza,
                // no se le cobra de su bolsillo. Sin invitación, sin ser el
                // museo y sin muestra aceptada, la obra no puede decir que es
                // de esa sala.
                return Err(if invitada { Error::FondoInsuficiente } else { Error::NoAutorizado });
            }
            // El museo o el artista con muestra aceptada pagan como siempre.
        }
        // Lo que pagó el fondo ya está en el contrato: sale de ahí.
        let pagador = if patrocinada { None } else { Some(&autor) };
        Self::cobrar_y_repartir(&env, pagador, &moneda, precios.huella, None, None)?;
        let artista = autor.clone();
        let raiz = id.clone();
        Self::guardar_nueva(
            &env,
            id,
            Nueva { autor, artista, digest, padre: None, raiz, sala, presencial: patrocinada, admite_respuestas },
        );
        Ok(patrocinada)
    }

    /// Continúa una huella existente. Una parte del pago queda a nombre del
    /// artista que abrió la obra (sea cual sea el nivel de la cadena) y el
    /// resto va a Umbral. Quien escribió la huella continuada no cobra.
    /// Falla si la huella continuada o la obra raíz fueron retiradas.
    /// Si la obra es de una sala, el museo invitó a quien comenta, el fondo
    /// alcanza y no es su propia obra, paga el fondo de la sala (con el
    /// mismo reparto) y la continuación queda marcada como presencial. Si
    /// falta algo de eso, paga quien comenta y la invitación no se gasta.
    /// `precio_max`: lo máximo que acepta pagar quien firma.
    pub fn comentar(
        env: Env,
        autor: Address,
        digest: BytesN<32>,
        padre: BytesN<32>,
        admite_respuestas: bool,
        moneda: Address,
        precio_max: i128,
    ) -> Result<(), Error> {
        autor.require_auth();
        let precios = Self::precios(env.clone(), moneda.clone())?;
        if precios.comentario > precio_max {
            return Err(Error::PrecioSuperado);
        }
        let id = Self::id_de(env.clone(), autor.clone(), digest.clone());
        Self::exigir_id_libre(&env, &id)?;

        let mut original = Self::obtener(env.clone(), padre.clone())?;
        Self::exigir_activa(&env, &padre, &original)?;
        if !original.admite_respuestas {
            return Err(Error::NoAdmiteRespuestas);
        }

        // Encuentro en persona: si la obra es de una sala, el museo invitó a
        // quien comenta, el fondo alcanza y no es su propia obra, paga el
        // fondo de la sala. El reparto es el mismo. Si falta algo de eso,
        // paga quien comenta y la invitación queda sin gastar.
        let mut patrocinada = false;
        if let Some(s) = original.sala.clone() {
            if autor != original.artista
                && Self::invitacion_disponible(&env, &s, &autor)
                && Self::fondo_alcanza(&env, &s, &moneda, precios.comentario)
            {
                Self::extender_sala(&env, &s);
                Self::usar_patrocinio(&env, &s, &autor, &moneda, precios.comentario)?;
                patrocinada = true;
            }
        }
        let pagador = if patrocinada { None } else { Some(&autor) };
        let museo = Self::museo_en_muestra(&env, &original.sala, &original.artista);
        Self::cobrar_y_repartir(
            &env,
            pagador,
            &moneda,
            precios.comentario,
            Some(&original.artista),
            museo.as_ref().map(|(m, bps)| (m, *bps)),
        )?;

        original.respuestas = original.respuestas.checked_add(1).ok_or(Error::Desborde)?;
        Self::guardar(&env, &padre, &original);
        let nueva = Nueva {
            autor,
            artista: original.artista.clone(),
            digest,
            padre: Some(padre),
            raiz: original.raiz.clone(),
            sala: original.sala.clone(),
            presencial: patrocinada,
            admite_respuestas,
        };
        Self::guardar_nueva(&env, id, nueva);
        Ok(())
    }

    /// Apoyo voluntario de monto libre sobre cualquier huella activa de una
    /// obra activa. El 80% queda a nombre del artista que abrió la obra (lo
    /// retira con `cobrar`) y el 20% va a Umbral, que también se queda con
    /// lo que sobra del redondeo. Quien escribió una respuesta no cobra.
    pub fn apoyar(
        env: Env,
        quien: Address,
        id: BytesN<32>,
        moneda: Address,
        monto: i128,
    ) -> Result<(), Error> {
        quien.require_auth();
        // Solo se aceptan las monedas que el museo habilitó.
        Self::precios(env.clone(), moneda.clone())?;
        if monto <= 0 {
            return Err(Error::MontoInvalido);
        }
        let mut huella = Self::obtener(env.clone(), id.clone())?;
        Self::exigir_activa(&env, &id, &huella)?;

        // Primero la parte del artista; el redondeo queda del lado de Umbral,
        // como en el resto del contrato.
        let para_artista = Self::parte_de(monto, TOTAL_BPS - APOYO_UMBRAL_BPS)?;
        let para_umbral = monto - para_artista;
        let cliente = token::TokenClient::new(&env, &moneda);
        if para_artista > 0 {
            cliente.transfer(&quien, &env.current_contract_address(), &para_artista);
            Self::sumar_saldo(&env, &huella.artista, &moneda, para_artista);
        }
        if para_umbral > 0 {
            let tesoro: Address = env.storage().instance().get(&Clave::Tesoro).unwrap();
            cliente.transfer(&quien, &tesoro, &para_umbral);
        }

        huella.apoyos = huella.apoyos.checked_add(1).ok_or(Error::Desborde)?;
        Self::guardar(&env, &id, &huella);
        Self::renovar_instancia(&env);
        HuellaApoyada { id, quien, moneda, monto }.publish(&env);
        Ok(())
    }

    /// Cualquiera puede renovar la vigencia de una huella para que no se
    /// archive por falta de movimiento. No cambia ningún dato.
    pub fn renovar(env: Env, id: BytesN<32>) -> Result<(), Error> {
        Self::extender(&env, &Clave::Huella(id), Error::NoExiste)
    }

    /// Cualquiera puede renovar la vigencia del saldo de una cuenta en una
    /// moneda. No cambia el monto.
    pub fn renovar_saldo(env: Env, autor: Address, moneda: Address) -> Result<(), Error> {
        Self::extender(&env, &Clave::Saldo(autor, moneda), Error::NadaParaCobrar)
    }

    /// Cualquiera puede renovar la vigencia del fondo de una sala en una moneda.
    pub fn renovar_fondo(env: Env, sala: BytesN<32>, moneda: Address) -> Result<(), Error> {
        Self::extender(&env, &Clave::Fondo(sala, moneda), Error::NoExiste)
    }

    /// Cualquiera puede renovar la vigencia de una sala y de su muestra.
    pub fn renovar_sala(env: Env, sala: BytesN<32>) -> Result<(), Error> {
        Self::extender(&env, &Clave::Sala(sala.clone()), Error::SalaNoExiste)?;
        let muestra = Clave::Muestra(sala);
        if env.storage().persistent().has(&muestra) {
            env.storage().persistent().extend_ttl(&muestra, UMBRAL_VIDA, VIDA);
        }
        Ok(())
    }

    /// Cualquiera puede renovar la vigencia del acuerdo de un artista con la
    /// muestra de una sala: hasta el fin de esa muestra, y como mínimo la
    /// vida de siempre.
    pub fn renovar_acuerdo(env: Env, sala: BytesN<32>, artista: Address) -> Result<(), Error> {
        let clave = Clave::Acuerdo(sala, artista);
        let a: Muestra = env.storage().persistent().get(&clave).ok_or(Error::NoExiste)?;
        Self::extender_hasta(&env, &clave, a.hasta);
        Self::renovar_instancia(&env);
        Ok(())
    }

    /// El artista retira lo que juntó en una moneda. Devuelve el monto cobrado.
    /// Funciona aunque la moneda ya no se acepte para pagos nuevos.
    pub fn cobrar(env: Env, autor: Address, moneda: Address) -> Result<i128, Error> {
        autor.require_auth();
        let clave = Clave::Saldo(autor.clone(), moneda.clone());
        let monto: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        if monto <= 0 {
            return Err(Error::NadaParaCobrar);
        }
        // Primero se pone el saldo en cero y después se paga.
        env.storage().persistent().remove(&clave);
        token::TokenClient::new(&env, &moneda).transfer(
            &env.current_contract_address(),
            &autor,
            &monto,
        );
        Self::renovar_instancia(&env);
        Cobro { autor, moneda, monto }.publish(&env);
        Ok(monto)
    }

    /// El autor retira su huella: deja de admitir comentarios y apoyos.
    /// El registro histórico no se borra.
    pub fn retirar(env: Env, autor: Address, id: BytesN<32>) -> Result<(), Error> {
        autor.require_auth();
        let huella = Self::obtener(env.clone(), id.clone())?;
        if huella.autor != autor {
            return Err(Error::NoEsElAutor);
        }
        Self::desactivar(&env, id, false)
    }

    // ---------- Consultas ----------

    /// Identificador de una huella: SHA-256 de la cuenta del autor seguida del
    /// código del contenido. Lo calcula el contrato, así nadie puede ocupar el
    /// identificador de otro ni quedar como autor de un envío ajeno.
    pub fn id_de(env: Env, autor: Address, digest: BytesN<32>) -> BytesN<32> {
        Self::hash_de(&env, &autor, digest)
    }

    /// Identificador de una sala: SHA-256 de los bytes "sala", seguidos de la
    /// cuenta del museo (en XDR, como en `id_de`) y de la semilla. El prefijo
    /// lo separa de los identificadores de huellas.
    pub fn id_sala(env: Env, museo: Address, semilla: BytesN<32>) -> BytesN<32> {
        let mut todo = Bytes::from_slice(&env, b"sala");
        todo.append(&museo.to_xdr(&env));
        todo.append(&Bytes::from(semilla));
        env.crypto().sha256(&todo).to_bytes()
    }

    /// Si una cuenta tiene una invitación sin usar en una sala.
    pub fn invitada(env: Env, sala: BytesN<32>, cuenta: Address) -> bool {
        env.storage()
            .persistent()
            .get(&Clave::Invitacion(sala, cuenta))
            .unwrap_or(false)
    }

    pub fn obtener(env: Env, id: BytesN<32>) -> Result<Huella, Error> {
        env.storage()
            .persistent()
            .get(&Clave::Huella(id))
            .ok_or(Error::NoExiste)
    }

    pub fn saldo(env: Env, autor: Address, moneda: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&Clave::Saldo(autor, moneda))
            .unwrap_or(0)
    }

    pub fn precios(env: Env, moneda: Address) -> Result<Precios, Error> {
        env.storage()
            .instance()
            .get(&Clave::Precios(moneda))
            .ok_or(Error::MonedaNoAceptada)
    }

    /// Quién abrió una sala.
    pub fn museo_de(env: Env, sala: BytesN<32>) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&Clave::Sala(sala))
            .ok_or(Error::SalaNoExiste)
    }

    /// Si un artista aceptó la muestra que esa sala tiene cargada.
    pub fn acepto_muestra(env: Env, sala: BytesN<32>, artista: Address) -> bool {
        let m: Option<Muestra> = env.storage().persistent().get(&Clave::Muestra(sala.clone()));
        let aceptada: Option<Muestra> = env.storage().persistent().get(&Clave::Acuerdo(sala, artista));
        match (m, aceptada) {
            (Some(m), Some(a)) => m == a,
            _ => false,
        }
    }

    /// La muestra de una sala, si alguna vez tuvo una.
    pub fn muestra(env: Env, sala: BytesN<32>) -> Option<Muestra> {
        env.storage().persistent().get(&Clave::Muestra(sala))
    }

    /// Cuánto queda en el fondo de patrocinio de una sala.
    pub fn fondo(env: Env, sala: BytesN<32>, moneda: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&Clave::Fondo(sala, moneda))
            .unwrap_or(0)
    }

    pub fn parte_autor(env: Env) -> u32 {
        env.storage().instance().get(&Clave::ParteAutor).unwrap()
    }

    pub fn tesoro(env: Env) -> Address {
        env.storage().instance().get(&Clave::Tesoro).unwrap()
    }

    pub fn administrador(env: Env) -> Address {
        Self::admin(&env)
    }

    /// Segundos entre proponer un cambio sensible y poder aplicarlo.
    pub fn plazo_aviso(env: Env) -> u64 {
        env.storage().instance().get(&Clave::PlazoAviso).unwrap()
    }

    /// La propuesta pendiente de un tipo, si hay.
    pub fn propuesta(env: Env, tipo: TipoCambio) -> Option<Propuesta> {
        env.storage().instance().get(&Clave::Propuesta(tipo))
    }
}

// ---------- Funciones internas ----------

/// Datos de una huella nueva antes de guardarla.
struct Nueva {
    autor: Address,
    artista: Address,
    digest: BytesN<32>,
    padre: Option<BytesN<32>>,
    raiz: BytesN<32>,
    sala: Option<BytesN<32>>,
    presencial: bool,
    admite_respuestas: bool,
}

impl Umbral {
    fn admin(env: &Env) -> Address {
        env.storage().instance().get(&Clave::Admin).unwrap()
    }

    fn renovar_instancia(env: &Env) {
        env.storage().instance().extend_ttl(UMBRAL_VIDA, VIDA);
    }

    /// Renueva la vigencia de una sala (que ya existe) y de la instancia.
    fn extender_sala(env: &Env, sala: &BytesN<32>) {
        env.storage()
            .persistent()
            .extend_ttl(&Clave::Sala(sala.clone()), UMBRAL_VIDA, VIDA);
        Self::renovar_instancia(env);
    }

    /// Extiende la vigencia de un dato persistente sin reescribirlo. Si no
    /// existe, devuelve `si_falta`.
    fn extender(env: &Env, clave: &Clave, si_falta: Error) -> Result<(), Error> {
        if !env.storage().persistent().has(clave) {
            return Err(si_falta);
        }
        env.storage().persistent().extend_ttl(clave, UMBRAL_VIDA, VIDA);
        Self::renovar_instancia(env);
        Ok(())
    }

    /// Extiende la vigencia de un dato persistente al menos hasta la fecha
    /// `hasta` (segundos desde 1970) más un día de margen, y como mínimo la
    /// vida de siempre. Nunca pasa del máximo que permite la red.
    fn extender_hasta(env: &Env, clave: &Clave, hasta: u64) {
        let ahora = env.ledger().timestamp();
        let ledgers = hasta.saturating_sub(ahora) / SEGUNDOS_LEDGER;
        let max = env.storage().max_ttl();
        let objetivo = u32::try_from(ledgers)
            .unwrap_or(u32::MAX)
            .saturating_add(DIA)
            .max(VIDA)
            .min(max);
        env.storage()
            .persistent()
            .extend_ttl(clave, objetivo.saturating_sub(DIA), objetivo);
    }

    fn hash_de(env: &Env, cuenta: &Address, datos: BytesN<32>) -> BytesN<32> {
        let mut todo: Bytes = cuenta.clone().to_xdr(env);
        todo.append(&Bytes::from(datos));
        env.crypto().sha256(&todo).to_bytes()
    }

    /// Guarda una propuesta (reemplaza la pendiente del mismo tipo y reinicia
    /// el plazo). Solo el administrador. Devuelve desde cuándo se aplica.
    fn proponer(env: &Env, tipo: TipoCambio, cambio: Cambio) -> Result<u64, Error> {
        Self::admin(env).require_auth();
        let plazo: u64 = env.storage().instance().get(&Clave::PlazoAviso).unwrap();
        let aplicable_desde = env
            .ledger()
            .timestamp()
            .checked_add(plazo)
            .ok_or(Error::Desborde)?;
        let aplicable_hasta = aplicable_desde
            .checked_add(VIGENCIA_PROPUESTA)
            .ok_or(Error::Desborde)?;
        let p = Propuesta { cambio: cambio.clone(), aplicable_desde, aplicable_hasta };
        env.storage().instance().set(&Clave::Propuesta(tipo), &p);
        Self::renovar_instancia(env);
        CambioPropuesto { cambio, aplicable_desde, aplicable_hasta }.publish(env);
        Ok(aplicable_desde)
    }

    fn leer_propuesta(env: &Env, tipo: TipoCambio) -> Result<Propuesta, Error> {
        env.storage()
            .instance()
            .get(&Clave::Propuesta(tipo))
            .ok_or(Error::NoHayPropuesta)
    }

    /// Saca la propuesta pendiente de un tipo si ya pasó su plazo y todavía
    /// no venció, y devuelve el cambio. La firma se revisa antes, en cada
    /// `aplicar_*`. Una vencida queda guardada hasta que se cancela o se
    /// reemplaza con otra propuesta, pero ya no se puede aplicar.
    fn tomar_propuesta(env: &Env, tipo: TipoCambio) -> Result<Cambio, Error> {
        let p = Self::leer_propuesta(env, tipo.clone())?;
        let ahora = env.ledger().timestamp();
        if ahora < p.aplicable_desde {
            return Err(Error::PlazoNoCumplido);
        }
        if ahora > p.aplicable_hasta {
            return Err(Error::PropuestaVencida);
        }
        env.storage().instance().remove(&Clave::Propuesta(tipo));
        Self::renovar_instancia(env);
        Ok(p.cambio)
    }

    /// La huella tiene que estar activa y, si no es la raíz, su obra raíz
    /// también. Así la moderación de una obra corta toda su cadena.
    fn exigir_activa(env: &Env, id: &BytesN<32>, huella: &Huella) -> Result<(), Error> {
        if !huella.activa {
            return Err(Error::Retirada);
        }
        if huella.raiz != *id {
            let raiz = Self::obtener(env.clone(), huella.raiz.clone())?;
            if !raiz.activa {
                return Err(Error::Retirada);
            }
        }
        Ok(())
    }

    /// Si la huella es de una sala que hoy tiene su muestra en curso y el
    /// artista aceptó esa muestra, devuelve el museo y la parte acordada.
    /// Renueva la vigencia de la muestra, del acuerdo y de la sala que lee.
    fn museo_en_muestra(
        env: &Env,
        sala: &Option<BytesN<32>>,
        artista: &Address,
    ) -> Option<(Address, u32)> {
        let s = sala.clone()?;
        let clave_muestra = Clave::Muestra(s.clone());
        let m: Muestra = env.storage().persistent().get(&clave_muestra)?;
        Self::extender_hasta(env, &clave_muestra, m.hasta);
        let ahora = env.ledger().timestamp();
        if ahora < m.desde || ahora > m.hasta {
            return None;
        }
        let clave_acuerdo = Clave::Acuerdo(s.clone(), artista.clone());
        let aceptada: Muestra = env.storage().persistent().get(&clave_acuerdo)?;
        Self::extender_hasta(env, &clave_acuerdo, aceptada.hasta);
        if aceptada != m {
            return None;
        }
        let museo: Address = env.storage().persistent().get(&Clave::Sala(s.clone()))?;
        Self::extender_sala(env, &s);
        Some((museo, m.parte_sala_bps))
    }

    /// `monto * bps / 10000`, con control de desborde. Redondea hacia abajo:
    /// lo que sobra del redondeo va al tesoro.
    fn parte_de(monto: i128, bps: u32) -> Result<i128, Error> {
        Ok(monto.checked_mul(bps as i128).ok_or(Error::Desborde)? / (TOTAL_BPS as i128))
    }

    /// Si una cuenta tiene una invitación sin usar en una sala. Si la
    /// invitación existe, renueva su vigencia.
    fn invitacion_disponible(env: &Env, sala: &BytesN<32>, cuenta: &Address) -> bool {
        let clave = Clave::Invitacion(sala.clone(), cuenta.clone());
        let disponible: Option<bool> = env.storage().persistent().get(&clave);
        if disponible.is_some() {
            env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        }
        disponible.unwrap_or(false)
    }

    /// Si el artista aceptó la muestra que la sala tiene cargada y esa
    /// muestra todavía no terminó (en curso o por empezar). Renueva la
    /// vigencia de la muestra y del acuerdo que lee.
    fn acuerdo_vigente(env: &Env, sala: &BytesN<32>, artista: &Address) -> bool {
        let clave_muestra = Clave::Muestra(sala.clone());
        let m: Muestra = match env.storage().persistent().get(&clave_muestra) {
            Some(m) => m,
            None => return false,
        };
        Self::extender_hasta(env, &clave_muestra, m.hasta);
        let clave_acuerdo = Clave::Acuerdo(sala.clone(), artista.clone());
        let aceptada: Muestra = match env.storage().persistent().get(&clave_acuerdo) {
            Some(a) => a,
            None => return false,
        };
        Self::extender_hasta(env, &clave_acuerdo, aceptada.hasta);
        aceptada == m && env.ledger().timestamp() <= m.hasta
    }

    /// Si el fondo de la sala en esa moneda alcanza para `precio`. Si el
    /// fondo existe, renueva su vigencia.
    fn fondo_alcanza(env: &Env, sala: &BytesN<32>, moneda: &Address, precio: i128) -> bool {
        let clave = Clave::Fondo(sala.clone(), moneda.clone());
        let fondo: Option<i128> = env.storage().persistent().get(&clave);
        if fondo.is_some() {
            env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        }
        fondo.unwrap_or(0) >= precio
    }

    /// Gasta la invitación de la cuenta y descuenta `precio` del fondo de la
    /// sala. La plata no se mueve: ya está en el contrato y la reparte quien
    /// llama. Falla con `FondoInsuficiente` si el fondo no alcanza, y con
    /// `NoAutorizado` si la cuenta no tiene una invitación sin usar.
    fn usar_patrocinio(
        env: &Env,
        sala: &BytesN<32>,
        autor: &Address,
        moneda: &Address,
        precio: i128,
    ) -> Result<(), Error> {
        if precio <= 0 {
            return Err(Error::PrecioInvalido);
        }
        let invitacion = Clave::Invitacion(sala.clone(), autor.clone());
        let disponible: bool = env.storage().persistent().get(&invitacion).unwrap_or(false);
        if !disponible {
            return Err(Error::NoAutorizado);
        }
        let clave = Clave::Fondo(sala.clone(), moneda.clone());
        let fondo: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        if fondo < precio {
            return Err(Error::FondoInsuficiente);
        }
        env.storage().persistent().set(&clave, &(fondo - precio));
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        env.storage().persistent().set(&invitacion, &false);
        env.storage().persistent().extend_ttl(&invitacion, UMBRAL_VIDA, VIDA);
        FondoUsado {
            sala: sala.clone(),
            cuenta: autor.clone(),
            moneda: moneda.clone(),
            monto: precio,
        }
        .publish(env);
        Ok(())
    }

    fn sumar_saldo(env: &Env, autor: &Address, moneda: &Address, monto: i128) {
        let clave = Clave::Saldo(autor.clone(), moneda.clone());
        let actual: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        let nuevo = match actual.checked_add(monto) {
            Some(n) => n,
            None => soroban_sdk::panic_with_error!(env, Error::Desborde),
        };
        env.storage().persistent().set(&clave, &nuevo);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        SaldoAcreditado { beneficiario: autor.clone(), moneda: moneda.clone(), monto }.publish(env);
    }

    fn exigir_id_libre(env: &Env, id: &BytesN<32>) -> Result<(), Error> {
        if env.storage().persistent().has(&Clave::Huella(id.clone())) {
            return Err(Error::YaExiste);
        }
        Ok(())
    }

    fn guardar(env: &Env, id: &BytesN<32>, huella: &Huella) {
        let clave = Clave::Huella(id.clone());
        env.storage().persistent().set(&clave, huella);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
    }

    fn guardar_nueva(env: &Env, id: BytesN<32>, n: Nueva) {
        let huella = Huella {
            autor: n.autor.clone(),
            artista: n.artista.clone(),
            digest: n.digest.clone(),
            padre: n.padre.clone(),
            raiz: n.raiz,
            sala: n.sala.clone(),
            presencial: n.presencial,
            admite_respuestas: n.admite_respuestas,
            activa: true,
            apoyos: 0,
            respuestas: 0,
            creada: env.ledger().timestamp(),
        };
        Self::guardar(env, &id, &huella);
        Self::renovar_instancia(env);
        HuellaDejada {
            id,
            autor: n.autor,
            artista: n.artista,
            digest: n.digest,
            padre: n.padre,
            sala: n.sala,
        }
        .publish(env);
    }

    fn desactivar(env: &Env, id: BytesN<32>, por_moderacion: bool) -> Result<(), Error> {
        let mut huella = Self::obtener(env.clone(), id.clone())?;
        if !huella.activa {
            return Err(Error::Retirada);
        }
        huella.activa = false;
        Self::guardar(env, &id, &huella);
        Self::renovar_instancia(env);
        HuellaRetirada { id, por_moderacion }.publish(env);
        Ok(())
    }

    /// Cobra `monto` a `pagador`. Si hay `artista`, su parte queda guardada en
    /// el contrato a su nombre (la retira con `cobrar`) y el resto va a Umbral.
    /// Se guarda en vez de pagarse directo para que un artista que no puede
    /// recibir esa moneda no haga fallar la acción de otra persona.
    /// Con `pagador` en `None`, el monto ya está en el contrato (lo pagó el
    /// fondo de una sala): las partes del artista y de la sala solo se anotan
    /// y lo de Umbral sale del contrato.
    fn cobrar_y_repartir(
        env: &Env,
        pagador: Option<&Address>,
        moneda: &Address,
        monto: i128,
        artista: Option<&Address>,
        museo: Option<(&Address, u32)>,
    ) -> Result<(), Error> {
        if monto <= 0 {
            return Err(Error::PrecioInvalido);
        }
        let cliente = token::TokenClient::new(env, moneda);
        // Sin muestra, o con una muestra en la que la sala no cobra nada: el
        // artista recibe su parte (80%). Con muestra en curso y sala > 0%:
        // Umbral se queda con el 30%, la sala con la parte acordada y el
        // artista con el resto, que nunca baja del piso.
        let museo = museo.filter(|(_, bps)| *bps > 0);
        let (parte, parte_sala) = match (artista, museo) {
            (Some(_), Some((_, bps_sala))) => {
                let bps_artista = TOTAL_BPS
                    .saturating_sub(MUESTRA_UMBRAL_BPS)
                    .saturating_sub(bps_sala)
                    .max(PISO_AUTOR_BPS);
                (Self::parte_de(monto, bps_artista)?, Self::parte_de(monto, bps_sala)?)
            }
            (Some(_), None) => {
                let bps: u32 = env.storage().instance().get(&Clave::ParteAutor).unwrap();
                (Self::parte_de(monto, bps)?, 0)
            }
            (None, _) => (0, 0),
        };
        let yo = env.current_contract_address();
        let al_contrato = parte.checked_add(parte_sala).ok_or(Error::Desborde)?;
        if let (Some(p), true) = (pagador, al_contrato > 0) {
            cliente.transfer(p, &yo, &al_contrato);
        }
        if let (Some(a), true) = (artista, parte > 0) {
            Self::sumar_saldo(env, a, moneda, parte);
        }
        if let (Some((s, _)), true) = (museo, parte_sala > 0) {
            Self::sumar_saldo(env, s, moneda, parte_sala);
        }
        // El redondeo queda del lado de Umbral: nunca se cobra de más ni de menos.
        let resto = monto - al_contrato;
        if resto > 0 {
            let tesoro: Address = env.storage().instance().get(&Clave::Tesoro).unwrap();
            cliente.transfer(pagador.unwrap_or(&yo), &tesoro, &resto);
        }
        Ok(())
    }
}

mod test;
