"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Ticket, 
  Trash2, 
  CheckCircle2, 
  ChevronRight, 
  Copy, 
  ExternalLink,
  Info,
  QrCode,
  RefreshCw
} from "lucide-react";

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
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-6"
        >
          <Ticket className="w-8 h-8" />
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Burn & Redeem</h1>
        <p className="text-gray-400 max-w-md mx-auto">
          Convert your on-chain tokens back into brand-specific points. 
          This process burns the tokens and generates a unique claim code.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {isSuccess && code ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden border-emerald-500/30 bg-emerald-500/[0.02]"
          >
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 text-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Redemption Successful!</h2>
                <p className="text-gray-400 text-sm">Your tokens have been burned on the BSC Testnet.</p>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-black/40 border-2 border-dashed border-emerald-500/30 rounded-2xl p-6 font-mono">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500/60 mb-2 font-sans font-bold">Claim Code</p>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-2xl font-bold tracking-[0.2em] text-white underline decoration-emerald-500/50 underline-offset-8">
                      {code}
                    </span>
                    <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={() => { setCode(null); setAmount(""); }}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Redeem Again
                </button>
                <a 
                  href="#" 
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> View Transaction
                </a>
              </div>
            </div>
            
            <div className="bg-black/40 border-t border-emerald-500/10 p-6 flex items-start gap-4">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 flex-shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Present this claim code at any <span className="text-white font-bold">{brand.name}</span> retail partner or mobile app to credit your account with <span className="text-white font-bold">{(parseFloat(amount) * brand.pointsPerToken).toLocaleString()}</span> points.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-8"
          >
            {/* Form Section */}
            <div className="md:col-span-3 space-y-6">
              <div className="glass-card p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Select Brand</label>
                    <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">Verified Issuer</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {MOCK_BRANDS.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBrandId(b.id)}
                        className={`p-3 rounded-xl border transition-all text-center space-y-2 ${
                          brandId === b.id 
                            ? "bg-emerald-500/10 border-emerald-500/40 shadow-inner" 
                            : "bg-white/5 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center text-[10px] font-bold text-white shadow-lg" style={{ backgroundColor: b.logo }}>
                          {b.symbol}
                        </div>
                        <p className="text-[10px] font-bold truncate">{b.symbol}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Burn Amount</label>
                  <div className="relative group">
                    <input
                      type="number"
                      placeholder="0.0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/40 rounded-2xl px-6 py-5 text-2xl font-bold outline-none transition-all pr-24"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       <span className="text-xs font-bold text-gray-500">{brand.symbol}</span>
                       <button className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300">MAX</button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRedeem}
                  disabled={isPending || !amount || !address}
                  className="w-full py-5 bg-emerald-500 text-black rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                  {isPending ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Confirm & Burn Tokens
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Receipt / Info Section */}
            <div className="md:col-span-2 space-y-6">
               <div className="glass-card p-6 bg-gradient-to-br from-white/5 to-transparent border-white/10">
                  <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-500" /> Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500">Burning Asset</span>
                       <span className="text-white font-medium">{brand.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500">Equivalent Points</span>
                       <span className="text-white font-medium">
                         {amount ? (parseFloat(amount) * brand.pointsPerToken).toLocaleString() : "0"} Points
                       </span>
                    </div>
                    <div className="flex justify-between text-xs">
                       <span className="text-gray-500">Protocol Fee</span>
                       <span className="text-emerald-500 font-bold">FREE</span>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                       <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                          <span className="text-[10px] uppercase font-bold text-emerald-400">Total Value</span>
                          <span className="text-sm font-bold text-emerald-400">
                             ${amount ? (parseFloat(amount) * 0.01).toFixed(2) : "0.00"}
                          </span>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="glass-card p-6 border-red-500/20 bg-red-500/[0.02]">
                  <div className="flex items-center gap-2 text-red-400 mb-3 text-xs font-bold uppercase tracking-widest">
                    <Trash2 className="w-4 h-4" /> Irreversible Action
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed italic">
                    By confirming, you agree to burn these ERC-1155 tokens on-chain. This action cannot be undone. You will receive a claim code immediately after the block is confirmed.
                  </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
