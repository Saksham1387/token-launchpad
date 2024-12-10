import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";
import { useMemo } from "react";
import { TokenLaunchpad } from "./components/token-launchpad";
import { RecoilRoot } from "recoil";

function App() {
  const network = WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  return (
    <RecoilRoot>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <TokenLaunchpad />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
    </RecoilRoot>
  );
}

export default App;
