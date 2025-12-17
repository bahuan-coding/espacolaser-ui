import { 
  PrismaClient, 
  InstallmentStatus, 
  InstallmentOrigin, 
  DisbursementStatus, 
  ReconciliationStatus, 
  LedgerEntryType, 
  DrawdownReason, 
  ContractEligibilityStatus, 
  TokenizationStatus, 
  CardChargeStatus, 
  PlCardIssuanceStatus,
  PaymentEventType,
  PaymentMethod,
  ReturnFileStatus,
  PaymentMatchStatus
} from '../src/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL
if (!connectionString) {
  throw new Error('Missing NETLIFY_DATABASE_URL or NETLIFY_DATABASE_URL_UNPOOLED environment variable')
}
const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

// Helpers
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Valid CPF generator with check digits
const generateCPF = () => {
  const n = Array.from({ length: 9 }, () => randomInt(0, 9))
  const d1 = (11 - (n.reduce((sum, v, i) => sum + v * (10 - i), 0) % 11)) % 11
  n.push(d1 > 9 ? 0 : d1)
  const d2 = (11 - (n.reduce((sum, v, i) => sum + v * (11 - i), 0) % 11)) % 11
  n.push(d2 > 9 ? 0 : d2)
  return `${n.slice(0, 3).join('')}.${n.slice(3, 6).join('')}.${n.slice(6, 9).join('')}-${n.slice(9).join('')}`
}

// Valid CNPJ generator with check digits
const generateCNPJ = () => {
  const n = Array.from({ length: 8 }, () => randomInt(0, 9))
  n.push(0, 0, 0, 1) // Branch 0001
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = (11 - (n.reduce((sum, v, i) => sum + v * weights1[i], 0) % 11)) % 11
  n.push(d1 > 9 ? 0 : d1)
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d2 = (11 - (n.reduce((sum, v, i) => sum + v * weights2[i], 0) % 11)) % 11
  n.push(d2 > 9 ? 0 : d2)
  return `${n.slice(0, 2).join('')}.${n.slice(2, 5).join('')}.${n.slice(5, 8).join('')}/${n.slice(8, 12).join('')}-${n.slice(12).join('')}`
}

const generateToken = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`
const generateBarcode = () => `23793.${randomInt(10000, 99999)} ${randomInt(10000, 99999)}.${randomInt(100000, 999999)} ${randomInt(10000, 99999)}.${randomInt(100000, 999999)} ${randomInt(1, 9)} ${randomInt(10000000, 99999999)}`
const generatePixKey = () => `${Math.random().toString(36).substring(2, 34)}`

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
const addMonths = (date: Date, months: number) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}
const formatDate = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '')

// Test case types
type TestCase = 'happy_path' | 'late_60d' | 'defaulted' | 'escrow_drawdown' | 'tokenization_failed'

// Realistic merchant names with locations
const merchantNames = [
  'Espaço Laser - Shopping Ibirapuera',
  'Espaço Laser - Shopping Morumbi', 
  'Espaço Laser - Shopping Eldorado'
]

// Realistic service packages with prices
const servicePackages = [
  { name: 'Depilação Corpo Inteiro Feminino', minValue: 350000, maxValue: 480000 },
  { name: 'Depilação Corpo Inteiro Masculino', minValue: 420000, maxValue: 550000 },
  { name: 'Pacote Virilha Completa + Axilas', minValue: 150000, maxValue: 220000 },
  { name: 'Depilação Pernas Completas', minValue: 180000, maxValue: 280000 },
  { name: 'Pacote Facial Premium', minValue: 120000, maxValue: 180000 },
  { name: 'Tratamento Rejuvenescimento Facial', minValue: 280000, maxValue: 400000 },
  { name: 'Harmonização Facial Completa', minValue: 450000, maxValue: 650000 },
  { name: 'Pacote Noiva Premium', minValue: 550000, maxValue: 800000 },
  { name: 'Depilação Masculina Costas + Peito', minValue: 200000, maxValue: 320000 },
  { name: 'Pacote Áreas Pequenas 5 Sessões', minValue: 80000, maxValue: 120000 },
]

const customerNames = [
  'Ana Carolina Silva', 'Bruno Henrique Costa', 'Carla Fernanda Oliveira', 'Daniel Augusto Santos', 
  'Elena Cristina Ferreira', 'Fernando José Lima', 'Gabriela Maria Souza', 'Hugo Leonardo Pereira', 
  'Isabela Regina Almeida', 'João Paulo Rodrigues', 'Karina Beatriz Martins', 'Lucas Eduardo Barbosa', 
  'Mariana Luiza Gomes', 'Nicolas Gabriel Ribeiro', 'Olivia Helena Carvalho', 'Pedro Henrique Nascimento', 
  'Rafaela Cristina Araújo', 'Rafael Augusto Mendes', 'Sofia Valentina Castro', 'Thiago Roberto Rocha',
  'Ursula Fernanda Monteiro', 'Victor Hugo Cardoso', 'Vitória Maria Teixeira', 'William Eduardo Correia', 
  'Yasmin Carolina Dias', 'Zélia Maria Moreira', 'Amanda Beatriz Lopes', 'Bernardo Felipe Freitas', 
  'Cecilia Valentina Nunes', 'Diego Fernando Pinto'
]

async function main() {
  console.log('🌱 Starting comprehensive demo seed...')

  // Clean existing data in correct order
  await prisma.$transaction([
    prisma.paymentEvent.deleteMany(),
    prisma.returnFile.deleteMany(),
    prisma.domainEvent.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.tokenizedCardCharge.deleteMany(),
    prisma.fundQuotaContribution.deleteMany(),
    prisma.escrowDrawdown.deleteMany(),
    prisma.fundRepayment.deleteMany(),
    prisma.disbursementSplit.deleteMany(),
    prisma.fundDisbursement.deleteMany(),
    prisma.reconciliationItem.deleteMany(),
    prisma.reconciliationFile.deleteMany(),
    prisma.gatewayTransaction.deleteMany(),
    prisma.gatewaySettlement.deleteMany(),
    prisma.contractInstallment.deleteMany(),
    prisma.privateLabelCard.deleteMany(),
    prisma.serviceContract.deleteMany(),
    prisma.tokenizedCard.deleteMany(),
    prisma.endCustomer.deleteMany(),
    prisma.escrowLedgerEntry.deleteMany(),
    prisma.escrowAccount.deleteMany(),
    prisma.fund.deleteMany(),
    prisma.merchantUser.deleteMany(),
    prisma.merchant.deleteMany(),
  ])

  const today = new Date()

  // ============================================================================
  // 1. CREATE FUNDS (FIDCs)
  // ============================================================================
  console.log('Creating FIDCs...')
  
  const funds = await Promise.all([
    prisma.fund.create({
      data: {
        name: 'FIDC Espaço Laser I',
        document: '45.678.901/0001-23',
        adminName: 'Omni Banco S.A.',
        managerName: 'A55 Capital',
        bankCode: '341',
        bankAgency: '0001',
        bankAccount: '12345',
        bankAccountDigit: '6',
      }
    }),
    prisma.fund.create({
      data: {
        name: 'FIDC Espaço Laser II',
        document: '56.789.012/0001-34',
        adminName: 'BTG Pactual',
        managerName: 'A55 Capital',
        bankCode: '208',
        bankAgency: '0001',
        bankAccount: '67890',
        bankAccountDigit: '1',
      }
    })
  ])
  const primaryFund = funds[0]
  console.log(`✓ Created ${funds.length} FIDCs`)

  // ============================================================================
  // 2. CREATE MERCHANTS (Lojistas) WITH USERS
  // ============================================================================
  console.log('Creating merchants...')

  const merchantAddresses = [
    { address: 'Av. Ibirapuera, 3103', city: 'São Paulo', state: 'SP', zipCode: '04029-902' },
    { address: 'Av. Roque Petroni Júnior, 1089', city: 'São Paulo', state: 'SP', zipCode: '04707-900' },
    { address: 'Av. Rebouças, 3970', city: 'São Paulo', state: 'SP', zipCode: '05402-918' }
  ]

  const merchants = await Promise.all(
    merchantNames.map((name, i) =>
      prisma.merchant.create({
        data: {
          name,
          document: generateCNPJ(),
          email: `contato@espacolaser${['ibirapuera', 'morumbi', 'eldorado'][i]}.com.br`,
          phone: `(11) 3${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
          ...merchantAddresses[i],
          users: {
            create: [
              { name: `Gerente ${name.split(' - ')[1]}`, email: `gerente.${['ibirapuera', 'morumbi', 'eldorado'][i]}@espacolaser.com.br`, role: 'admin' },
              { name: `Atendente ${name.split(' - ')[1]}`, email: `atendente.${['ibirapuera', 'morumbi', 'eldorado'][i]}@espacolaser.com.br`, role: 'operator' },
              { name: `Financeiro ${name.split(' - ')[1]}`, email: `financeiro.${['ibirapuera', 'morumbi', 'eldorado'][i]}@espacolaser.com.br`, role: 'viewer' }
            ]
          }
        }
      })
    )
  )
  console.log(`✓ Created ${merchants.length} merchants with users`)

  // ============================================================================
  // 3. CREATE ESCROW ACCOUNTS
  // ============================================================================
  console.log('Creating escrow accounts...')

  const escrowAccounts: Awaited<ReturnType<typeof prisma.escrowAccount.create>>[] = []
  for (const merchant of merchants) {
    const escrow = await prisma.escrowAccount.create({
      data: { merchantId: merchant.id, fundId: primaryFund.id, balanceCents: BigInt(0) }
    })
    escrowAccounts.push(escrow)
  }
  console.log(`✓ Created ${escrowAccounts.length} escrow accounts`)

  // ============================================================================
  // 4. CREATE END CUSTOMERS (Clientes Finais)
  // ============================================================================
  console.log('Creating end customers...')

  const endCustomers = await Promise.all(
    customerNames.map((name) =>
      prisma.endCustomer.create({
        data: {
          name,
          document: generateCPF(),
          email: `${name.toLowerCase().split(' ').slice(0, 2).join('.')}@gmail.com`,
          phone: `(11) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
          birthDate: new Date(randomInt(1970, 2000), randomInt(0, 11), randomInt(1, 28)),
        }
      })
    )
  )
  console.log(`✓ Created ${endCustomers.length} end customers`)

  // ============================================================================
  // 5. CREATE GATEWAY SETTLEMENTS (for grouping transactions)
  // ============================================================================
  console.log('Creating gateway settlements...')
  
  const settlementDates = [
    addDays(today, -7),
    addDays(today, -14),
    addDays(today, -21),
    addDays(today, -28),
    addDays(today, -35),
  ]
  
  const settlements = await Promise.all(
    settlementDates.map((date, i) =>
      prisma.gatewaySettlement.create({
        data: {
          settlementDate: date,
          totalAmountCents: BigInt(0), // Will be updated later
          transactionCount: 0, // Will be updated later
          status: 'processed',
          processedAt: addDays(date, 1),
        }
      })
    )
  )
  console.log(`✓ Created ${settlements.length} gateway settlements`)

  // ============================================================================
  // 6. CREATE CONTRACTS WITH FULL FLOW (5 TEST CASES)
  // ============================================================================
  console.log('Creating contracts with all test case scenarios...')

  const escrowBalances: Map<string, bigint> = new Map()
  escrowAccounts.forEach(ea => escrowBalances.set(ea.id, BigInt(0)))

  // Track settlements for updating
  const settlementTotals: Map<string, { amount: bigint, count: number }> = new Map()
  settlements.forEach(s => settlementTotals.set(s.id, { amount: BigInt(0), count: 0 }))

  // Collect all paid installments for payment events
  const paidInstallmentsForEvents: Array<{
    installment: any,
    contract: any,
    customer: any,
    testCase: TestCase
  }> = []

  let contractCount = 0
  let happyPathCount = 0
  let late60dCount = 0
  let defaultedCount = 0
  let escrowDrawdownCount = 0
  let tokenizationFailedCount = 0

  // Distribution: 36 happy, 12 late, 6 defaulted, 4 escrow_drawdown, 2 tokenization_failed
  const testCaseDistribution: TestCase[] = [
    ...Array(36).fill('happy_path'),
    ...Array(12).fill('late_60d'),
    ...Array(6).fill('defaulted'),
    ...Array(4).fill('escrow_drawdown'),
    ...Array(2).fill('tokenization_failed'),
  ]

  for (let m = 0; m < merchants.length; m++) {
    const merchant = merchants[m]
    const escrowAccount = escrowAccounts[m]

    for (let c = 0; c < 20; c++) {
      contractCount++
      const customer = endCustomers[(m * 20 + c) % endCustomers.length]
      const testCase = testCaseDistribution[contractCount - 1] || 'happy_path'
      
      const servicePackage = randomElement(servicePackages)
      const numInstallments = randomInt(6, 12)
      const totalValue = randomInt(servicePackage.minValue, servicePackage.maxValue)
      const installmentValue = Math.floor(totalValue / numInstallments)
      
      // Escrow drawdown cases need older contracts so later installments are past due
      const daysAgo = testCase === 'escrow_drawdown' ? randomInt(240, 300) : randomInt(60, 120)
      const startDate = addDays(today, -daysAgo)

      // Track counts
      if (testCase === 'happy_path') happyPathCount++
      else if (testCase === 'late_60d') late60dCount++
      else if (testCase === 'defaulted') defaultedCount++
      else if (testCase === 'escrow_drawdown') escrowDrawdownCount++
      else if (testCase === 'tokenization_failed') tokenizationFailedCount++

      // ========================================
      // Create tokenized fallback card
      // ========================================
      const tokenizationFailed = testCase === 'tokenization_failed'
      const tokenizedCard = await prisma.tokenizedCard.create({
        data: {
          endCustomerId: customer.id,
          cardToken: generateToken('tok'),
          lastFourDigits: String(randomInt(1000, 9999)),
          brand: randomElement(['visa', 'mastercard', 'elo']),
          expirationMonth: randomInt(1, 12),
          expirationYear: randomInt(2026, 2030),
          tokenizationStatus: tokenizationFailed ? TokenizationStatus.failed : TokenizationStatus.success,
          tokenizedAt: tokenizationFailed ? null : addDays(startDate, 1),
          failureReason: tokenizationFailed ? 'Cartão recusado pelo emissor' : null,
        }
      })

      // Domain event for tokenization
      await prisma.domainEvent.create({
        data: {
          eventType: tokenizationFailed ? 'gateway.card.tokenization_failed' : 'gateway.card.tokenized',
          source: 'gateway',
          target: 'a55',
          payload: { cardId: tokenizedCard.id, customerId: customer.id },
          status: 'delivered',
          deliveredAt: addDays(startDate, 1),
        }
      })

      // ========================================
      // Determine eligibility status
      // ========================================
      let eligibilityStatus: ContractEligibilityStatus
      let firstInstallmentPaidAt: Date | null = null
      let secondInstallmentPaidAt: Date | null = null

      if (tokenizationFailed) {
        eligibilityStatus = ContractEligibilityStatus.ineligible
      } else if (testCase === 'defaulted') {
        eligibilityStatus = ContractEligibilityStatus.ineligible
        firstInstallmentPaidAt = addDays(startDate, 3)
      } else if (testCase === 'late_60d') {
        eligibilityStatus = ContractEligibilityStatus.eligible_late
        firstInstallmentPaidAt = addDays(startDate, 3)
        secondInstallmentPaidAt = addDays(addMonths(startDate, 1), randomInt(10, 55))
      } else {
        // happy_path or escrow_drawdown
        eligibilityStatus = ContractEligibilityStatus.disbursed
        firstInstallmentPaidAt = addDays(startDate, 3)
        secondInstallmentPaidAt = addDays(addMonths(startDate, 1), randomInt(-2, 5))
      }

      // ========================================
      // Create service contract
      // ========================================
      const contract = await prisma.serviceContract.create({
        data: {
          merchantId: merchant.id,
          endCustomerId: customer.id,
          contractNumber: `CTR-${String(contractCount).padStart(6, '0')}`,
          description: `${servicePackage.name} - ${numInstallments}x de R$ ${(installmentValue / 100).toFixed(2)}`,
          totalAmountCents: BigInt(totalValue),
          numberOfInstallments: numInstallments,
          startDate,
          endDate: addMonths(startDate, numInstallments),
          eligibilityStatus,
          firstInstallmentPaidAt,
          secondInstallmentPaidAt,
          tokenizedCardId: tokenizedCard.id,
          isEligibleForFunding: !tokenizationFailed && testCase !== 'defaulted',
        }
      })

      // ========================================
      // Create PL Card (issued by BIZ)
      // ========================================
      const plCardFailed = tokenizationFailed
      const plCard = await prisma.privateLabelCard.create({
        data: {
          endCustomerId: customer.id,
          contractId: contract.id,
          bizCardId: plCardFailed ? null : `BIZ-${contract.contractNumber}`,
          cardToken: generateToken('pl'),
          lastFourDigits: String(randomInt(1000, 9999)),
          expirationMonth: randomInt(1, 12),
          expirationYear: randomInt(2026, 2030),
          creditLimitCents: BigInt(totalValue - installmentValue),
          issuanceStatus: plCardFailed ? PlCardIssuanceStatus.failed : PlCardIssuanceStatus.issued,
          issuedAt: plCardFailed ? null : addDays(startDate, 2),
          failureReason: plCardFailed ? 'Falha na tokenização, cartão PL não emitido' : null,
        }
      })

      // Domain event for PL card issuance
      await prisma.domainEvent.create({
        data: {
          eventType: plCardFailed ? 'biz.pl_card.issuance_failed' : 'biz.pl_card.issued',
          source: 'biz',
          target: 'a55',
          payload: { cardId: plCard.id, contractId: contract.id },
          status: 'delivered',
          deliveredAt: addDays(startDate, 2),
        }
      })

      // ========================================
      // Create installments
      // ========================================
      const installments: any[] = []
      for (let i = 1; i <= numInstallments; i++) {
        const dueDate = addMonths(startDate, i)
        const isPast = dueDate < today
        const isFirst = i === 1
        const isSecond = i === 2
        
        let status: InstallmentStatus = InstallmentStatus.scheduled
        let paidAt: Date | null = null
        let paidAmountCents: bigint | null = null
        let daysOverdue = 0
        let contributesToSubQuota = false

        // First installment (acquirer) - always paid for non-tokenization-failed
        if (isFirst && !tokenizationFailed) {
          status = InstallmentStatus.paid
          paidAt = firstInstallmentPaidAt
          paidAmountCents = BigInt(installmentValue)
          contributesToSubQuota = true
        }
        // Second installment (1st PL invoice) - depends on test case
        else if (isSecond && isPast && !tokenizationFailed) {
          if (testCase === 'defaulted') {
            status = InstallmentStatus.defaulted
            daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
          } else if (testCase === 'late_60d') {
            status = InstallmentStatus.paid
            paidAt = secondInstallmentPaidAt
            paidAmountCents = BigInt(installmentValue)
            daysOverdue = Math.floor((paidAt!.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
            contributesToSubQuota = true
          } else {
            status = InstallmentStatus.paid
            paidAt = secondInstallmentPaidAt
            paidAmountCents = BigInt(installmentValue)
          }
        }
        // Remaining installments
        else if (isPast && !tokenizationFailed && testCase !== 'defaulted') {
          if (testCase === 'escrow_drawdown' && i > numInstallments / 2) {
            status = i > numInstallments * 0.7 ? InstallmentStatus.defaulted : InstallmentStatus.late
            daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))
          } else if (testCase === 'happy_path' || testCase === 'late_60d' || testCase === 'escrow_drawdown') {
            status = InstallmentStatus.paid
            paidAt = addDays(dueDate, randomInt(-3, 5))
            paidAmountCents = BigInt(installmentValue)
          }
        }

        const installment = await prisma.contractInstallment.create({
          data: {
            contractId: contract.id,
            installmentNumber: i,
            amountCents: BigInt(installmentValue),
            dueDate,
            paidAt,
            paidAmountCents,
            daysOverdue,
            status,
            origin: isFirst ? InstallmentOrigin.external_capture : InstallmentOrigin.private_label,
            contributesToSubQuota,
          }
        })
        installments.push(installment)

        // Collect for payment events
        if (status === InstallmentStatus.paid && paidAt) {
          paidInstallmentsForEvents.push({ installment, contract, customer, testCase })
        }

        // Create Sub quota contribution for eligible installments
        if (contributesToSubQuota && paidAt) {
          await prisma.fundQuotaContribution.create({
            data: {
              fundId: primaryFund.id,
              installmentId: installment.id,
              amountCents: BigInt(installmentValue),
              quotaType: 'sub',
              reason: isFirst ? 'first_installment' : 'late_second_installment',
              contributedAt: paidAt,
            }
          })
        }
      }

      // ========================================
      // Create gateway transaction for 1st installment
      // ========================================
      if (!tokenizationFailed && firstInstallmentPaidAt) {
        // Find appropriate settlement
        const settlement = settlements.find(s => 
          s.settlementDate <= firstInstallmentPaidAt! && 
          addDays(s.settlementDate, 7) > firstInstallmentPaidAt!
        ) || settlements[0]

        await prisma.gatewayTransaction.create({
          data: {
            merchantId: merchant.id,
            contractId: contract.id,
            settlementId: settlement.id,
            gatewayTransactionId: `GW-${contract.contractNumber}-1`,
            amountCents: BigInt(installmentValue),
            status: 'settled',
            authorizationCode: `AUTH${randomInt(100000, 999999)}`,
            paymentLink: `https://pay.a55.tech/${contract.contractNumber}`,
            processedAt: firstInstallmentPaidAt,
          }
        })

        // Update settlement totals
        const current = settlementTotals.get(settlement.id)!
        settlementTotals.set(settlement.id, {
          amount: current.amount + BigInt(installmentValue),
          count: current.count + 1
        })
      }

      // ========================================
      // Create disbursement with 70/30 split
      // ========================================
      if (eligibilityStatus === ContractEligibilityStatus.disbursed || 
          eligibilityStatus === ContractEligibilityStatus.eligible_late) {
        const remainingValue = totalValue - installmentValue
        const merchantAmount = BigInt(Math.floor(remainingValue * 0.7))
        const escrowAmount = BigInt(remainingValue) - merchantAmount

        const disbursement = await prisma.fundDisbursement.create({
          data: {
            fundId: primaryFund.id,
            contractId: contract.id,
            totalAmountCents: BigInt(remainingValue),
            merchantAmountCents: merchantAmount,
            escrowAmountCents: escrowAmount,
            status: DisbursementStatus.posted,
            disbursedAt: secondInstallmentPaidAt ? addDays(secondInstallmentPaidAt, 1) : addDays(startDate, 35),
            splits: {
              create: [
                { recipientType: 'merchant', amountCents: merchantAmount, percentage: 70.00 },
                { recipientType: 'escrow', amountCents: escrowAmount, percentage: 30.00 }
              ]
            }
          }
        })

        // Credit escrow ledger
        const currentBalance = escrowBalances.get(escrowAccount.id) || BigInt(0)
        const newBalance = currentBalance + escrowAmount
        escrowBalances.set(escrowAccount.id, newBalance)

        await prisma.escrowLedgerEntry.create({
          data: {
            escrowAccountId: escrowAccount.id,
            entryType: LedgerEntryType.credit,
            amountCents: escrowAmount,
            balanceAfterCents: newBalance,
            description: `Crédito split 30% - ${contract.contractNumber}`,
            referenceType: 'disbursement_split',
            referenceId: disbursement.id,
          }
        })

        await prisma.domainEvent.create({
          data: {
            eventType: 'a55.disbursement.posted',
            source: 'a55',
            target: 'fidc',
            payload: { disbursementId: disbursement.id, contractId: contract.id, amount: remainingValue },
            status: 'delivered',
            deliveredAt: disbursement.disbursedAt,
          }
        })
      }

      // ========================================
      // Create fund repayments
      // ========================================
      for (const inst of installments) {
        if (inst.status === InstallmentStatus.paid && inst.paidAt && inst.installmentNumber > 1) {
          await prisma.fundRepayment.create({
            data: {
              fundId: primaryFund.id,
              installmentId: inst.id,
              amountCents: inst.paidAmountCents || inst.amountCents,
              repaidAt: inst.paidAt,
              source: 'installment_payment',
            }
          })
        }
      }

      // ========================================
      // Create escrow drawdowns (for escrow_drawdown test case)
      // ========================================
      if (testCase === 'escrow_drawdown') {
        for (const inst of installments) {
          if (inst.status === InstallmentStatus.defaulted || inst.status === InstallmentStatus.late) {
            const drawdownAmount = inst.amountCents
            const currentBalance = escrowBalances.get(escrowAccount.id) || BigInt(0)
            
            if (currentBalance >= drawdownAmount) {
              const newBalance = currentBalance - drawdownAmount
              escrowBalances.set(escrowAccount.id, newBalance)

              const drawdown = await prisma.escrowDrawdown.create({
                data: {
                  escrowAccountId: escrowAccount.id,
                  amountCents: drawdownAmount,
                  reason: inst.status === InstallmentStatus.defaulted ? DrawdownReason.default_coverage : DrawdownReason.late_payment,
                  referenceType: 'installment',
                  referenceId: inst.id,
                  description: `Cobertura ${inst.status === InstallmentStatus.defaulted ? 'inadimplência' : 'atraso'} - Parcela ${inst.installmentNumber}`,
                  executedAt: addDays(inst.dueDate, inst.daysOverdue > 60 ? 61 : 31),
                }
              })

              await prisma.escrowLedgerEntry.create({
                data: {
                  escrowAccountId: escrowAccount.id,
                  entryType: LedgerEntryType.debit,
                  amountCents: drawdownAmount,
                  balanceAfterCents: newBalance,
                  description: `Débito drawdown - Parcela ${inst.installmentNumber}`,
                  referenceType: 'drawdown',
                  referenceId: drawdown.id,
                }
              })

              await prisma.domainEvent.create({
                data: {
                  eventType: 'a55.escrow.drawdown',
                  source: 'a55',
                  target: 'fidc',
                  payload: { drawdownId: drawdown.id, installmentId: inst.id, amount: Number(drawdownAmount) },
                  status: 'delivered',
                  deliveredAt: drawdown.executedAt,
                }
              })
            }
          }
        }
      }

      // ========================================
      // Create tokenized card charge attempts (for defaulted)
      // ========================================
      if (testCase === 'defaulted' && !tokenizationFailed) {
        const defaultedInstallment = installments.find((i: any) => i.status === InstallmentStatus.defaulted)
        if (defaultedInstallment) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            await prisma.tokenizedCardCharge.create({
              data: {
                tokenizedCardId: tokenizedCard.id,
                installmentId: defaultedInstallment.id,
                amountCents: defaultedInstallment.amountCents,
                status: CardChargeStatus.failed,
                attemptNumber: attempt,
                gatewayReference: `CHG-${contract.contractNumber}-${attempt}`,
                failureReason: randomElement(['Saldo insuficiente', 'Cartão expirado', 'Transação recusada pelo emissor']),
                attemptedAt: addDays(defaultedInstallment.dueDate, 5 + (attempt * 7)),
                processedAt: addDays(defaultedInstallment.dueDate, 5 + (attempt * 7)),
              }
            })

            await prisma.domainEvent.create({
              data: {
                eventType: 'a55.fallback_charge.failed',
                source: 'a55',
                target: 'biz',
                payload: { contractId: contract.id, attempt, reason: 'Cartão recusado' },
                status: 'delivered',
                deliveredAt: addDays(defaultedInstallment.dueDate, 5 + (attempt * 7)),
              }
            })
          }
        }
      }
    }
  }

  console.log(`✓ Created ${contractCount} contracts`)
  console.log(`  - Happy path: ${happyPathCount}`)
  console.log(`  - Late <=60d: ${late60dCount}`)
  console.log(`  - Defaulted: ${defaultedCount}`)
  console.log(`  - Escrow drawdown: ${escrowDrawdownCount}`)
  console.log(`  - Tokenization failed: ${tokenizationFailedCount}`)

  // ============================================================================
  // 7. UPDATE GATEWAY SETTLEMENTS
  // ============================================================================
  console.log('Updating gateway settlements...')
  for (const [settlementId, totals] of settlementTotals) {
    await prisma.gatewaySettlement.update({
      where: { id: settlementId },
      data: { totalAmountCents: totals.amount, transactionCount: totals.count }
    })
  }

  // ============================================================================
  // 8. UPDATE ESCROW BALANCES
  // ============================================================================
  console.log('Updating escrow account balances...')
  for (const [escrowAccountId, balance] of escrowBalances) {
    await prisma.escrowAccount.update({
      where: { id: escrowAccountId },
      data: { balanceCents: balance }
    })
  }

  // ============================================================================
  // 9. CREATE RETURN FILES & PAYMENT EVENTS
  // ============================================================================
  console.log('Creating return files and payment events...')

  // Create 3 return files (gateway, biz, bank)
  const returnFiles = await Promise.all([
    prisma.returnFile.create({
      data: {
        fileName: `GATEWAY_RET_${formatDate(addDays(today, -7))}.csv`,
        fileType: 'gateway',
        fileHash: `sha256:${Math.random().toString(36).substring(2, 66)}`,
        fileSize: randomInt(10000, 50000),
        uploadedBy: 'sistema@a55.tech',
        status: ReturnFileStatus.processed,
        totalRecords: 0,
        matchedRecords: 0,
        unmatchedRecords: 0,
        processedAt: addDays(today, -6),
      }
    }),
    prisma.returnFile.create({
      data: {
        fileName: `BIZ_FATURAS_${formatDate(addDays(today, -5))}.csv`,
        fileType: 'biz',
        fileHash: `sha256:${Math.random().toString(36).substring(2, 66)}`,
        fileSize: randomInt(20000, 80000),
        uploadedBy: 'integracao@biz.com.br',
        status: ReturnFileStatus.processed,
        totalRecords: 0,
        matchedRecords: 0,
        unmatchedRecords: 0,
        processedAt: addDays(today, -4),
      }
    }),
    prisma.returnFile.create({
      data: {
        fileName: `BANCO_BOLETOS_${formatDate(addDays(today, -3))}.ret`,
        fileType: 'bank',
        fileHash: `sha256:${Math.random().toString(36).substring(2, 66)}`,
        fileSize: randomInt(5000, 20000),
        uploadedBy: 'cnab@itau.com.br',
        status: ReturnFileStatus.processed,
        totalRecords: 0,
        matchedRecords: 0,
        unmatchedRecords: 0,
        processedAt: addDays(today, -2),
      }
    })
  ])

  // Payment method distribution for demo
  const paymentMethodDistribution: PaymentMethod[] = [
    ...Array(40).fill(PaymentMethod.boleto),
    ...Array(25).fill(PaymentMethod.pix),
    ...Array(20).fill(PaymentMethod.credit_card),
    ...Array(10).fill(PaymentMethod.debit_card),
    ...Array(5).fill(PaymentMethod.bank_transfer),
  ]

  // Create payment events for paid installments
  const fileRecordCounts = { gateway: 0, biz: 0, bank: 0 }
  const fileMatchedCounts = { gateway: 0, biz: 0, bank: 0 }
  
  for (let idx = 0; idx < paidInstallmentsForEvents.length; idx++) {
    const { installment, contract, customer, testCase } = paidInstallmentsForEvents[idx]
    
    // Determine payment method and event type
    const paymentMethod = paymentMethodDistribution[idx % paymentMethodDistribution.length]
    let eventType: PaymentEventType = PaymentEventType.full_payment
    let paidAmountCents = installment.amountCents
    
    // Add variety to payment events
    if (testCase === 'late_60d' && installment.installmentNumber === 2) {
      eventType = PaymentEventType.late_payment
    } else if (idx % 25 === 0) {
      // Some partial payments
      eventType = PaymentEventType.partial_payment
      paidAmountCents = BigInt(Math.floor(Number(installment.amountCents) * 0.8))
    } else if (idx % 30 === 0) {
      // Some overpayments
      eventType = PaymentEventType.overpayment
      paidAmountCents = BigInt(Math.floor(Number(installment.amountCents) * 1.05))
    }

    // Assign to appropriate return file
    let returnFile: typeof returnFiles[0]
    let fileKey: 'gateway' | 'biz' | 'bank'
    
    if (installment.installmentNumber === 1) {
      returnFile = returnFiles[0] // Gateway file for 1st installment
      fileKey = 'gateway'
    } else if (paymentMethod === PaymentMethod.boleto) {
      returnFile = returnFiles[2] // Bank file for boletos
      fileKey = 'bank'
    } else {
      returnFile = returnFiles[1] // BIZ file for PL payments
      fileKey = 'biz'
    }
    
    fileRecordCounts[fileKey]++

    // Calculate fees
    const feesCents = BigInt(Math.floor(Number(paidAmountCents) * 0.02))
    const netAmountCents = paidAmountCents - feesCents

    // Determine match status
    const isAutoMatched = Math.random() > 0.1 // 90% auto-matched
    const matchStatus = isAutoMatched ? PaymentMatchStatus.auto_matched : PaymentMatchStatus.manual_matched
    if (isAutoMatched) fileMatchedCounts[fileKey]++

    await prisma.paymentEvent.create({
      data: {
        installmentId: installment.id,
        returnFileId: returnFile.id,
        externalReference: `${paymentMethod.toUpperCase()}-${contract.contractNumber}-${installment.installmentNumber}`,
        customerDocument: customer.document,
        customerName: customer.name,
        barcode: paymentMethod === PaymentMethod.boleto ? generateBarcode() : null,
        pixKey: paymentMethod === PaymentMethod.pix ? generatePixKey() : null,
        expectedAmountCents: installment.amountCents,
        paidAmountCents: paidAmountCents,
        feesCents: feesCents,
        netAmountCents: netAmountCents,
        eventType: eventType,
        paymentMethod: paymentMethod,
        matchStatus: matchStatus,
        matchedBy: isAutoMatched ? 'auto' : 'admin@a55.tech',
        matchedAt: isAutoMatched ? installment.paidAt : addDays(installment.paidAt, 1),
        matchConfidence: isAutoMatched ? randomInt(85, 100) / 100 : null,
        paymentDate: installment.paidAt,
        settlementDate: addDays(installment.paidAt, paymentMethod === PaymentMethod.pix ? 0 : 2),
        processedAt: addDays(installment.paidAt, 1),
        observations: eventType === PaymentEventType.late_payment 
          ? `Pagamento com ${installment.daysOverdue} dias de atraso`
          : eventType === PaymentEventType.partial_payment
          ? 'Pagamento parcial - aguardando complemento'
          : null,
      }
    })
  }

  // Update return file stats
  await Promise.all([
    prisma.returnFile.update({
      where: { id: returnFiles[0].id },
      data: { totalRecords: fileRecordCounts.gateway, matchedRecords: fileMatchedCounts.gateway, unmatchedRecords: fileRecordCounts.gateway - fileMatchedCounts.gateway }
    }),
    prisma.returnFile.update({
      where: { id: returnFiles[1].id },
      data: { totalRecords: fileRecordCounts.biz, matchedRecords: fileMatchedCounts.biz, unmatchedRecords: fileRecordCounts.biz - fileMatchedCounts.biz }
    }),
    prisma.returnFile.update({
      where: { id: returnFiles[2].id },
      data: { totalRecords: fileRecordCounts.bank, matchedRecords: fileMatchedCounts.bank, unmatchedRecords: fileRecordCounts.bank - fileMatchedCounts.bank }
    }),
  ])

  console.log(`✓ Created 3 return files with ${paidInstallmentsForEvents.length} payment events`)

  // ============================================================================
  // 10. CREATE RECONCILIATION FILE
  // ============================================================================
  console.log('Creating reconciliation file...')

  const allPaidInstallments = await prisma.contractInstallment.findMany({
    where: { status: InstallmentStatus.paid }
  })

  const reconFile = await prisma.reconciliationFile.create({
    data: {
      fileName: `BIZ_RECON_${formatDate(today)}.csv`,
      fileHash: `sha256:${Math.random().toString(36).substring(2, 66)}`,
      source: 'biz',
      periodStart: addDays(today, -30),
      periodEnd: today,
      totalRecords: allPaidInstallments.length,
      status: ReconciliationStatus.pending,
    }
  })

  let matchedCount = 0
  let mismatchedCount = 0

  for (const inst of allPaidInstallments) {
    const isMismatch = Math.random() < 0.05
    const actualAmount = isMismatch 
      ? inst.amountCents + BigInt(randomInt(-500, 500))
      : inst.amountCents

    await prisma.reconciliationItem.create({
      data: {
        fileId: reconFile.id,
        installmentId: inst.id,
        externalReference: `BIZ-${inst.id.substring(0, 8)}`,
        expectedAmountCents: inst.amountCents,
        actualAmountCents: actualAmount,
        status: isMismatch ? ReconciliationStatus.mismatched : ReconciliationStatus.matched,
        mismatchReason: isMismatch ? 'Valor divergente no arquivo BIZ' : null,
      }
    })
    if (isMismatch) mismatchedCount++
    else matchedCount++
  }

  await prisma.reconciliationFile.update({
    where: { id: reconFile.id },
    data: {
      matchedCount,
      mismatchedCount,
      status: mismatchedCount > 0 ? ReconciliationStatus.mismatched : ReconciliationStatus.matched,
      processedAt: today,
    }
  })

  console.log(`✓ Created reconciliation with ${matchedCount} matched, ${mismatchedCount} mismatched`)

  // ============================================================================
  // 11. CREATE AUDIT LOGS
  // ============================================================================
  console.log('Creating audit logs...')

  await prisma.auditLog.createMany({
    data: [
      { action: 'seed', actorType: 'system', actorId: 'seed-script', entityType: 'database', entityId: 'all', payload: { message: 'Ambiente de demo populado com fluxo PL completo' } },
      { action: 'create', actorType: 'system', actorId: 'seed-script', entityType: 'fund', entityId: primaryFund.id, payload: { name: primaryFund.name } },
      { action: 'create', actorType: 'system', actorId: 'seed-script', entityType: 'fund', entityId: funds[1].id, payload: { name: funds[1].name } },
      ...merchants.map(m => ({ action: 'create', actorType: 'system', actorId: 'seed-script', entityType: 'merchant', entityId: m.id, payload: { name: m.name } })),
      { action: 'process', actorType: 'system', actorId: 'file-processor', entityType: 'return_file', entityId: returnFiles[0].id, payload: { fileName: returnFiles[0].fileName, records: fileRecordCounts.gateway } },
      { action: 'process', actorType: 'system', actorId: 'file-processor', entityType: 'return_file', entityId: returnFiles[1].id, payload: { fileName: returnFiles[1].fileName, records: fileRecordCounts.biz } },
      { action: 'process', actorType: 'system', actorId: 'file-processor', entityType: 'return_file', entityId: returnFiles[2].id, payload: { fileName: returnFiles[2].fileName, records: fileRecordCounts.bank } },
      { action: 'reconcile', actorType: 'system', actorId: 'reconciliation-service', entityType: 'reconciliation_file', entityId: reconFile.id, payload: { matched: matchedCount, mismatched: mismatchedCount } },
    ]
  })

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const summary = await prisma.$transaction([
    prisma.fund.count(),
    prisma.merchant.count(),
    prisma.merchantUser.count(),
    prisma.endCustomer.count(),
    prisma.serviceContract.count(),
    prisma.contractInstallment.count(),
    prisma.tokenizedCard.count(),
    prisma.privateLabelCard.count(),
    prisma.gatewayTransaction.count(),
    prisma.gatewaySettlement.count(),
    prisma.fundDisbursement.count(),
    prisma.fundQuotaContribution.count(),
    prisma.escrowDrawdown.count(),
    prisma.tokenizedCardCharge.count(),
    prisma.returnFile.count(),
    prisma.paymentEvent.count(),
    prisma.reconciliationItem.count(),
    prisma.domainEvent.count(),
    prisma.auditLog.count(),
  ])

  console.log('\n📊 Demo Environment Summary:')
  console.log('═══════════════════════════════════════')
  console.log('📌 AGENTES')
  console.log(`   FIDCs: ${summary[0]}`)
  console.log(`   Merchants (Lojistas): ${summary[1]}`)
  console.log(`   Merchant Users: ${summary[2]}`)
  console.log(`   End Customers (Clientes): ${summary[3]}`)
  console.log('───────────────────────────────────────')
  console.log('📋 CONTRATOS')
  console.log(`   Service Contracts: ${summary[4]}`)
  console.log(`   Contract Installments: ${summary[5]}`)
  console.log(`   Tokenized Cards: ${summary[6]}`)
  console.log(`   PL Cards: ${summary[7]}`)
  console.log('───────────────────────────────────────')
  console.log('💳 PAGAMENTOS')
  console.log(`   Gateway Transactions: ${summary[8]}`)
  console.log(`   Gateway Settlements: ${summary[9]}`)
  console.log(`   Return Files: ${summary[14]}`)
  console.log(`   Payment Events: ${summary[15]}`)
  console.log('───────────────────────────────────────')
  console.log('💰 FINANCEIRO')
  console.log(`   Fund Disbursements: ${summary[10]}`)
  console.log(`   Quota Contributions: ${summary[11]}`)
  console.log(`   Escrow Drawdowns: ${summary[12]}`)
  console.log(`   Fallback Charge Attempts: ${summary[13]}`)
  console.log('───────────────────────────────────────')
  console.log('📊 CONCILIAÇÃO')
  console.log(`   Reconciliation Items: ${summary[16]}`)
  console.log('───────────────────────────────────────')
  console.log('📝 AUDITORIA')
  console.log(`   Domain Events: ${summary[17]}`)
  console.log(`   Audit Logs: ${summary[18]}`)
  console.log('═══════════════════════════════════════')
  console.log('\n✅ Demo environment ready!')
  console.log('\n🔐 Logins disponíveis:')
  console.log('   Lojista: gerente.ibirapuera@espacolaser.com.br')
  console.log('   Admin FIDC: admin@a55.tech')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
