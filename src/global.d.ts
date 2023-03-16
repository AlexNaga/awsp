export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_DEFAULT_REGION: string
      AWS_URL: string
      DEBUG?: string
      IS_MICROSOFT_LOGIN?: string
      USER_EMAIL: string
      USER_PASSWORD: string
    }
  }
}
