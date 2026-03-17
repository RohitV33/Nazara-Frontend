import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronDown, ChevronUp, X, Loader } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { OrderSkeleton } from '../components/common/Skeletons';
import { formatPrice } from '../utils/price';

const STATUS_COLORS = {
  pending:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  confirmed:  'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  shipped:    'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
};

const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered'];

function OrderTimeline({ status }) {
  if (status === 'cancelled') return null;
  const current = STATUS_STEPS.indexOf(status);

  return (
    <div className="mt-4 pt-4 border-t border-ink-100">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-ink-100 z-0" />
        <div
          className="absolute left-0 top-3 h-0.5 bg-green-400 z-0 transition-all duration-700"
          style={{ width: current >= 0 ? `${(current / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
        />
        {STATUS_STEPS.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1 z-10">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
              i <= current
                ? 'bg-green-500 border-green-500 text-white'
                : 'bg-white border-ink-200 text-ink-400'
            }`}>
              {i <= current ? '✓' : i + 1}
            </div>
            <span className="text-xs text-ink-500 capitalize hidden sm:block">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, index, onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const items = Array.isArray(order.items) ? order.items.filter(Boolean) : [];
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  const handleCancel = async (e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      await api.put(`/orders/${order.id}/cancel`);
      toast.success('Order cancelled successfully');
      onCancel(order.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-ink-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
            <Package size={18} className="text-ink-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-ink-950 text-sm">Order #{order.id}</span>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status] || 'bg-ink-50 text-ink-700 border-ink-200'}`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-ink-400 mt-0.5">
              {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
              {' · '}{items.length} item{items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              {cancelling
                ? <Loader size={12} className="animate-spin" />
                : <X size={12} />
              }
              Cancel
            </button>
          )}
          <span className="font-bold text-lg text-ink-950">${Number(order.total_amount).toFixed(2)}</span>
          {expanded ? <ChevronUp size={16} className="text-ink-400" /> : <ChevronDown size={16} className="text-ink-400" />}
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-ink-100 px-5 pb-5">
              {/* Order Timeline */}
              <OrderTimeline status={order.status} />

              {/* Items */}
              {items.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-12 h-12 rounded-lg object-cover bg-ink-50"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-ink-400">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-400 mt-4">No item details available</p>
              )}

              {/* Shipping address */}
              {order.shipping_address && (
                <div className="mt-4 pt-4 border-t border-ink-100">
                  <p className="text-xs font-semibold text-ink-600 uppercase tracking-wider mb-2">Shipped To</p>
                  <div className="text-sm text-ink-700">
                    {typeof order.shipping_address === 'object' ? (
                      <>
                        <p className="font-medium">{order.shipping_address.name}</p>
                        <p>{order.shipping_address.address}</p>
                        <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</p>
                        <p className="text-ink-400">{order.shipping_address.email}</p>
                      </>
                    ) : (
                      <p>{order.shipping_address}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/my')
      .then(({ data }) => setOrders(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = (orderId) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled' } : o
    ));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="section-title mb-10"
      >
        My Orders
      </motion.h1>

      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => <OrderSkeleton key={i} />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package size={56} className="text-ink-200 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-ink-800 mb-2">No orders yet</h3>
          <p className="text-ink-400 mb-6">When you place an order, it'll show up here.</p>
          <a href="/products" className="btn-primary">Start Shopping</a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, i) => (
            <OrderCard
              key={order.id}
              order={order}
              index={i}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
