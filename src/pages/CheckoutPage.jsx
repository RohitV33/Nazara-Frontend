import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, MapPin, CheckCircle, Loader, ShieldCheck } from 'lucide-react';
import api from '../utils/api';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { formatPrice } from '../utils/price';

const STEPS = ['Shipping', 'Payment', 'Confirm'];

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, refetch } = useCart();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const [shipping, setShipping] = useState({
    name: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'India',
  });

  // field-level errors
  const [errors, setErrors] = useState({});

  const { items, total } = cart;
  const subtotal = total;
  const shippingCost = subtotal >= 100 ? 0 : 9.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  const grandTotal = +(subtotal + shippingCost + tax).toFixed(2);

  const validate = () => {
    const newErrors = {};

    // Empty checks
    if (!shipping.name.trim())    newErrors.name    = 'Full name is required';
    if (!shipping.email.trim())   newErrors.email   = 'Email is required';
    if (!shipping.address.trim()) newErrors.address = 'Street address is required';
    if (!shipping.city.trim())    newErrors.city    = 'City is required';
    if (!shipping.state.trim())   newErrors.state   = 'State is required';
    if (!shipping.zip.trim())     newErrors.zip     = 'PIN code is required';

    // Email format
    if (shipping.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    // Phone — optional but if filled must be 10 digits
    if (shipping.phone) {
      const clean = shipping.phone.replace(/[\s\-\+]/g, '');
      if (!/^\d{10}$/.test(clean)) {
        newErrors.phone = 'Phone must be 10 digits';
      }
    }

    // PIN code — exactly 6 digits
    if (shipping.zip && !/^\d{6}$/.test(shipping.zip)) {
      newErrors.zip = 'PIN code must be exactly 6 digits';
    }

    return newErrors;
  };

  const handleShippingSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    setStep(1);
  };

  // helper — input class with red border on error
  const inputCls = (field) =>
    `input-field ${errors[field] ? 'border-red-400 focus:border-red-500' : ''}`;

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error('Failed to load payment gateway. Check your internet connection.');
        setLoading(false);
        return;
      }

      const { data } = await api.post('/payment/create-order', {
        amount: grandTotal,
        shipping_address: shipping,
      });

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'NAZARA',
        description: `Order Payment`,
        order_id: data.orderId,
        prefill: {
          name: shipping.name,
          email: shipping.email,
          contact: shipping.phone || '',
        },
        theme: { color: '#0d0d12' },
        handler: async (response) => {
          try {
            const verifyRes = await api.post('/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              shipping_address: shipping,
              payment_method: 'razorpay',
            });
            setOrderId(verifyRes.data.orderId);
            await refetch();
            setStep(2);
            toast.success('Payment successful! 🎉');
          } catch (err) {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            toast.error('Payment cancelled');
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — Success
  if (step === 2) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-32 pb-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}>
          <CheckCircle size={72} className="text-green-500 mx-auto mb-6" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}>
          <h1 className="text-3xl font-semibold text-ink-950 mb-3">Order Placed! 🎉</h1>
          <p className="text-ink-500 mb-2">Thank you for your purchase.</p>
          <p className="text-sm text-ink-400 mb-8">
            Order #{orderId} · Confirmation sent to {shipping.email}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/orders')} className="btn-primary">View Orders</button>
            <button onClick={() => navigate('/products')} className="btn-outline">Continue Shopping</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <h1 className="section-title mb-8">Checkout</h1>

      {/* Step indicators */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all ${
                i < step ? 'bg-green-500 text-white'
                : i === step ? 'bg-ink-950 text-white'
                : 'bg-ink-100 text-ink-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs text-ink-500 hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mb-4 mx-1 transition-all ${
                i < step ? 'bg-green-500' : 'bg-ink-100'
              }`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">

          {/* Step 0 — Shipping */}
          {step === 0 && (
            <motion.form initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              onSubmit={handleShippingSubmit} className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <MapPin size={20} className="text-ink-600" />
                <h2 className="font-semibold text-lg">Shipping Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">Full Name *</label>
                  <input className={inputCls('name')} placeholder="Rohit Kumar"
                    value={shipping.name}
                    onChange={e => { setShipping({...shipping, name: e.target.value}); setErrors({...errors, name: ''}); }} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">Email *</label>
                  <input type="email" className={inputCls('email')} placeholder="rohit@example.com"
                    value={shipping.email}
                    onChange={e => { setShipping({...shipping, email: e.target.value}); setErrors({...errors, email: ''}); }} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">Phone</label>
                  <input className={inputCls('phone')} placeholder="+91 98765 43210"
                    value={shipping.phone}
                    onChange={e => { setShipping({...shipping, phone: e.target.value}); setErrors({...errors, phone: ''}); }} />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                {/* Street Address */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">Street Address *</label>
                  <input className={inputCls('address')} placeholder="123 Main Street, Flat 4B"
                    value={shipping.address}
                    onChange={e => { setShipping({...shipping, address: e.target.value}); setErrors({...errors, address: ''}); }} />
                  {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">City *</label>
                  <input className={inputCls('city')} placeholder="New Delhi"
                    value={shipping.city}
                    onChange={e => { setShipping({...shipping, city: e.target.value}); setErrors({...errors, city: ''}); }} />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>

                {/* State */}
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">State *</label>
                  <input className={inputCls('state')} placeholder="Delhi"
                    value={shipping.state}
                    onChange={e => { setShipping({...shipping, state: e.target.value}); setErrors({...errors, state: ''}); }} />
                  {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                </div>

                {/* PIN Code */}
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">PIN Code *</label>
                  <input className={inputCls('zip')} placeholder="110001"
                    value={shipping.zip} maxLength={6}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, ''); // only digits
                      setShipping({...shipping, zip: val});
                      setErrors({...errors, zip: ''});
                    }} />
                  {errors.zip && <p className="text-xs text-red-500 mt-1">{errors.zip}</p>}
                </div>

                {/* Country */}
                <div>
                  <label className="text-xs font-medium text-ink-600 mb-1.5 block">Country</label>
                  <input className="input-field" value={shipping.country}
                    onChange={e => setShipping({...shipping, country: e.target.value})} />
                </div>

              </div>

              <button type="submit" className="btn-primary mt-6">
                Continue to Payment →
              </button>
            </motion.form>
          )}

          {/* Step 1 — Payment */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard size={20} className="text-ink-600" />
                <h2 className="font-semibold text-lg">Payment</h2>
              </div>

              <div className="bg-ink-50 rounded-2xl p-5 mb-6 border border-ink-100">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck size={20} className="text-green-600" />
                  <p className="font-medium text-ink-900">Secure Payment via Razorpay</p>
                </div>
                <p className="text-sm text-ink-500 leading-relaxed">
                  You will be redirected to Razorpay's secure payment page. We accept:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['💳 Cards', '📱 UPI', '🏦 NetBanking', '👝 Wallets', '📦 EMI'].map(m => (
                    <span key={m} className="text-xs bg-white border border-ink-200 px-2.5 py-1 rounded-full font-medium text-ink-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-ink-100 p-4 mb-6">
                <h3 className="font-semibold text-ink-950 mb-3 text-sm">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {items.slice(0, 3).map(item => (
                    <div key={item.id} className="flex justify-between text-ink-600">
                      <span className="truncate max-w-[200px]">{item.name} ×{item.quantity}</span>
                      <span className="font-medium ml-2">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-ink-400">+{items.length - 3} more items</p>
                  )}
                  <div className="border-t border-ink-100 pt-2 flex justify-between font-bold text-ink-950">
                    <span>Total</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="btn-outline flex-1">← Back</button>
                <button onClick={handleRazorpayPayment} disabled={loading} className="btn-primary flex-1">
                  {loading
                    ? <><Loader size={16} className="animate-spin" /> Processing...</>
                    : `Pay ${formatPrice(grandTotal)}`
                  }
                </button>
              </div>

              <p className="text-xs text-ink-400 text-center mt-3">
                🔒 256-bit SSL encrypted · Powered by Razorpay
              </p>
            </motion.div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <div className="card p-5 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Your Order</h2>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.image_url} alt={item.name}
                    className="w-10 h-10 rounded-lg object-cover bg-ink-50 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink-900 truncate">{item.name}</p>
                    <p className="text-xs text-ink-400">×{item.quantity}</p>
                  </div>
                  <span className="text-xs font-semibold shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Shipping</span>
                <span>{shippingCost === 0
                  ? <span className="text-green-600">Free</span>
                  : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Tax</span><span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span><span>{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}