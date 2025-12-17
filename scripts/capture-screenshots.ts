import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://zesty-faloodeh-e2a297.netlify.app';

const PAGES = [
  { path: '/login', name: 'login' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/boletos', name: 'boletos' },
  { path: '/clientes', name: 'clientes' },
  { path: '/contratos', name: 'contratos' },
  { path: '/contratos/novo', name: 'contratos-novo' },
  { path: '/extrato', name: 'extrato' },
  { path: '/configuracoes', name: 'configuracoes' },
  { path: '/admin', name: 'admin' },
  { path: '/admin/arquivos', name: 'admin-arquivos' },
  { path: '/admin/baixas', name: 'admin-baixas' },
  { path: '/admin/clientes', name: 'admin-clientes' },
  { path: '/admin/conciliacao', name: 'admin-conciliacao' },
  { path: '/admin/configuracoes', name: 'admin-configuracoes' },
  { path: '/admin/contratos', name: 'admin-contratos' },
  { path: '/admin/drawdowns', name: 'admin-drawdowns' },
  { path: '/admin/escrow', name: 'admin-escrow' },
  { path: '/admin/fundos', name: 'admin-fundos' },
  { path: '/admin/ledger', name: 'admin-ledger' },
  { path: '/admin/merchants', name: 'admin-merchants' },
  { path: '/admin/pagamentos', name: 'admin-pagamentos' },
  { path: '/admin/parcelas', name: 'admin-parcelas' },
  { path: '/admin/simulador', name: 'admin-simulador' },
  { path: '/admin/transacoes', name: 'admin-transacoes' },
];

async function captureScreenshots() {
  const screenshotsDir = join(process.cwd(), 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(join(screenshotsDir, 'desktop'), { recursive: true });
  await mkdir(join(screenshotsDir, 'mobile'), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  
  // Desktop viewport
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const desktopPage = await desktopContext.newPage();

  // Mobile viewport
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log('Capturando screenshots...\n');

  for (const { path, name } of PAGES) {
    const url = `${BASE_URL}${path}`;
    console.log(`📸 ${name}...`);
    
    try {
      // Desktop
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({
        path: join(screenshotsDir, 'desktop', `${name}.png`),
        fullPage: true,
      });

      // Mobile
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await mobilePage.waitForTimeout(500);
      await mobilePage.screenshot({
        path: join(screenshotsDir, 'mobile', `${name}.png`),
        fullPage: true,
      });

      console.log(`   ✅ OK`);
    } catch (error) {
      console.log(`   ❌ ERRO: ${error}`);
    }
  }

  await browser.close();
  console.log('\n✨ Screenshots salvos em ./screenshots/');
}

captureScreenshots();

