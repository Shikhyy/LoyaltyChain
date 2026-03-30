"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { motion, AnimatePresence } from "framer-motion";
import { Ticket, Trash2, CheckCircle2, ChevronRight, Copy, RefreshCw, Info, AlertTriangle } from "lucide-react";

function generateRewardCode(brandSymbol: string, amount: number): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${brandSymbol}-${amount}-${random}`;
}

export default function RedeemPage() {
  const { address } = useAccount();
  const [brandId, setBrandId] = useState(0);
  const [amount, setAmount]   = useState("");
  const [code, setCode]       = useState<string | null>(null);

  const { writeContract, isPending, isSuccess } = useWriteContract();

  function handleRedeem() {
    const rewardCode = generateRewardCode(
      MOCK_BRANDS[brandId].symbol,
      Number(amount)
    );
    setCode(rewardCode);
    writeContract({
      address: ADDRESSES.token,
      abi: LOYALTY_TOKEN_ABI,
      functionName: "redeem",
      args: [BigInt(brandId), BigInt(Math.floor(parseFloat(amount))), rewardCode],
    });
  }

  const brand = MOCK_BRANDS[brandId];

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <motion.div 
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ff4000]/10 border border-[#ff4000]/20 text-[#ff4000] mb-6"
        >
          <Ticket className="w-8 h-8" />
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-3">Burn & Redeem</h1>
        <p className="text-[#666666] max-w-md mx-auto">
          Convert your on-chain tokens into brand-specific points. Burns tokens and generates a unique claim code.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {isSuccess && code ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card overflow-hidden"
          >
            <div className="p-8 text-center space-y-6">
              <motion.div 
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Redemption Successful!</h2>
                <p className="text-[#666666] text-sm">Your tokens have been burned on the BSC Testnet.</p>
              </div>

              <motion.div 
                className="relative group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="absolute inset-0 bg-[#ff4000]/10 blur-xl opacity-0 group-hover:opacity-50 transition-opacity -z-10" />
                <div className="relative bg-[#f4f3e5] border-2 border-dashed border-[#e8e6d9] rounded-2xl p-6">
                  <p className="text-[10px] uppercase tracking-widest text-[#999999] mb-2 font-semibold">Claim Code</p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-2xl font-bold tracking-[0.2em] text-[#1a1a1a] underline decoration-[#ff4000]/50 underline-offset-8">
                      {code}
                    </span>
                    <button className="p-2 hover:bg-white rounded-lg transition-colors text-[#999999] hover:text-[#1a1a1a]">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => { setCode(null); setAmount(""); }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Redeem Again
                </button>
              </div>
            </div>
            
            <div className="bg-[#f4f3e5] border-t border-[#e8e6d9] p-6 flex items-start gap-4">
              <div className="p-2 bg-[#ff4000]/10 rounded-xl text-[#ff4000] flex-shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <p className="text-sm text-[#666666] leading-relaxed">
                Present this claim code at any <span className="font-semibold text-[#1a1a1a]">{brand.name}</span> partner to credit your account with <span className="font-semibold text-[#1a1a1a]">{(parseFloat(amount) * brand.pointsPerToken).toLocaleString()}</span> points.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="card p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#999999]">Select Brand</label>
                  <span className="text-[10px] text-[#ff4000] font-semibold bg-[#ff4000]/10 px-2 py-0.5 rounded">Verified</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {MOCK_BRANDS.map((b) => (
                    <motion.button
                      key={b.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setBrandId(b.id)}
                      className={`p-3 rounded-xl border transition-all text-center space-y-2 ${
                        brandId === b.id 
                          ? "bg-[#ff4000]/10 border-[#ff4000]/40 shadow-inner" 
                          : "bg-[#f4f3e5] border-[#e8e6d9] hover:border-[#ff4000]/40"
                      }`}
                    >
                      <div 
                        className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-xs font-bold text-white shadow-md" 
                        style={{ backgroundColor: b.logo }}
                      >
                        {b.symbol}
                      </div>
                      <p className="text-xs font-semibold text-[#1a1a1a] truncate">{b.symbol}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-widest text-[#999999]">Burn Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="input text-2xl font-bold pr-20"
                    style={{ fontSize: '16px' }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#999999]">{brand.symbol}</span>
                  </div>
                </div>
                {amount && (
                  <p className="text-sm text-[#ff4000] font-medium">
                    = {(parseFloat(amount) * brand.pointsPerToken).toLocaleString()} points
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleRedeem}
                disabled={isPending || !amount || !address}
                className="w-full py-4 btn-primary flex items-center justify-center gap-3 text-lg"
              >
                {isPending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Confirm & Burn Tokens
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>

            <div className="space-y-4">
              <div className="card p-6 bg-gradient-to-br from-white to-[#fffdf5]">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 text-[#1a1a1a]">
                  <Ticket className="w-4 h-4 text-[#ff4000]" /> Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#999999]">Burning Asset</span>
                    <span className="font-medium text-[#1a1a1a]">{brand.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#999999]">Equivalent Points</span>
                    <span className="font-medium text-[#1a1a1a]">
                      {amount ? (parseFloat(amount) * brand.pointsPerToken).toLocaleString() : "0"} Points
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#999999]">Protocol Fee</span>
                    <span className="font-bold text-green-600">FREE</span>
                  </div>
                  <div className="pt-4 border-t border-[#e8e6d9]">
                    <div className="flex justify-between items-center bg-[#ff4000]/10 p-3 rounded-xl border border-[#ff4000]/20">
                      <span className="text-xs uppercase font-bold text-[#ff4000]">Total Value</span>
                      <span className="text-lg font-bold text-[#ff4000]">
                        ${amount ? (parseFloat(amount) * 0.01).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card p-5 border-l-4 border-l-red-500 bg-red-50/50">
                <div className="flex items-center gap-2 text-red-600 mb-3 text-xs font-bold uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" /> Irreversible Action
                </div>
                <p className="text-xs text-[#666666] leading-relaxed">
                  By confirming, you agree to burn these ERC-1155 tokens on-chain. This action cannot be undone. You will receive a claim code immediately.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
