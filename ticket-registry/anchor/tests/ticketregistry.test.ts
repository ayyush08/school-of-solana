import {
  Blockhash,
  createSolanaClient,
  createTransaction,
  Instruction,
  KeyPairSigner,
  signTransactionMessageWithSigners,
} from 'gill'
import { loadKeypairSignerFromFile } from 'gill/node'
import BN from 'bn.js'
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js'
import { getEventInstruction, buyTicketInstruction, withdrawInstruction } from '../src/'

const { rpc, sendAndConfirmTransaction } = createSolanaClient({
  urlOrMoniker: process.env.ANCHOR_PROVIDER_URL!,
})

describe('TicketRegistry (Gill version)', () => {
  let payer: KeyPairSigner
  let eventOrganizer: KeyPairSigner
  let buyer1: KeyPairSigner
  let buyer2: KeyPairSigner
  let unauthorizedUser: KeyPairSigner

  beforeAll(async () => {
    payer = await loadKeypairSignerFromFile(process.env.ANCHOR_WALLET!)
    eventOrganizer = KeyPairSigner.generate()
    buyer1 = KeyPairSigner.generate()
    buyer2 = KeyPairSigner.generate()
    unauthorizedUser = KeyPairSigner.generate()

    // Airdrop SOL to all test accounts
    await Promise.all([
      airdrop(eventOrganizer.publicKey, 5),
      airdrop(buyer1.publicKey, 5),
      airdrop(buyer2.publicKey, 5),
      airdrop(unauthorizedUser.publicKey, 5),
    ])
  })

  describe('Initialize Event', () => {
    it('Should initialize a valid event successfully', async () => {
      const event = {
        name: 'Test Event',
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) + 7200),
        ticketPrice: new BN(0.5 * LAMPORTS_PER_SOL),
        availableTickets: new BN(100),
      }

      const [eventPda] = getEventPda(event.name, eventOrganizer.publicKey)

      const ix: Instruction = getEventInstruction({
        event,
        eventOrganizer: eventOrganizer.publicKey,
        eventPda,
      })

      await sendAndConfirm({ ix, payer: eventOrganizer })
    })

    it('Should fail when event name is too long', async () => {
      const event = {
        name: 'a'.repeat(31),
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(0.5 * LAMPORTS_PER_SOL),
        availableTickets: new BN(100),
      }

      const [eventPda] = getEventPda(event.name, eventOrganizer.publicKey)
      const ix: Instruction = getEventInstruction({
        event,
        eventOrganizer: eventOrganizer.publicKey,
        eventPda,
      })

      await expect(sendAndConfirm({ ix, payer: eventOrganizer })).rejects.toThrow(
        /Name too long/,
      )
    })

    it('Should fail when event description is too long', async () => {
      const event = {
        name: 'Valid Name',
        description: 'a'.repeat(301),
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(0.5 * LAMPORTS_PER_SOL),
        availableTickets: new BN(100),
      }

      const [eventPda] = getEventPda(event.name, eventOrganizer.publicKey)
      const ix: Instruction = getEventInstruction({
        event,
        eventOrganizer: eventOrganizer.publicKey,
        eventPda,
      })

      await expect(sendAndConfirm({ ix, payer: eventOrganizer })).rejects.toThrow(
        /Description too long/,
      )
    })

    it('Should fail when start date is in the past', async () => {
      const event = {
        name: 'Past Event',
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) - 3600),
        ticketPrice: new BN(0.5 * LAMPORTS_PER_SOL),
        availableTickets: new BN(100),
      }

      const [eventPda] = getEventPda(event.name, eventOrganizer.publicKey)
      const ix: Instruction = getEventInstruction({
        event,
        eventOrganizer: eventOrganizer.publicKey,
        eventPda,
      })

      await expect(sendAndConfirm({ ix, payer: eventOrganizer })).rejects.toThrow(
        /Start date is in the past/,
      )
    })

    it('Should fail when available tickets is zero', async () => {
      const event = {
        name: 'No Tickets Event',
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(0.5 * LAMPORTS_PER_SOL),
        availableTickets: new BN(0),
      }

      const [eventPda] = getEventPda(event.name, eventOrganizer.publicKey)
      const ix: Instruction = getEventInstruction({
        event,
        eventOrganizer: eventOrganizer.publicKey,
        eventPda,
      })

      await expect(sendAndConfirm({ ix, payer: eventOrganizer })).rejects.toThrow(
        /Available tickets is too low/,
      )
    })
  })

  describe('Buy Ticket', () => {
    let validEvent: any
    let eventPda: PublicKey

    beforeEach(async () => {
      const eventName = `Evt${Date.now().toString().slice(-8)}`
      validEvent = {
        name: eventName,
        description: 'Buyable Event',
        startDate: new BN(Math.floor(Date.now() / 1000) + 7200),
        ticketPrice: new BN(0.1 * LAMPORTS_PER_SOL),
        availableTickets: new BN(10),
      }

        ;[eventPda] = getEventPda(validEvent.name, eventOrganizer.publicKey)
      const ix: Instruction = getEventInstruction({
        event: validEvent,
        eventOrganizer: eventOrganizer.publicKey,
        eventPda,
      })

      await sendAndConfirm({ ix, payer: eventOrganizer })
    })

    it('Should allow buying a ticket successfully', async () => {
      const ticket = {
        event: eventPda,
        buyer: buyer1.publicKey,
        price: validEvent.ticketPrice,
      }

      const ix: Instruction = buyTicketInstruction({ ticket })
      await sendAndConfirm({ ix, payer: buyer1 })
    })

    it('Should fail when all tickets are sold out', async () => {
      const ticket1 = { event: eventPda, buyer: buyer1.publicKey, price: validEvent.ticketPrice }
      const ticket2 = { event: eventPda, buyer: buyer2.publicKey, price: validEvent.ticketPrice }

      await sendAndConfirm({ ix: buyTicketInstruction({ ticket: ticket1 }), payer: buyer1 })
      await sendAndConfirm({ ix: buyTicketInstruction({ ticket: ticket2 }), payer: buyer2 })

      const soldOutTicket = { event: eventPda, buyer: unauthorizedUser.publicKey, price: validEvent.ticketPrice }
      await expect(sendAndConfirm({ ix: buyTicketInstruction({ ticket: soldOutTicket }), payer: unauthorizedUser })).rejects.toThrow(
        /All tickets sold out/,
      )
    })
  })

  describe('Withdraw Funds', () => {
    it('Should fail when non-organizer tries to withdraw funds', async () => {
      const withdrawIx = withdrawInstruction({
        eventPda: eventPda!,
        eventOrganizer: unauthorizedUser.publicKey,
        amount: new BN(0.1 * LAMPORTS_PER_SOL),
      })

      await expect(sendAndConfirm({ ix: withdrawIx, payer: unauthorizedUser })).rejects.toThrow(
        /unauthorized/,
      )
    })
  })
})

// --------------------
// Helper functions
// --------------------

async function airdrop(pubkey: PublicKey, sol: number) {
  const sig = await rpc.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL).send()
  await rpc.confirmTransaction(sig).send()
}

let latestBlockhash: Awaited<ReturnType<typeof getLatestBlockhash>> | undefined
async function getLatestBlockhash(): Promise<Readonly<{ blockhash: Blockhash; lastValidBlockHeight: bigint }>> {
  if (latestBlockhash) return latestBlockhash
  return await rpc.getLatestBlockhash().send().then(({ value }) => value)
}

async function sendAndConfirm({ ix, payer }: { ix: Instruction; payer: KeyPairSigner }) {
  const tx = createTransaction({
    feePayer: payer,
    instructions: [ix],
    version: 'legacy',
    latestBlockhash: await getLatestBlockhash(),
  })

  const signedTx = await signTransactionMessageWithSigners(tx)
  return await sendAndConfirmTransaction(signedTx)
}

function getEventPda(eventName: string, organizer: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('event'), Buffer.from(eventName), organizer.toBuffer()], new PublicKey(process.env.PROGRAM_ID!))
}
