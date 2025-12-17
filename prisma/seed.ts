import { PrismaClient, InstallmentStatus, InstallmentOrigin, DisbursementStatus, ReconciliationStatus, LedgerEntryType, DrawdownReason, ContractEligibilityStatus, TokenizationStatus, CardChargeStatus, PlCardIssuanceStatus } from '../src/generated/prisma'
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
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
const addMonths = (date: Date, months: number) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// Test case types
type TestCase = 'happy_path' | 'late_60d' | 'defaulted' | 'escrow_drawdown' | 'tokenization_failed'

const merchantNames = ['Espaço Laser Centro', 'Espaço Laser Shopping', 'Espaço Laser Premium']

// Realistic service packages
const servicePackages = [
  'Depilação Corpo Inteiro',
  'Depilação Áreas Pequenas',
  'Depilação Virilha + Axilas',
  'Pacote Facial Completo',
  'Tratamento Rejuvenescimento',
  'Harmonização Facial',
  'Pacote Pernas + Coxas',
  'Depilação Masculina Costas',
  'Tratamento Anti-Idade',
  'Pacote Noivas Premium',
]
const customerNames = [
  'Ana Silva', 'Bruno Costa', 'Carla Oliveira', 'Daniel Santos', 'Elena Ferreira',
  'Fernando Lima', 'Gabriela Souza', 'Hugo Pereira', 'Isabela Almeida', 'João Rodrigues',
  'Karina Martins', 'Lucas Barbosa', 'Mariana Gomes', 'Nicolas Ribeiro', 'Olivia Carvalho',
  'Pedro Nascimento', 'Quintina Araújo', 'Rafael Mendes', 'Sofia Castro', 'Thiago Rocha',
  'Ursula Monteiro', 'Victor Cardoso', 'Wendy Teixeira', 'Xavier Correia', 'Yasmin Dias',
  'Zeca Moreira', 'Amanda Lopes', 'Bernardo Freitas', 'Cecilia Nunes', 'Diego Pinto'
]

async function main() {
  console.log('🌱 Starting comprehensive seed...')

  // Clean existing data in correct order
  await prisma.$transaction([
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
  // 1. CREATE FUNDS
  // ============================================================================
  console.log('Creating funds...')
  
  const funds = await Promise.all([
    prisma.fund.create({
      data: {
        name: 'FIDC Espaço Laser I',
        document: generateCNPJ(),
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
        document: generateCNPJ(),
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
  console.log(`✓ Created ${funds.length} funds`)

  // ============================================================================
  // 2. CREATE MERCHANTS WITH USERS
  // ============================================================================
  console.log('Creating merchants...')

  const merchants = await Promise.all(
    merchantNames.map((name, i) =>
      prisma.merchant.create({
        data: {
          name,
          document: generateCNPJ(),
          email: `contato@espacolaser${i + 1}.com.br`,
          phone: `(11) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
          address: `Rua das Flores, ${randomInt(100, 999)}`,
          city: 'São Paulo',
          state: 'SP',
          zipCode: `0${randomInt(1000, 9999)}-${randomInt(100, 999)}`,
          users: {
            create: [
              { name: `Admin ${name}`, email: `admin${i + 1}@espacolaser.com.br`, role: 'admin' },
              { name: `Operador ${name}`, email: `operador${i + 1}@espacolaser.com.br`, role: 'operator' }
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
  // 4. CREATE END CUSTOMERS
  // ============================================================================
  console.log('Creating end customers...')

  const endCustomers = await Promise.all(
    customerNames.map((name) =>
      prisma.endCustomer.create({
        data: {
          name,
          document: generateCPF(),
          email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
          phone: `(11) 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`,
          birthDate: new Date(randomInt(1970, 2000), randomInt(0, 11), randomInt(1, 28)),
        }
      })
    )
  )
  console.log(`✓ Created ${endCustomers.length} end customers`)

  // ============================================================================
  // 5. CREATE CONTRACTS WITH FULL FLOW (5 TEST CASES)
  // ============================================================================
  console.log('Creating contracts with all test case scenarios...')

  const escrowBalances: Map<string, bigint> = new Map()
  escrowAccounts.forEach(ea => escrowBalances.set(ea.id, BigInt(0)))

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
      const numInstallments = randomInt(6, 12)
      const installmentValue = randomInt(15000, 50000) // R$ 150 - R$ 500
      const totalValue = installmentValue * numInstallments
      const startDate = addDays(today, -randomInt(90, 180))
      
      const testCase = testCaseDistribution[contractCount - 1] || 'happy_path'

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
          failureReason: tokenizationFailed ? 'Card declined by issuer' : null,
        }
      })

      // ========================================
      // Create domain event for tokenization
      // ========================================
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
          description: `${randomElement(servicePackages)} - ${numInstallments}x`,
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
          creditLimitCents: BigInt(totalValue - installmentValue), // Total - 1st installment
          issuanceStatus: plCardFailed ? PlCardIssuanceStatus.failed : PlCardIssuanceStatus.issued,
          issuedAt: plCardFailed ? null : addDays(startDate, 2),
          failureReason: plCardFailed ? 'Tokenization failed, cannot issue PL card' : null,
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
          contributesToSubQuota = true // 1st goes to Sub quota
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
            contributesToSubQuota = true // Late 2nd also goes to Sub quota
          } else {
            status = InstallmentStatus.paid
            paidAt = secondInstallmentPaidAt
            paidAmountCents = BigInt(installmentValue)
          }
        }
        // Remaining installments
        else if (isPast && !tokenizationFailed && testCase !== 'defaulted') {
          if (testCase === 'escrow_drawdown' && i > numInstallments / 2) {
            // Simulate later installments going into default
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

        // Create Sub quota contribution for eligible installments
        if (contributesToSubQuota) {
          await prisma.fundQuotaContribution.create({
            data: {
              fundId: primaryFund.id,
              installmentId: installment.id,
              amountCents: BigInt(installmentValue),
              quotaType: 'sub',
              reason: isFirst ? 'first_installment' : 'late_second_installment',
              contributedAt: paidAt!,
            }
          })
        }
      }

      // ========================================
      // Create gateway transaction for 1st installment
      // ========================================
      if (!tokenizationFailed && firstInstallmentPaidAt) {
        await prisma.gatewayTransaction.create({
          data: {
            merchantId: merchant.id,
            contractId: contract.id,
            gatewayTransactionId: `GW-${contract.contractNumber}-1`,
            amountCents: BigInt(installmentValue),
            status: 'settled',
            authorizationCode: `AUTH${randomInt(100000, 999999)}`,
            paymentLink: `https://pay.a55.tech/${contract.contractNumber}`,
            processedAt: firstInstallmentPaidAt,
          }
        })
      }

      // ========================================
      // Create disbursement with 70/30 split (for eligible contracts)
      // ========================================
      if (eligibilityStatus === ContractEligibilityStatus.disbursed || 
          eligibilityStatus === ContractEligibilityStatus.eligible_late) {
        const remainingValue = totalValue - installmentValue // Exclude 1st installment
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

        // Domain events
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
      // Create fund repayments (from paid installments)
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
                  description: `Cobertura ${inst.status} - Parcela ${inst.installmentNumber}`,
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

              // Domain event
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
          // Create 3 failed charge attempts
          for (let attempt = 1; attempt <= 3; attempt++) {
            await prisma.tokenizedCardCharge.create({
              data: {
                tokenizedCardId: tokenizedCard.id,
                installmentId: defaultedInstallment.id,
                amountCents: defaultedInstallment.amountCents,
                status: CardChargeStatus.failed,
                attemptNumber: attempt,
                gatewayReference: `CHG-${contract.contractNumber}-${attempt}`,
                failureReason: randomElement(['Insufficient funds', 'Card expired', 'Transaction declined']),
                attemptedAt: addDays(defaultedInstallment.dueDate, 5 + (attempt * 7)),
                processedAt: addDays(defaultedInstallment.dueDate, 5 + (attempt * 7)),
              }
            })

            await prisma.domainEvent.create({
              data: {
                eventType: 'a55.fallback_charge.failed',
                source: 'a55',
                target: 'biz',
                payload: { contractId: contract.id, attempt, reason: 'Card declined' },
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
  // 6. UPDATE ESCROW BALANCES
  // ============================================================================
  console.log('Updating escrow account balances...')
  for (const [escrowAccountId, balance] of escrowBalances) {
    await prisma.escrowAccount.update({
      where: { id: escrowAccountId },
      data: { balanceCents: balance }
    })
  }

  // ============================================================================
  // 7. CREATE RECONCILIATION FILE WITH 5% MISMATCH
  // ============================================================================
  console.log('Creating reconciliation file...')

  const allPaidInstallments = await prisma.contractInstallment.findMany({
    where: { status: InstallmentStatus.paid }
  })

  const reconFile = await prisma.reconciliationFile.create({
    data: {
      fileName: `BIZ_RECON_${today.toISOString().slice(0, 10).replace(/-/g, '')}.csv`,
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
        mismatchReason: isMismatch ? 'Valor divergente no arquivo Biz' : null,
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
  // 8. CREATE AUDIT LOGS
  // ============================================================================
  console.log('Creating audit logs...')

  await prisma.auditLog.createMany({
    data: [
      { action: 'seed', actorType: 'system', actorId: 'seed-script', entityType: 'database', entityId: 'all', payload: { message: 'Database seeded with complete PL flow' } },
      { action: 'create', actorType: 'system', actorId: 'seed-script', entityType: 'fund', entityId: primaryFund.id, payload: { name: primaryFund.name } },
      ...merchants.map(m => ({ action: 'create', actorType: 'system', actorId: 'seed-script', entityType: 'merchant', entityId: m.id, payload: { name: m.name } })),
    ]
  })

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const summary = await prisma.$transaction([
    prisma.fund.count(),
    prisma.merchant.count(),
    prisma.endCustomer.count(),
    prisma.serviceContract.count(),
    prisma.contractInstallment.count(),
    prisma.tokenizedCard.count(),
    prisma.privateLabelCard.count(),
    prisma.fundDisbursement.count(),
    prisma.fundQuotaContribution.count(),
    prisma.escrowDrawdown.count(),
    prisma.tokenizedCardCharge.count(),
    prisma.reconciliationItem.count(),
    prisma.domainEvent.count(),
  ])

  console.log('\n📊 Seed Summary:')
  console.log(`   Funds: ${summary[0]}`)
  console.log(`   Merchants: ${summary[1]}`)
  console.log(`   End Customers: ${summary[2]}`)
  console.log(`   Contracts: ${summary[3]}`)
  console.log(`   Installments: ${summary[4]}`)
  console.log(`   Tokenized Cards: ${summary[5]}`)
  console.log(`   PL Cards: ${summary[6]}`)
  console.log(`   Disbursements: ${summary[7]}`)
  console.log(`   Quota Contributions: ${summary[8]}`)
  console.log(`   Escrow Drawdowns: ${summary[9]}`)
  console.log(`   Fallback Charge Attempts: ${summary[10]}`)
  console.log(`   Reconciliation Items: ${summary[11]}`)
  console.log(`   Domain Events: ${summary[12]}`)
  console.log('\n✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
