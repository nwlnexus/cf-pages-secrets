import * as fs from 'node:fs'
import * as core from '@actions/core'
import TOML from '@iarna/toml'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as cfApi from '../src/cf-api.js'
import * as utils from '../src/utils.js'

vi.mock('node:fs')
vi.mock('@actions/core')
vi.mock('@iarna/toml')
vi.mock('../src/cf-api.js')
vi.mock('../src/main.js', () => ({
  config: {
    CLOUDFLARE_API_TOKEN: 'test-token',
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    QUIET_MODE: false,
    wranglerConfigPath: 'wrangler.toml',
  } as const,
}))

describe('utils', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CLOUDFLARE_API_TOKEN
    delete process.env.CLOUDFLARE_ACCOUNT_ID
  })

  describe('authenticationSetup', () => {
    it('should set environment variables', () => {
      utils.authenticationSetup()

      expect(process.env.CLOUDFLARE_API_TOKEN).toBe('test-token')
      expect(process.env.CLOUDFLARE_ACCOUNT_ID).toBe('test-account-id')
    })
  })

  describe('logging functions', () => {
    it('should call original functions when not in quiet mode', () => {
      utils.error('test error')
      utils.info('test info')
      utils.startGroup('test group')
      utils.endGroup()

      expect(core.error).toHaveBeenCalledWith('test error')
      expect(core.info).toHaveBeenCalledWith('test info')
      expect(core.startGroup).toHaveBeenCalledWith('test group')
      expect(core.endGroup).toHaveBeenCalled()
    })

    it.skip('should not call original functions when in quiet mode', () => {
      utils.error('test error')
      utils.info('test info')
      utils.startGroup('test group')
      utils.endGroup()

      expect(core.error).not.toHaveBeenCalled()
      expect(core.info).not.toHaveBeenCalled()
      expect(core.startGroup).not.toHaveBeenCalled()
      expect(core.endGroup).not.toHaveBeenCalled()
    })
  })

  describe('isObject', () => {
    it('should return true for objects', () => {
      expect(utils.isObject({})).toBe(true)
      expect(utils.isObject({ a: 1 })).toBe(true)
    })

    it('should return false for non-objects', () => {
      expect(utils.isObject(null)).toBe(false)
      expect(utils.isObject([])).toBe(false)
      expect(utils.isObject('string')).toBe(false)
      expect(utils.isObject(123)).toBe(false)
    })
  })

  describe('deepMerge', () => {
    it('should merge objects deeply', () => {
      const target = { a: { b: 1 }, c: 2 }
      const source = { a: { d: 3 }, e: 4 }
      const result = utils.deepMerge(target, source)
      expect(result).toEqual({ a: { b: 1, d: 3 }, c: 2, e: 4 })
    })

    it('should merge objects deeply, overwriting values in target', () => {
      const target = { a: { b: 1 }, c: 2 }
      const source = { a: { d: 3 }, c: 4 }
      const result = utils.deepMerge(target, source)
      expect(result).toEqual({ a: { b: 1, d: 3 }, c: 4 })
    })
  })

  describe('splitOnFirstOccurrence', () => {
    it('should split string on first occurrence of delimiter', () => {
      expect(utils.splitOnFirstOccurrence('a:b:c', ':')).toEqual(['a', 'b:c'])
    })

    it('should return original string and empty string if delimiter not found', () => {
      expect(utils.splitOnFirstOccurrence('abc', ':')).toEqual(['abc', ''])
    })
  })

  describe('getSecret', () => {
    it('should return secret value from environment', () => {
      process.env.TEST_SECRET = 'secret-value'
      expect(utils.getSecret('TEST_SECRET')).toBe('secret-value')
    })

    it('should throw error if secret name is blank', () => {
      expect(() => utils.getSecret('')).toThrow('Secret name cannot be blank.')
    })

    it('should throw error if secret value not found', () => {
      expect(() => utils.getSecret('NON_EXISTENT_SECRET')).toThrow(
        'Value for secret NON_EXISTENT_SECRET not found in environment.',
      )
    })
  })

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test-value'
      expect(utils.getEnvVar('TEST_VAR')).toBe('test-value')
    })

    it('should throw error if variable name is blank', () => {
      expect(() => utils.getEnvVar('')).toThrow('Environment variable name is required')
    })

    it('should throw error if variable not set', () => {
      expect(() => utils.getEnvVar('NON_EXISTENT_VAR')).toThrow(
        'Environment variable NON_EXISTENT_VAR is not set',
      )
    })
  })

  describe('determineProjectName', () => {
    it('should return project name from wrangler config', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('name = "test-project"')
      vi.spyOn(TOML, 'parse').mockReturnValue({ name: 'test-project' })

      const result = utils.determineProjectName()
      expect(result).toEqual({
        projectName: 'test-project',
        wranglerConfig: { name: 'test-project' },
      })
    })

    it('should throw error if project name not found', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      vi.spyOn(fs, 'readFileSync').mockReturnValue('')
      vi.spyOn(TOML, 'parse').mockReturnValue({})

      expect(() => utils.determineProjectName()).toThrow(
        'Project name not found in wrangler.toml and not provided as projectName input',
      )
    })
  })

  describe('checkWranglerConfigPath', () => {
    it('should return normalized path if config exists', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true)
      expect(utils.checkWranglerConfigPath('./wrangler.toml')).toBe('wrangler.toml')
    })

    it('should throw error if config does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false)
      expect(() => utils.checkWranglerConfigPath('./non-existent.toml')).toThrow(
        'Wrangler config path does not exist',
      )
    })
  })

  describe('checkProjectExists', () => {
    it('should return project if it exists', async () => {
      vi.spyOn(cfApi, 'getProject').mockResolvedValue('existing-project-id')
      const result = await utils.checkProjectExists('test-project')
      expect(result).toBe('existing-project-id')
    })

    it('should create project if it does not exist and createMissingProject is true', async () => {
      vi.spyOn(cfApi, 'getProject').mockResolvedValue(null)
      vi.spyOn(cfApi, 'createProject').mockResolvedValue('new-project-id')
      const result = await utils.checkProjectExists('test-project', true)
      expect(result).toBe('new-project-id')
    })

    it('should throw error if project does not exist and createMissingProject is false', async () => {
      vi.spyOn(cfApi, 'getProject').mockResolvedValue(null)
      await expect(utils.checkProjectExists('test-project')).rejects.toThrow(
        'Project test-project does not exist and createMissingProject is not enabled.',
      )
    })
  })
})
