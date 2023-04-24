import totp from 'totp-generator'

export const generateMfaCode = (secret: string) => totp(secret)
