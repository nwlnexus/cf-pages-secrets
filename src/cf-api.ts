import { config } from './main.js'
import { info } from './utils.js'
const CF_API_URL = 'https://api.cloudflare.com/client/v4'

type CFResponseCommon = {
  errors: {
    code: number
    message: string
  }[]
  messages: {
    code: number
    message: string
  }[]
  success: boolean
}

type BuildConfig = {
  build_caching: boolean
  build_command: string
  destination_dir: string
  root_dir: string
  web_analytics_tag: string
  web_analytics_token: string
}

type DeploymentSource = {
  config: {
    deployments_enabled: boolean
    owner: string
    path_excludes: string[]
    path_includes: string[]
    pr_comments_enabled: boolean
    preview_branch_excludes: string[]
    preview_branch_includes: string[]
    preview_deployment_setting: 'all' | 'custom' | 'none'
    production_branch: string
    production_deployments_enabled: boolean
    repo_name: string
  }
  type: string
}

type DeploymentStage = {
  ended_on: string
  name: string
  started_on: string
  status: string
}

type Deployment = {
  aliases: string[]
  build_config: BuildConfig
  created_on: string
  deployment_trigger: {
    metadata: {
      branch: string
      commit_hash: string
      commit_message: string
    }
    type: string
  }
  env_vars: object
  environment: string
  id: string
  is_skipped: boolean
  latest_stage: DeploymentStage
  modified_on: string
  project_id: string
  project_name: string
  short_id: string
  source: DeploymentSource
  stages: DeploymentStage[]
  url: string
}

type DeploymentConfig = {
  preview: object
  production: object
}

type ProjectResult = {
  build_config: BuildConfig
  canonical_deployment: Deployment
  created_on: string
  deployment_configs: DeploymentConfig
  domains: string[]
  id: string
  latest_deployment: object
  name: string
  production_branch: string
  source: DeploymentSource
  subdomain: string
}

type Project = CFResponseCommon & {
  result: ProjectResult
}

export const createProject = async (projectName: string) => {
  const response = await fetch(
    `${CF_API_URL}/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Email': config.CLOUDFLARE_API_EMAIL,
        'X-Auth-Key': config.CLOUDFLARE_API_TOKEN,
      },
      body: JSON.stringify({ name: projectName, production_branch: config.productionBranch }),
    },
  )

  const data = (await response.json()) as Project

  if (data.errors) {
    throw new Error(
      'Failed to create project, ' + data.errors.map((error) => error.message).join(', '),
    )
  }

  info(`🚀 Project ${data.result.name} created: ${data.result.id}`)
  return data.result.id
}

export const getProject = async (projectName: string) => {
  const response = await fetch(
    `${CF_API_URL}/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Email': config.CLOUDFLARE_API_EMAIL,
        'X-Auth-Key': config.CLOUDFLARE_API_TOKEN,
      },
    },
  )

  const data = (await response.json()) as Project

  if (data.result && data.result.id) {
    return data.result.id
  } else {
    return null
  }
}
