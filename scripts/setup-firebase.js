#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔥 Firebase Setup Script for StreamVault\n')

// Check if service account file exists
const serviceAccountPath = path.join(process.cwd(), '.gcp', 'service-account.json')
const envPath = path.join(process.cwd(), '.env.local')

console.log('📋 Checking Firebase configuration...\n')

// 1. Check service account file
if (fs.existsSync(serviceAccountPath)) {
  console.log('✅ Service account file found at:', serviceAccountPath)
  
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
    console.log('   Project ID:', serviceAccount.project_id)
    console.log('   Client Email:', serviceAccount.client_email)
  } catch (error) {
    console.log('❌ Service account file is invalid JSON')
  }
} else {
  console.log('❌ Service account file not found at:', serviceAccountPath)
  console.log('   Please ensure the service account file is in the .gcp directory')
}

// 2. Check environment variables
if (fs.existsSync(envPath)) {
  console.log('\n✅ Environment file found at:', envPath)
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'GCP_PROJECT_ID',
  ]
  
  const missing = []
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName + '=')) {
      missing.push(varName)
    }
  })
  
  if (missing.length === 0) {
    console.log('✅ All required environment variables are present')
  } else {
    console.log('❌ Missing environment variables:', missing.join(', '))
  }
} else {
  console.log('\n❌ Environment file not found at:', envPath)
}

// 3. Check Firebase files
const firebaseFiles = [
  'firebase.json',
  'firestore.rules',
  'firestore.indexes.json'
]

console.log('\n📁 Checking Firebase configuration files...')
firebaseFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`)
  } else {
    console.log(`❌ ${file} missing`)
  }
})

// 4. Check Firebase libraries
console.log('\n📦 Checking Firebase dependencies...')
const packageJsonPath = path.join(process.cwd(), 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
  
  const firebaseDeps = ['firebase', 'firebase-admin']
  firebaseDeps.forEach(dep => {
    if (deps[dep]) {
      console.log(`✅ ${dep} v${deps[dep]} installed`)
    } else {
      console.log(`❌ ${dep} not installed`)
    }
  })
}

console.log('\n🚀 Next Steps:')
console.log('1. Ensure Firestore API is enabled in Google Cloud Console')
console.log('2. Run: pnpm dev')
console.log('3. Test configuration: curl http://localhost:3000/api/firebase/config')
console.log('4. Deploy Firestore rules: firebase deploy --only firestore:rules')
console.log('5. Deploy Firestore indexes: firebase deploy --only firestore:indexes')

console.log('\n📚 Documentation:')
console.log('- Firebase Console: https://console.firebase.google.com/')
console.log('- Google Cloud Console: https://console.cloud.google.com/')
console.log('- Enable Firestore API: https://console.developers.google.com/apis/api/firestore.googleapis.com/')