import { EVENT_DISCRIMINATOR, getEventDecoder, getTicketregistryProgramId } from '@project/anchor'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'
import { useWalletUi } from '@wallet-ui/react'
import { Instruction, TransactionSigner, createTransaction, SolanaClient, signAndSendTransactionMessageWithSigners, getBase58Decoder, createSolanaClient, Address } from 'gill'

export function useTicketregistryProgramId() {
  const { cluster } = useWalletUi()

  return useMemo(() => getTicketregistryProgramId(cluster.id), [cluster])
}

export function useGetProgramAccountQuery() {
  const { client, cluster } = useWalletUi()

  return useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => client.rpc.getAccountInfo(getTicketregistryProgramId(cluster.id)).send(),
  })
}

export async function useProcessTransaction(
  signer: TransactionSigner,
  client: SolanaClient,
  instructions: Instruction[]) {
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send()

  const { simulateTransaction } = createSolanaClient({
    urlOrMoniker: "https://api.devnet.solana.com",
  });




  toast.message("Creating transaction...")
  const transaction = createTransaction({
    latestBlockhash,
    feePayer: signer,
    version: 'legacy',
    instructions: Array.isArray(instructions) ? instructions : [instructions],
  })
  console.log("Transaction created:", transaction);

  toast.message("Signing transaction...")
  // const simulation = await simulateTransaction(transaction) -- to debug
  // console.log("Simulation:",simulation);



  const signature = await signAndSendTransactionMessageWithSigners(transaction);
  console.log("Transaction signature:", signature);

  toast.success(`${signature} successfully sent!`)
  const decoder = getBase58Decoder()
  const sig58 = decoder.decode(signature)
  console.log(sig58)
}

export async function useGetEventAccounts(
  client: SolanaClient,
  programId: Address
) {
  const allAccounts = await client.rpc.getProgramAccounts(programId, {
    encoding: 'base64'
  }).send()

  const filteredAccounts = allAccounts.filter((account) => {
    const data = Buffer.from(account.account.data[0], 'base64')
    const discriminator = data.subarray(0, 8)
    return discriminator.equals(Buffer.from(EVENT_DISCRIMINATOR))
  })

  const decoder = getEventDecoder()

  const decodedAccounts = filteredAccounts.map((account) => ({
    address: account.pubkey,
    data: decoder.decode(Buffer.from(account.account.data[0], "base64"))
  }))

  return decodedAccounts
}