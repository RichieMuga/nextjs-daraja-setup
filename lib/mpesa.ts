import axios from 'axios'

const SANDBOX_URL = 'https://sandbox.safaricom.co.ke'
const PRODUCTION_URL = 'https://api.safaricom.co.ke'

const BASE_URL = process.env.MPESA_ENVIRONMENT === 'production' 
  ? PRODUCTION_URL 
  : SANDBOX_URL

// Type definitions for M-Pesa API responses
interface AccessTokenResponse {
  access_token: string
  expires_in: string
}

interface STKPushResponse {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResponseCode: string
  ResponseDescription: string
  CustomerMessage: string
}

interface STKPushCallbackMetadataItem {
  Name: string
  Value: string | number
}

interface STKPushCallback {
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: number
  ResultDesc: string
  CallbackMetadata?: {
    Item: STKPushCallbackMetadataItem[]
  }
}

interface STKQueryResponse {
  ResponseCode: string
  ResponseDescription: string
  MerchantRequestID: string
  CheckoutRequestID: string
  ResultCode: string
  ResultDesc: string
}

export class MpesaService {
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64')

    try {
      const response = await axios.get<AccessTokenResponse>(
        `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      )
      return response.data.access_token
    } catch (error: any) {
      console.error('Access Token Error:', error.response?.data || error.message)
      throw new Error('Failed to get access token')
    }
  }

  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string
  ): Promise<STKPushResponse> {
    const token = await this.getAccessToken()
    
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14)

    const password = Buffer.from(
      `${process.env.MPESA_BUSINESS_SHORT_CODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    // Format phone number - ensure it starts with 254 for Kenya
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    
    // Handle different phone number formats
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1)
    } else if (formattedPhone.startsWith('254')) {
      // Already correct
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.slice(1)
    } else if (formattedPhone.length === 9) {
      // Missing country code
      formattedPhone = '254' + formattedPhone
    }

    const requestPayload = {
      BusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.floor(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_BUSINESS_SHORT_CODE,
      PhoneNumber: formattedPhone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    }

    // Log request for debugging (remove in production)
    console.log('STK Push Request:', {
      ...requestPayload,
      Password: '[REDACTED]',
      PhoneNumber: formattedPhone,
      Amount: Math.floor(amount),
      CallBackURL: process.env.MPESA_CALLBACK_URL
    })

    try {
      const response = await axios.post<STKPushResponse>(
        `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('STK Push Response:', response.data)
      return response.data
    } catch (error: any) {
      // Enhanced error logging
      console.error('STK Push Detailed Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        requestData: {
          ...requestPayload,
          Password: '[REDACTED]'
        }
      })

      // Throw more descriptive error
      const errorMessage = error.response?.data?.errorMessage || 
                          error.response?.data?.ResponseDescription ||
                          error.message
      throw new Error(`M-Pesa API Error: ${errorMessage}`)
    }
  }

  async querySTKStatus(checkoutRequestId: string): Promise<STKQueryResponse> {
    const token = await this.getAccessToken()
    
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, '')
      .slice(0, 14)

    const password = Buffer.from(
      `${process.env.MPESA_BUSINESS_SHORT_CODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64')

    try {
      const response = await axios.post<STKQueryResponse>(
        `${BASE_URL}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return response.data
    } catch (error: any) {
      console.error('STK Query Error:', error.response?.data || error.message)
      throw new Error('Failed to query STK status')
    }
  }
}

// Export types for use in other files
export type {
  AccessTokenResponse,
  STKPushResponse,
  STKPushCallback,
  STKPushCallbackMetadataItem,
  STKQueryResponse,
}