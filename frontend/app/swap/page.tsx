"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useBalance } from "wagmi";
import { ADDRESSES, SWAP_POOL_ABI, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowDown, 
  Settings, 
  Info, 
  AlertCircle, 
  CheckCircle2,
  RefreshCw,
  ArrowUpDown
} from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function QuoteDetail({ label, value, subValue, warning }: { label: string; value: string; subValue?: string; warning?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500 font-medium">{label}</span>
      <div className="text-right">
        <span className={`font-semibold ${warning ? "text-red-400" : "text-gray-200"}`}>{value}</span>
        {subValue && <p className="text-[10px] text-gray-500">{subValue}</p>}
      </div>
    </div>
  );
}

export default function SwapPage() {
  const { address } = useAccount();
  const [fromId, setFromId] = useState(0);
  const [toId, setToId]     = useState(1);
  const [amount, setAmount] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  const debouncedAmount = useDebounce(amount, 300);
  const amountBigInt = debouncedAmount ? BigInt(Math.floor(parseFloat(debouncedAmount))) : 0n;

  const fromBrand = MOCK_BRANDS[fromId];
  const toBrand   = MOCK_BRANDS[toId];

  const { data: amountOut, isLoading: isQuoteLoading, refetch: refreshQuote } = useReadContract({
    address: ADDRESSES.swap,
    abi: SWAP_POOL_ABI,
    functionName: "getAmountOut",
    args: fromId !== toId ? [BigInt(fromId), BigInt(toId), amountBigInt] : undefined,
    query: { enabled: amountBigInt > 0n && fromId !== toId },
  });

  const { writeContract: approve, isPending: isApproving } = useWriteContract();
  const { writeContract: doSwap, isPending: isSwapping, isSuccess: isSwapSuccess }   = useWriteContract();

  const priceImpact = amountOut && amountBigInt > 0n
    ? (((Number(amountOut) / Number(amountBigInt)) - 1) * 100).toFixed(2)
    : "0";

  const rate = amountOut && amountBigInt > 0n
    ? (Number(amountOut) / Number(amountBigInt)).toFixed(4)
    : null;

  function handleSwap() {
    if (!amountOut || !address) return;
    const minOut = (amountOut * 97n) / 100n; // 3% slippage
    doSwap({
      address: ADDRESSES.swap,
      abi: SWAP_POOL_ABI,
      functionName: "swap",
      args: [BigInt(fromId), BigInt(toId), amountBigInt, minOut],
    });
  }

  function handleApprove() {
    approve({
      address: ADDRESSES.token,
      abi: LOYALTY_TOKEN_ABI,
      functionName: "setApprovalForAll",
      args: [ADDRESSES.swap, true],
    });
  }

  const switchTokens = () => {
    setFromId(toId);
    setToId(fromId);
    setAmount("");
  };

  return (
    <div className="max-w-lg mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Convert</h1>
          <p className="text-gray-500 text-sm">Instant cross-brand loyalty swaps</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-xl transition-all ${showSettings ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-white/5 text-gray-400 hover:text-white"}`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <motion.div 
        layout
        className="glass-card p-2 space-y-1 relative"
      >
        {/* From Input */}
        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5 focus-within:border-emerald-500/30 transition-colors">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">You Pay</span>
            <span className="text-xs text-gray-500 flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors">
              <Wallet className="w-3 h-3" /> Max: 10,000
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-transparent text-4xl font-bold outline-none placeholder:text-gray-800"
              />
            </div>
            <select
              value={fromId}
              onChange={e => setFromId(Number(e.target.value))}
              className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2 font-bold text-sm outline-none cursor-pointer hover:bg-white/5 transition-colors"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.symbol}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {fromBrand.name}
          </div>
        </div>

        {/* Switch Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[50%] z-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={switchTokens}
            className="w-10 h-10 bg-[#1a1a1a] border-4 border-[#0a0a0a] rounded-xl flex items-center justify-center text-emerald-500 shadow-xl"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        </div>

        {/* To Input */}
        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">You Receive</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={amountOut?.toString()}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-4xl font-bold ${!amountOut ? "text-gray-800" : "text-white"}`}
                >
                  {amountOut ? Number(amountOut).toLocaleString() : "0.0"}
                </motion.div>
              </AnimatePresence>
            </div>
            <select
              value={toId}
              onChange={e => setToId(Number(e.target.value))}
              className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2 font-bold text-sm outline-none cursor-pointer hover:bg-white/5 transition-colors"
            >
              {MOCK_BRANDS.filter(b => b.id !== fromId).map(b => (
                <option key={b.id} value={b.id}>{b.symbol}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-gray-600 flex justify-between items-center">
            <span>{toBrand.name}</span>
            {rate && (
              <span className="text-[10px] text-emerald-500/60 font-medium">
                1 {fromBrand.symbol} = {rate} {toBrand.symbol}
              </span>
            )}
          </div>
        </div>

        {/* Quote Details */}
        <div className="px-4 py-6 space-y-4">
          <AnimatePresence>
            {amountBigInt > 0n && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <QuoteDetail 
                  label="Exchange Rate" 
                  value={rate ? `1 ${fromBrand.symbol} = ${rate} ${toBrand.symbol}` : "—"} 
                />
                <QuoteDetail 
                  label="Price Impact" 
                  value={`${priceImpact}%`} 
                  warning={Number(priceImpact) < -5}
                />
                <QuoteDetail 
                  label="Network Fee" 
                  value="Dynamic" 
                  subValue="BSC Testnet Gas"
                />
                <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] text-gray-500 italic">
                  <Info className="w-3 h-3" />
                  Estimated prices are subject to change before the transaction is mined.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className={`py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isApproving 
                  ? "bg-white/5 text-gray-500 cursor-not-allowed" 
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}
            >
              {isApproving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={handleSwap}
              disabled={isSwapping || !amount || fromId === toId || !amountOut}
              className={`py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isSwapping || !amountOut
                  ? "bg-white/5 text-gray-500 cursor-not-allowed"
                  : "bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              }`}
            >
              {isSwapping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpDown className="w-4 h-4" />}
              Swap Now
            </button>
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {isSwapSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-400">Transaction Submitted!</p>
                <p className="text-xs text-emerald-500/60">View on BscScan</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Info Section */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
            <AlertCircle className="w-5 h-5 text-blue-400" />
          </div>
          <h4 className="font-bold text-blue-400 mb-2">Multi-Asset AMM</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            LoyaltyChain uses a specialized version of the Constant Product formula (x*y=k) optimized for ERC-1155 royalty tokens on BSC.
          </p>
        </div>
        <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
          <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
            <Ticket className="w-5 h-5 text-amber-400" />
          </div>
          <h4 className="font-bold text-amber-400 mb-2">Points Value Peg</h4>
          <p className="text-xs text-gray-400 leading-relaxed">
            While swaps are decentralized, token values are initially derived from brand-specific RWA redemption rates (pts/token).
          </p>
        </div>
      </div>
    </div>
  );
}

import { Wallet, ShieldCheck, Ticket } from "lucide-react";
