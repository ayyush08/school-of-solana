import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Ticketregistry } from '../target/types/ticketregistry'
import { LAMPORTS_PER_SOL, Connection, PublicKey } from '@solana/web3.js'
import assert from 'assert'
import BN from 'bn.js'

describe('ticketregistry', () => {
  // Anchor setup
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  // NOTE: If this throws, try `anchor.workspace.Ticketregistry` (PascalCase)
  const program = anchor.workspace.ticketregistry as Program<Ticketregistry>

  const eventOrganizer = anchor.web3.Keypair.generate()
  const buyer1 = anchor.web3.Keypair.generate()
  const buyer2 = anchor.web3.Keypair.generate()
  const unauthorizedUser = anchor.web3.Keypair.generate()

  it('Airdrop SOL to all test accounts', async () => {
    await airdrop(program.provider.connection, eventOrganizer.publicKey, 5 * LAMPORTS_PER_SOL)
    await airdrop(program.provider.connection, buyer1.publicKey, 5 * LAMPORTS_PER_SOL)
    await airdrop(program.provider.connection, buyer2.publicKey, 5 * LAMPORTS_PER_SOL)
    await airdrop(program.provider.connection, unauthorizedUser.publicKey, 5 * LAMPORTS_PER_SOL)
  })

  describe('Initialize Event', () => {
    it('Should initialize a valid event successfully', async () => {
      const event = {
        name: 'Test Event',
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) + 7200),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(2), // 0.5 SOL
        availableTickets: new BN(100),
      }

      await createEvent(program, eventOrganizer, event)
      await verifyEvent(program, event, eventOrganizer)
    })

    it('Should fail when event name is too long', async () => {
      const testEvent = {
        name: 'a'.repeat(31), // > 30
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(2),
        availableTickets: new BN(100),
      }

      try {
        await createEvent(program, eventOrganizer, testEvent)
        // If it succeeded, demonstrate the failure explicitly
        const [eventPda] = getEventPda(program, testEvent.name, eventOrganizer.publicKey)
        const eventAccount = await program.account.event.fetch(eventPda)
        assert(
          eventAccount.name.length <= 30,
          `Event name length (${eventAccount.name.length}) exceeds max (30)`
        )
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        assert(
          logs.includes('Event name is too long') || (error.message || '').includes('NameTooLong'),
          'Expected NameTooLong'
        )
      }
    })

    it('Should fail when event description is too long', async () => {
      const event = {
        name: 'Valid Name',
        description: 'a'.repeat(301), // > 300
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(2),
        availableTickets: new BN(100),
      }

      try {
        await createEvent(program, eventOrganizer, event)
        const [eventPda] = getEventPda(program, event.name, eventOrganizer.publicKey)
        const eventAccount = await program.account.event.fetch(eventPda)
        assert(
          eventAccount.description.length <= 300,
          `Event description length (${eventAccount.description.length}) exceeds max (300)`
        )
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        assert(
          logs.includes('Event description is too long') || (error.message || '').includes('DescriptionTooLong'),
          'Expected DescriptionTooLong'
        )
      }
    })

    it('Should fail when start date is in the past', async () => {
      const event = {
        name: 'Past Event',
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) - 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(2),
        availableTickets: new BN(100),
      }

      try {
        await createEvent(program, eventOrganizer, event)
        const [eventPda] = getEventPda(program, event.name, eventOrganizer.publicKey)
        const eventAccount = await program.account.event.fetch(eventPda)
        assert(
          eventAccount.startDate.toNumber() > Math.floor(Date.now() / 1000),
          'Start date should be in the future'
        )
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        assert(
          logs.includes('Start date is in the past') || (error.message || '').includes('StartDateInThePast'),
          'Expected StartDateInThePast'
        )
      }
    })

    it('Should fail when available tickets is zero', async () => {
      const event = {
        name: 'No Tickets Event',
        description: 'Test Description',
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(2),
        availableTickets: new BN(0),
      }

      try {
        await createEvent(program, eventOrganizer, event)
        const [eventPda] = getEventPda(program, event.name, eventOrganizer.publicKey)
        const eventAccount = await program.account.event.fetch(eventPda)
        assert(
          eventAccount.availableTickets.toNumber() > 0,
          'Available tickets should be > 0'
        )
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        assert(
          logs.includes('Available tickets is too low') || (error.message || '').includes('AvailableTicketsTooLow'),
          'Expected AvailableTicketsTooLow'
        )
      }
    })

    it('Should accept event with maximum allowed name and description lengths', async () => {
      const event = {
        name: 'a'.repeat(30),
        description: 'b'.repeat(300),
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(10), // 0.1 SOL
        availableTickets: new BN(1),
      }

      await createEvent(program, eventOrganizer, event)
      await verifyEvent(program, event, eventOrganizer)
    })
  })

  describe('Buy Ticket', () => {
    let validEvent: TicketRegistryEvent

    beforeEach(async () => {
      const eventName = `Evt${Date.now().toString().slice(-8)}`
      validEvent = {
        name: eventName,
        description: 'Buyable Event',
        startDate: new BN(Math.floor(Date.now() / 1000) + 7200),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(10), // 0.1 SOL
        availableTickets: new BN(10),
      }
      await createEvent(program, eventOrganizer, validEvent)
    })

    it('Should allow buying a ticket successfully', async () => {
      const initialBuyerBalance = await program.provider.connection.getBalance(buyer1.publicKey)
      const [eventPda] = getEventPda(program, validEvent.name, eventOrganizer.publicKey)
      const initialEventBalance = await program.provider.connection.getBalance(eventPda)

      const ticket = {
        event: eventPda,
        buyer: buyer1.publicKey,
        price: validEvent.ticketPrice,
      }

      await buyTicket(program, buyer1, ticket)
      await verifyTicket(program, ticket)

      const eventAccount = await program.account.event.fetch(eventPda)
      assert.equal(eventAccount.availableTickets.toString(), '9')

      const finalBuyerBalance = await program.provider.connection.getBalance(buyer1.publicKey)
      const finalEventBalance = await program.provider.connection.getBalance(eventPda)

      // Buyer should have less SOL by at least ticket price (plus fees)
      assert(finalBuyerBalance <= initialBuyerBalance - validEvent.ticketPrice.toNumber())
      assert(finalEventBalance > initialEventBalance)
    })

    it('Should allow multiple users to buy tickets', async () => {
      const [eventPda] = getEventPda(program, validEvent.name, eventOrganizer.publicKey)
      const ticket1 = { event: eventPda, buyer: buyer1.publicKey, price: validEvent.ticketPrice }
      const ticket2 = { event: eventPda, buyer: buyer2.publicKey, price: validEvent.ticketPrice }
      await buyTicket(program, buyer1, ticket1)
      await buyTicket(program, buyer2, ticket2)
      const eventAccount = await program.account.event.fetch(eventPda)
      assert.equal(eventAccount.availableTickets.toString(), '8')
    })

    it('Should fail when trying to buy ticket for event that already started', async () => {
      const now = Math.floor(Date.now() / 1000)
      const futureEventName = `Future${Date.now().toString().slice(-6)}`
      const futureEvent = {
        name: futureEventName,
        description: 'Future Event',
        startDate: new BN(now + 2), // starts in 2 seconds
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(10),
        availableTickets: new BN(10),
      }

      await createEvent(program, eventOrganizer, futureEvent)
      const [eventPda] = getEventPda(program, futureEvent.name, eventOrganizer.publicKey)

      // Wait a bit so it has started
      await new Promise((r) => setTimeout(r, 3000))

      const ticket = { event: eventPda, buyer: buyer1.publicKey, price: futureEvent.ticketPrice }
      try {
        await buyTicket(program, buyer1, ticket)
        assert(false)
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        assert(
          logs.includes('Start date is in the past') || (error.message || '').includes('StartDateInThePast'),
          'Should fail: event already started'
        )
      }
    })

    it('Should fail when all tickets are sold out', async () => {
      const limitedEventName = `Ltd${Date.now().toString().slice(-7)}`
      const limitedEvent = {
        name: limitedEventName,
        description: 'Limited Event',
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(10),
        availableTickets: new BN(1),
      }

      await createEvent(program, eventOrganizer, limitedEvent)
      const [eventPda] = getEventPda(program, limitedEvent.name, eventOrganizer.publicKey)

      const ticket1 = { event: eventPda, buyer: buyer1.publicKey, price: limitedEvent.ticketPrice }
      await buyTicket(program, buyer1, ticket1)

      const ticket2 = { event: eventPda, buyer: buyer2.publicKey, price: limitedEvent.ticketPrice }
      try {
        await buyTicket(program, buyer2, ticket2)
        assert(false)
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        assert(
          logs.includes('All tickets sold out') || (error.message || '').includes('AllTicketsSoldOut'),
          'Expected AllTicketsSoldOut'
        )
      }
    })

    it('Should fail when buyer tries to buy the same ticket twice', async () => {
      const [eventPda] = getEventPda(program, validEvent.name, eventOrganizer.publicKey)
      const ticket = { event: eventPda, buyer: buyer1.publicKey, price: validEvent.ticketPrice }
      await buyTicket(program, buyer1, ticket)

      try {
        await buyTicket(program, buyer1, ticket)
        assert(false)
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        // Anchor typically surfaces PDA collision as "already in use"
        assert(logs.includes('already in use') || (error.message || '').includes('already in use'))
      }
    })

    it('Should fail when buyer does not have enough funds to buy ticket', async () => {
      const poorBuyer = anchor.web3.Keypair.generate()
      const [eventPda] = getEventPda(program, validEvent.name, eventOrganizer.publicKey)
      const ticket = { event: eventPda, buyer: poorBuyer.publicKey, price: validEvent.ticketPrice }

      try {
        await buyTicket(program, poorBuyer, ticket)
        assert(false)
      } catch (error: any) {
        const logs = (error.logs || []).join(' ').toLowerCase()
        assert(
          logs.includes('insufficient') || (error.message || '').toLowerCase().includes('insufficient'),
          'Expected insufficient funds error'
        )
      }
    })
  })

  describe('Withdraw Funds', () => {
    let eventWithFunds: TicketRegistryEvent
    let eventPda: PublicKey

    beforeEach(async () => {
      const eventName = `Fund${Date.now().toString().slice(-8)}`
      eventWithFunds = {
        name: eventName,
        description: 'Event with funds',
        startDate: new BN(Math.floor(Date.now() / 1000) + 3600),
        ticketPrice: new BN(LAMPORTS_PER_SOL).divn(5), // 0.2 SOL
        availableTickets: new BN(10),
      }

      await createEvent(program, eventOrganizer, eventWithFunds)
      eventPda = getEventPda(program, eventWithFunds.name, eventOrganizer.publicKey)[0]

      const ticket1 = { event: eventPda, buyer: buyer1.publicKey, price: eventWithFunds.ticketPrice }
      const ticket2 = { event: eventPda, buyer: buyer2.publicKey, price: eventWithFunds.ticketPrice }
      await buyTicket(program, buyer1, ticket1)
      await buyTicket(program, buyer2, ticket2)
    })

    it('Should allow event organizer to withdraw funds', async () => {
      const initialOrganizerBalance = await program.provider.connection.getBalance(eventOrganizer.publicKey)
      const initialEventBalance = await program.provider.connection.getBalance(eventPda)

      const withdrawAmount = new BN(LAMPORTS_PER_SOL).divn(10) // 0.1 SOL

      await withdrawFunds(program, eventOrganizer, eventWithFunds, withdrawAmount)

      const finalOrganizerBalance = await program.provider.connection.getBalance(eventOrganizer.publicKey)
      const finalEventBalance = await program.provider.connection.getBalance(eventPda)

      assert(finalOrganizerBalance > initialOrganizerBalance) // + fees
      assert(finalEventBalance < initialEventBalance)
    })

    it('Should fail when non-organizer tries to withdraw funds', async () => {
      const withdrawAmount = new BN(LAMPORTS_PER_SOL).divn(10)
      const [eventPda] = getEventPda(program, eventWithFunds.name, eventOrganizer.publicKey)

      try {
        await program.methods
          .withdraw(withdrawAmount)
          .accounts({
            // EXACTLY the accounts in the IDL: eventOrganizer + event
            //@ts-ignore
            eventOrganizer: unauthorizedUser.publicKey,
            event: eventPda,
          })
          .signers([unauthorizedUser])
          .rpc()
        assert(false)
      } catch (error: any) {
        const logs = (error.logs || []).join(' ')
        // has_one constraint between event.event_organizer and provided eventOrganizer
        assert(
          logs.includes('has one constraint was violated') ||
            logs.toLowerCase().includes('constraint has_one') ||
            (error.message || '').toLowerCase().includes('has one'),
          'Expected has_one violation'
        )
      }
    })

    it('Should fail when trying to withdraw more than available balance', async () => {
      const eventBalance = await program.provider.connection.getBalance(eventPda)
      const withdrawAmount = new BN(eventBalance).add(new BN(LAMPORTS_PER_SOL)) // more than available

      try {
        await withdrawFunds(program, eventOrganizer, eventWithFunds, withdrawAmount)
        assert(false)
      } catch (error: any) {
        const txt = ((error.logs || []).join(' ') + ' ' + (error.message || '')).toLowerCase()
        assert(
          txt.includes('arithmetic') || txt.includes('insufficient') || txt.includes('overflow'),
          'Expected arithmetic/insufficient balance failure'
        )
      }
    })

    it('Should allow partial withdrawal', async () => {
      const initialEventBalance = await program.provider.connection.getBalance(eventPda)
      const withdrawAmount = new BN(LAMPORTS_PER_SOL).divn(20) // 0.05 SOL

      await withdrawFunds(program, eventOrganizer, eventWithFunds, withdrawAmount)

      const finalEventBalance = await program.provider.connection.getBalance(eventPda)
      assert(finalEventBalance < initialEventBalance)
      assert(finalEventBalance > 0)
    })
  })
})

// -----------------------------
// Types & Helpers
// -----------------------------

interface TicketRegistryEvent {
  name: string
  description: string
  startDate: BN
  ticketPrice: BN
  availableTickets: BN
}

interface Ticket {
  event: PublicKey
  buyer: PublicKey
  price: BN
}

async function airdrop(connection: Connection, address: PublicKey, amount: number) {
  const sig = await connection.requestAirdrop(address, amount)
  await connection.confirmTransaction(sig, 'confirmed')
}

// INSTRUCTIONS

async function createEvent(
  program: Program<Ticketregistry>,
  eventOrganizer: anchor.web3.Keypair,
  event: TicketRegistryEvent,
) {
  const [eventPda] = getEventPda(program, event.name, eventOrganizer.publicKey)

  await program.methods
    .initialize(event.name, event.description, event.ticketPrice, event.availableTickets, event.startDate)
    .accounts({
      eventOrganizer: eventOrganizer.publicKey,
      //@ts-ignore
      event: eventPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([eventOrganizer])
    .rpc()
}

async function buyTicket(program: Program<Ticketregistry>, buyer: anchor.web3.Keypair, ticket: Ticket) {
  const [ticketPda] = getTicketPda(program, ticket.event, ticket.buyer)

  await program.methods
    .buy()
    .accounts({
      buyer: ticket.buyer,
      //@ts-ignore
      ticket: ticketPda,
      event: ticket.event,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([buyer])
    .rpc()
}

async function withdrawFunds(
  program: Program<Ticketregistry>,
  eventOrganizer: anchor.web3.Keypair,
  event: TicketRegistryEvent,
  amount: BN,
) {
  const [eventPda] = getEventPda(program, event.name, eventOrganizer.publicKey)

  await program.methods
    .withdraw(amount)
    .accounts({
      // EXACT accounts per IDL: no systemProgram here
      //@ts-ignore
      eventOrganizer: eventOrganizer.publicKey,
      event: eventPda,
    })
    .signers([eventOrganizer])
    .rpc()
}

// VERIFY

async function verifyTicket(program: Program<Ticketregistry>, ticket: Ticket) {
  const [ticketPda] = getTicketPda(program, ticket.event, ticket.buyer)
  const ticketAccount = await program.account.ticket.fetch(ticketPda)

  assert.equal(ticketAccount.event.toString(), ticket.event.toString())
  assert.equal(ticketAccount.buyer.toString(), ticket.buyer.toString())
  assert.equal(ticketAccount.price.toString(), ticket.price.toString())
}

async function verifyEvent(
  program: Program<Ticketregistry>,
  event: TicketRegistryEvent,
  eventOrganizer: anchor.web3.Keypair,
) {
  const [eventPda] = getEventPda(program, event.name, eventOrganizer.publicKey)
  const eventAccount = await program.account.event.fetch(eventPda)

  assert.equal(eventAccount.name, event.name)
  assert.equal(eventAccount.description, event.description)
  assert.equal(eventAccount.startDate.toString(), event.startDate.toString())
  assert.equal(eventAccount.ticketPrice.toString(), event.ticketPrice.toString())
  assert.equal(eventAccount.availableTickets.toString(), event.availableTickets.toString())
  assert.equal(eventAccount.eventOrganizer.toString(), eventOrganizer.publicKey.toString())
}

// PDAs (match your IDL seed order)

function getEventPda(
  program: Program<Ticketregistry>,
  eventName: string,
  eventOrganizer: PublicKey,
): [PublicKey, number] {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('event'), Buffer.from(eventName), eventOrganizer.toBuffer()],
    program.programId,
  )
}

function getTicketPda(program: Program<Ticketregistry>, eventPda: PublicKey, buyer: PublicKey): [PublicKey, number] {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('ticket'), eventPda.toBuffer(), buyer.toBuffer()],
    program.programId,
  )
}
