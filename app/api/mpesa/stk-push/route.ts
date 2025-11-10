import { NextRequest, NextResponse } from 'next/server'
import { MpesaService } from '@/lib/mpesa'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json()

    // Validate input
    if (!phoneNumber || !amount || !accountReference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const mpesa = new MpesaService()
    const response = await mpesa.initiateSTKPush(
      phoneNumber,
      amount,
      accountReference,
      transactionDesc || 'Payment'
    )

    // Save transaction to database
    const transaction = await prisma.transaction.create({
      data: {
        merchantRequestId: response.MerchantRequestID,
        checkoutRequestId: response.CheckoutRequestID,
        phoneNumber,
        amount,
        accountReference,
        transactionDesc: transactionDesc || 'Payment',
        paymentMode: 'stk_push',
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: response.CustomerMessage,
      checkoutRequestId: response.CheckoutRequestID,
      transactionId: transaction.id,
    })
  } catch (error: any) {
    console.error('STK Push Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}