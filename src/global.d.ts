export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_URL: string;
      USER_EMAIL: string;
      USER_PASSWORD: string;
      DEBUG?: string;
    }
  }
}
