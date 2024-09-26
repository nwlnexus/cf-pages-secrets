import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createProject, getProject, updateProject, deleteProject } from '../src/cf-api.js'
import { config } from '../src/main.js'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock config
vi.mock('./main.js', () => ({
  config: {
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    CLOUDFLARE_API_EMAIL: 'test@example.com',
    CLOUDFLARE_API_TOKEN: 'test-token',
    productionBranch: 'main',
  },
}))

describe('Cloudflare API functions', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const mockResponse = {
        result: { id: 'test-project-id' },
        errors: [],
        messages: [],
        success: true,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      const projectId = await createProject('test-project')

      expect(projectId).toBe('test-project-id')
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/pages/projects`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Auth-Email': config.CLOUDFLARE_API_EMAIL,
            'X-Auth-Key': config.CLOUDFLARE_API_TOKEN,
          }),
          body: JSON.stringify({
            name: 'test-project',
            production_branch: config.productionBranch,
          }),
        }),
      )
    })

    it('should throw an error if project creation fails', async () => {
      const mockResponse = {
        result: null,
        errors: [{ code: 1000, message: 'Project creation failed' }],
        messages: [],
        success: false,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      await expect(createProject('test-project')).rejects.toThrow(
        'Failed to create project, Project creation failed',
      )
    })
  })

  describe('getProject', () => {
    it('should get a project successfully', async () => {
      const mockResponse = {
        result: { id: 'test-project-id' },
        errors: [],
        messages: [],
        success: true,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      const projectId = await getProject('test-project')

      expect(projectId).toBe('test-project-id')
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/pages/projects/test-project`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Auth-Email': config.CLOUDFLARE_API_EMAIL,
            'X-Auth-Key': config.CLOUDFLARE_API_TOKEN,
          }),
        }),
      )
    })

    it('should return null if project is not found', async () => {
      const mockResponse = {
        result: null,
        errors: [],
        messages: [],
        success: false,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      const projectId = await getProject('non-existent-project')

      expect(projectId).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const mockResponse = {
        result: { id: 'test-project-id' },
        errors: [],
        messages: [],
        success: true,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      await updateProject('test-project', { name: 'updated-project' })

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/pages/projects/test-project`,
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Auth-Email': config.CLOUDFLARE_API_EMAIL,
            'X-Auth-Key': config.CLOUDFLARE_API_TOKEN,
          }),
          body: JSON.stringify({
            production_branch: config.productionBranch,
            name: 'updated-project',
          }),
        }),
      )
    })

    it('should throw an error if project update fails', async () => {
      const mockResponse = {
        result: null,
        errors: [{ code: 1000, message: 'Project update failed' }],
        messages: [],
        success: false,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      await expect(updateProject('test-project')).rejects.toThrow(
        'Failed to update project, Project update failed',
      )
    })
  })

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      const mockResponse = {
        result: null,
        errors: [],
        messages: [],
        success: true,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      await deleteProject('test-project')

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/pages/projects/test-project`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Auth-Email': config.CLOUDFLARE_API_EMAIL,
            'X-Auth-Key': config.CLOUDFLARE_API_TOKEN,
          }),
        }),
      )
    })

    it('should throw an error if project deletion fails', async () => {
      const mockResponse = {
        result: null,
        errors: [{ code: 1000, message: 'Project deletion failed' }],
        messages: [],
        success: false,
      }
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      await expect(deleteProject('test-project')).rejects.toThrow(
        'Failed to delete project, Project deletion failed',
      )
    })
  })
})
