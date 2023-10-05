export declare global {
  namespace NodeJS {
    interface ProcessEnv {
      AWS_DEFAULT_REGION: string
      AWS_URL: string
      DEBUG?: string
      SECRET_MFA_KEY?: string
      IS_MICROSOFT_LOGIN?: string
      USER_EMAIL: string
      USER_PASSWORD: string

      // PRIVATE
      AWS_PRIVATE_DEFAULT_REGION?: string
      PRIVATE_USER_ACCESS_KEY?: string
      PRIVATE_USER_SECRET_ACCESS_KEY?: string
    }
  }
}
