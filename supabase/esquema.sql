-- Base de datos de UMBRAL. Se corre una sola vez en un proyecto Supabase vacío.
-- No contiene claves.

do $$
begin
  create type public.estado_huella as enum ('pendiente', 'publicada', 'retirada');
exception
  when duplicate_object then null;
end
$$;

create schema if not exists privado;

create table if not exists public.huellas (
  id text primary key,
  digest text not null,
  tx_hash text unique,
  autor text not null,
  artista text not null,
  moneda text not null,
  padre text references public.huellas(id),
  sala text,
  estado public.estado_huella not null default 'pendiente',
  nombre text not null,
  titulo text,
  descripcion text,
  texto text,
  foto_ruta text,
  audio_ruta text,
  enlace text,
  sal text not null,
  creado text not null,
  recibido timestamptz not null default now(),
  raiz text,
  respuestas_publicadas integer not null default 0,
  constraint huellas_id_hex check (id ~ '^[0-9a-f]{64}$'),
  constraint huellas_digest_hex check (digest ~ '^[0-9a-f]{64}$'),
  constraint huellas_tx_hash_hex check (tx_hash is null or tx_hash ~ '^[0-9a-f]{64}$'),
  constraint huellas_autor_stellar check (autor ~ '^G[A-Z2-7]{55}$'),
  constraint huellas_artista_stellar check (artista ~ '^G[A-Z2-7]{55}$'),
  constraint huellas_moneda_sac check (moneda ~ '^C[A-Z2-7]{55}$'),
  constraint huellas_sala_hex check (sala is null or sala ~ '^[0-9a-f]{64}$'),
  constraint huellas_nombre_largo check (char_length(nombre) between 1 and 80),
  constraint huellas_titulo_obra check (
    (padre is null
      and titulo is not null
      and char_length(btrim(titulo)) between 1 and 200
      and array_length(regexp_split_to_array(btrim(titulo), E'\\s+'), 1) <= 20)
    or (padre is not null and titulo is null)
  ),
  constraint huellas_descripcion_larga check (
    descripcion is null or char_length(descripcion) <= 400
  ),
  constraint huellas_solo_obras check (
    padre is null
    or (titulo is null and descripcion is null and foto_ruta is null and audio_ruta is null)
  ),
  constraint huellas_texto_largo check (texto is null or char_length(texto) <= 300),
  constraint huellas_texto_respuesta check (
    padre is null or (texto is not null and char_length(btrim(texto)) >= 3)
  ),
  constraint huellas_nombre_sin_espacios check (nombre = btrim(nombre)),
  constraint huellas_foto_ruta check (
    foto_ruta is null
    or (padre is null and char_length(foto_ruta) <= 300 and foto_ruta like id || '/%')
  ),
  constraint huellas_audio_ruta check (
    audio_ruta is null
    or (padre is null and char_length(audio_ruta) <= 300 and audio_ruta like id || '/%')
  ),
  constraint huellas_enlace check (
    enlace is null or (enlace ~ '^https?://' and char_length(enlace) <= 500)
  ),
  constraint huellas_sal check (char_length(sal) between 16 and 128),
  constraint huellas_creado_iso check (creado ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'),
  constraint huellas_respuestas_no_negativas check (
    respuestas_publicadas >= 0 and (padre is null or respuestas_publicadas = 0)
  )
);

create table if not exists public.favoritos (
  cuenta text not null check (cuenta ~ '^G[A-Z2-7]{55}$'),
  huella_id text not null references public.huellas(id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (cuenta, huella_id)
);

create index if not exists huellas_obras_por_respuestas_idx
  on public.huellas (respuestas_publicadas desc)
  where padre is null and estado = 'publicada';

create index if not exists huellas_obras_recientes_idx
  on public.huellas (recibido desc)
  where padre is null and estado = 'publicada';

create index if not exists huellas_raiz_recibido_publicadas_idx
  on public.huellas (raiz, recibido)
  where estado = 'publicada';

create index if not exists huellas_padre_idx on public.huellas (padre);
create index if not exists favoritos_huella_id_idx on public.favoritos (huella_id);

create index if not exists huellas_pendientes_recibido_idx
  on public.huellas (recibido)
  where estado = 'pendiente';

create or replace function public.huellas_antes_insertar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raiz text;
begin
  new.recibido := pg_catalog.now();
  new.respuestas_publicadas := 0;

  if new.padre is null then
    new.raiz := null;
  else
    select coalesce(p.raiz, p.id)
      into v_raiz
      from public.huellas as p
      where p.id = new.padre;
    new.raiz := v_raiz;
  end if;

  return new;
end;
$$;

create or replace function public.huellas_actualizar_conteo_respuestas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.raiz is not null and new.estado = 'publicada' then
      update public.huellas
        set respuestas_publicadas = respuestas_publicadas + 1
        where id = new.raiz and padre is null;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.raiz is not null and old.estado = 'publicada' then
      update public.huellas
        set respuestas_publicadas = respuestas_publicadas - 1
        where id = old.raiz and padre is null;
    end if;
    return old;
  else
    if old.raiz is not null and old.estado = 'publicada' and new.estado <> 'publicada' then
      update public.huellas
        set respuestas_publicadas = respuestas_publicadas - 1
        where id = old.raiz and padre is null;
    elsif new.raiz is not null and old.estado <> 'publicada' and new.estado = 'publicada' then
      update public.huellas
        set respuestas_publicadas = respuestas_publicadas + 1
        where id = new.raiz and padre is null;
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists huellas_antes_insertar on public.huellas;
create trigger huellas_antes_insertar
before insert on public.huellas
for each row execute function public.huellas_antes_insertar();

drop trigger if exists huellas_contar_respuesta_insertada on public.huellas;
create trigger huellas_contar_respuesta_insertada
after insert on public.huellas
for each row execute function public.huellas_actualizar_conteo_respuestas();

drop trigger if exists huellas_contar_respuesta_actualizada on public.huellas;
create trigger huellas_contar_respuesta_actualizada
after update of estado on public.huellas
for each row execute function public.huellas_actualizar_conteo_respuestas();

drop trigger if exists huellas_contar_respuesta_borrada on public.huellas;
create trigger huellas_contar_respuesta_borrada
after delete on public.huellas
for each row execute function public.huellas_actualizar_conteo_respuestas();


-- ---------------------------------------------------------------------------
-- Filtro automático antes de cobrar. La app guarda la huella como pendiente
-- ANTES de pedir la firma: si el texto no pasa, no se llega a pagar.
-- La lista de palabras se carga desde el servidor; el navegador no la ve.
-- ---------------------------------------------------------------------------
create table if not exists privado.palabras_bloqueadas (
  palabra text primary key check (palabra = lower(palabra) and char_length(palabra) >= 3)
);
revoke all on table privado.palabras_bloqueadas from anon, authenticated;

create or replace function privado.texto_permitido(p_texto text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_texto is null or not exists (
    select 1
    from privado.palabras_bloqueadas as b
    where pg_catalog.lower(p_texto) ~ ('(^|[^[:alnum:]])' || b.palabra || '($|[^[:alnum:]])')
  );
$$;
revoke execute on function privado.texto_permitido(text) from public;
grant execute on function privado.texto_permitido(text) to anon, authenticated;

-- Cuántos borradores esperando pago tiene una cuenta en la última hora. Un
-- borrador no es una huella: nadie lo ve y no se publica sin pago. Con 5 se
-- frena, para que nadie llene la base de borradores.
create or replace function privado.pendientes_de(p_autor text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.huellas as h
  where h.autor = p_autor
    and h.estado = 'pendiente'
    and h.recibido > pg_catalog.now() - interval '1 hour';
$$;
revoke execute on function privado.pendientes_de(text) from public;
grant execute on function privado.pendientes_de(text) to anon, authenticated;

alter table public.huellas enable row level security;
alter table public.favoritos enable row level security;

revoke all on table public.huellas from anon, authenticated;
grant select, insert on table public.huellas to anon, authenticated;
revoke update, delete, truncate on table public.huellas from anon, authenticated;
grant all on table public.huellas to service_role;

drop policy if exists huellas_leer_publicadas on public.huellas;
create policy huellas_leer_publicadas
  on public.huellas
  for select
  to anon, authenticated
  using (estado = 'publicada');

drop policy if exists huellas_insertar_pendientes on public.huellas;
create policy huellas_insertar_pendientes
  on public.huellas
  for insert
  to anon, authenticated
  with check (
    estado = 'pendiente'
    and tx_hash is null
    -- El filtro automático vale solo para las respuestas del público. Las
    -- obras de artistas no se filtran: si hay un problema, las revisa una persona.
    and (padre is null or (privado.texto_permitido(nombre) and privado.texto_permitido(texto)))
    and privado.pendientes_de(autor) < 5
    and (
      (padre is null and artista = autor and raiz is null)
      or exists (
        select 1
        from public.huellas as p
        where p.id = huellas.padre
          and p.estado = 'publicada'
          and p.artista = huellas.artista
          and p.sala is not distinct from huellas.sala
      )
    )
  );

revoke all on table public.favoritos from anon, authenticated;
grant select on table public.favoritos to anon, authenticated;
grant all on table public.favoritos to service_role;

drop policy if exists favoritos_leer on public.favoritos;
create policy favoritos_leer
  on public.favoritos
  for select
  to anon, authenticated
  using (true);

create or replace view public.huellas_publicas
with (security_invoker = false)
as
select
  h.id,
  h.digest,
  h.tx_hash,
  h.autor,
  h.artista,
  h.moneda,
  h.padre,
  h.sala,
  h.estado,
  case when h.estado = 'retirada' then null else h.nombre end as nombre,
  case when h.estado = 'retirada' then null else h.titulo end as titulo,
  case when h.estado = 'retirada' then null else h.descripcion end as descripcion,
  case when h.estado = 'retirada' then null else h.texto end as texto,
  case when h.estado = 'retirada' then null else h.foto_ruta end as foto_ruta,
  case when h.estado = 'retirada' then null else h.audio_ruta end as audio_ruta,
  case when h.estado = 'retirada' then null else h.enlace end as enlace,
  case when h.estado = 'retirada' then null else h.sal end as sal,
  h.creado,
  h.recibido,
  h.raiz,
  h.respuestas_publicadas
from public.huellas as h
where h.estado in ('publicada', 'retirada');

alter view public.huellas_publicas owner to postgres;
comment on view public.huellas_publicas is
  'Vista security_invoker=false, propiedad de postgres: muestra publicadas y retiradas; en las retiradas oculta nombre, título, descripción, texto, foto, audio, enlace y sal (con la sal, un texto corto se podría adivinar contra el código que quedó en la red).';
grant select on public.huellas_publicas to anon, authenticated;

create or replace view public.obras_con_conteo
with (security_invoker = true)
as
select h.*
from public.huellas as h
where h.padre is null and h.estado = 'publicada';

alter view public.obras_con_conteo owner to postgres;
comment on view public.obras_con_conteo is
  'Obras publicadas; respuestas_publicadas cuenta todas las respuestas de la cadena mediante raiz.';
grant select on public.obras_con_conteo to anon, authenticated;

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated;

create or replace function privado.es_obra_pendiente(p_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.huellas as h
    where h.id = p_id
      and h.estado = 'pendiente'
      and h.padre is null
  );
$$;

revoke execute on function privado.es_obra_pendiente(text) from public;
grant execute on function privado.es_obra_pendiente(text) to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'obras',
  'obras',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audios',
  'audios',
  true,
  5242880,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg']
)
on conflict (id) do nothing;

drop policy if exists obras_subir_a_obra_pendiente on storage.objects;
create policy obras_subir_a_obra_pendiente
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'obras'
    and privado.es_obra_pendiente((storage.foldername(name))[1])
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists audios_subir_a_obra_pendiente on storage.objects;
create policy audios_subir_a_obra_pendiente
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'audios'
    and privado.es_obra_pendiente((storage.foldername(name))[1])
    and lower(storage.extension(name)) in ('mp3', 'm4a', 'webm', 'ogg')
  );

-- Limpieza manual; después hay que borrar los archivos de Storage por la API.
-- delete from public.huellas where estado = 'pendiente' and tx_hash is null and recibido < now() - interval '24 hours';

-- ---------------------------------------------------------------------------
-- Obras que forman parte de la muestra de una sala. Una obra entra cuando la
-- sala la eligió; la firma del artista se lee del contrato. Solo escribe el servidor.
-- ---------------------------------------------------------------------------
create table if not exists public.muestra_obras (
  sala text not null check (sala ~ '^[0-9a-f]{64}$'),
  huella_id text not null references public.huellas(id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (sala, huella_id)
);
alter table public.muestra_obras enable row level security;
revoke all on table public.muestra_obras from anon, authenticated;
grant select on table public.muestra_obras to anon, authenticated;
grant all on table public.muestra_obras to service_role;

drop policy if exists muestra_obras_leer on public.muestra_obras;
create policy muestra_obras_leer
  on public.muestra_obras
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Cierres aplicados el 27/11/2026 al proyecto "umbral" (los pidió el revisor
-- de seguridad de Supabase).
-- ---------------------------------------------------------------------------
revoke execute on function public.huellas_antes_insertar() from public, anon, authenticated;
revoke execute on function public.huellas_actualizar_conteo_respuestas() from public, anon, authenticated;
alter table privado.palabras_bloqueadas enable row level security;
grant usage on schema privado to service_role;
grant all on table privado.palabras_bloqueadas to service_role;
-- Función que crea Supabase al tildar "activar reglas en tablas nuevas".
-- Si no existe en el proyecto, borrar este renglón.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Retiro y limpieza (aplicado el 27/11/2026).
-- Una huella retirada no guarda contenido: título y texto pueden quedar vacíos.
-- ---------------------------------------------------------------------------
alter table public.huellas drop constraint huellas_titulo_obra;
alter table public.huellas add constraint huellas_titulo_obra check (
  estado = 'retirada'
  or (padre is null
      and titulo is not null
      and char_length(btrim(titulo)) between 1 and 200
      and array_length(regexp_split_to_array(btrim(titulo), E'\s+'), 1) <= 20)
  or (padre is not null and titulo is null)
);
alter table public.huellas drop constraint huellas_texto_respuesta;
alter table public.huellas add constraint huellas_texto_respuesta check (
  estado = 'retirada' or padre is null or (texto is not null and char_length(btrim(texto)) >= 3)
);

-- Los borradores que nunca se pagaron se borran solos a las 24 horas.
create extension if not exists pg_cron;
select cron.schedule(
  'umbral-borrar-borradores-viejos',
  '17 * * * *',
  $$delete from public.huellas where estado = 'pendiente' and tx_hash is null and recibido < now() - interval '24 hours'$$
);

-- ---------------------------------------------------------------------------
-- Derechos de la obra (27/11/2026): quien abre una obra declara si es su autor,
-- si es de dominio público o si tiene autorización. Entra en el digest.
-- ---------------------------------------------------------------------------
alter table public.huellas add column if not exists derechos text null;
alter table public.huellas drop constraint if exists huellas_derechos_valores;
alter table public.huellas add constraint huellas_derechos_valores
  check (derechos is null or derechos in ('autoria','dominio_publico','autorizacion'));
alter table public.huellas drop constraint if exists huellas_derechos_solo_obras;
alter table public.huellas add constraint huellas_derechos_solo_obras
  check (
    (padre is null and (derechos is not null or estado = 'retirada'))
    or (padre is not null and derechos is null)
  );

-- ---------------------------------------------------------------------------
-- Arreglos de la auditoría de código (27/11/2026).
-- 1. El límite de 20 palabras del título: '\s+' (con standard_conforming_strings)
--    es el patrón de espacios. Las versiones anteriores partían por "\s" literal o por "s".
-- 2. Un borrador pagado que no llegó a publicarse se guarda 7 días, no 24 horas:
--    `publicar` ya no necesita el comprobante, así que se puede publicar al volver.
-- 3. Solo se aceptan los nombres de archivo que usa la app: un archivo por borrador.
-- ---------------------------------------------------------------------------
alter table public.huellas drop constraint huellas_titulo_obra;
alter table public.huellas add constraint huellas_titulo_obra check (
  estado = 'retirada'
  or (padre is null
      and titulo is not null
      and char_length(btrim(titulo)) between 1 and 200
      and array_length(regexp_split_to_array(btrim(titulo), '\s+'), 1) <= 20)
  or (padre is not null and titulo is null)
);

select cron.schedule(
  'umbral-borrar-borradores-viejos',
  '17 * * * *',
  $$delete from public.huellas where estado = 'pendiente' and tx_hash is null and recibido < now() - interval '7 days'$$
);

drop policy if exists obras_subir_a_obra_pendiente on storage.objects;
create policy obras_subir_a_obra_pendiente
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'obras'
    and name ~ '^[0-9a-f]{64}/foto\.(jpg|png|webp)$'
    and privado.es_obra_pendiente((storage.foldername(name))[1])
  );

drop policy if exists audios_subir_a_obra_pendiente on storage.objects;
create policy audios_subir_a_obra_pendiente
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'audios'
    and name ~ '^[0-9a-f]{64}/audio\.(mp3|m4a|webm|ogg)$'
    and privado.es_obra_pendiente((storage.foldername(name))[1])
  );

-- ---------------------------------------------------------------------------
-- Opiniones de quienes prueban UMBRAL (28/11/2026). SIN APLICAR TODAVÍA.
-- Formulario corto y opcional, sin billetera ni cuenta. Sirve para mejorar la
-- app y, solo si la persona marca la casilla, para citarla en la entrega.
-- No pide datos personales. El navegador solo puede insertar: nadie la lee
-- desde la app (se lee desde el panel de Supabase).
-- ---------------------------------------------------------------------------
create table if not exists public.opiniones (
  id bigint generated always as identity primary key,
  creada timestamptz not null default now(),
  desde text not null default 'pie',
  rol text not null,
  pudo text not null,
  costo text null,
  cambiaria text null,
  apodo text null,
  citar boolean not null default false,
  constraint opiniones_desde check (desde in ('huella', 'pie')),
  constraint opiniones_rol check (rol in ('artista', 'sala', 'publico')),
  constraint opiniones_pudo check (pudo in ('si', 'con_ayuda', 'no')),
  constraint opiniones_costo_largo check (costo is null or char_length(costo) <= 500),
  constraint opiniones_cambiaria_largo check (cambiaria is null or char_length(cambiaria) <= 500),
  constraint opiniones_apodo_largo check (apodo is null or char_length(btrim(apodo)) between 1 and 40)
);

alter table public.opiniones enable row level security;

-- Solo insertar, y solo estas columnas: id y fecha las pone la base.
revoke all on public.opiniones from anon, authenticated;
grant insert (desde, rol, pudo, costo, cambiaria, apodo, citar) on public.opiniones to anon, authenticated;

drop policy if exists opiniones_insertar on public.opiniones;
create policy opiniones_insertar
  on public.opiniones
  for insert
  to anon, authenticated
  with check (
    privado.texto_permitido(costo)
    and privado.texto_permitido(cambiaria)
    and privado.texto_permitido(apodo)
  );

-- ---------------------------------------------------------------------------
-- Límites de pagos y seguridad (28/11/2026). Aplicado el 28/11.
-- Se corre entero, de una vez (va en una sola transacción). No contiene claves.
--
-- A. Borradores sin firma: el límite ya no se cuenta solo por cuenta (cualquiera
--    podía dejar 5 borradores a nombre de otra cuenta y frenarla una hora), sino
--    por cuenta y por origen del pedido.
-- B. La vista huellas_publicas pasa a respetar las reglas de la tabla
--    (security_invoker). Para eso el retiro limpia la fila en la base.
-- C. Borradores pagados: antes de que la limpieza de 7 días los borre, la base
--    le pide a la función `publicar` que los publique. `publicar` lee el
--    contrato: si la huella está pagada, queda publicada y ya no se borra.
--    Sirve también para quien pagó y cerró la pestaña y no volvió.
--
-- Antes de aplicar C hay que cargar dos ajustes (ver el final del archivo).
-- ---------------------------------------------------------------------------
begin;

-- ===========================================================================
-- A. Borradores: límite por cuenta y por origen
-- ===========================================================================

-- De dónde vino el pedido, sin guardar la dirección en claro. Solo vive mientras
-- la fila es un borrador: al publicarse o retirarse se borra (ver B).
alter table public.huellas add column if not exists origen text null;
comment on column public.huellas.origen is
  'Solo en borradores: código (md5) de la dirección desde la que llegó el pedido. Sirve para el límite de borradores. Se vacía al publicar o retirar.';

create index if not exists huellas_pendientes_origen_idx
  on public.huellas (origen, recibido)
  where estado = 'pendiente';

-- La dirección la pone la puerta de entrada de Supabase en las cabeceras del pedido.
-- (Guía "Securing your API" de Supabase: x-forwarded-for, primer valor.)
create or replace function privado.origen_del_pedido()
returns text
language sql
stable
set search_path = ''
as $$
  select pg_catalog.md5(
    coalesce(
      nullif(pg_catalog.btrim(x.h ->> 'cf-connecting-ip'), ''),
      nullif(pg_catalog.btrim(pg_catalog.split_part(x.h ->> 'x-forwarded-for', ',', 1)), ''),
      'sin-origen'
    )
  )
  from (
    select nullif(pg_catalog.current_setting('request.headers', true), '')::json as h
  ) as x;
$$;
revoke execute on function privado.origen_del_pedido() from public, anon, authenticated;

-- El origen lo pone siempre la base: lo que mande el navegador en esa columna se pisa.
create or replace function public.huellas_poner_origen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.origen := privado.origen_del_pedido();
  return new;
end;
$$;
revoke execute on function public.huellas_poner_origen() from public, anon, authenticated;

drop trigger if exists huellas_poner_origen on public.huellas;
create trigger huellas_poner_origen
before insert on public.huellas
for each row execute function public.huellas_poner_origen();

-- Borradores de esa cuenta DESDE ESE ORIGEN en la última hora. Los que otra
-- persona deje a su nombre desde otro lado no le cuentan.
create or replace function privado.pendientes_de(p_autor text, p_origen text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.huellas as h
  where h.autor = p_autor
    and h.origen is not distinct from p_origen
    and h.estado = 'pendiente'
    and h.recibido > pg_catalog.now() - interval '1 hour';
$$;
revoke execute on function privado.pendientes_de(text, text) from public;
grant execute on function privado.pendientes_de(text, text) to anon, authenticated;

-- Borradores de ese origen, de cualquier cuenta, en la última hora. Frena a
-- quien cambia de cuenta para llenar la base. Un borrador pagado deja de
-- contar apenas se publica, así que una sala con mucha gente no llega al tope.
create or replace function privado.pendientes_del_origen(p_origen text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.huellas as h
  where h.origen is not distinct from p_origen
    and h.estado = 'pendiente'
    and h.recibido > pg_catalog.now() - interval '1 hour';
$$;
revoke execute on function privado.pendientes_del_origen(text) from public;
grant execute on function privado.pendientes_del_origen(text) to anon, authenticated;

-- La misma regla de antes, con los dos límites nuevos en lugar de pendientes_de(autor).
drop policy if exists huellas_insertar_pendientes on public.huellas;
create policy huellas_insertar_pendientes
  on public.huellas
  for insert
  to anon, authenticated
  with check (
    estado = 'pendiente'
    and tx_hash is null
    and (padre is null or (privado.texto_permitido(nombre) and privado.texto_permitido(texto)))
    and privado.pendientes_de(autor, origen) < 5
    and privado.pendientes_del_origen(origen) < 40
    and (
      (padre is null and artista = autor and raiz is null)
      or exists (
        select 1
        from public.huellas as p
        where p.id = huellas.padre
          and p.estado = 'publicada'
          and p.artista = huellas.artista
          and p.sala is not distinct from huellas.sala
      )
    )
  );

-- La versión vieja (solo por cuenta) ya no la usa nadie.
drop function if exists privado.pendientes_de(text);

-- ===========================================================================
-- B. La vista pública respeta las reglas de la tabla
-- ===========================================================================

-- Las que ya estaban retiradas: se les cambia la sal ahora, ANTES de crear el
-- disparador (que después no deja tocar la sal de una retirada). El contenido
-- ya lo había borrado `retirar`; se repasa igual.
update public.huellas
  set sal = pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
      nombre = '—', titulo = null, descripcion = null, texto = null,
      foto_ruta = null, audio_ruta = null, enlace = null
  where estado = 'retirada';

-- Al dejar de ser borrador se vacía el origen. Al retirarse, la base misma borra
-- el contenido y cambia la sal (con la sal vieja, un texto corto se podría
-- adivinar contra el código que quedó en la red). Antes esto dependía de la
-- función `retirar` y de que la vista ocultara la sal.
create or replace function public.huellas_antes_actualizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado <> 'pendiente' then
    new.origen := null;
  end if;
  if new.estado = 'retirada' then
    new.nombre := '—';
    new.titulo := null;
    new.descripcion := null;
    new.texto := null;
    new.foto_ruta := null;
    new.audio_ruta := null;
    new.enlace := null;
    if old.estado is distinct from 'retirada' then
      new.sal := pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '');
    else
      new.sal := old.sal;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.huellas_antes_actualizar() from public, anon, authenticated;

drop trigger if exists huellas_antes_actualizar on public.huellas;
create trigger huellas_antes_actualizar
before update on public.huellas
for each row execute function public.huellas_antes_actualizar();

-- Cualquiera puede leer publicadas y retiradas. De una retirada queda solo lo
-- que ya es público en la red: id, código, comprobante, cuentas y fechas.
drop policy if exists huellas_leer_publicadas on public.huellas;
create policy huellas_leer_publicadas
  on public.huellas
  for select
  to anon, authenticated
  using (estado in ('publicada', 'retirada'));

-- Misma vista, mismas columnas. Ahora corre con los permisos de quien consulta.
-- Las columnas ocultas de las retiradas quedan como segunda barrera.
alter view public.huellas_publicas set (security_invoker = true);
comment on view public.huellas_publicas is
  'Vista security_invoker=true: muestra publicadas y retiradas según la regla huellas_leer_publicadas. En las retiradas no hay contenido (lo borra el disparador huellas_antes_actualizar) y además la vista lo oculta.';

-- ===========================================================================
-- C. Borradores pagados: publicarlos antes de que la limpieza los borre
-- ===========================================================================

create extension if not exists pg_net;

-- Dos datos que la base necesita para llamar a `publicar`: la dirección del
-- proyecto y la clave pública (la misma que usa la web; no es secreta).
create table if not exists privado.ajustes (
  clave text primary key,
  valor text not null
);
alter table privado.ajustes enable row level security;
revoke all on table privado.ajustes from public, anon, authenticated;
grant all on table privado.ajustes to service_role;

-- Pide publicar los borradores que pueden estar pagados:
--   · los recientes (entre 10 minutos y 3 horas): pagó y cerró la pestaña;
--   · los que están por borrarse (más de 5 días): última oportunidad.
-- `publicar` no le cree a nadie: lee el contrato y publica solo si la huella
-- está pagada. Si no lo está, contesta que no y el borrador sigue su curso.
-- Devuelve cuántos pedidos mandó. Sin los ajustes cargados, no hace nada.
create or replace function privado.reintentar_borradores()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_clave text;
  v_mandados integer := 0;
  v_id text;
begin
  select a.valor into v_url from privado.ajustes as a where a.clave = 'url_proyecto';
  select a.valor into v_clave from privado.ajustes as a where a.clave = 'clave_publica';
  if v_url is null or v_clave is null then
    return 0;
  end if;

  for v_id in
    (
      select h.id
      from public.huellas as h
      where h.estado = 'pendiente'
        and h.tx_hash is null
        and h.recibido < pg_catalog.now() - interval '10 minutes'
        and h.recibido > pg_catalog.now() - interval '3 hours'
      order by h.recibido desc
      limit 40
    )
    union
    (
      select h.id
      from public.huellas as h
      where h.estado = 'pendiente'
        and h.tx_hash is null
        and h.recibido < pg_catalog.now() - interval '5 days'
      order by h.recibido
      limit 40
    )
  loop
    perform net.http_post(
      url := v_url || '/functions/v1/publicar',
      headers := pg_catalog.jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', v_clave,
        'Authorization', 'Bearer ' || v_clave
      ),
      body := pg_catalog.jsonb_build_object('id', v_id),
      timeout_milliseconds := 20000
    );
    v_mandados := v_mandados + 1;
  end loop;
  return v_mandados;
end;
$$;
revoke execute on function privado.reintentar_borradores() from public, anon, authenticated;

select cron.schedule(
  'umbral-publicar-pagadas',
  '7,37 * * * *',
  $$select privado.reintentar_borradores()$$
);

-- La limpieza queda igual (7 días). Para entonces cada borrador ya pasó unas
-- 96 veces por `publicar`: si estaba pagado, ya no es borrador.

commit;

-- ---------------------------------------------------------------------------
-- DESPUÉS de aplicar: cargar los dos ajustes (a mano, no van en el repositorio).
--
--   insert into privado.ajustes (clave, valor) values
--     ('url_proyecto', 'https://<ref-del-proyecto>.supabase.co'),
--     ('clave_publica', '<la clave pública del proyecto>')
--   on conflict (clave) do update set valor = excluded.valor;
--
-- COMPROBACIONES (cada una dice qué tiene que dar):
--
-- 1. La vista sigue leyendo como anónimo y no muestra borradores:
--      set local role anon;
--      select estado, count(*) from public.huellas_publicas group by 1;   -- solo publicada y retirada
--      select count(*) from public.huellas where estado = 'pendiente';    -- 0
--      reset role;
-- 2. Ninguna retirada conserva contenido:
--      select count(*) from public.huellas
--      where estado = 'retirada' and (titulo is not null or texto is not null or descripcion is not null
--        or foto_ruta is not null or audio_ruta is not null or enlace is not null or nombre <> '—');   -- 0
-- 3. El origen llega de verdad (hacer UN borrador desde la web y mirar):
--      select origen, count(*) from public.huellas where estado = 'pendiente' group by 1;
--    Si todos dan lo mismo que
--      select md5('sin-origen');
--    la cabecera no está llegando: el límite por origen pasa a ser uno solo para todos (40 por hora).
--    En ese caso avisar antes de dejarlo así.
-- 4. Ningún origen queda guardado fuera de los borradores:
--      select count(*) from public.huellas where estado <> 'pendiente' and origen is not null;   -- 0
-- 5. El reintento manda pedidos y `publicar` contesta:
--      select privado.reintentar_borradores();
--      select status_code, content::text from net._http_response order by created desc limit 5;
--    402 = no estaba pagada (normal). 200 = se publicó. 401 = la clave pública está mal cargada.
-- 6. Los dos trabajos están programados:
--      select jobname, schedule from cron.job where jobname like 'umbral-%';
--
-- PARA VOLVER ATRÁS: correr de nuevo las secciones de esquema.sql que definen
-- privado.pendientes_de(text), la regla huellas_insertar_pendientes, la regla
-- huellas_leer_publicadas y la vista huellas_publicas, y
--   select cron.unschedule('umbral-publicar-pagadas');
--   drop trigger huellas_poner_origen on public.huellas;
--   drop trigger huellas_antes_actualizar on public.huellas;
-- (La sal de las retiradas no vuelve: ya no hacía falta.)
-- ---------------------------------------------------------------------------
