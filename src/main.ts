const core = require('@actions/core')

const config = {
  CLOUDFLARE_API_TOKEN: core.getInput('apiToken', { required: true }),
  CLOUDFLARE_ACCOUNT_ID: core.getInput('accountId', { required: true }),
  CLOUDFLARE_PROJECT_NAME: core.getInput('projectName', { required: true }),
  secrets: core.getMultilineInput('secrets'),
}

const run = async () => {
  try {
    authenticationSetup()
    await uploadSecrets()
    core.info('🏁 Wrangler Action completed', true)
  } catch (error) {
    core.setFailed('🚨 Action Failed:', error.message)
  }
}

function authenticationSetup() {
  process.env.CLOUDFLARE_API_TOKEN = config['CLOUDFLARE_API_TOKEN']
  process.env.CLOUDFLARE_ACCOUNT_ID = config['CLOUDFLARE_ACCOUNT_ID']
}

async function uploadSecrets() {
  const secrets = config['secrets']
  core.info(`🔑 Uploading ${secrets.length} secrets to Cloudflare Pages`)

  if (secrets.length === 0) {
    core.info('🔑 No secrets to upload')
    return
  }

  core.startGroup('🔑 Uploading secrets')
  for (const secret of secrets) {
    core.info(`🔑 Uploading secret: ${secret}`)
  }
}

module.exports = { run }
