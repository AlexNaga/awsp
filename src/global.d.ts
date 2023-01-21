export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_DEFAULT_REGION: string;
      AWS_URL: string;
      DEBUG?: string;
      MICROSOFT_LOGIN_HOSTNAME?: string;
      UPDATE_WSL_AWS_CREDENTIALS?: string;
      USER_EMAIL: string;
      USER_PASSWORD: string;
      WSL_HOME_DIR_PATH?: string;
    }
  }
}
