"use client";
import { useState, useEffect, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ADDRESSES, SWAP_POOL_ABI, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function QuotePreview({ 
  amountOut, 
  amountIn, 
  fromBrand, 
  toBrand,
  isLoading 
}: { 
  amountOut: bigint | undefined; 
  amountIn: bigint;
  fromBrand: typeof MOCK_BRANDS[0];
  toBrand: typeof MOCK_BRANDS[0];
  isLoading: boolean;
}) {
  const rate = amountOut && amountIn > 0n
    ? (Number(amountOut) / Number(amountIn)).toFixed(4)
    : "—";
  
  const minReceived = amountOut ? (amountOut * 99n) / 100n : 0n;
  const priceImpact: string = amountOut && amountIn > 0n
    ? (((Number(amountOut) / Number(amountIn)) - 1) * 100).toFixed(2)
    : "0";

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 space-y-2 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!amountOut) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-xs text-gray-400">Enter an amount to see quote</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Rate</span>
        <span className="text-gray-700 font-medium">1 {fromBrand.symbol} = {rate} {toBrand.symbol}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Min. Received</span>
        <span className="text-gray-700 font-medium">{Number(minReceived).toLocaleString()} {toBrand.symbol}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Price Impact</span>
        <span className={Number(priceImpact) < -5 ? "text-red-500" : "text-gray-700"}>
          {priceImpact}%
        </span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Fee (0.3%)</span>
        <span className="text-gray-700">{Number(amountIn * 3n / 1000n).toLocaleString()} {fromBrand.symbol}</span>
      </div>
    </div>
  );
}

export default function SwapPage() {
  const { address } = useAccount();
  const [fromId, setFromId] = useState(0);
  const [toId, setToId]     = useState(1);
  const [amount, setAmount] = useState("");
  
  const debouncedAmount = useDebounce(amount, 300);
  const amountBigInt = debouncedAmount ? BigInt(Math.floor(parseFloat(debouncedAmount))) : 0n;

  const { data: amountOut, isLoading } = useReadContract({
    address: ADDRESSES.swap,
    abi: SWAP_POOL_ABI,
    functionName: "getAmountOut",
    args: fromId !== toId ? [BigInt(fromId), BigInt(toId), amountBigInt] : undefined,
    query: { enabled: amountBigInt > 0n && fromId !== toId },
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
  const inputAmountBigInt = amount ? BigInt(Math.floor(parseFloat(amount))) : 0n;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Swap Points</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">From</p>
          <div className="flex items-center gap-3">
            <select
              value={fromId}
              onChange={e => {
                setFromId(Number(e.target.value));
                if (Number(e.target.value) === toId) {
                  setToId(fromId);
                }
              }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium min-w-[120px]"
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
              className="flex-1 text-right text-xl md:text-2xl font-semibold bg-transparent outline-none min-h-[40px]"
              style={{ fontSize: '16px' }}
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
              onChange={e => {
                setToId(Number(e.target.value));
                if (Number(e.target.value) === fromId) {
                  setFromId(toId);
                }
              }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium min-w-[120px]"
            >
              {MOCK_BRANDS.filter(b => b.id !== fromId).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div className="flex-1 text-right text-xl md:text-2xl font-semibold text-gray-400">
              {amountOut ? Number(amountOut).toLocaleString() : "0"}
            </div>
          </div>
        </div>

        <QuotePreview 
          amountOut={amountOut}
          amountIn={inputAmountBigInt}
          fromBrand={fromBrand}
          toBrand={toBrand}
          isLoading={isLoading}
        />

        <button
          onClick={handleApprove}
          disabled={approving}
          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
        >
          {approving ? "Approving…" : "1. Approve SwapPool"}
        </button>
        <button
          onClick={handleSwap}
          disabled={swapping || !amount || fromId === toId || !amountOut}
          className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-40"
        >
          {swapping ? "Swapping…" : `2. Swap ${fromBrand.symbol} → ${toBrand.symbol}`}
        </button>
      </div>
    </div>
  );
}
