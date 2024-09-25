import { existsSync } from 'node:fs'
import * as path from 'node:path'
import {
  error as originalError,
  info as originalInfo,
  startGroup as originalStartGroup,
  endGroup as originalEndGroup,
} from '@actions/core'
import { createProject, getProject } from './cf-api.js'
import { config } from './main.js'
export function authenticationSetup() {
  process.env.CLOUDFLARE_API_TOKEN = config['CLOUDFLARE_API_TOKEN']
  process.env.CLOUDFLARE_ACCOUNT_ID = config['CLOUDFLARE_ACCOUNT_ID']
}

export function error(message: string, bypass?: boolean): void {
  if (!config.QUIET_MODE || bypass) {
    originalError(message)
  }
}

export function info(message: string, bypass?: boolean): void {
  if (!config.QUIET_MODE || bypass) {
    originalInfo(message)
  }
}

export function startGroup(message: string): void {
  if (!config.QUIET_MODE) {
    originalStartGroup(message)
  }
}

export function endGroup(): void {
  if (!config.QUIET_MODE) {
    originalEndGroup()
  }
}

export function getSecret(secret: string): string {
  if (!secret) {
    throw new Error('❌ Secret name cannot be blank.')
  }

  const value = process.env[secret]
  if (!value) {
    throw new Error(`❌ Value for secret ${secret} not found in environment.`)
  }

  return value
}

export function getEnvVar(name: string): string {
  if (!name) {
    throw new Error('❌ Environment variable name is required')
  }
  const value = process.env[name]
  if (!value) {
    throw new Error(`❌ Environment variable ${name} is not set`)
  }
  return value
}

export function checkWranglerConfigPath(wranglerConfigPath: string): string {
  const normalizedPath = path.normalize(wranglerConfigPath)
  info(`Checking if wrangler config path exists: ${normalizedPath}`)
  if (!existsSync(normalizedPath)) {
    throw new Error('❌ Wrangler config path does not exist')
  } else {
    info(`ℹ️ Wrangler config path exists: ${normalizedPath}`)
    return normalizedPath
  }
}

export async function checkProjectExists(
  projectName: string,
  createMissingProject?: boolean,
): Promise<string> {
  const project = await getProject(projectName)
  if (project) {
    return project
  } else {
    if (createMissingProject) {
      const projectId = await createProject(projectName)
      info(`🚀 Project ${projectName} created: ${projectId}`)
      return projectId
    } else {
      throw new Error(
        `❌ Project ${projectName} does not exist and createMissingProject is not enabled.`,
      )
    }
  }
}
