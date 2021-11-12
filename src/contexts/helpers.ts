
import { web3 } from '@project-serum/anchor';
import { Keypair, 
        PublicKey, 
        SystemProgram,
        Transaction,
        TransactionInstruction } from '@solana/web3.js';

// for rest function
import { Token, TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token";
//import { TokenInfo } from '@solana/spl-token-registry';
import * as borsh from 'borsh';
import bs58 from 'bs58';
import {
  NFTRecord1,
  RecordSchema1,
  UpdateNFTArgs,
  UpdateNFTSchema,
  chunks,
  ContentRecord,
  showToast
} from './utils';
import axios from 'axios';
import BN from 'bn.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

const solConnection = new web3.Connection(web3.clusterApiUrl("devnet"));


const PDA_SEED = "hallofheros";
const NFT_RECORD_SPACE = 250; // RECORD_MAX_SIZE

const REPO_PROGRAM_ID = new PublicKey(
  "4p1oq2vTyran6rpx6BDXi4pi5DjTUcNX7vFKsgmGTT81"
);
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
const REPO_ACCOUNT_PUBKEY = new PublicKey(
  "67PefZpyHPzc9SEgZXwiakzvqDdPuYM5vhdBG9mEhHPT"
);


export const updateRecord = async (nftId: number, nftKey: PublicKey, price: BN, contentURI: string, wallet: WalletContextState) => {
  console.log(nftId + '  ' + nftKey.toBase58() + '  ' + price.toString() + '  uri=', contentURI);
  
  let args = new UpdateNFTArgs ({
    hero_id: nftId,
    key_nft: nftKey.toBytes(),
    new_price: price,
    content_uri: contentURI
  });

  let instructionInfo = borsh.serialize(UpdateNFTSchema, args);

  let buffer = Buffer.concat([Buffer.from(Uint8Array.of(1)), Buffer.from(instructionInfo)]);

  let nfts_metadata = await solConnection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        {
          memcmp: {
            offset: 33,
            bytes: nftKey.toBase58()
          }
        }
      ]
    }
  );
  
  if (nfts_metadata.length === 0) return;
  if (! wallet.publicKey) return;

  let associatedTokenAccount = await getNFTTokenAccount(nftKey);//await getAssociatedTokenAccount(wallet.publicKey, nftKey);
  console.log("NFTTokenAccount=", associatedTokenAccount.toBase58());

  const instruction = new TransactionInstruction({
    keys: [
      {pubkey: wallet.publicKey, isSigner: true, isWritable: false},
      {pubkey: REPO_ACCOUNT_PUBKEY, isSigner: false, isWritable: true},
      {pubkey: nftKey, isSigner: false, isWritable: false},
      {pubkey: associatedTokenAccount, isSigner: false, isWritable: false},
    ],
    programId: REPO_PROGRAM_ID,
    data: buffer,
  });
  let result = await wallet.sendTransaction(new Transaction().add(instruction), solConnection).catch(error => {
    showToast(error, 1);
  });
  if (result !== undefined) {
    showToast("Successfully changed.", 0);
    return true;
  }
  return false;
}
export const getRecords = async () :Promise<ContentRecord[]> => {
  let records : NFTRecord1[] = await getRepoAccountInfo();
  let contents : ContentRecord[] = records.map(r => (new ContentRecord({
      hero_id: r.hero_id,
      content_uri: r.content_uri,
      key_nft: new PublicKey(r.key_nft),
      last_price: r.last_price,
      listed_price: r.listed_price,
      image_uri: '#',
      name: '-',
      owner: null
    })
  ));
  return contents;
}
export const getContents = async (records: ContentRecord[]) => {
  console.log("getContents records =", records);
  for (let i = 0; i<records.length; i++) {
    records[i].owner = await getOwnerOfNFT(records[i].key_nft);
    let offchain_data = await axios.get(records[i].content_uri).catch((err) => {
      console.log(err);
    });
    if (offchain_data != null) {
      records[i].image_uri = offchain_data.data.image;
      records[i].name = offchain_data.data.name;
    }
  }
  return records;
}
export const getFullContents = async () => {
  let records : ContentRecord[] = await getRecords();
  let contents = await getContents(records);
  console.log("9's key=", contents[8].key_nft.toBase58());
  console.log("9's owner=", contents[8].owner);
  //getOwnerOfNFT
  return contents;
}
export const getContent = async (record: ContentRecord) => {
  console.log("getContents");
  
  record.owner = await getOwnerOfNFT(record.key_nft);
  let offchain_data = await axios.get(record.content_uri).catch((err) => {
    console.log(err);
  });
  if (offchain_data != null) {
    record.image_uri = offchain_data.data.image;
    record.name = offchain_data.data.name;
  }
  return record;
}

const getRepoAccountInfo = async () : Promise<NFTRecord1[]> => {
  let recordsInfo = await solConnection.getAccountInfo(REPO_ACCOUNT_PUBKEY);
  if (recordsInfo === null) {
    console.log("There is no info registered.");
    return [];
  }
  const records = chunks(recordsInfo.data.slice(), NFT_RECORD_SPACE);
  let unpacked_records = records.slice(0, 12).map((packInfo, idx) => {
    let record = borsh.deserializeUnchecked(RecordSchema1, NFTRecord1, Buffer.from(packInfo)) as NFTRecord1;
    return record;
  })
  return unpacked_records;

  /*
  records.forEach((packInfo, idx) => {
    if (idx < 12) {
      console.log("packInfo.len =", packInfo.length);
      let record = borsh.deserializeUnchecked(RecordSchema1, NFTRecord1, Buffer.from(packInfo)) as NFTRecord1;
      console.log("record =", record);
      let key = new PublicKey(record.key_nft);
      console.log("record.key_nft =", key.toBase58());
      console.log("record.last_price =", record.last_price.toNumber());
      console.log("record.listed_price =", record.listed_price.toNumber());
    }
    //console.log("No." + idx, "NFT: " + record.nft_address, " Owner: " + record.nft_owner, " Date:", record.register_date);
  })*/
}

export const buyNFT = async (nftId: number, nftKey: PublicKey, wallet: WalletContextState) => {
  if (!wallet.publicKey) return;

  const prevOwnerPK = await getOwnerOfNFT(nftKey);

  let nfts_metadata = await solConnection.getProgramAccounts(
    TOKEN_METADATA_PROGRAM_ID,
    {
      filters: [
        {
          memcmp: {
            offset: 33,
            bytes: nftKey.toBase58()
          }
        }
      ]
    }
  );
  if (nfts_metadata.length === 0) return;
  
  let nft_account_pk_to_send = await getAssociatedTokenAccount(prevOwnerPK, nftKey); 

  let {
    tempNFTTokenAccountKeypair, 
    createTempTokenAccountIx, 
    initTempAccountIx} = await createReceiveTokenAccountIx(wallet.publicKey, nftKey);
  let nft_account_pk_to_receive = tempNFTTokenAccountKeypair.publicKey;//new PublicKey("DJNwjdLbeBpc9zZ4m1zRLDHbnjcw3yPbB8Gs3dSRReA4");//await getToReceiveTokenAccount(buyerKeyPair.publicKey, nftKey); 
  //let nft_account_pk_to_receive = await getToSendTokenAccount(buyerKeyPair.publicKey, nftKey); 

  console.log("nft_account_pk_to_send =", nft_account_pk_to_send.toBase58());
  console.log("nft_account_pk_to_receive =", nft_account_pk_to_receive.toBase58());
    
  const PDA = await PublicKey.findProgramAddress(
    [Buffer.from(PDA_SEED)],
    REPO_PROGRAM_ID
  );

  const instruction = new TransactionInstruction({
    keys: [
      {pubkey: wallet.publicKey, isSigner: true, isWritable: true},
      {pubkey: prevOwnerPK, isSigner: false, isWritable: true},
      {pubkey: REPO_ACCOUNT_PUBKEY, isSigner: false, isWritable: true},
      {pubkey: nftKey, isSigner: false, isWritable: false},
      {pubkey: nft_account_pk_to_send, isSigner: false, isWritable: true},
      {pubkey: nft_account_pk_to_receive, isSigner: false, isWritable: true},
      {pubkey: PDA[0], isSigner: false, isWritable: false},
      {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
      {pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
    ],
    programId: REPO_PROGRAM_ID,
    data: Buffer.from(Uint8Array.of(2, nftId)),
  });
  console.log("buying nft...");

  let tx = new Transaction().add(
    createTempTokenAccountIx,
    initTempAccountIx,
    instruction
  );
  
  await wallet.sendTransaction(tx, solConnection, {
    signers: [tempNFTTokenAccountKeypair]
  }).then(result => {
    showToast("Successfully bought. Check your wallet", 0);
    return true;
  }).catch(error => {
    showToast(error, 1);
    return false;
  });
}


const getOwnerOfNFT = async (nftMintPk : PublicKey) : Promise<PublicKey> => {
  let tokenAccountPK = await getNFTTokenAccount(nftMintPk);
  let tokenAccountInfo = await solConnection.getAccountInfo(tokenAccountPK);
  
  console.log("nftMintPk=", nftMintPk.toBase58());
  console.log("tokenAccountInfo =", tokenAccountInfo);

  if (tokenAccountInfo && tokenAccountInfo.data ) {
    let ownerPubkey = new PublicKey(tokenAccountInfo.data.slice(32, 64))
    console.log("ownerPubkey=", ownerPubkey.toBase58());
    return ownerPubkey;
  }
  return new PublicKey("");
}

const getNFTTokenAccount = async (nftMintPk : PublicKey) : Promise<PublicKey> => {
  console.log("getNFTTokenAccount nftMintPk=", nftMintPk);
  let tokenAccount = await solConnection.getProgramAccounts(
    TOKEN_PROGRAM_ID,
    {
      filters: [
        {
          dataSize: 165
        },
        {
          memcmp: {
            offset: 64,
            bytes: '2'
          }
        },
        {
          memcmp: {
            offset: 0,
            bytes: nftMintPk.toBase58()
          }
        },
      ]
    }
  );
  return tokenAccount[0].pubkey;
}

const getAssociatedTokenAccount = async (ownerPubkey : PublicKey, mintPk : PublicKey) : Promise<PublicKey> => {
  let associatedTokenAccountPubkey = (await PublicKey.findProgramAddress(
    [
        ownerPubkey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPk.toBuffer(), // mint address
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  ))[0];
  return associatedTokenAccountPubkey;
}
const createReceiveTokenAccountIx = async (receiverPK : PublicKey, mintPk : PublicKey) => {
  const tempNFTTokenAccountKeypair = new Keypair();
  console.log("tempNFTTokenAccountKeypair =", tempNFTTokenAccountKeypair);
  const createTempTokenAccountIx = SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
    lamports: await solConnection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    ),
    fromPubkey: receiverPK,
    newAccountPubkey: tempNFTTokenAccountKeypair.publicKey,
  });
  const initTempAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    mintPk,
    tempNFTTokenAccountKeypair.publicKey,
    receiverPK
  );
  return {
    tempNFTTokenAccountKeypair, createTempTokenAccountIx, initTempAccountIx
  }
}