"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ADDRESSES, SWAP_POOL_ABI, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, RefreshCw, ArrowDownUp, CheckCircle2, Zap, ShieldCheck, Info } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SwapPage() {
  const { address } = useAccount();
  const [fromId, setFromId] = useState(0);
  const [toId, setToId]     = useState(1);
  const [amount, setAmount] = useState("");
  
  const debouncedAmount = useDebounce(amount, 300);
  const amountBigInt = debouncedAmount ? BigInt(Math.floor(parseFloat(debouncedAmount))) : 0n;

  const fromBrand = MOCK_BRANDS[fromId];
  const toBrand   = MOCK_BRANDS[toId];

  const { data: amountOut, isLoading: isQuoteLoading } = useReadContract({
    address: ADDRESSES.swap,
    abi: SWAP_POOL_ABI,
    functionName: "getAmountOut",
    args: fromId !== toId ? [BigInt(fromId), BigInt(toId), amountBigInt] : undefined,
    query: { enabled: amountBigInt > 0n && fromId !== toId },
  });

  const { writeContract: approve, isPending: isApproving } = useWriteContract();
  const { writeContract: doSwap, isPending: isSwapping, isSuccess: isSwapSuccess } = useWriteContract();

  const priceImpact: string = amountOut && amountBigInt > 0n
    ? (((Number(amountOut) / Number(amountBigInt)) - 1) * 100).toFixed(2)
    : "0";

  const rate = amountOut && amountBigInt > 0n
    ? (Number(amountOut) / Number(amountBigInt)).toFixed(4)
    : null;

  const minReceived = amountOut ? (amountOut * 99n) / 100n : 0n;

  function handleSwap() {
    if (!amountOut || !address) return;
    const minOut = (amountOut * 97n) / 100n;
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

  function switchTokens() {
    setFromId(toId);
    setToId(fromId);
    setAmount("");
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2">Swap Points</h1>
        <p className="text-[#666666]">Instant cross-brand loyalty swaps</p>
      </motion.div>

      <motion.div 
        layout
        className="swap-widget space-y-1 relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="bg-[#f4f3e5] rounded-2xl p-5 border border-[#e8e6d9] transition-all focus-within:border-[#ff4000] focus-within:shadow-lg focus-within:shadow-[#ff4000]/10">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#999999]">You Pay</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-transparent text-3xl md:text-4xl font-bold outline-none text-[#1a1a1a] placeholder:text-[#d4d2c5]"
                style={{ fontSize: '16px' }}
              />
            </div>
            <select
              value={fromId}
              onChange={e => {
                setFromId(Number(e.target.value));
                if (Number(e.target.value) === toId) setToId(fromId);
              }}
              className="bg-white border border-[#e8e6d9] rounded-xl px-4 py-2 font-bold text-sm outline-none cursor-pointer hover:border-[#ff4000] transition-colors"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.symbol})</option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-[#999999]">{fromBrand.name}</div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[calc(50%-16px)] z-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={switchTokens}
            className="w-10 h-10 bg-[#ff4000] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#ff4000]/30"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="bg-[#f4f3e5] rounded-2xl p-5 border border-[#e8e6d9]">
          <div className="flex justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#999999]">You Receive</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={amountOut?.toString()}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-3xl md:text-4xl font-bold ${!amountOut ? "text-[#d4d2c5]" : "text-[#1a1a1a]"}`}
                >
                  {amountOut ? Number(amountOut).toLocaleString() : "0.0"}
                </motion.div>
              </AnimatePresence>
            </div>
            <select
              value={toId}
              onChange={e => {
                setToId(Number(e.target.value));
                if (Number(e.target.value) === fromId) setFromId(toId);
              }}
              className="bg-white border border-[#e8e6d9] rounded-xl px-4 py-2 font-bold text-sm outline-none cursor-pointer hover:border-[#ff4000] transition-colors"
            >
              {MOCK_BRANDS.filter(b => b.id !== fromId).map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.symbol})</option>
              ))}
            </select>
          </div>
          <div className="mt-2 text-xs text-[#999999] flex justify-between items-center">
            <span>{toBrand.name}</span>
            {rate && (
              <span className="text-[10px] text-[#ff4000] font-medium">
                1 {fromBrand.symbol} = {rate} {toBrand.symbol}
              </span>
            )}
          </div>
        </div>

        <div className="px-2 py-6 space-y-4">
          <AnimatePresence>
            {amountBigInt > 0n && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#f4f3e5] rounded-xl p-4 space-y-3 overflow-hidden"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-[#999999] font-medium">Rate</span>
                  <span className="text-[#1a1a1a] font-semibold">
                    1 {fromBrand.symbol} = {rate} {toBrand.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#999999] font-medium">Min. Received</span>
                  <span className="text-[#1a1a1a] font-semibold">
                    {Number(minReceived).toLocaleString()} {toBrand.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#999999] font-medium">Price Impact</span>
                  <span className={Number(priceImpact) < -5 ? "text-red-500 font-semibold" : "text-[#1a1a1a] font-semibold"}>
                    {priceImpact}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#999999] font-medium">Fee (0.3%)</span>
                  <span className="text-[#1a1a1a] font-semibold">
                    {Number(amountBigInt * 3n / 1000n).toLocaleString()} {fromBrand.symbol}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#e8e6d9] flex items-center gap-2 text-xs text-[#999999]">
                  <Info className="w-3 h-3" />
                  Prices are subject to change before transaction is mined.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className={`py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isApproving 
                  ? "bg-[#f4f3e5] text-[#999999] cursor-not-allowed border border-[#e8e6d9]" 
                  : "btn-secondary"
              }`}
            >
              {isApproving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={handleSwap}
              disabled={isSwapping || !amount || fromId === toId || !amountOut}
              className={`py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                isSwapping || !amountOut
                  ? "bg-[#d4d2c5] text-[#999999] cursor-not-allowed"
                  : "btn-primary"
              }`}
            >
              {isSwapping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowDownUp className="w-4 h-4" />}
              Swap Now
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSwapSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-2 mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-green-700">Transaction Submitted!</p>
                <p className="text-xs text-green-600">View on BscScan</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div 
          className="card p-5 border-l-4 border-l-[#ff4000]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#ff4000]/10 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#ff4000]" />
            </div>
            <h4 className="font-bold text-[#1a1a1a]">Multi-Asset AMM</h4>
          </div>
          <p className="text-sm text-[#666666] leading-relaxed">
            Uses Constant Product formula (x*y=k) optimized for ERC-1155 loyalty tokens on BSC.
          </p>
        </motion.div>
        <motion.div 
          className="card p-5 border-l-4 border-l-[#ff6a33]"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#ff6a33]/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#ff6a33]" />
            </div>
            <h4 className="font-bold text-[#1a1a1a]">Points Value Peg</h4>
          </div>
          <p className="text-sm text-[#666666] leading-relaxed">
            Token values derived from brand-specific RWA redemption rates (pts/token).
          </p>
        </motion.div>
      </div>
    </div>
  );
}
