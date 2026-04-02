import { useState } from "react";
import { useExplorer } from "@/hooks/use-explorer";
import { CyberCard } from "@/components/CyberCard";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, Blocks, ArrowRightLeft, Globe, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Explorer() {
  const { blocks, transactions } = useExplorer();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (searchQuery.trim().length < 3) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/explorer/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      } else {
        setSearchResults({ users: [], addresses: [], transactions: [], blocks: [], error: true });
      }
    } catch {
      setSearchResults({ users: [], addresses: [], transactions: [], blocks: [], error: true });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const { data: polygonBlocks, isLoading: blocksLoading } = useQuery({
    queryKey: ["/api/blockchain/explorer/blocks"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/explorer/blocks");
      if (!res.ok) return { blocks: [], polygonscanUrl: "" };
      return await res.json();
    },
    refetchInterval: 30000,
  });

  const { data: polygonTxs, isLoading: txsLoading } = useQuery({
    queryKey: ["/api/blockchain/explorer/transactions"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/explorer/transactions");
      if (!res.ok) return { transactions: [], polygonscanUrl: "" };
      return await res.json();
    },
    refetchInterval: 30000,
  });

  const { data: blockchainStatus } = useQuery({
    queryKey: ["/api/blockchain/status"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/status");
      if (!res.ok) return null;
      return await res.json();
    },
    refetchInterval: 30000,
  });

  const scanUrl = polygonBlocks?.polygonscanUrl || "https://amoy.polygonscan.com";

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-5xl font-heading text-accent border-b-2 border-accent/20 pb-2 mb-4" data-testid="text-explorer-title">BLOCK EXPLORER</h1>
          <p className="font-mono text-white/70 text-lg mt-2 italic">Real-time WEBD2 Network Ledger</p>
        </div>
        {blockchainStatus?.connected && (
          <div className="flex items-center gap-3 bg-card/50 border border-green-500/20 rounded-md px-4 py-2" data-testid="text-explorer-status">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-mono text-green-400/80">{blockchainStatus.network}</span>
            <span className="text-xs font-mono text-muted-foreground">Block #{blockchainStatus.blockNumber?.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-accent/50" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search Address, Hash, Block..."
            className="pl-14 py-8 bg-input border-2 border-primary/30 font-mono text-xl text-white placeholder:text-primary/30"
            data-testid="input-explorer-search"
          />
          {searchQuery && (
            <button onClick={clearSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary p-2">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} disabled={isSearching || searchQuery.trim().length < 3} className="btn-neon shrink-0 w-full sm:w-auto py-8 px-10 text-xl font-black uppercase tracking-widest" data-testid="button-search">
          {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : "FIND DATA"}
        </Button>
      </div>

      {searchResults && (
        <CyberCard title="SEARCH RESULTS">
          {searchResults.error ? (
            <div className="text-center py-8 text-destructive font-mono text-sm" data-testid="text-search-error">
              Search failed. Try a different query.
            </div>
          ) : searchResults.addresses?.length === 0 && searchResults.users?.length === 0 && searchResults.blocks?.length === 0 && searchResults.transactions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-mono text-sm" data-testid="text-no-results">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.addresses?.map((addr: any, idx: number) => (
                <div key={`addr-${idx}`} className="p-3 border border-primary/10 rounded-md font-mono text-sm" data-testid={`search-result-address-${idx}`}>
                  <div className="text-xs text-accent mb-1">WALLET ADDRESS</div>
                  <div className="text-white text-base">{addr.address}</div>
                  {addr.polygonAddress && <div className="text-purple-400/70 text-base mt-1">{addr.polygonAddress}</div>}
                  <div className="text-muted-foreground text-xs mt-1">Balance: {Number(addr.balance || 0).toLocaleString()} WEBD2</div>
                </div>
              ))}
              {searchResults.users?.map((u: any, idx: number) => (
                <div key={`user-${idx}`} className="p-3 border border-primary/10 rounded-md font-mono text-sm" data-testid={`search-result-user-${idx}`}>
                  <div className="text-xs text-primary mb-1">USER</div>
                  <div className="text-white">{u.username}</div>
                  <div className="text-muted-foreground text-base mt-1">{u.walletAddress}</div>
                </div>
              ))}
              {searchResults.blocks?.map((b: any, idx: number) => (
                <div key={`block-${idx}`} className="p-3 border border-primary/10 rounded-md font-mono text-sm" data-testid={`search-result-block-${idx}`}>
                  <div className="text-xs text-accent mb-1">BLOCK #{b.id}</div>
                  <div className="text-muted-foreground text-xs break-all">Hash: {b.hash}</div>
                  <div className="text-muted-foreground text-xs">Reward: {b.reward} WEBD2</div>
                </div>
              ))}
              {searchResults.transactions?.map((tx: any, idx: number) => (
                <div key={`tx-${idx}`} className="p-3 border border-primary/10 rounded-md font-mono text-sm" data-testid={`search-result-tx-${idx}`}>
                  <div className="text-xs text-primary mb-1">TRANSACTION #{tx.id}</div>
                  <div className="text-muted-foreground text-base">{tx.senderAddress || 'System'} -&gt; {tx.receiverAddress}</div>
                  <div className="text-accent text-xs">{Number(tx.amount).toLocaleString()} WEBD2</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-center">
            <Button variant="outline" size="sm" onClick={clearSearch} className="font-mono text-xs" data-testid="button-clear-search">
              <X className="w-3 h-3 mr-1" /> CLEAR RESULTS
            </Button>
          </div>
        </CyberCard>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <CyberCard title="WEBD2 NETWORK BLOCKS" className="min-h-[500px]">
          {blocksLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              <span className="ml-2 font-mono text-sm text-muted-foreground">Fetching blocks...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm text-left">
                <thead>
                  <tr className="border-b border-primary/30 text-primary/70">
                    <th className="py-3 px-2">BLOCK</th>
                    <th className="py-3 px-2">HASH</th>
                    <th className="py-3 px-2">TXS</th>
                    <th className="py-3 px-2 text-right">AGE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {polygonBlocks?.blocks?.map((block: any) => (
                    <tr key={block.number} className="hover:bg-primary/5 transition-colors" data-testid={`polygon-block-${block.number}`}>
                      <td className="py-3 px-2">
                        <a
                          href={`${scanUrl}/block/${block.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent font-bold hover:underline flex items-center gap-1"
                          data-testid={`link-block-${block.number}`}
                        >
                          #{block.number.toLocaleString()}
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{block.hash.substring(0, 12)}...</td>
                      <td className="py-3 px-2 text-purple-400">{block.transactionCount}</td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {formatDistanceToNow(new Date(block.timestamp * 1000), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                  {(!polygonBlocks?.blocks || polygonBlocks.blocks.length === 0) && (
                    <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Connecting to DIELBS Engine...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" className="font-mono text-xs" disabled>
              <Blocks className="w-3 h-3 mr-1" /> NETWORK SYNCED
            </Button>
          </div>
        </CyberCard>

        <CyberCard title="WEBD2 NETWORK TRANSACTIONS" className="min-h-[500px]">
          {txsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              <span className="ml-2 font-mono text-sm text-muted-foreground">Fetching transactions...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm text-left">
                <thead>
                  <tr className="border-b border-primary/30 text-primary/70">
                    <th className="py-3 px-2">TX HASH</th>
                    <th className="py-3 px-2">FROM / TO</th>
                    <th className="py-3 px-2 text-right">VALUE (WEBD2)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {polygonTxs?.transactions?.map((tx: any, idx: number) => (
                    <tr key={`${tx.hash}-${idx}`} className="hover:bg-primary/5 transition-colors" data-testid={`polygon-tx-${idx}`}>
                      <td className="py-3 px-2">
                        <a
                          href={`${scanUrl}/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline flex items-center gap-1"
                          data-testid={`link-tx-${idx}`}
                        >
                          {tx.hash.substring(0, 14)}...
                          <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        <div className="flex flex-col">
                          <a
                            href={`${scanUrl}/address/${tx.from}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate max-w-[200px] hover:text-purple-400 transition-colors text-base"
                          >
                            {tx.from.substring(0, 14)}...{tx.from.substring(36)}
                          </a>
                          <span className="text-sm opacity-50">to</span>
                          {tx.to ? (
                            <a
                              href={`${scanUrl}/address/${tx.to}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate max-w-[200px] hover:text-purple-400 transition-colors text-base"
                            >
                              {tx.to.substring(0, 14)}...{tx.to.substring(36)}
                            </a>
                          ) : (
                            <span className="text-accent text-xs">CONTRACT CREATE</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-accent font-bold">
                        {parseFloat(tx.value).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                  {(!polygonTxs?.transactions || polygonTxs.transactions.length === 0) && (
                    <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">Fetching transactions...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" className="font-mono text-xs" disabled>
              <ArrowRightLeft className="w-3 h-3 mr-1" /> LEDGER IMMUTABLE
            </Button>
          </div>
        </CyberCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <CyberCard title="INTERNAL WEBD2 BLOCKS" className="min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm text-left">
              <thead>
                <tr className="border-b border-primary/30 text-primary/70">
                  <th className="py-3 px-2">HEIGHT</th>
                  <th className="py-3 px-2">HASH</th>
                  <th className="py-3 px-2">MINER</th>
                  <th className="py-3 px-2 text-right">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {blocks?.map((block: any) => (
                  <tr key={block.id} className="hover:bg-primary/5 transition-colors" data-testid={`block-row-${block.id}`}>
                    <td className="py-3 px-2 text-accent font-bold">#{block.id}</td>
                    <td className="py-3 px-2 text-muted-foreground">{block.hash.substring(0, 12)}...</td>
                    <td className="py-3 px-2 text-muted-foreground text-base truncate max-w-[200px]">{block.minerAddress ? `${block.minerAddress.substring(0, 20)}...` : `Miner #${block.minerId}`}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatDistanceToNow(new Date(block.timestamp), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
                {(!blocks || blocks.length === 0) && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No WEBD blocks yet. Start mining to create blocks.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CyberCard>

        <CyberCard title="INTERNAL WEBD2 TRANSACTIONS" className="min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm text-left">
              <thead>
                <tr className="border-b border-primary/30 text-primary/70">
                  <th className="py-3 px-2">TYPE</th>
                  <th className="py-3 px-2">FROM / TO</th>
                  <th className="py-3 px-2 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {transactions?.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-primary/5 transition-colors" data-testid={`tx-row-${tx.id}`}>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 text-[10px] uppercase border rounded-sm ${
                        tx.type === 'mining_reward' ? 'border-accent text-accent' :
                        tx.type === 'conversion' ? 'border-yellow-500 text-yellow-500' :
                        'border-primary text-primary'
                      }`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[250px] text-base">{tx.senderAddress ? `${tx.senderAddress.substring(0, 22)}...` : 'COINBASE'}</span>
                        <span className="text-sm opacity-50">to</span>
                        <span className="truncate max-w-[250px] text-base">{tx.receiverAddress ? `${tx.receiverAddress.substring(0, 22)}...` : `User #${tx.receiverId}`}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-accent font-bold">
                      {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 4 })} WEBD2
                    </td>
                  </tr>
                ))}
                {(!transactions || transactions.length === 0) && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No WEBD transactions yet...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
