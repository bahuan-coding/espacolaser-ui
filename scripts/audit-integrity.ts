/**
 * Script de Auditoria de Integridade do Banco de Dados
 * Valida consistência dos dados do sistema Private Label
 */

import { PrismaClient, LedgerEntryType, InstallmentStatus } from '../src/generated/prisma'
import { PrismaNeon } from '@prisma/adapter-neon'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.NETLIFY_DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL
if (!connectionString) {
  throw new Error('Missing NETLIFY_DATABASE_URL environment variable')
}

const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

interface AuditResult {
  check: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

const results: AuditResult[] = []

function log(result: AuditResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
  console.log(`${icon} [${result.status}] ${result.check}: ${result.message}`)
  if (result.details && result.status !== 'PASS') {
    console.log('   Details:', JSON.stringify(result.details, null, 2))
  }
  results.push(result)
}

async function auditEscrowBalances() {
  console.log('\n📊 Auditando Saldos Escrow...')
  
  const accounts = await prisma.escrowAccount.findMany({
    include: {
      ledgerEntries: true,
      merchant: { select: { name: true } }
    }
  })

  for (const account of accounts) {
    const credits = account.ledgerEntries
      .filter(e => e.entryType === LedgerEntryType.credit)
      .reduce((sum, e) => sum + e.amountCents, 0n)
    
    const debits = account.ledgerEntries
      .filter(e => e.entryType === LedgerEntryType.debit)
      .reduce((sum, e) => sum + e.amountCents, 0n)
    
    const calculatedBalance = credits - debits
    const storedBalance = account.balanceCents

    if (calculatedBalance === storedBalance) {
      log({
        check: `Saldo Escrow [${account.merchant.name}]`,
        status: 'PASS',
        message: `Saldo correto: R$ ${Number(storedBalance) / 100}`
      })
    } else {
      log({
        check: `Saldo Escrow [${account.merchant.name}]`,
        status: 'FAIL',
        message: `Divergência de saldo`,
        details: {
          stored: Number(storedBalance) / 100,
          calculated: Number(calculatedBalance) / 100,
          difference: Number(storedBalance - calculatedBalance) / 100,
          credits: Number(credits) / 100,
          debits: Number(debits) / 100
        }
      })
    }
  }
}

async function auditLedgerSequence() {
  console.log('\n📊 Auditando Sequência do Ledger...')
  
  const accounts = await prisma.escrowAccount.findMany({
    include: {
      ledgerEntries: { orderBy: { createdAt: 'asc' } },
      merchant: { select: { name: true } }
    }
  })

  for (const account of accounts) {
    let runningBalance = 0n
    let hasError = false
    const errors: any[] = []

    for (const entry of account.ledgerEntries) {
      if (entry.entryType === LedgerEntryType.credit) {
        runningBalance += entry.amountCents
      } else {
        runningBalance -= entry.amountCents
      }

      if (runningBalance !== entry.balanceAfterCents) {
        hasError = true
        errors.push({
          entryId: entry.id,
          expected: Number(runningBalance) / 100,
          actual: Number(entry.balanceAfterCents) / 100,
          entryType: entry.entryType,
          amount: Number(entry.amountCents) / 100
        })
      }
    }

    if (!hasError) {
      log({
        check: `Sequência Ledger [${account.merchant.name}]`,
        status: 'PASS',
        message: `${account.ledgerEntries.length} lançamentos em sequência correta`
      })
    } else {
      log({
        check: `Sequência Ledger [${account.merchant.name}]`,
        status: 'FAIL',
        message: `${errors.length} lançamentos com balanceAfter incorreto`,
        details: errors.slice(0, 5)
      })
    }
  }
}

async function auditDisbursementSplits() {
  console.log('\n📊 Auditando Splits de Desembolso (70/30)...')
  
  const disbursements = await prisma.fundDisbursement.findMany({
    include: {
      splits: true,
      contract: { select: { contractNumber: true } }
    }
  })

  let passed = 0
  let failed = 0
  const errors: any[] = []

  for (const d of disbursements) {
    const merchantSplit = d.splits.find(s => s.recipientType === 'merchant')
    const escrowSplit = d.splits.find(s => s.recipientType === 'escrow')

    if (!merchantSplit || !escrowSplit) {
      failed++
      errors.push({
        contract: d.contract.contractNumber,
        reason: 'Split incompleto',
        splits: d.splits.map(s => s.recipientType)
      })
      continue
    }

    const totalFromSplits = merchantSplit.amountCents + escrowSplit.amountCents
    const expectedMerchant = (d.totalAmountCents * 70n) / 100n
    const expectedEscrow = d.totalAmountCents - expectedMerchant

    // Allow 1 cent tolerance for rounding
    const merchantOk = Math.abs(Number(merchantSplit.amountCents - expectedMerchant)) <= 1
    const escrowOk = Math.abs(Number(escrowSplit.amountCents - expectedEscrow)) <= 1
    const totalOk = totalFromSplits === d.totalAmountCents

    if (merchantOk && escrowOk && totalOk) {
      passed++
    } else {
      failed++
      errors.push({
        contract: d.contract.contractNumber,
        total: Number(d.totalAmountCents) / 100,
        merchantExpected: Number(expectedMerchant) / 100,
        merchantActual: Number(merchantSplit.amountCents) / 100,
        escrowExpected: Number(expectedEscrow) / 100,
        escrowActual: Number(escrowSplit.amountCents) / 100
      })
    }
  }

  if (failed === 0) {
    log({
      check: 'Splits 70/30',
      status: 'PASS',
      message: `Todos os ${passed} desembolsos com split correto`
    })
  } else {
    log({
      check: 'Splits 70/30',
      status: 'FAIL',
      message: `${failed} de ${passed + failed} desembolsos com split incorreto`,
      details: errors.slice(0, 5)
    })
  }
}

async function auditRepayments() {
  console.log('\n📊 Auditando Repagamentos ao Fundo...')
  
  // Parcelas pagas (exceto 1ª que vai pro acquirer) devem ter repayment
  const paidInstallments = await prisma.contractInstallment.findMany({
    where: {
      status: InstallmentStatus.paid,
      installmentNumber: { gt: 1 } // Exclui 1ª parcela (external_capture)
    },
    include: {
      repayments: true,
      contract: { 
        select: { 
          contractNumber: true,
          eligibilityStatus: true
        } 
      }
    }
  })

  // Filtra apenas contratos que foram desembolsados
  const eligibleInstallments = paidInstallments.filter(i => 
    i.contract.eligibilityStatus === 'disbursed' || 
    i.contract.eligibilityStatus === 'eligible_late'
  )

  const withRepayment = eligibleInstallments.filter(i => i.repayments.length > 0)
  const withoutRepayment = eligibleInstallments.filter(i => i.repayments.length === 0)

  if (withoutRepayment.length === 0) {
    log({
      check: 'Repagamentos FIDC',
      status: 'PASS',
      message: `${withRepayment.length} parcelas pagas têm repayment registrado`
    })
  } else {
    log({
      check: 'Repagamentos FIDC',
      status: 'WARN',
      message: `${withoutRepayment.length} parcelas pagas sem repayment`,
      details: withoutRepayment.slice(0, 5).map(i => ({
        contract: i.contract.contractNumber,
        installment: i.installmentNumber,
        amount: Number(i.amountCents) / 100
      }))
    })
  }
}

async function auditDrawdownCoverage() {
  console.log('\n📊 Auditando Cobertura de Drawdowns...')
  
  const lateInstallments = await prisma.contractInstallment.findMany({
    where: {
      status: { in: [InstallmentStatus.late, InstallmentStatus.defaulted] }
    },
    include: {
      contract: {
        include: {
          merchant: { select: { name: true } },
          disbursements: { where: { status: 'posted' } }
        }
      }
    }
  })

  // Apenas parcelas de contratos desembolsados devem ter drawdown
  const eligibleForDrawdown = lateInstallments.filter(i => 
    i.contract.disbursements.length > 0
  )

  const drawdowns = await prisma.escrowDrawdown.findMany({
    where: {
      referenceType: 'installment',
      referenceId: { in: eligibleForDrawdown.map(i => i.id) }
    }
  })

  const covered = eligibleForDrawdown.filter(i => 
    drawdowns.some(d => d.referenceId === i.id)
  )
  const uncovered = eligibleForDrawdown.filter(i => 
    !drawdowns.some(d => d.referenceId === i.id)
  )

  log({
    check: 'Cobertura Drawdown',
    status: uncovered.length === 0 ? 'PASS' : 'WARN',
    message: `${covered.length} de ${eligibleForDrawdown.length} parcelas em atraso cobertas por drawdown`,
    details: uncovered.length > 0 ? {
      uncoveredCount: uncovered.length,
      samples: uncovered.slice(0, 3).map(i => ({
        contract: i.contract.contractNumber,
        installment: i.installmentNumber,
        status: i.status
      }))
    } : undefined
  })
}

async function auditContractEligibility() {
  console.log('\n📊 Auditando Elegibilidade de Contratos...')
  
  const contracts = await prisma.serviceContract.findMany({
    include: {
      installments: { orderBy: { installmentNumber: 'asc' } },
      disbursements: true,
      plCard: true,
      tokenizedCard: true
    }
  })

  let issues: any[] = []

  for (const c of contracts) {
    const first = c.installments.find(i => i.installmentNumber === 1)
    const second = c.installments.find(i => i.installmentNumber === 2)

    // Contrato disbursed deve ter desembolso
    if (c.eligibilityStatus === 'disbursed' && c.disbursements.length === 0) {
      issues.push({
        contract: c.contractNumber,
        issue: 'Status disbursed mas sem desembolso registrado'
      })
    }

    // Contrato inelegível não deve ter desembolso
    if (c.eligibilityStatus === 'ineligible' && c.disbursements.length > 0) {
      issues.push({
        contract: c.contractNumber,
        issue: 'Status ineligible mas tem desembolso'
      })
    }

    // Tokenização falhou = inelegível
    if (c.tokenizedCard?.tokenizationStatus === 'failed' && 
        c.eligibilityStatus !== 'ineligible') {
      issues.push({
        contract: c.contractNumber,
        issue: 'Tokenização falhou mas status não é ineligible'
      })
    }
  }

  if (issues.length === 0) {
    log({
      check: 'Elegibilidade Contratos',
      status: 'PASS',
      message: `${contracts.length} contratos com elegibilidade consistente`
    })
  } else {
    log({
      check: 'Elegibilidade Contratos',
      status: 'FAIL',
      message: `${issues.length} contratos com inconsistência de elegibilidade`,
      details: issues.slice(0, 5)
    })
  }
}

async function auditReconciliation() {
  console.log('\n📊 Auditando Conciliação...')
  
  const files = await prisma.reconciliationFile.findMany({
    include: {
      items: true
    }
  })

  let issues: any[] = []

  for (const f of files) {
    const matched = f.items.filter(i => i.status === 'matched').length
    const mismatched = f.items.filter(i => i.status === 'mismatched').length

    if (matched !== f.matchedCount || mismatched !== f.mismatchedCount) {
      issues.push({
        file: f.fileName,
        stored: { matched: f.matchedCount, mismatched: f.mismatchedCount },
        calculated: { matched, mismatched }
      })
    }
  }

  if (issues.length === 0) {
    log({
      check: 'Contadores Conciliação',
      status: 'PASS',
      message: `${files.length} arquivos com contadores corretos`
    })
  } else {
    log({
      check: 'Contadores Conciliação',
      status: 'FAIL',
      message: `${issues.length} arquivos com contadores divergentes`,
      details: issues
    })
  }
}

async function auditDataCounts() {
  console.log('\n📊 Resumo de Dados...')
  
  const counts = await Promise.all([
    prisma.merchant.count(),
    prisma.fund.count(),
    prisma.escrowAccount.count(),
    prisma.endCustomer.count(),
    prisma.serviceContract.count(),
    prisma.contractInstallment.count(),
    prisma.fundDisbursement.count(),
    prisma.escrowLedgerEntry.count(),
    prisma.escrowDrawdown.count(),
    prisma.fundRepayment.count(),
    prisma.reconciliationFile.count(),
    prisma.reconciliationItem.count(),
    prisma.tokenizedCard.count(),
    prisma.privateLabelCard.count(),
    prisma.tokenizedCardCharge.count(),
    prisma.domainEvent.count(),
    prisma.auditLog.count(),
  ])

  const labels = [
    'Merchants', 'Funds', 'Escrow Accounts', 'End Customers', 
    'Contracts', 'Installments', 'Disbursements', 'Ledger Entries',
    'Drawdowns', 'Repayments', 'Recon Files', 'Recon Items',
    'Tokenized Cards', 'PL Cards', 'Charge Attempts', 'Domain Events', 'Audit Logs'
  ]

  console.log('\n📈 Contagem de Registros:')
  labels.forEach((label, i) => {
    console.log(`   ${label}: ${counts[i]}`)
  })

  log({
    check: 'Dados Existentes',
    status: counts[4] > 0 ? 'PASS' : 'WARN',
    message: counts[4] > 0 
      ? `${counts[4]} contratos, ${counts[5]} parcelas, ${counts[6]} desembolsos`
      : 'Banco vazio - execute pnpm db:seed'
  })
}

async function main() {
  console.log('🔍 AUDITORIA DE INTEGRIDADE - SISTEMA PRIVATE LABEL')
  console.log('═'.repeat(60))

  try {
    await auditDataCounts()
    await auditEscrowBalances()
    await auditLedgerSequence()
    await auditDisbursementSplits()
    await auditRepayments()
    await auditDrawdownCoverage()
    await auditContractEligibility()
    await auditReconciliation()

    console.log('\n' + '═'.repeat(60))
    console.log('📋 RESUMO DA AUDITORIA')
    console.log('═'.repeat(60))

    const passed = results.filter(r => r.status === 'PASS').length
    const failed = results.filter(r => r.status === 'FAIL').length
    const warned = results.filter(r => r.status === 'WARN').length

    console.log(`\n   ✅ Passou: ${passed}`)
    console.log(`   ❌ Falhou: ${failed}`)
    console.log(`   ⚠️  Alerta: ${warned}`)
    console.log(`   📊 Total:  ${results.length}`)

    if (failed > 0) {
      console.log('\n❌ AUDITORIA ENCONTROU PROBLEMAS')
      process.exit(1)
    } else if (warned > 0) {
      console.log('\n⚠️  AUDITORIA PASSOU COM ALERTAS')
    } else {
      console.log('\n✅ AUDITORIA PASSOU COMPLETAMENTE')
    }

  } catch (error) {
    console.error('\n❌ Erro na auditoria:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


