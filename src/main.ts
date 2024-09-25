import { readFileSync } from 'fs'
import { debug, getBooleanInput, getInput, getMultilineInput, setFailed } from '@actions/core'
import TOML from '@iarna/toml'
import {
  error,
  info,
  startGroup,
  endGroup,
  getSecret,
  checkWranglerConfigPath,
  checkProjectExists,
} from './utils.js'

/**
 * A configuration object that contains all the inputs & immutable state for the action.
 */
export const config = {
  CLOUDFLARE_API_EMAIL: getInput('apiEmail', { required: true }),
  CLOUDFLARE_API_TOKEN: getInput('apiToken', { required: true }),
  CLOUDFLARE_ACCOUNT_ID: getInput('accountId', { required: true }),
  QUIET_MODE: getBooleanInput('quiet'),
  CREATE_MISSING_PROJECT: getBooleanInput('createMissingProject'),
  projectName: getInput('projectName'),
  wranglerConfigPath: getInput('wranglerConfigPath'),
  productionBranch: getInput('productionBranch'),
  secrets: getMultilineInput('secrets'),
} as const

export const run = async () => {
  let projectName: string | undefined
  let projectId: string | undefined
  let wranglerConfig: Record<string, unknown> | undefined

  if (process.env.ACT) {
    info(`🚀 Running with ACT`)
  }

  try {
    if (config.wranglerConfigPath) {
      const wranglerConfigPath = checkWranglerConfigPath('./' + config.wranglerConfigPath)
      wranglerConfig = TOML.parse(readFileSync(wranglerConfigPath, 'utf-8'))
    }
    projectName = [config.projectName, wranglerConfig?.name as string | undefined].filter(
      Boolean,
    )[0]

    if (!projectName) {
      throw new Error(
        'Project name not found in wrangler.toml and not provided as projectName input',
      )
    }
    if (projectName) {
      info(`💡 Project name set to: ${projectName}`)
    }

    projectId = await checkProjectExists(projectName, config.CREATE_MISSING_PROJECT)
    await uploadSecrets(projectId)
    info('🏁 Wrangler Action completed', true)
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(err.message)
    } else {
      setFailed('🚨 Action Failed')
    }
  } finally {
    if (projectId) {
      await deleteProject(projectId)
    }
  }
}

async function uploadSecrets(projectId: string) {
  const secrets = config['secrets']
  info(`ℹ️ Uploading ${secrets.length} secrets to Cloudflare Pages`)

  if (secrets.length === 0) {
    info('❌ No secrets to upload')
    return
  }

  startGroup('ℹ️ Uploading secrets')
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
