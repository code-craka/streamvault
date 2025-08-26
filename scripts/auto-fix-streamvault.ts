import { glob } from 'glob'
import fs from 'fs'
import path from 'path'

// Find all TypeScript/TSX files in app/ and lib/
const files = await glob('app/**/*.ts*')
const libFiles = await glob('lib/**/*.ts*')
const allFiles = [...files, ...libFiles]

function fixAuthAsync(content: string): string {
  return content.replace(
    /const\s+\{([^}]+)\}\s*=\s*auth\(\)/g,
    'const {$1} = await auth()'
  )
}

function fixErrorGuard(content: string): string {
  return content.replace(
    /error\.message/g,
    "error instanceof Error ? error.message : String(error)"
  )
}

function fixAny(content: string): string {
  if (content.includes(': any') || content.includes('as any')) {
    console.warn(
      '[WARN] Found usage of "any" type. Please manually refactor to strict types.'
    )
    return content.replace(/: any/g, ': unknown').replace(/as any/g, 'as unknown')
  }
  return content
}

function fixMathRandom(content: string): string {
  return content.replace(/Math\.random\(\)\.toString\(36\)/g, 'secureRandomId()')
}

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf-8')
  let updated = false

  const newContent = fixErrorGuard(fixAuthAsync(fixAny(fixMathRandom(content))))
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf-8')
    console.log(`✅ Auto-fixed: ${file}`)
    updated = true
  }
}

console.log('✅ StreamVault automated code fixes complete.')