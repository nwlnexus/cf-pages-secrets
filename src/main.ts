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
  CREATE_PROJECT: getBooleanInput('createProject'),
  DELETE_PROJECT: getBooleanInput('deleteProject'),
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
    await checkProjectExists(projectName, config.CREATE_PROJECT)
    const secrets = await uploadSecrets()
    const vars = await uploadVars(wranglerConfig)
    const toBeUpdated = deepMerge({}, secrets, vars)
    if (toBeUpdated) {
      await updateProject(projectName, toBeUpdated)
    }
    if (config.DELETE_PROJECT && projectName) {
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

export async function uploadSecrets() {
  const secrets = config['secrets']
  let toBeUpdated: Record<string, unknown> = {}

  if (secrets.length === 0) {
    return {}
  }

  startGroup(`ℹ️ Uploading ${secrets.length} secrets to Cloudflare Pages`)
  const secretValues = new Map()
  secrets.map((secret) => {
    info(`🔑 Secret: ${secret}`)
    secretValues.set(secret, { type: 'secret_text', value: getSecret(secret) })
  })
  toBeUpdated = {
    deployment_configs: {
      [`${config.productionBranch === env.GITHUB_REF_NAME ? 'production' : 'preview'}`]: {
        env_vars: Object.fromEntries(secretValues),
      },
    },
  }
  endGroup()
  return toBeUpdated
}

export async function uploadVars(wranglerConfig?: Record<string, unknown> | undefined) {
  const vars = config['vars']
  let tomlVars: Record<string, unknown>

  const varValues = new Map()
  if (wranglerConfig && 'vars' in wranglerConfig) {
    // This is the vars that are passed in from the wrangler.toml file
    tomlVars = wranglerConfig.vars as Record<string, unknown>
    Object.entries(tomlVars).map(([key, value]) => {
      varValues.set(key, { type: 'plain_text', value })
    })
  }

  // This is the vars that are passed in from the action
  // Keys that are not in the wrangler.toml file are added
  // Keys that are in both are overwritten by the vars from the action
  vars.map((v) => {
    const [key, value] = splitOnFirstOccurrence(v, '=')
    info(`${key}=${value}`)
    varValues.set(key, { type: 'plain_text', value })
  })

  if (varValues.size === 0) {
    return {}
  }

  startGroup(`ℹ️ Uploading ${varValues.size} variables to Cloudflare Pages`)
  varValues.forEach((value, key) => {
    info(`${key}=${value}`)
  })

  const toBeUpdated = {
    deployment_configs: {
      [`${config.productionBranch === env.GITHUB_REF_NAME ? 'production' : 'preview'}`]: {
        env_vars: Object.fromEntries(varValues),
      },
    },
  }

  debug(`🔑 Variable values: ${JSON.stringify(toBeUpdated, null, 2)}`)
  endGroup()
  return toBeUpdated
}
