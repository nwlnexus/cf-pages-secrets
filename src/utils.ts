import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { env } from 'node:process'
import {
  error as originalError,
  info as originalInfo,
  startGroup as originalStartGroup,
  endGroup as originalEndGroup,
} from '@actions/core'
import TOML from '@iarna/toml'
import { createProject, getProject } from './cf-api.js'
import { config } from './main.js'

export function authenticationSetup(): void {
  env.CLOUDFLARE_API_TOKEN = config.CLOUDFLARE_API_TOKEN
  env.CLOUDFLARE_ACCOUNT_ID = config.CLOUDFLARE_ACCOUNT_ID
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

export function isObject(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item)
}

export function deepMerge(target: unknown, ...sources: unknown[]): unknown {
  if (!sources.length) return target
  const source = sources.shift()

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} })
        deepMerge(target[key], source[key])
      } else {
        Object.assign(target, { [key]: source[key] })
      }
    }
  }
  return deepMerge(target, ...sources)
}

export function splitOnFirstOccurrence(str: string, delimiter: string): [string, string] {
  const index = str.indexOf(delimiter)
  if (index === -1) return [str, '']
  return [str.slice(0, index), str.slice(index + delimiter.length)]
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

export function determineProjectName(): {
  projectName: string
  wranglerConfig: Record<string, unknown> | undefined
} {
  let projectName: string | undefined = undefined
  let wranglerConfig: Record<string, unknown> | undefined = undefined

  if (config.wranglerConfigPath) {
    const cp = checkWranglerConfigPath('./' + config.wranglerConfigPath)
    wranglerConfig = TOML.parse(readFileSync(cp, 'utf-8'))
    projectName = [config.projectName, wranglerConfig?.name as string | undefined].find(Boolean)
  }

  if (!projectName) {
    throw new Error('Project name not found in wrangler.toml and not provided as projectName input')
  }

  info(`💡 Project name set to: ${projectName}`)
  return { projectName, wranglerConfig }
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
