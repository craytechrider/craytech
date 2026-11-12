import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Package,
  ArrowRight,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import api from "../../lib/api";

const BLUE = "#1749D1";
const BLUE_DARK = "#102D79";

interface Order {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  created_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { clearCart } = useCart();

  const [checking, setChecking] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const hasClearedCart = useRef(false);

  const orderNumber = searchParams.get("order");

  /*
  |--------------------------------------------------------------------------
  | CHECK ORDER PAYMENT STATUS
  |--------------------------------------------------------------------------
  */

  const checkPaymentStatus = async () => {
    if (!orderNumber) {
      setChecking(false);
      return false;
    }

    try {
      console.log("Checking payment status for:", orderNumber);

      const response = await api.get<ApiResponse<Order[]>>("/orders");

      console.log("Orders response:", response.data);

      if (!response.data.success) {
        return false;
      }

      const orders = response.data.data || [];

      const foundOrder = orders.find(
        (item) =>
          String(item.order_number).toUpperCase() ===
          String(orderNumber).toUpperCase(),
      );

      if (!foundOrder) {
        console.log("Order not found yet:", orderNumber);
        return false;
      }

      console.log("Found order:", foundOrder);

      setOrder(foundOrder);

      const paymentStatus = String(
        foundOrder.payment_status || "pending",
      ).toLowerCase();

      /*
      |--------------------------------------------------------------------------
      | PAYMENT SUCCESS
      |--------------------------------------------------------------------------
      */

      if (paymentStatus === "paid") {
        if (!hasClearedCart.current) {
          clearCart();
          hasClearedCart.current = true;
        }

        setChecking(false);
        return true;
      }

      /*
      |--------------------------------------------------------------------------
      | PAYMENT FAILED
      |--------------------------------------------------------------------------
      */

      if (paymentStatus === "failed") {
        setChecking(false);
        return true;
      }

      /*
      |--------------------------------------------------------------------------
      | STILL PENDING
      |--------------------------------------------------------------------------
      */

      return false;
    } catch (error: any) {
      console.error("Payment status check failed:", error);

      console.error("Server response:", error?.response?.data);

      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | POLLING
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const maxAttempts = 30;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      attempts++;

      const finished = await checkPaymentStatus();

      if (cancelled) {
        return;
      }

      if (finished) {
        return;
      }

      if (attempts >= maxAttempts) {
        setChecking(false);
        setTimedOut(true);
        return;
      }

      setTimeout(poll, 2000);
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | NO ORDER ID
  |--------------------------------------------------------------------------
  */

  if (!orderNumber) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        
          <div className="flex min-h-screen items-center justify-center px-8 py-10">
            <div className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white px-8 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <XCircle size={42} className="text-red-500" />
              </div>

              <h1 className="mt-6 text-2xl font-extrabold text-[#17365D]">
                Order Not Found
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                We could not determine which order you paid for.
              </p>

              <button
                type="button"
                onClick={() => navigate("/customer/orders")}
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white"
                style={{
                  backgroundColor: BLUE,
                }}
              >
                View My Orders
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAYMENT FAILED
  |--------------------------------------------------------------------------
  */

  if (order && String(order.payment_status).toLowerCase() === "failed") {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        
          <div className="flex min-h-screen items-center justify-center px-8 py-10">
            <div className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white px-8 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
                <XCircle size={42} className="text-red-500" />
              </div>

              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-red-500">
                Payment Failed
              </p>

              <h1 className="mt-2 text-3xl font-extrabold text-[#17365D]">
                Payment Was Not Completed
              </h1>

              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
                PayMongo reported that your payment was unsuccessful. Please
                check your order and try again.
              </p>

              <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-3 rounded-xl bg-gray-50 p-4">
                <Package
                  size={20}
                  style={{
                    color: BLUE,
                  }}
                />

                <div className="text-left">
                  <p className="text-xs text-gray-400">Order Number</p>

                  <p className="text-sm font-extrabold text-gray-800">
                    {order.order_number}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/customer/orders")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white"
                  style={{
                    backgroundColor: BLUE,
                  }}
                >
                  View My Orders
                  <ArrowRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/customer/dashboard")}
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-700"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAYMENT STILL PROCESSING / TIMEOUT
  |--------------------------------------------------------------------------
  */

  if (checking || timedOut) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        
          <div className="flex min-h-screen items-center justify-center px-8 py-10">
            <div className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white px-8 py-14 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                {timedOut ? (
                  <Clock
                    size={40}
                    style={{
                      color: BLUE,
                    }}
                  />
                ) : (
                  <Loader2
                    size={38}
                    className="animate-spin"
                    style={{
                      color: BLUE,
                    }}
                  />
                )}
              </div>

              <h1
                className="mt-6 text-2xl font-extrabold"
                style={{
                  color: BLUE,
                }}
              >
                Processing Payment
              </h1>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                We are waiting for PayMongo to confirm your payment. This
                usually takes only a few moments.
              </p>

              <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-3 rounded-xl bg-gray-50 p-4">
                <Package
                  size={20}
                  style={{
                    color: BLUE,
                  }}
                />

                <div className="text-left">
                  <p className="text-xs text-gray-400">Order ID</p>

                  <p className="text-sm font-extrabold text-gray-800">
                    {order?.order_number || orderNumber}
                  </p>
                </div>
              </div>

              {timedOut && (
                <div className="mt-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-left">
                  <p className="text-sm font-bold text-yellow-800">
                    Payment confirmation is taking longer than expected.
                  </p>

                  <p className="mt-1 text-xs leading-5 text-yellow-700">
                    Your payment may still be processing. Please check your
                    orders instead of making another payment.
                  </p>
                </div>
              )}

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                {timedOut && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw size={17} />
                    Check Again
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate("/customer/orders")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white"
                  style={{
                    backgroundColor: BLUE,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = BLUE_DARK;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = BLUE;
                  }}
                >
                  View My Orders
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAYMENT SUCCESS
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      
        <div className="flex min-h-screen items-center justify-center px-8 py-10">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-100 bg-white px-8 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 size={42} className="text-green-500" />
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-green-600">
              Payment Successful
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-[#17365D]">
              Thank You for Your Order!
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
              Your PayMongo payment has been successfully confirmed. Your order
              is now being processed by CRAYTECH.
            </p>

            {order && (
              <div className="mx-auto mt-6 max-w-sm rounded-xl bg-gray-50 p-4">
                <div className="flex items-center justify-center gap-3">
                  <Package
                    size={20}
                    style={{
                      color: BLUE,
                    }}
                  />

                  <div className="text-left">
                    <p className="text-xs text-gray-400">Order Number</p>

                    <p className="text-sm font-extrabold text-gray-800">
                      {order.order_number}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Amount Paid</span>

                    <span className="font-extrabold text-[#17365D]">
                      ₱
                      {Number(order.total_amount).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate("/customer/orders")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  backgroundColor: BLUE,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = BLUE_DARK;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = BLUE;
                }}
              >
                View My Orders
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/customer/dashboard")}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      
    </div>
  );
};

export default PaymentSuccess;
