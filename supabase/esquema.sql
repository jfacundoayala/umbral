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
