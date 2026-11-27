//! Umbral: registro de huellas con valor.
//!
//! Cada huella (un texto, una foto o un audio) queda anotada con su autor, el
//! código que identifica su contenido y, si es un comentario, la huella de la
//! que nació. Dejar una huella y continuarla se pagan en una moneda aceptada
//! (USDC o XLM). Al continuar, una parte queda a nombre del artista que abrió
//! la obra, en toda la cadena. Apoyar es un pago voluntario de monto libre que
//! también va al artista. Quien responde no cobra. El contenido nunca se guarda acá: solo su código
//! (SHA-256).
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
/// 100% en puntos básicos.
const TOTAL_BPS: u32 = 10_000;
/// Parte de cada apoyo voluntario que queda para Umbral (30%).
const APOYO_UMBRAL_BPS: u32 = 3_000;
/// Piso de la parte del artista en una continuación (30%). Ningún
/// administrador puede bajarla de acá.
const PISO_AUTOR_BPS: u32 = 3_000;
/// Tope de la parte que puede recibir una sala durante su muestra (40%).
/// La parte de la sala se elige al abrir cada muestra y sale de la parte
/// del artista, que igual nunca baja del piso.
const MUESTRA_SALA_MAX_BPS: u32 = 4_000;
/// Duración máxima de una muestra, en segundos (90 días).
const MUESTRA_MAX: u64 = 90 * 86_400;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Ya hay una huella con ese identificador.
    YaExiste = 1,
    /// No hay ninguna huella con ese identificador.
    NoExiste = 2,
    /// La huella fue retirada.
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
    /// Esa cuenta ya fue invitada a esa sala.
    YaInvitada = 13,
    /// El precio vigente es mayor que el máximo que aceptó quien paga.
    PrecioSuperado = 14,
    /// Las fechas de la muestra no sirven: ya pasó, dura más de 90 días o
    /// la sala tiene otra muestra que todavía no terminó.
    MuestraInvalida = 15,
    /// El fondo de la sala no alcanza para ese retiro.
    FondoInsuficiente = 16,
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
    /// Sala de museo a la que pertenece, si pertenece a alguna.
    pub sala: Option<BytesN<32>>,
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
    pub desde: u64,
    pub hasta: u64,
    /// Parte de cada continuación que recibe la sala, en puntos básicos.
    pub parte_sala_bps: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum Clave {
    Admin,
    Tesoro,
    ParteAutor,
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
    /// está disponible, `false` cuando ya se usó.
    Invitacion(BytesN<32>, Address),
    /// Saldo a cobrar: (autor, moneda).
    Saldo(Address, Address),
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
    pub desde: u64,
    pub hasta: u64,
    pub parte_sala_bps: u32,
}

/// Un artista aceptó el reparto de la muestra de una sala para sus obras.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MuestraAceptada {
    #[topic]
    pub sala: BytesN<32>,
    pub artista: Address,
    pub desde: u64,
    pub parte_sala_bps: u32,
}

/// El museo de una sala invitó a un visitante a dejar una huella.
#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VisitanteInvitado {
    #[topic]
    pub sala: BytesN<32>,
    pub cuenta: Address,
}

/// El fondo de una sala pagó la huella de una cuenta invitada.
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

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ParteAutorFijada {
    pub parte_autor_bps: u32,
}

#[contract]
pub struct Umbral;

#[contractimpl]
impl Umbral {
    /// `parte_autor_bps`: qué parte de una continuación va al artista que
    /// abrió la obra, en puntos básicos (5000 = 50%). El resto va a Umbral.
    pub fn __constructor(env: Env, admin: Address, tesoro: Address, parte_autor_bps: u32) {
        if parte_autor_bps < PISO_AUTOR_BPS || parte_autor_bps > TOTAL_BPS {
            soroban_sdk::panic_with_error!(&env, Error::PorcentajeInvalido);
        }
        let inst = env.storage().instance();
        inst.set(&Clave::Admin, &admin);
        inst.set(&Clave::Tesoro, &tesoro);
        inst.set(&Clave::ParteAutor, &parte_autor_bps);
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

    /// Cambia la parte que recibe el artista. Nunca por debajo del piso.
    pub fn fijar_parte_autor(env: Env, parte_autor_bps: u32) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        if parte_autor_bps < PISO_AUTOR_BPS || parte_autor_bps > TOTAL_BPS {
            return Err(Error::PorcentajeInvalido);
        }
        env.storage().instance().set(&Clave::ParteAutor, &parte_autor_bps);
        Self::renovar_instancia(&env);
        ParteAutorFijada { parte_autor_bps }.publish(&env);
        Ok(())
    }

    /// Moderación: el administrador de Umbral retira una huella. No borra el
    /// registro y el aviso dice que fue por moderación.
    pub fn moderar(env: Env, id: BytesN<32>) -> Result<(), Error> {
        Self::admin(&env).require_auth();
        Self::desactivar(&env, id, true)
    }

    /// Reemplaza el código del contrato por uno ya subido a la red, sin
    /// perder huellas, saldos ni fondos. Solo el administrador.
    pub fn actualizar(env: Env, wasm_hash: BytesN<32>) {
        Self::admin(&env).require_auth();
        env.deployer()
            .update_current_contract(soroban_sdk::deploy::ContractExecutable::Wasm(wasm_hash));
    }

    // ---------- Salas de museos y patrocinio ----------

    /// Un museo o institución abre su sala dentro de Umbral.
    pub fn abrir_sala(env: Env, museo: Address, sala: BytesN<32>) -> Result<(), Error> {
        museo.require_auth();
        let clave = Clave::Sala(sala.clone());
        if env.storage().persistent().has(&clave) {
            return Err(Error::YaExiste);
        }
        env.storage().persistent().set(&clave, &museo);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::renovar_instancia(&env);
        SalaAbierta { sala, museo }.publish(&env);
        Ok(())
    }

    /// Umbral abre la muestra con fecha de una sala, a pedido de su museo.
    /// Mientras dura, cada continuación sobre una obra de esa sala le deja
    /// a la sala `parte_sala_bps` (de 0 a 40%), que se acuerda para cada
    /// muestra y queda publicado. El artista nunca baja del piso. Dura como
    /// mucho 90 días y una sala no puede tener dos muestras a la vez.
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
        if hasta <= desde || hasta <= ahora || hasta - desde > MUESTRA_MAX {
            return Err(Error::MuestraInvalida);
        }
        let clave = Clave::Muestra(sala.clone());
        let anterior: Option<Muestra> = env.storage().persistent().get(&clave);
        if let Some(m) = anterior {
            if m.hasta >= ahora {
                return Err(Error::MuestraInvalida);
            }
        }
        env.storage().persistent().set(&clave, &Muestra { desde, hasta, parte_sala_bps });
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::renovar_sala(&env, &sala);
        MuestraAbierta { sala, desde, hasta, parte_sala_bps }.publish(&env);
        Ok(())
    }

    /// El artista acepta, con su firma, el reparto de la muestra de una sala
    /// para sus obras de esa sala. Sin esta firma, sus obras siguen con el
    /// reparto de siempre aunque la sala esté en muestra. `parte_sala_bps`
    /// es el porcentaje que el artista vio: si no coincide, falla.
    pub fn aceptar_muestra(
        env: Env,
        artista: Address,
        sala: BytesN<32>,
        parte_sala_bps: u32,
    ) -> Result<(), Error> {
        artista.require_auth();
        let m: Muestra = env
            .storage()
            .persistent()
            .get(&Clave::Muestra(sala.clone()))
            .ok_or(Error::MuestraInvalida)?;
        if m.hasta < env.ledger().timestamp() {
            return Err(Error::MuestraInvalida);
        }
        if m.parte_sala_bps != parte_sala_bps {
            return Err(Error::PorcentajeInvalido);
        }
        let clave = Clave::Acuerdo(sala.clone(), artista.clone());
        env.storage().persistent().set(&clave, &m);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::renovar_sala(&env, &sala);
        MuestraAceptada { sala, artista, desde: m.desde, parte_sala_bps }.publish(&env);
        Ok(())
    }

    /// El museo que abrió la sala invita a una cuenta: el fondo de la sala le
    /// paga una huella, una sola vez. Solo el museo decide a quién invita, así
    /// nadie puede vaciar el fondo creando cuentas.
    pub fn invitar(env: Env, sala: BytesN<32>, cuenta: Address) -> Result<(), Error> {
        let museo = Self::museo_de(env.clone(), sala.clone())?;
        museo.require_auth();
        let clave = Clave::Invitacion(sala.clone(), cuenta.clone());
        if env.storage().persistent().has(&clave) {
            return Err(Error::YaInvitada);
        }
        env.storage().persistent().set(&clave, &true);
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::renovar_sala(&env, &sala);
        VisitanteInvitado { sala, cuenta }.publish(&env);
        Ok(())
    }

    /// Cualquiera (el museo o quien lo apoye) pone plata en el fondo de una
    /// sala. Ese fondo paga una huella a cada visitante que el museo invitó.
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
        Self::renovar_sala(&env, &sala);
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
        Self::renovar_sala(&env, &sala);
        FondoRetirado { sala, museo, moneda, monto }.publish(&env);
        Ok(())
    }

    // ---------- Acciones de los usuarios ----------

    /// Deja una huella nueva. El precio completo va al museo Umbral.
    /// Si la huella va a una sala con fondo y el museo invitó a esa cuenta,
    /// paga el fondo y no el autor. Devuelve `true` si la pagó el fondo.
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
            Self::museo_de(env.clone(), s.clone())?;
            Self::renovar_sala(&env, &s);
            patrocinada = Self::usar_patrocinio(&env, &s, &autor, &moneda, precios.huella);
        }
        if !patrocinada {
            Self::cobrar_y_repartir(&env, &autor, &moneda, precios.huella, None, None)?;
        }
        let artista = autor.clone();
        Self::guardar_nueva(&env, id, autor, artista, digest, None, admite_respuestas, sala);
        Ok(patrocinada)
    }

    /// Continúa una huella existente. Una parte del pago queda a nombre del
    /// artista que abrió la obra (sea cual sea el nivel de la cadena) y el
    /// resto va a Umbral. Quien escribió la huella continuada no cobra.
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
        if !original.activa {
            return Err(Error::Retirada);
        }
        if !original.admite_respuestas {
            return Err(Error::NoAdmiteRespuestas);
        }

        let museo = Self::museo_en_muestra(&env, &original.sala, &original.artista);
        Self::cobrar_y_repartir(
            &env,
            &autor,
            &moneda,
            precios.comentario,
            Some(&original.artista),
            museo.as_ref().map(|(m, bps)| (m, *bps)),
        )?;

        original.respuestas = original.respuestas.checked_add(1).ok_or(Error::Desborde)?;
        Self::guardar(&env, &padre, &original);
        let sala = original.sala.clone();
        let artista = original.artista.clone();
        Self::guardar_nueva(&env, id, autor, artista, digest, Some(padre), admite_respuestas, sala);
        Ok(())
    }

    /// Apoyo voluntario de monto libre sobre cualquier huella. El 70% queda a
    /// nombre del artista que abrió la obra (lo retira con `cobrar`) y el 30%
    /// va a Umbral. Quien escribió una respuesta no cobra.
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
        if !huella.activa {
            return Err(Error::Retirada);
        }

        let para_umbral = Self::parte_de(monto, APOYO_UMBRAL_BPS)?;
        let para_artista = monto - para_umbral;
        let cliente = token::TokenClient::new(&env, &moneda);
        if para_umbral > 0 {
            let tesoro: Address = env.storage().instance().get(&Clave::Tesoro).unwrap();
            cliente.transfer(&quien, &tesoro, &para_umbral);
        }
        cliente.transfer(&quien, &env.current_contract_address(), &para_artista);
        Self::sumar_saldo(&env, &huella.artista, &moneda, para_artista);

        huella.apoyos = huella.apoyos.checked_add(1).ok_or(Error::Desborde)?;
        Self::guardar(&env, &id, &huella);
        Self::renovar_instancia(&env);
        HuellaApoyada { id, quien, moneda, monto }.publish(&env);
        Ok(())
    }

    /// Cualquiera puede renovar la vigencia de una huella para que no se
    /// archive por falta de movimiento. No cambia ningún dato.
    pub fn renovar(env: Env, id: BytesN<32>) -> Result<(), Error> {
        let clave = Clave::Huella(id);
        if !env.storage().persistent().has(&clave) {
            return Err(Error::NoExiste);
        }
        // Solo extiende la vigencia: no reescribe el dato.
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        Self::renovar_instancia(&env);
        Ok(())
    }

    /// El artista retira lo que juntó en una moneda. Devuelve el monto cobrado.
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
        let mut datos: Bytes = autor.to_xdr(&env);
        datos.append(&Bytes::from(digest));
        env.crypto().sha256(&datos).to_bytes()
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
}

// ---------- Funciones internas ----------

impl Umbral {
    fn admin(env: &Env) -> Address {
        env.storage().instance().get(&Clave::Admin).unwrap()
    }

    fn renovar_instancia(env: &Env) {
        env.storage().instance().extend_ttl(UMBRAL_VIDA, VIDA);
    }

    /// Renueva la vigencia de una sala (que ya existe) y de la instancia.
    fn renovar_sala(env: &Env, sala: &BytesN<32>) {
        env.storage()
            .persistent()
            .extend_ttl(&Clave::Sala(sala.clone()), UMBRAL_VIDA, VIDA);
        Self::renovar_instancia(env);
    }

    /// Si la huella es de una sala que hoy tiene su muestra en curso y el
    /// artista aceptó esa muestra, devuelve el museo y la parte acordada.
    fn museo_en_muestra(
        env: &Env,
        sala: &Option<BytesN<32>>,
        artista: &Address,
    ) -> Option<(Address, u32)> {
        let s = sala.clone()?;
        let m: Muestra = env.storage().persistent().get(&Clave::Muestra(s.clone()))?;
        let ahora = env.ledger().timestamp();
        if ahora < m.desde || ahora > m.hasta {
            return None;
        }
        let aceptada: Muestra = env
            .storage()
            .persistent()
            .get(&Clave::Acuerdo(s.clone(), artista.clone()))?;
        if aceptada != m {
            return None;
        }
        let museo: Address = env.storage().persistent().get(&Clave::Sala(s))?;
        Some((museo, m.parte_sala_bps))
    }

    /// `monto * bps / 10000`, con control de desborde.
    fn parte_de(monto: i128, bps: u32) -> Result<i128, Error> {
        Ok(monto.checked_mul(bps as i128).ok_or(Error::Desborde)? / (TOTAL_BPS as i128))
    }

    /// Si el fondo de la sala alcanza y la cuenta tiene una invitación sin
    /// usar, paga el precio desde el fondo a Umbral y devuelve `true`.
    fn usar_patrocinio(
        env: &Env,
        sala: &BytesN<32>,
        autor: &Address,
        moneda: &Address,
        precio: i128,
    ) -> bool {
        let invitacion = Clave::Invitacion(sala.clone(), autor.clone());
        let disponible: bool = env.storage().persistent().get(&invitacion).unwrap_or(false);
        let clave = Clave::Fondo(sala.clone(), moneda.clone());
        let fondo: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        if precio <= 0 || fondo < precio || !disponible {
            return false;
        }
        env.storage().persistent().set(&clave, &(fondo - precio));
        env.storage().persistent().extend_ttl(&clave, UMBRAL_VIDA, VIDA);
        env.storage().persistent().set(&invitacion, &false);
        env.storage().persistent().extend_ttl(&invitacion, UMBRAL_VIDA, VIDA);
        let tesoro: Address = env.storage().instance().get(&Clave::Tesoro).unwrap();
        token::TokenClient::new(env, moneda).transfer(
            &env.current_contract_address(),
            &tesoro,
            &precio,
        );
        FondoUsado {
            sala: sala.clone(),
            cuenta: autor.clone(),
            moneda: moneda.clone(),
            monto: precio,
        }
        .publish(env);
        true
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

    fn guardar_nueva(
        env: &Env,
        id: BytesN<32>,
        autor: Address,
        artista: Address,
        digest: BytesN<32>,
        padre: Option<BytesN<32>>,
        admite_respuestas: bool,
        sala: Option<BytesN<32>>,
    ) {
        let huella = Huella {
            autor: autor.clone(),
            artista: artista.clone(),
            digest: digest.clone(),
            padre: padre.clone(),
            sala: sala.clone(),
            admite_respuestas,
            activa: true,
            apoyos: 0,
            respuestas: 0,
            creada: env.ledger().timestamp(),
        };
        Self::guardar(env, &id, &huella);
        Self::renovar_instancia(env);
        HuellaDejada { id, autor, artista, digest, padre, sala }.publish(env);
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
    fn cobrar_y_repartir(
        env: &Env,
        pagador: &Address,
        moneda: &Address,
        monto: i128,
        artista: Option<&Address>,
        museo: Option<(&Address, u32)>,
    ) -> Result<(), Error> {
        if monto <= 0 {
            return Err(Error::PrecioInvalido);
        }
        let cliente = token::TokenClient::new(env, moneda);
        // Sin muestra: el artista recibe su parte entera. Con muestra en
        // curso: la sala recibe la parte acordada, que sale de la del artista, y el
        // artista nunca baja del piso.
        let (parte, parte_sala) = match (artista, museo) {
            (Some(_), sala) => {
                let bps: u32 = env.storage().instance().get(&Clave::ParteAutor).unwrap();
                match sala {
                    Some((_, bps_sala)) => {
                        let bps_artista = bps.saturating_sub(bps_sala).max(PISO_AUTOR_BPS);
                        (Self::parte_de(monto, bps_artista)?, Self::parte_de(monto, bps_sala)?)
                    }
                    None => (Self::parte_de(monto, bps)?, 0),
                }
            }
            (None, _) => (0, 0),
        };
        let al_contrato = parte + parte_sala;
        if al_contrato > 0 {
            cliente.transfer(pagador, &env.current_contract_address(), &al_contrato);
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
            cliente.transfer(pagador, &tesoro, &resto);
        }
        Ok(())
    }
}

mod test;
