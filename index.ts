import { execSync } from 'child_process'
import * as frida from 'frida'
import { readFileSync } from 'fs'
import { resolve } from 'path'

execSync('npm run build')
const agent = readFileSync(resolve(__dirname, '_agent.js')).toString()

frida.attach('bf4.exe').then(async session => {
  const script = await session.createScript(agent)
  await script.load()
})