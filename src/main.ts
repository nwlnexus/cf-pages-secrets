import { env } from 'node:process'
import { debug, getBooleanInput, getInput, getMultilineInput, setFailed } from '@actions/core'
import { deleteProject, updateProject } from './cf-api.js'
import {
  error,
  info,
  startGroup,
  endGroup,
  getSecret,
  determineProjectName,
  checkProjectExists,
  splitOnFirstOccurrence,
  deepMerge,
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
  vars: getMultilineInput('vars'),
  secrets: getMultilineInput('secrets'),
} as const

export const run = async () => {
  if (env.ACT) {
    info(`🚀 Running with ACT`)
  }

  try {
    const { projectName, wranglerConfig } = determineProjectName()
    await checkProjectExists(projectName, config.CREATE_MISSING_PROJECT)
    const secrets = await uploadSecrets()
    const vars = await uploadVars(wranglerConfig)
    const toBeUpdated = deepMerge<Record<string, unknown>>({}, secrets, vars)
    if (toBeUpdated) {
      await updateProject(projectName, toBeUpdated)
    }
    if (env.ACT && projectName) {
      await deleteProject(projectName)
      info(`🧹 Project ${projectName} deleted`)
    }
    info('🏁 Wrangler Action completed', true)
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(err.message)
    } else {
      setFailed('🚨 Action Failed')
    }
  }
}

async function uploadSecrets(): Promise<Record<string, unknown>> {
  const secrets = config['secrets']
  let toBeUpdated: Record<string, unknown> = {}
  info(`ℹ️ Uploading ${secrets.length} secrets to Cloudflare Pages`)

  if (secrets.length === 0) {
    info('❌ No secrets to upload')
    return {}
  }

  startGroup('ℹ️ Uploading secrets')
  const secretValues = new Map()
  secrets.map((secret) =>
    secretValues.set(secret, { type: 'secret_text', value: getSecret(secret) }),
  )
  toBeUpdated = {
    deployment_configs: {
      [`${config.productionBranch === env.GITHUB_REF_NAME ? 'production' : 'preview'}`]: {
        env_vars: Object.fromEntries(secretValues),
      },
    },
  }
  debug(`🔑 Secret values: ${JSON.stringify(toBeUpdated, null, 2)}`)
  endGroup()
  return toBeUpdated
}

async function uploadVars(
  wranglerConfig?: Record<string, unknown> | undefined,
): Promise<Record<string, unknown>> {
  const vars = config['vars']
  let tomlVars: Record<string, unknown> | undefined
  info(`ℹ️ Uploading ${vars.length} variables to Cloudflare Pages`)

  if (vars.length === 0) {
    info('❌ No variables to upload')
    return {}
  }

  startGroup('ℹ️ Uploading variables')
  const varValues = new Map()

  vars.map((v) => {
    const [key, value] = splitOnFirstOccurrence(v, '=')
    varValues.set(key, { type: 'plain_text', value })
  })

  // This is the vars that are passed in from the action
  const inputVars = {
    deployment_configs: {
      [`${config.productionBranch === env.GITHUB_REF_NAME ? 'production' : 'preview'}`]: {
        env_vars: Object.fromEntries(varValues),
      },
    },
  }

  if (wranglerConfig) {
    // This is the vars that are passed in from the wrangler.toml file
    tomlVars = wranglerConfig?.vars as Record<string, unknown>
  }

  const toBeUpdated = deepMerge<Record<string, unknown>>({}, inputVars, tomlVars ?? {})
  debug(`🔑 Variable values: ${JSON.stringify(toBeUpdated, null, 2)}`)
  return toBeUpdated
}
