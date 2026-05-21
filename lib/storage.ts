import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { getDefaultSettings } from "@/lib/defaults";
import { AppSettings, ScoreResult, TranslationRecord, TranslationStatus } from "@/lib/types";

type JsonDb = {
  settings: AppSettings;
  translations: TranslationRecord[];
};

function resolveDataDir() {
  // Vercel serverless runtime has a read-only app directory; /tmp is writable.
  if (process.env.VERCEL) {
    return "/tmp/translator-data";
  }
  return path.join(process.cwd(), ".data");
}

const dataDir = resolveDataDir();
const dataFile = path.join(dataDir, "translator-db.json");

function nowIso() {
  return new Date().toISOString();
}

function isPostgresEnabled() {
  return Boolean(process.env.POSTGRES_URL);
}

function getSqlClient() {
  return postgres(process.env.POSTGRES_URL as string, {
    ssl: "require",
    max: 1
  });
}

async function ensureJsonDb(): Promise<JsonDb> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<JsonDb>;
    return {
      settings: parsed.settings ?? getDefaultSettings(),
      translations: parsed.translations ?? []
    };
  } catch {
    const seed: JsonDb = {
      settings: getDefaultSettings(),
      translations: []
    };
    await mkdir(dataDir, { recursive: true });
    await writeFile(dataFile, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

async function saveJsonDb(db: JsonDb) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(db, null, 2), "utf8");
}

export async function initializeStorage() {
  if (!isPostgresEnabled()) {
    await ensureJsonDb();
    return;
  }

  const sql = getSqlClient();
  try {
    await sql`
      create table if not exists app_settings (
        settings_key text primary key,
        settings_value jsonb not null,
        updated_at timestamptz not null default now()
      )
    `;

    await sql`
      create table if not exists translations (
        id text primary key,
        original_text text not null,
        source_language text not null,
        target_language text not null,
        context_text text,
        output_text text not null,
        reviewed_text text,
        status text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null
      )
    `;

    const settings = await sql`select settings_key from app_settings where settings_key = 'global' limit 1`;
    if (settings.length === 0) {
      await sql`
        insert into app_settings (settings_key, settings_value, updated_at)
        values ('global', ${sql.json(getDefaultSettings())}, now())
      `;
    }
  } finally {
    await sql.end();
  }
}

export async function getSettings(): Promise<AppSettings> {
  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    return db.settings;
  }

  await initializeStorage();
  const sql = getSqlClient();
  try {
    const rows = await sql<{ settings_value: AppSettings }[]>`
      select settings_value
      from app_settings
      where settings_key = 'global'
      limit 1
    `;
    return rows[0]?.settings_value ?? getDefaultSettings();
  } catch (error) {
    console.error("[storage.getSettings] postgres query failed, fallback to defaults", error);
    return getDefaultSettings();
  } finally {
    await sql.end();
  }
}

export async function saveSettings(input: Omit<AppSettings, "updatedAt">) {
  const nextValue: AppSettings = {
    ...input,
    updatedAt: nowIso()
  };

  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    db.settings = nextValue;
    await saveJsonDb(db);
    return nextValue;
  }

  const sql = getSqlClient();
  try {
    await sql`
      insert into app_settings (settings_key, settings_value, updated_at)
      values ('global', ${sql.json(nextValue)}, now())
      on conflict (settings_key)
      do update set settings_value = excluded.settings_value, updated_at = excluded.updated_at
    `;
    return nextValue;
  } finally {
    await sql.end();
  }
}

export async function createTranslation(record: TranslationRecord) {
  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    db.translations.unshift(record);
    await saveJsonDb(db);
    return record;
  }

  const sql = getSqlClient();
  try {
    await sql`
      insert into translations (
        id, original_text, source_language, target_language, context_text, output_text,
        reviewed_text, status, created_at, updated_at
      ) values (
        ${record.id},
        ${record.originalText},
        ${record.sourceLanguage},
        ${record.targetLanguage},
        ${record.contextText},
        ${record.outputText},
        ${record.reviewedText},
        ${record.status},
        ${record.createdAt},
        ${record.updatedAt}
      )
    `;
    return record;
  } finally {
    await sql.end();
  }
}

function mapRow(row: Record<string, string | null>): TranslationRecord {
  return {
    id: String(row.id),
    originalText: String(row.original_text),
    sourceLanguage: String(row.source_language),
    targetLanguage: String(row.target_language),
    contextText: row.context_text,
    outputText: String(row.output_text),
    reviewedText: row.reviewed_text,
    status: row.status as TranslationStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export async function listTranslations() {
  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    return db.translations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const sql = getSqlClient();
  try {
    const rows = await sql<Record<string, string | null>[]>`
      select *
      from translations
      order by created_at desc
    `;
    return rows.map(mapRow);
  } finally {
    await sql.end();
  }
}

export async function getTranslation(id: string) {
  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    return db.translations.find((item) => item.id === id) ?? null;
  }

  const sql = getSqlClient();
  try {
    const rows = await sql<Record<string, string | null>[]>`
      select *
      from translations
      where id = ${id}
      limit 1
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  } finally {
    await sql.end();
  }
}

export async function updateTranslationReview(
  id: string,
  reviewedText: string,
  status: TranslationStatus
) {
  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    const found = db.translations.find((item) => item.id === id);
    if (!found) {
      return null;
    }
    found.reviewedText = reviewedText;
    found.status = status;
    found.updatedAt = nowIso();
    await saveJsonDb(db);
    return found;
  }

  const sql = getSqlClient();
  try {
    const rows = await sql<Record<string, string | null>[]>`
      update translations
      set reviewed_text = ${reviewedText}, status = ${status}, updated_at = now()
      where id = ${id}
      returning *
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  } finally {
    await sql.end();
  }
}

export async function deleteTranslation(id: string) {
  if (!isPostgresEnabled()) {
    const db = await ensureJsonDb();
    const next = db.translations.filter((item) => item.id !== id);
    db.translations = next;
    await saveJsonDb(db);
    return;
  }

  const sql = getSqlClient();
  try {
    await sql`delete from translations where id = ${id}`;
  } finally {
    await sql.end();
  }
}

export function summarizeScores(score: ScoreResult) {
  return `${score.overallScore}/10 - ${score.overallComment}`;
}
