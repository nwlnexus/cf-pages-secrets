import {
  debug,
  getBooleanInput,
  getInput,
  getMultilineInput,
  endGroup as originalEndGroup,
  error as originalError,
  info as originalInfo,
  startGroup as originalStartGroup,
  setFailed,
} from '@actions/core'

/**
 * A configuration object that contains all the inputs & immutable state for the action.
 */
const config = {
  CLOUDFLARE_API_TOKEN: getInput('apiToken', { required: true }),
  CLOUDFLARE_ACCOUNT_ID: getInput('accountId', { required: true }),
  CLOUDFLARE_PROJECT_NAME: getInput('projectName', { required: true }),
  QUIET_MODE: getBooleanInput('quiet'),
  secrets: getMultilineInput('secrets'),
} as const

function error(message: string, bypass?: boolean): void {
  if (!config.QUIET_MODE || bypass) {
    originalError(message)
  }
}

function info(message: string, bypass?: boolean): void {
  if (!config.QUIET_MODE || bypass) {
    originalInfo(message)
  }
}

function startGroup(message: string): void {
  if (!config.QUIET_MODE) {
    originalStartGroup(message)
  }
}

function endGroup(): void {
  if (!config.QUIET_MODE) {
    originalEndGroup()
  }
}

const run = async () => {
  try {
    authenticationSetup()
    await uploadSecrets()
    info('🏁 Wrangler Action completed', true)
  } catch (err: unknown) {
    err instanceof Error && error(err.message)
    setFailed('🚨 Action Failed')
  }
}

function authenticationSetup() {
  process.env.CLOUDFLARE_API_TOKEN = config['CLOUDFLARE_API_TOKEN']
  process.env.CLOUDFLARE_ACCOUNT_ID = config['CLOUDFLARE_ACCOUNT_ID']
}

function getSecret(secret: string) {
  if (!secret) {
    throw new Error('Secret name cannot be blank.')
  }

  const value = process.env[secret]
  if (!value) {
    throw new Error(`Value for secret ${secret} not found in environment.`)
  }

  return value
}

function getEnvVar(name: string): string {
  if (!name) {
    throw new Error('Environment variable name is required')
  }
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`)
  }
  return value
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
      err.stack && debug(err.stack)
    } else {
      throw new Error('Failed to upload secrets')
    }
  } finally {
    endGroup()
  }
}

export { run }
