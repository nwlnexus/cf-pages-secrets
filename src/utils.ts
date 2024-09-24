import {
  error as originalError,
  info as originalInfo,
  startGroup as originalStartGroup,
  endGroup as originalEndGroup,
} from '@actions/core'
import { config } from './main.js'

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

export function getSecret(secret: string) {
  if (!secret) {
    throw new Error('Secret name cannot be blank.')
  }

  const value = process.env[secret]
  if (!value) {
    throw new Error(`Value for secret ${secret} not found in environment.`)
  }

  return value
}

export function getEnvVar(name: string): string {
  if (!name) {
    throw new Error('Environment variable name is required')
  }
  const value = process.env[name]
  if (!value) {
    throw new Error(`Environment variable ${name} is not set`)
  }
  return value
}
