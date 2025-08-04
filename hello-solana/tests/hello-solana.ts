import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HelloSolana } from "../target/types/hello_solana";

describe("hello-solana", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.helloSolana as Program<HelloSolana>;

  const signer = anchor.web3.Keypair.generate(); //generates completely new solana wallet with no data/no lamports in it.
  const data_account = anchor.web3.Keypair.generate(); //generates a new data account that will be used to store data.
  it("Is initialized!", async () => {
    //Since signer needs to have some lamports to pay for the transaction and rent for the data account, we need to airdrop some lamports before we can proceed.

    await program.provider.connection.confirmTransaction(await program.provider.connection.requestAirdrop(signer.publicKey,100*anchor.web3.LAMPORTS_PER_SOL),"confirmed"); 
    //Airdrop 100 lamports to the signer account. (1 SOL = 1,000,000,000 lamports)
    //"confirmed" is the commitment level, it means that the transaction will be confirmed by the cluster before proceeding.
    //confirmTransaction is used to wait for the transaction to be confirmed.
    //requestAirdrop is used to request an airdrop of lamports to the specified account.



    const tx = await program.methods.initialize(
      "Hello, Solana!"
    ).accounts(
      {
        signer: signer.publicKey, //This is the signer account that will pay for the transaction and rent for the data account.
        dataAccount: data_account.publicKey
      }
    ).signers([signer,data_account]).rpc(); //These inputs are instruction arguments apart from the accounts.
    //To include accounts, we can specify with additional accounts in the method call.

    const dataAccount = await program.account.dataAccount.fetch(data_account.publicKey)

    console.log("Data Account: ",dataAccount)

    console.log("Your transaction signature", tx);
  });
});
