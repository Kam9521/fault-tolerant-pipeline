export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      MAIN_QUEUE_URL: string;
      DLQ_URL: string;
    }
  }
}
