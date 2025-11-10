import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    
    const { Body } = data
    const { stkCallback } = Body

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
    } = stkCallback

    // Extract callback metadata if payment was successful
    let mpesaReceiptNumber = null
    let transactionDate = null

    if (ResultCode === 0 && stkCallback.CallbackMetadata) {
      const items = stkCallback.CallbackMetadata.Item
      
      mpesaReceiptNumber = items.find(
        (item: any) => item.Name === 'MpesaReceiptNumber'
      )?.Value

      const dateValue = items.find(
        (item: any) => item.Name === 'TransactionDate'
      )?.Value

      if (dateValue) {
        const dateStr = dateValue.toString()
        transactionDate = new Date(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(4, 6)) - 1,
          parseInt(dateStr.substring(6, 8)),
          parseInt(dateStr.substring(8, 10)),
          parseInt(dateStr.substring(10, 12)),
          parseInt(dateStr.substring(12, 14))
        )
      }
    }

    // Update transaction in database
    await prisma.transaction.update({
      where: {
        checkoutRequestId: CheckoutRequestID,
      },
      data: {
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        status: ResultCode === 0 ? 'success' : 'failed',
        mpesaReceiptNumber,
        transactionDate,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Callback Error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}