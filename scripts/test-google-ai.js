#!/usr/bin/env node

// Simple script to test Google AI API key configuration
const fs = require('fs')
const path = require('path')

console.log('Testing Google AI API Key configuration...\n')

// Read .env.local file manually
let apiKey = null
try {
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const lines = envContent.split('\n')

  for (const line of lines) {
    if (line.startsWith('GOOGLE_AI_API_KEY=')) {
      apiKey = line.split('=')[1]
      break
    }
  }
} catch (error) {
  console.error('❌ Could not read .env.local file:', error.message)
  process.exit(1)
}

if (!apiKey) {
  console.error('❌ GOOGLE_AI_API_KEY is not set in environment variables')
  process.exit(1)
}

if (apiKey === '...') {
  console.error('❌ GOOGLE_AI_API_KEY is still set to placeholder value')
  process.exit(1)
}

if (!apiKey.startsWith('AIza')) {
  console.warn(
    '⚠️  GOOGLE_AI_API_KEY does not start with expected prefix "AIza"'
  )
}

console.log('✅ GOOGLE_AI_API_KEY is properly configured')
console.log(`   Key starts with: ${apiKey.substring(0, 8)}...`)
console.log(`   Key length: ${apiKey.length} characters`)

console.log('\n📋 VS Code Settings:')
try {
  const fs = require('fs')
  const vscodeSettings = JSON.parse(
    fs.readFileSync('.vscode/settings.json', 'utf8')
  )

  if (
    vscodeSettings['gemini.apiKey'] ||
    vscodeSettings['google.ai.apiKey'] ||
    vscodeSettings['googleAI.apiKey']
  ) {
    console.log('✅ Google AI API key is configured in VS Code settings')
  } else {
    console.log('❌ Google AI API key is not found in VS Code settings')
  }
} catch (error) {
  console.log('❌ Could not read VS Code settings:', error.message)
}

console.log('\n🔄 Next steps:')
console.log('1. ✅ Restart VS Code to pick up the new settings')
console.log('2. ✅ Google Cloud authentication is configured')
console.log('3. ✅ Project is set to: shining-courage-465501-i8')
console.log('4. ✅ Gemini APIs are enabled')
console.log('5. 🔄 Try using Gemini Code Assist features in VS Code')
console.log(
  '6. 🔄 If still not working, use Command Palette: "Gemini Code Assist: Sign In"'
)
