
import { web3 } from '@project-serum/anchor';
import { Keypair, 
        PublicKey, 
        SystemProgram,
        Transaction,
        TransactionInstruction,
        sendAndConfirmTransaction } from '@solana/web3.js';

// for rest function
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
//import { TokenInfo } from '@solana/spl-token-registry';
import * as borsh from 'borsh';
import bs58 from 'bs58';
import { METADATA_SCHEMA, Metadata } from './processMetaplexAccounts';
import axios from 'axios';

const solConnection = new web3.Connection(web3.clusterApiUrl("devnet"));

export const getNFTs = async () => {
  // for rest
  // J2TQr6JnPSQokyYUSSmWzniYxmRnGkQFJEQ4gQi3xfnU
  const creatorAddress = new PublicKey(
    "J2TQr6JnPSQokyYUSSmWzniYxmRnGkQFJEQ4gQi3xfnU"
  );
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  let nfts_metadata = await solConnection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        {
          memcmp: {
            offset: 1,
            bytes: creatorAddress.toBase58()
          }
        }
      ]
    }
  )
  .then((nfts) => {
    
    nfts.forEach((nft, i) => {
      //let nftAttr = decodeMetadata(nft.account.data);
      //console.log(bs58.encode(nftAttr.mint));
      console.log(i + " nft=", nft);
      console.log("account.owner =", bs58.encode(nft.account.owner.toBuffer()));
      console.log("pubkey =", bs58.encode(nft.pubkey.toBuffer()));
    })
    return nfts.map(
      (nft) => decodeMetadata(nft.account.data)
    );
  });

  for (let i=0; i<nfts_metadata.length; i++) {
    console.log("nfts_metadata[i]=", nfts_metadata[i]);
    nfts_metadata[i].data.image_uri = "#";
    await axios.get(nfts_metadata[i].data.uri)
    .then((offchain_data) => {  
      if (offchain_data != null) {
        nfts_metadata[i].data.image_uri = offchain_data.data.image;
        console.log("offchain_data =", offchain_data);
      }
    })
    .catch((err) => {
      console.log(err);
    });
  }

  return nfts_metadata;
}

const METADATA_REPLACE = new RegExp("\u0000", "g");
function decodeMetadata(buffer: any) {
  console.log("check");
  // return borsh.deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer);

  const metadata = borsh.deserializeUnchecked(
    METADATA_SCHEMA,
    Metadata,
    buffer
  );

  metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, "");
  metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, "");
  metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, "");
  return metadata;
}