// import { execSync } from 'child_process'
import { attach } from 'frida'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// execSync('npm run build')
const agent = readFileSync(resolve(__dirname, '_agent.js')).toString()

attach('bf4.exe').then(async session => {
  const script = await session.createScript(agent)
  await script.load()
})