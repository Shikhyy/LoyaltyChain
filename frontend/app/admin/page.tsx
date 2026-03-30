"use client";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import { ADDRESSES } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

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

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Operator Panel</h1>
      <p className="text-gray-500 text-sm mb-6">Mint loyalty tokens to a user address. Only registered operators can mint their brand's tokens.</p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Recipient address</label>
          <input
            placeholder="0x..."
            value={to}
            onChange={e => setTo(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Brand</label>
          <select
            value={brandId}
            onChange={e => setBrandId(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
          >
            {MOCK_BRANDS.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Amount of tokens</label>
          <input
            type="number"
            placeholder="e.g. 500"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
          />
        </div>
        {isSuccess && (
          <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Tokens minted successfully!</p>
        )}
        <button
          onClick={handleMint}
          disabled={isPending || !to || !amount}
          className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold text-sm hover:bg-yellow-500 disabled:opacity-40"
        >
          {isPending ? "Minting…" : "Mint tokens"}
        </button>
      </div>
    </div>
  );
}
