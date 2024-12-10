import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  ExtensionType,
  LENGTH_SIZE,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  getMintLen,
} from "@solana/spl-token";
import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

import { Anchor, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ChangeEvent, useState } from "react";
import axios from "axios";
import { MintToken } from "./MintToken";
import { useRecoilState } from "recoil";
import { decimals } from "@/atoms/atoms";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;

export const TokenLaunchpad = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [name, setName] = useState("");
  const [tokenaddress, setTokenaddress] = useState<PublicKey>();
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [initialSupply, setInitialSupply] = useState(0);
  const [number,setNumber] = useRecoilState(decimals);
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log(e.target.files[0]);
      setTokenImage(e.target.files[0]);
    }
  };

  const uploadImageToPinata = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        }
      );
      console.log(response.data);
      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      console.error("Error uploading image to Pinata:", error);
      throw error;
    }
  };

  const uploadMetadataToPinata = async (metadata: any) => {
    try {
      const jsonString = JSON.stringify(metadata);
      console.log("json", jsonString);
      const file = new File([jsonString], "metadata.json", {
        type: "application/json",
      });
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          headers: {
            Authorization: `Bearer ${PINATA_JWT}`,
          },
        }
      );

      return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    } catch (error) {
      console.error("Error uploading metadata to Pinata:", error);
      throw error;
    }
  };

  async function createToken() {
    if (!name || !symbol || !tokenImage) {
      console.log(name);
      console.log(symbol);
      console.log(tokenImage);
      alert("Please fill in all required fields and select an image");
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadImageToPinata(tokenImage);

      const metadata = {
        name: name,
        symbol: symbol,
        description: description || "",
        image: imageUrl,
      };

      console.log("meta data before upload", metadata);

      const metadataUri = await uploadMetadataToPinata(metadata);
      console.log("meta data uri", metadataUri);

      const mintKeypair = Keypair.generate();
      const tokenMetadata: TokenMetadata = {
        mint: mintKeypair.publicKey,
        name: name,
        symbol: symbol,
        uri: metadataUri,
        additionalMetadata: [],
      };

      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;

      const lamports = await connection.getMinimumBalanceForRentExemption(
        mintLen + metadataLen
      );

      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey!,
          newAccountPubkey: mintKeypair.publicKey,
          space: mintLen,
          lamports,
          programId: TOKEN_2022_PROGRAM_ID,
        }),
        createInitializeMetadataPointerInstruction(
          mintKeypair.publicKey,
          wallet.publicKey,
          mintKeypair.publicKey,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeMintInstruction(
          mintKeypair.publicKey,
          //decimals
          number,
          wallet.publicKey!,
          null,
          TOKEN_2022_PROGRAM_ID
        ),
        createInitializeInstruction({
          programId: TOKEN_2022_PROGRAM_ID,
          mint: mintKeypair.publicKey,
          metadata: mintKeypair.publicKey,
          name: tokenMetadata.name,
          symbol: tokenMetadata.symbol,
          uri: tokenMetadata.uri,
          mintAuthority: wallet.publicKey!,
          updateAuthority: wallet.publicKey!,
        })
      );

      if (wallet.publicKey === null) {
        return;
      }
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      transaction.partialSign(mintKeypair);

      await wallet.sendTransaction(transaction, connection);
      console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);

      setTokenaddress(mintKeypair.publicKey);
    } catch (error) {
      console.error("Token creation failed:", error);
      alert("Failed to create token. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-500 to-pink-500 opacity-20 blur-3xl" />
      <div className="relative">
        {/* Navigation */}
        <nav className="flex justify-between items-center p-6">
          <div className="flex items-center space-x-2">
            <Anchor className="text-white"></Anchor>
            <span className="text-white font-semibold text-xl">
              TokenLaunch
            </span>
          </div>
          {/* <WalletMultiButton /> */}
          <WalletMultiButton />
        </nav>

        {/* Main content */}
        <main className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Launch Your Token on Solana
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
              Efficient and straightforward token creation delivered in minutes
              – Start building your Web3 project today!
            </p>
          </div>

          {/* Features */}

          {/* Main card */}
          <Card className="w-full max-w-2xl mx-auto bg-black/40 backdrop-blur-xl border-none shadow-2xl shadow-purple-500/10">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center text-white">
                Create Your Token
              </CardTitle>
              <CardDescription className="text-center text-gray-400">
                Launch your own SPL token in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-1 items-center px-10 bg-black/40 backdrop-blur-xl">
                  <TabsTrigger
                    value="create"
                    className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
                  >
                    Create Token
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="create">
                  <div className="flex flex-col gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="tokenName" className="text-gray-300">
                        Token Name
                      </Label>
                      <Input
                        id="tokenName"
                        placeholder="Enter token name"
                        onChange={(e) => {
                          setName(e.target.value);
                        }}
                        className="bg-gray-900 border-gray-800 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tokenSymbol" className="text-gray-300">
                        Token Symbol
                      </Label>
                      <Input
                        id="tokenSymbol"
                        placeholder="Enter token symbol"
                        onChange={(e) => {
                          setSymbol(e.target.value);
                        }}
                        className="bg-gray-900 border-gray-800 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tokenSymbol" className="text-gray-300">
                        Token Description
                      </Label>
                      <Input
                        id="tokenSymbol"
                        onChange={(e) => {
                          setDescription(e.target.value);
                        }}
                        placeholder="Enter token description"
                        className="bg-gray-900 border-gray-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tokenSymbol" className="text-gray-300">
                        Decimal
                      </Label>
                      <Input
                        id="tokenSymbol"
                        onChange={(e) => {
                          setNumber(Number(e.target.value));
                        }}
                        type="number"
                        placeholder="Enter token description"
                        className="bg-gray-900 border-gray-800 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tokenSupply" className="text-gray-300">
                        Initial Supply
                      </Label>
                      <Input
                        id="tokenSupply"
                        onChange={(e) => {
                          setInitialSupply(Number(e.target.value));
                        }}
                        type="number"
                        placeholder="Enter initial supply"
                        className="bg-gray-900 border-gray-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tokenSupply" className="text-gray-300">
                        Token Image
                      </Label>
                      <Input
                        id="tokenImage"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="border-none text-white"
                      />
                    </div>

                    <div className="flex items-center justify-center">
                      <Button
                        onClick={createToken}
                        disabled={isUploading}
                        className="w-1/2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 items-center"
                      >
                        {isUploading ? "Creating..." : "Create Token"}
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {tokenaddress && <MintToken mintAddress={tokenaddress} />}
        </main>
      </div>
    </div>
  );
};
