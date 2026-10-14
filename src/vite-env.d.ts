/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Мессенджер, выбранный на экране входа по умолчанию: whatsapp | telegram */
  readonly VITE_GREEN_API_PLATFORM?: string;

  readonly VITE_GREEN_API_WHATSAPP_URL?: string;
  readonly VITE_GREEN_API_WHATSAPP_ID_INSTANCE?: string;
  readonly VITE_GREEN_API_WHATSAPP_TOKEN?: string;

  readonly VITE_GREEN_API_TELEGRAM_URL?: string;
  readonly VITE_GREEN_API_TELEGRAM_ID_INSTANCE?: string;
  readonly VITE_GREEN_API_TELEGRAM_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
