import path from 'path'
import { dirname } from 'dirname-filename-esm'
const __dirname = dirname(import.meta)
import { BrowserContext } from 'playwright'
import { chromium, Page } from 'playwright-core'
import { prompt } from './helpers/input.js'
import { AwsProfile } from './models/AwsProfile.js'
import { AwsCredentials } from './models/AwsCredentials.js'
import { createSpinner } from 'nanospinner'
import { getRandomLoadingMessage } from './data/loading-messages.js'
import chalk from 'chalk'
import { generateMfaCode } from './helpers/token.js'

const { env } = process

const blockedResourceTypes: string[] = ['image', 'media', 'font']
const blockedFileExtensions: string[] = ['.ico', '.jpg', '.jpeg', '.png', '.svg', '.woff']

const isAuthenticated = async (page: Page) => {
  const isAuthenticatedLocator = '#header' // only visible when logged in

  try {
    await page.locator(isAuthenticatedLocator).waitFor({ timeout: 2000 })
    // eslint-disable-next-line no-empty
  } catch (error) {}
  return page.locator(isAuthenticatedLocator).isVisible()
}

const authenticateAws = async (page: Page, email: string, password: string, mfaCode: string) => {
  await page.locator('#username').fill(email)
  await page.locator('#password').fill(password)
  await page.keyboard.press('Enter')

  await page.locator('#mfacode').fill(mfaCode)
  await page.keyboard.press('Enter')
}

const authenticateMicrosoft = async (page: Page, email: string, password: string, mfaCode: string) => {
  // handle the case when email is already filled in
  try {
    await page.locator('input[type="email"]').fill(email, { timeout: 8000 })
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle')
    // eslint-disable-next-line no-empty
  } catch (error) {}

  // handle the case when password is already filled in
  try {
    await page.locator('input[type="password"]').fill(password, { timeout: 3000 })
    await page.keyboard.press('Enter')
    await page.waitForLoadState('networkidle')
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

const getNextElementSiblingTxt = async (page: Page, elem: string) =>
  (
    await (await page.getByText(elem, { exact: true }).evaluateHandle((e) => e.nextElementSibling))
      ?.asElement()
      ?.textContent()
  )
    ?.replace('=', '')
    .trim()

const fetchAwsProfiles = async (page: Page): Promise<AwsProfile[]> => {
  const profilesSelector = 'account-list-cell'
  await page.getByTestId(profilesSelector).first().waitFor()
  const profileList = await page.getByTestId(profilesSelector).all()

  // get all profile names and IDs
  return Promise.all(
    profileList.map(async (elem) => {
      const profileName = await elem.locator('strong').textContent()
      const profileId = (await elem.locator('div').nth(2).textContent())?.split('|')[0].trim()

      if (!profileName) throw new Error('Error: profileName is not defined')
      if (!profileId) throw new Error('Error: profileId is not defined')

      return { profileName, profileId }
    })
  )
}

const fetchCredentials = async (page: Page, awsProfileId: string): Promise<AwsCredentials> => {
  const profilesSelector = 'account-list-cell'
  await page.getByTestId(profilesSelector).first().waitFor()
  await page.locator(`text=${awsProfileId}`).click()
  await page.getByTestId('role-creation-action-button').first().click()

  // we want to get the text of the next element sibling since it contains the actual values
  const accessKeyId = await getNextElementSiblingTxt(page, 'aws_access_key_id')
  const secretAccessKey = await getNextElementSiblingTxt(page, 'aws_secret_access_key')
  const sessionToken = await getNextElementSiblingTxt(page, 'aws_session_token')

  if (!accessKeyId) throw new Error('Error: accessKeyId has no value')
  if (!secretAccessKey) throw new Error('Error: secretAccessKey has no value')
  if (!sessionToken) throw new Error('Error: sessionToken has no value')

  return { accessKeyId, secretAccessKey, sessionToken }
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
        mfaCode = await prompt.input('Enter MFA code: ')

        if (mfaCode.length !== 6) console.warn('MFA code is not 6 chars long.')
      }
    }
    const authSpinner = createSpinner('Authenticating.').start()

    if (env.IS_MICROSOFT_LOGIN) {
      await authenticateMicrosoft(this.page, env.USER_EMAIL, env.USER_PASSWORD, mfaCode)
    } else {
      await authenticateAws(this.page, env.USER_EMAIL, env.USER_PASSWORD, mfaCode)
    }

    authSpinner.success()
  }

  async fetchAwsProfiles() {
    const spinner = createSpinner('Fetching AWS profiles.').start()
    const profiles = await fetchAwsProfiles(this.page)
    spinner.success()
    return profiles
  }

  async fetchCredentials(awsProfileId: string): Promise<AwsCredentials> {
    const spinner = createSpinner('Fetching credentials.').start()
    const credentials = await fetchCredentials(this.page, awsProfileId)
    spinner.success()
    return credentials
  }

  async close() {
    await this.browser.close()
  }
}
