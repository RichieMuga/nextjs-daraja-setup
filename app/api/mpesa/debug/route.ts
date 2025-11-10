import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  const results = {
    step1_env_check: {} as any,
    step2_token_test: {} as any,
    step3_diagnosis: [] as string[],
  }

  // Step 1: Check environment variables
  const consumerKey = process.env.MPESA_CONSUMER_KEY || ''
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET || ''
  const passkey = process.env.MPESA_PASSKEY || ''
  
  results.step1_env_check = {
    hasConsumerKey: !!consumerKey,
    hasConsumerSecret: !!consumerSecret,
    hasPasskey: !!passkey,
    consumerKeyLength: consumerKey.length,
    consumerSecretLength: consumerSecret.length,
    passkeyLength: passkey.length,
    consumerKeyFirstChars: consumerKey.slice(0, 8) + '...',
    consumerSecretFirstChars: consumerSecret.slice(0, 8) + '...',
    passkeyFirstChars: passkey.slice(0, 15) + '...',
    shortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
    environment: process.env.MPESA_ENVIRONMENT,
    
    // Check for common issues
    issues: {
      consumerKeyHasSpaces: /\s/.test(consumerKey),
      consumerSecretHasSpaces: /\s/.test(consumerSecret),
      passkeyHasSpaces: /\s/.test(passkey),
      consumerKeyHasQuotes: /["']/.test(consumerKey),
      consumerSecretHasQuotes: /["']/.test(consumerSecret),
      consumerKeyTooShort: consumerKey.length < 20,
      consumerSecretTooShort: consumerSecret.length < 20,
      passkeyWrongLength: passkey.length !== 64,
    }
  }

  // Step 2: Test authentication
  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
    
    console.log('=== AUTHENTICATION TEST ===')
    console.log('Consumer Key (first 10 chars):', consumerKey.slice(0, 10))
    console.log('Consumer Secret (first 10 chars):', consumerSecret.slice(0, 10))
    console.log('Base64 Auth (first 20 chars):', auth.slice(0, 20))
    
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    )

    results.step2_token_test = {
      success: true,
      status: response.status,
      hasAccessToken: !!response.data.access_token,
      tokenPreview: response.data.access_token?.slice(0, 20) + '...',
      expiresIn: response.data.expires_in,
    }

  } catch (error: any) {
    results.step2_token_test = {
      success: false,
      status: error.response?.status,
      error: error.response?.data?.error || error.message,
      errorDescription: error.response?.data?.error_description,
      fullError: error.response?.data,
    }

    console.error('=== AUTHENTICATION FAILED ===')
    console.error('Status:', error.response?.status)
    console.error('Error:', error.response?.data)
  }

  // Step 3: Generate diagnosis
  const diagnosis = results.step3_diagnosis

  // Check env issues
  if (!consumerKey) {
    diagnosis.push('🔴 CRITICAL: MPESA_CONSUMER_KEY is not set in .env file')
  }
  if (!consumerSecret) {
    diagnosis.push('🔴 CRITICAL: MPESA_CONSUMER_SECRET is not set in .env file')
  }
  
  if (results.step1_env_check.issues.consumerKeyHasSpaces) {
    diagnosis.push('🔴 ERROR: Consumer Key contains spaces - remove all whitespace')
  }
  if (results.step1_env_check.issues.consumerSecretHasSpaces) {
    diagnosis.push('🔴 ERROR: Consumer Secret contains spaces - remove all whitespace')
  }
  if (results.step1_env_check.issues.consumerKeyHasQuotes) {
    diagnosis.push('🔴 ERROR: Consumer Key contains quotes - remove quotes from .env')
  }
  if (results.step1_env_check.issues.consumerSecretHasQuotes) {
    diagnosis.push('🔴 ERROR: Consumer Secret contains quotes - remove quotes from .env')
  }
  
  if (results.step1_env_check.issues.consumerKeyTooShort) {
    diagnosis.push('⚠️  WARNING: Consumer Key seems too short - verify it\'s complete')
  }
  if (results.step1_env_check.issues.consumerSecretTooShort) {
    diagnosis.push('⚠️  WARNING: Consumer Secret seems too short - verify it\'s complete')
  }
  if (results.step1_env_check.issues.passkeyWrongLength) {
    diagnosis.push('⚠️  WARNING: Passkey should be exactly 64 characters for sandbox')
  }

  // Check token test results
  if (results.step2_token_test.success) {
    diagnosis.push('✅ SUCCESS: Authentication works! Your credentials are correct.')
    diagnosis.push('✅ The "Wrong credentials" error in STK Push must be from something else.')
    diagnosis.push('🔍 Check if you\'re using the same credentials in both places.')
  } else {
    diagnosis.push('🔴 FAILED: Cannot get access token with these credentials')
    diagnosis.push('🔧 ACTION REQUIRED:')
    diagnosis.push('   1. Go to https://developer.safaricom.co.ke/MyApps')
    diagnosis.push('   2. Select your sandbox app (or create new one)')
    diagnosis.push('   3. Copy the Consumer Key and Consumer Secret')
    diagnosis.push('   4. Paste them DIRECTLY into .env (no quotes, no spaces)')
    diagnosis.push('   5. Restart your development server')
  }

  // Add helpful tips
  diagnosis.push('')
  diagnosis.push('📝 Your .env should look like this:')
  diagnosis.push('   MPESA_CONSUMER_KEY=abc123xyz...')
  diagnosis.push('   MPESA_CONSUMER_SECRET=def456uvw...')
  diagnosis.push('   (No quotes, no spaces around =)')

  return NextResponse.json(results, { 
    status: results.step2_token_test.success ? 200 : 500 
  })
}