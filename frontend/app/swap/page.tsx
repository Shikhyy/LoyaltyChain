"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ADDRESSES, SWAP_POOL_ABI, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

export default function SwapPage() {
  const { address } = useAccount();
  const [fromId, setFromId] = useState(0);
  const [toId, setToId]     = useState(1);
  const [amount, setAmount] = useState("");

  const amountBigInt = amount ? BigInt(Math.floor(parseFloat(amount))) : 0n;

  const { data: amountOut } = useReadContract({
    address: ADDRESSES.swap,
    abi: SWAP_POOL_ABI,
    functionName: "getAmountOut",
    args: [BigInt(fromId), BigInt(toId), amountBigInt],
    query: { enabled: amountBigInt > 0n },
  });

  const { writeContract: approve, isPending: approving } = useWriteContract();
  const { writeContract: doSwap, isPending: swapping }   = useWriteContract();

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

  const fromBrand = MOCK_BRANDS[fromId];
  const toBrand   = MOCK_BRANDS[toId];
  const rate = amountOut && amountBigInt > 0n
    ? (Number(amountOut) / Number(amountBigInt)).toFixed(3)
    : "—";

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Swap Points</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">From</p>
          <div className="flex items-center gap-3">
            <select
              value={fromId}
              onChange={e => setFromId(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 text-right text-2xl font-semibold bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { setFromId(toId); setToId(fromId); }}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            ↕
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">To</p>
          <div className="flex items-center gap-3">
            <select
              value={toId}
              onChange={e => setToId(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              {MOCK_BRANDS.filter(b => b.id !== fromId).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="flex-1 text-right text-2xl font-semibold text-gray-400">
              {amountOut ? Number(amountOut).toLocaleString() : "0"}
            </div>
          </div>
        </div>

        {amount && (
          <div className="text-xs text-gray-500 text-center">
            1 {fromBrand.symbol} = {rate} {toBrand.symbol} · 0.3% fee
          </div>
        )}

        <button
          onClick={handleApprove}
          disabled={approving}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          {approving ? "Approving…" : "1. Approve SwapPool"}
        </button>
        <button
          onClick={handleSwap}
          disabled={swapping || !amount || fromId === toId}
          className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-40"
        >
          {swapping ? "Swapping…" : `2. Swap ${fromBrand.symbol} → ${toBrand.symbol}`}
        </button>
      </div>
    </div>
  );
}
