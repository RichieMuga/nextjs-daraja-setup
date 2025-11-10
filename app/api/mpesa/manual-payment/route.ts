import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, amount, mpesaCode, accountReference } = await req.json()

    // Validate input
    if (!phoneNumber || !amount || !mpesaCode || !accountReference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if M-Pesa code already exists
    const existing = await prisma.manualPayment.findUnique({
      where: { mpesaCode },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'This M-Pesa code has already been submitted' },
        { status: 400 }
      )
    }

    // Create manual payment record
    const payment = await prisma.manualPayment.create({
      data: {
        phoneNumber,
        amount,
        mpesaCode: mpesaCode.toUpperCase(),
        accountReference,
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment submitted for verification',
      paymentId: payment.id,
    })
  } catch (error: any) {
    console.error('Manual Payment Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit payment' },
      { status: 500 }
    )
  }
}

// Verify manual payment (admin route)
export async function PATCH(request: NextRequest) {
  try {
    const { paymentId, status } = await request.json()

    const payment = await prisma.manualPayment.update({
      where: { id: paymentId },
      data: {
        status,
        verifiedAt: status === 'verified' ? new Date() : null,
      },
    })

    return NextResponse.json({ success: true, payment })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}