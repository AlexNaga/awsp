import path from 'path'
import { dirname } from 'dirname-filename-esm'
const __dirname = dirname(import.meta)
import { BrowserContext } from 'playwright'
import { chromium, Page } from 'playwright-core'
import { formatAwsCredentials } from './helpers/aws.js'
import { getUserInput } from './helpers/input.js'
import { AwsProfile } from './models/AwsProfile.js'
import { Credentials } from './models/Credentials.js'
import { createSpinner } from 'nanospinner'
import { getRandomLoadingMessage } from './data/loading-messages.js'
import chalk from 'chalk'
import { generateMfaCode } from './helpers/token.js'

const { env } = process

const blockedResourceTypes: string[] = ['image', 'media', 'font']
const blockedFileExtensions: string[] = ['.ico', '.jpg', '.jpeg', '.png', '.svg', '.woff']

const getBrowserClipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText())

const isAuthenticated = async (page: Page) => {
  const isAuthenticatedLocator = 'portal-application:has-text("AWS Account")'

  try {
    await page.locator(isAuthenticatedLocator).waitFor({ timeout: 2000 })
    // eslint-disable-next-line no-empty
  } catch (error) {}
  return page.locator(isAuthenticatedLocator).isVisible()
}

const authenticateAws = async (page: Page, mfaCode: string) => {
  await page.locator('#username-input input').fill(env.USER_EMAIL)
  await page.keyboard.press('Enter')

  await page.locator('#password-input').type(env.USER_PASSWORD)
  await page.keyboard.press('Enter')

  await page.locator('input[type="text"]').fill(mfaCode)
  await page.keyboard.press('Enter')
}

const authenticateMicrosoft = async (page: Page, mfaCode: string) => {
  // handle the case when email is already filled in
  try {
    await page.locator('input[type="email"]').fill(env.USER_EMAIL, { timeout: 8000 })
    await page.keyboard.press('Enter')
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    // eslint-disable-next-line no-empty
  } catch (error) {}

  // handle the case when password is already filled in
  try {
    await page.locator('input[type="password"]').type(env.USER_PASSWORD, { timeout: 3000 })
    await page.keyboard.press('Enter')
    await page.waitForNavigation({ waitUntil: 'networkidle' })
    // eslint-disable-next-line no-empty
  } catch (error) {}

  await page.locator('input[type="tel"]').fill(mfaCode, { timeout: 60000 })
  await page.keyboard.press('Enter')

  await page.waitForURL('**/ProcessAuth', { timeout: 60000 })
  await page.keyboard.press('Enter')

  // handle the case when it asks if we want to stay signed in
  try {
    await page.getByText('Stay signed in?', { exact: true }).isVisible({ timeout: 3000 })
    await page.keyboard.press('Enter')
    // eslint-disable-next-line no-empty
  } catch (error) {}
}

const fetchAwsProfiles = async (page: Page): Promise<AwsProfile[]> => {
  await page.locator('portal-application:has-text("AWS Account")').first().click({ timeout: 60000 })
  await page.locator('sso-expander').isVisible()

  const profileList = await page.$$('portal-instance')

  // get all profile names and IDs
  return Promise.all(
    profileList.map(async (elem) => {
      const profileName = await (await elem.$('.name'))?.textContent()
      const profileId = (await (await elem.$('.accountId'))?.textContent())?.replace('#', '')

      if (!profileName) throw new Error('Error: profileName is not defined')
      if (!profileId) throw new Error('Error: profileId is not defined')

      return { profileName, profileId }
    })
  )
}

const fetchCredentials = async (page: Page, awsProfileId: string) => {
  const profilesSelector = 'portal-instance'
  await page.waitForSelector(profilesSelector)

  await page.locator(`text=${awsProfileId}`).click()
  await page.waitForTimeout(1000)

  await page.locator('#temp-credentials-button').first().click()
  await page.locator('#hover-copy-env').click()

  return getBrowserClipboard(page)
}

export class Browser {
  debug = false
  browser!: BrowserContext
  page!: Page

  constructor() {
    this.debug = Boolean(env.DEBUG)
  }

  async init() {
    const spinner = createSpinner(chalk.dim(getRandomLoadingMessage())).start()
    const userDataDir = path.join(__dirname, '../.tmp')
    this.browser = await chromium.launchPersistentContext(userDataDir, { headless: !this.debug })

    // allow clipboard access
    this.browser.grantPermissions(['clipboard-read'], { origin: env.AWS_URL })

    this.page = await this.browser.newPage()

    await this.initBlockResources()

    await this.page.goto(env.AWS_URL, { timeout: 60000 })
    spinner.success()
  }

  // block resources to speed up things
  async initBlockResources() {
    await this.page.route('**/*', (route) => {
      if (blockedResourceTypes.includes(route.request().resourceType())) {
        route.abort()
      } else if (blockedFileExtensions.some((ext) => route.request().url().includes(ext))) {
        route.abort()
      } else {
        route.continue()
      }
    })
  }

  async isAuthenticated() {
    return isAuthenticated(this.page)
  }

  async authenticate() {
    const authCheckSpinner = createSpinner('Checking if authenticated.').start()

    // check if active login session
    if (await this.isAuthenticated()) {
      authCheckSpinner.success()
      return
    }

    let mfaCode = env.SECRET_MFA_KEY ? generateMfaCode(env.SECRET_MFA_KEY) : ''

    authCheckSpinner.warn()

    // get MFA code
    if (!mfaCode) {
      while (!mfaCode || mfaCode.length !== 6) {
        mfaCode = await getUserInput('Enter MFA code: ')

        if (mfaCode.length !== 6) console.warn('MFA code is not 6 chars long.')
      }
    }
    const authSpinner = createSpinner('Authenticating.').start()

    if (env.IS_MICROSOFT_LOGIN) {
      await authenticateMicrosoft(this.page, mfaCode)
    } else {
      await authenticateAws(this.page, mfaCode)
    }

    authSpinner.success()
  }

  async fetchAwsProfiles() {
    const spinner = createSpinner('Fetching AWS profiles.').start()
    const profiles = await fetchAwsProfiles(this.page)
    spinner.success()
    return profiles
  }

  async fetchCredentials(awsProfileId: string): Promise<Credentials> {
    const spinner = createSpinner('Fetching credentials.').start()
    const rawCredentials = await fetchCredentials(this.page, awsProfileId)
    const credentials = formatAwsCredentials(rawCredentials)
    spinner.success()
    return credentials
  }

  async close() {
    await this.browser.close()
  }
}
