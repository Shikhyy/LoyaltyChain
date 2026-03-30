"use client";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import { motion } from "framer-motion";
import { ADDRESSES } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { ShieldCheck, Plus, CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";

const MINT_ABI = [{
  name: "mint",
  type: "function" as const,
  stateMutability: "nonpayable" as const,
  inputs: [
    { name: "to",      type: "address" },
    { name: "brandId", type: "uint256" },
    { name: "amount",  type: "uint256" },
  ],
  outputs: [],
}];

export default function AdminPage() {
  const [to, setTo]         = useState("");
  const [brandId, setBrandId] = useState(0);
  const [amount, setAmount]  = useState("");

  const { writeContract, isPending, isSuccess } = useWriteContract();

  function handleMint() {
    writeContract({
      address: ADDRESSES.token,
      abi: MINT_ABI,
      functionName: "mint",
      args: [to as `0x${string}`, BigInt(brandId), BigInt(Math.floor(parseFloat(amount)))],
    });
  }

  const brand = MOCK_BRANDS[brandId];

  return (
    <div className="max-w-lg mx-auto pb-20">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-[#ff4000]/10 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#ff4000]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a]">Operator Panel</h1>
            <p className="text-xs text-[#999999] uppercase tracking-wide">Brand Token Management</p>
          </div>
        </div>
        <p className="text-[#666666] text-sm">
          Mint loyalty tokens to a user address. Only registered operators can mint their brand's tokens.
        </p>
      </motion.div>

      <motion.div 
        className="card p-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#999999] block mb-2">Recipient Address</label>
            <input
              placeholder="0x..."
              value={to}
              onChange={e => setTo(e.target.value)}
              className="input font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#999999] block mb-2">Brand</label>
            <select
              value={brandId}
              onChange={e => setBrandId(Number(e.target.value))}
              className="input"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.symbol})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#999999] block mb-2">Token Amount</label>
            <div className="relative">
              <input
                type="number"
                placeholder="e.g. 500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="input pr-16"
                style={{ fontSize: '16px' }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#999999]">
                {brand.symbol}
              </span>
            </div>
            {amount && (
              <p className="text-xs text-[#ff4000] mt-2 font-medium">
                = {(parseFloat(amount) * brand.pointsPerToken).toLocaleString()} real points
              </p>
            )}
          </div>
        </div>

        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">Tokens minted successfully!</span>
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleMint}
          disabled={isPending || !to || !amount}
          className="w-full py-4 btn-primary flex items-center justify-center gap-3 text-lg"
        >
          {isPending ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Minting…
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Mint Tokens
            </>
          )}
        </motion.button>

        <div className="flex items-start gap-3 p-4 bg-[#f4f3e5] rounded-xl border border-[#e8e6d9]">
          <AlertCircle className="w-5 h-5 text-[#ff4000] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#1a1a1a] mb-1">Operator Access Required</p>
            <p className="text-xs text-[#666666]">
              Only the registered operator address for each brand can mint tokens. Contact support if you need access.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-sm font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#ff4000]" />
          Registered Brands
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MOCK_BRANDS.map((b, idx) => (
            <motion.div
              key={b.id}
              className="card p-4 flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                style={{ backgroundColor: b.logo }}
              >
                {b.symbol}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1a1a1a] truncate">{b.name}</p>
                <p className="text-xs text-[#999999]">{b.pointsPerToken} pts/token</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
