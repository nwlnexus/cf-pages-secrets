import { debug, getBooleanInput, getInput, getMultilineInput, setFailed } from '@actions/core'
import { error, info, startGroup, endGroup, getSecret } from './utils.js'

/**
 * A configuration object that contains all the inputs & immutable state for the action.
 */
export const config = {
  CLOUDFLARE_API_TOKEN: getInput('apiToken', { required: true }),
  CLOUDFLARE_ACCOUNT_ID: getInput('accountId', { required: true }),
  CLOUDFLARE_PROJECT_NAME: getInput('projectName', { required: true }),
  QUIET_MODE: getBooleanInput('quiet'),
  secrets: getMultilineInput('secrets'),
} as const

export const run = async () => {
  try {
    authenticationSetup()
    await uploadSecrets()
    info('🏁 Wrangler Action completed', true)
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(err.message)
    } else {
      setFailed('🚨 Action Failed')
    }
  }
}

function authenticationSetup() {
  process.env.CLOUDFLARE_API_TOKEN = config['CLOUDFLARE_API_TOKEN']
  process.env.CLOUDFLARE_ACCOUNT_ID = config['CLOUDFLARE_ACCOUNT_ID']
}

async function uploadSecrets() {
  const secrets = config['secrets']
  info(`🔑 Uploading ${secrets.length} secrets to Cloudflare Pages`)

  if (secrets.length === 0) {
    info('🔑 No secrets to upload')
    return
  }

  startGroup('🔑 Uploading secrets')
  try {
    const secretValues = Object.fromEntries(secrets.map((secret) => [secret, getSecret(secret)]))
    info(`🔑 Secret values: ${JSON.stringify(secretValues)}`)
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(err.message)
      if (err.stack) {
        debug(err.stack)
      }
    } else {
      throw new Error('Failed to upload secrets')
    }
  } finally {
    endGroup()
  }
}
