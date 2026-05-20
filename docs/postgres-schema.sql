create table if not exists app_settings (
  settings_key text primary key,
  settings_value jsonb not null,
  updated_at timestamptz not null default now()
);

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
);

insert into app_settings (settings_key, settings_value, updated_at)
values (
  'global',
  jsonb_build_object(
    'selectedProvider', 'openai',
    'customProviderLabel', 'Custom OpenAI-Compatible',
    'customBaseUrl', '',
    'customApiKeyEnv', 'CUSTOM_AI_API_KEY',
    'translateModel', 'gpt-4.1-mini',
    'polishModel', 'gpt-4.1-mini',
    'scoringModel', 'gpt-4.1-mini',
    'systemPrompt', '你是专业的客服沟通翻译员。只输出翻译结果，不要解释。',
    'adminThemeNote', '首次初始化',
    'updatedAt', now()::text
  ),
  now()
)
on conflict (settings_key) do nothing;
