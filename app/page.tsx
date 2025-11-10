"use client"

import axios from "axios"
import { ChangeEvent, useState } from "react"

export default function HomePage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const pollTransactionStatus = async (transactionId: string) => {
    const maxAttempts = 30
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await axios.get(`/api/mpesa/status?id=${transactionId}`)
        if (data.transaction.status === "success") {
          setMessage(`✓ Payment successful! Receipt: ${data.transaction.mpesaReceiptNumber}`)
          clearInterval(interval)
        } else if (data.transaction.status === "failed") {
          setMessage(`✗ Payment failed: ${data.transaction.resultDesc}`)
          clearInterval(interval)
        } else if (attempts >= maxAttempts) {
          setMessage("Payment verification timeout. Please check status later.")
          clearInterval(interval)
        }
      } catch (error) {
        console.error("Status check error:", error)
      }
    }, 3000)
  }

  const handleSTKPush = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const { data } = await axios.post("/api/mpesa/stk-push", {
        phoneNumber,
        amount: parseFloat(amount),
        accountReference: "ORDER123",
        transactionDesc: "Product Purchase",
      })

      if (data.success) {
        setMessage("Please check your phone to complete payment")
        pollTransactionStatus(data.transactionId)
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setMessage(`Error: ${error.response?.data?.error || error.message}`)
      } else {
        setMessage("Payment initiation failed")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value)
  }

  return (
    <>
      <div className="flex align-center items-center flex-col gap-10 py-4">
        <h1>Mpesa stk push example</h1>
        <div>
          <form onSubmit={handleSTKPush}>
            <div className="flex flex-col gap-2">
              <label>Phone Number (254XXXXXXXXX)</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={handleChange}
                placeholder="2547XXXXXXXX"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label>Amount (KES)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                min="1"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="py-2 px-4 cursor-pointer">
              {loading ? "Processing..." : "Pay Now"}
            </button>
          </form>

          <div>{message && <p>{message}</p>}</div>
        </div>
      </div>
    </>
  )
}
