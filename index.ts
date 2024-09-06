import { execSync } from 'child_process'
import { attach, ScriptRuntime } from 'frida'
import { readFileSync } from 'fs'
import { resolve } from 'path'

execSync('npm run build')
const agent = readFileSync(resolve('_agent.js')).toString()

attach('bf4.exe').then(async session => {
  const script = await session.createScript(agent, { runtime: ScriptRuntime.V8 })
  await script.load()
})