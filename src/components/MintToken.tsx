import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useState } from "react";
import { useRecoilState } from "recoil";
import { decimals } from "@/atoms/atoms";

interface MinProps {
  mintAddress: PublicKey;
}
export function MintToken({ mintAddress }: MinProps) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [number] = useRecoilState(decimals);
  const [amount,setAmount] = useState(0)
  async function mint() {
    try {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      // Create the associated token account instruction
      const associatedToken = getAssociatedTokenAddressSync(
        mintAddress,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Prepare instructions
      const instructions = [];

      // Check if the associated token account exists
      const accountInfo = await connection.getAccountInfo(associatedToken);
      if (!accountInfo) {
        // Add instruction to create associated token account if it doesn't exist
        instructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            associatedToken,
            wallet.publicKey,
            mintAddress,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Add mint instruction
      instructions.push(
        createMintToInstruction(
          mintAddress,
          associatedToken,
          wallet.publicKey,
          amount * (10 ** number),
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );
      if (!wallet.signTransaction) {
        throw new Error("Wallet does not support transaction signing");
      }
      // Create transaction
      const transaction = new Transaction().add(...instructions);

      // Set recent blockhash
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = wallet.publicKey;

      // Request signature from wallet
      const signedTransaction = await wallet.signTransaction(transaction);

      // Send the transaction
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      // Confirm transaction
      await connection.confirmTransaction(signature);

      console.log("Minting done for token " + mintAddress.toBase58());
     
    } catch (error) {
      console.error("Error minting token:", error);
    }
  }
  return (
    <Card className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border-none shadow-2xl shadow-purple-500/10 mt-10">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-white">
          Mint Your Token
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <div className="text-white text-center">
          {mintAddress.toBase58()}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mintAmount" className="text-gray-300">
              Mint Amount
            </Label>
            <Input
              id="mintAmount"
              type="number"
              placeholder="Enter amount to mint"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="bg-gray-900 border-gray-800 text-white"
            />
          </div>

          <div className="flex items-center justify-center">
            <Button
              onClick={() => mint()}
              className="w-1/2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 items-center"
            >
              Mint Tokens
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
