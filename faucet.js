require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');
const crypto = require('crypto');
const UserAgent = require('user-agents');
const fs = require('fs').promises;
const { HttpsProxyAgent } = require('https-proxy-agent');

const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✔] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log('---------------------------------------------');
    console.log('     KiteAI Faucet V2 - Bamar Airdrop Group');
    console.log(`---------------------------------------------${colors.reset}\n`);
  }
};

let proxies = [];
let currentProxyIndex = 0;

const loadProxies = async () => {
  try {
    const content = await fs.readFile('proxy.txt', 'utf8');
    proxies = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => {
        const parts = line.split(':');
        if (parts.length < 2) return null;
        const proxy = { host: parts[0], port: parseInt(parts[1]) };
        if (parts.length >= 4) proxy.auth = `${parts[2]}:${parts[3]}`;
        return proxy;
      })
      .filter(p => p !== null);

    if (proxies.length === 0) {
      logger.error('No valid proxies found in proxy.txt');
      return [];
    }

    logger.success(`Loaded ${proxies.length} proxies from proxy.txt`);
    return proxies;
  } catch (error) {
    logger.error(`Failed to load proxy.txt: ${error.message}`);
    return [];
  }
};

const getNextProxy = () => {
  if (proxies.length === 0) return null;
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxies[currentProxyIndex];
};

const createAxiosInstance = (proxyConfig) => {
  try {
    if (!proxyConfig) return axios.create({ timeout: 30000 });

    let proxyUrl = proxyConfig.auth
      ? `http://${proxyConfig.auth}@${proxyConfig.host}:${proxyConfig.port}`
      : `http://${proxyConfig.host}:${proxyConfig.port}`;

    return axios.create({
      timeout: 30000,
      proxy: false,
      httpsAgent: new HttpsProxyAgent(proxyUrl),
    });
  } catch (error) {
    logger.error(`Failed to create Axios instance: ${error.message}`);
    return axios.create({ timeout: 30000 });
  }
};

const baseHeaders = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Origin': 'https://testnet.gokite.ai',
  'Referer': 'https://testnet.gokite.ai/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'User-Agent': new UserAgent().toString(),
  'Content-Type': 'application/json'
};

const getWallet = (privateKey) => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    logger.info(`Wallet created: ${wallet.address}`);
    return wallet;
  } catch (error) {
    logger.error(`Invalid private key: ${error.message}`);
    return null;
  }
};

const encryptAddress = (address) => {
  try {
    const keyHex = '6a1c35292b7c5b769ff47d89a17e7bc4f0adfe1b462981d28e0e9f7ff20b8f8a';
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(address, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    const result = Buffer.concat([iv, encrypted, authTag]);

    return result.toString('hex');
  } catch (error) {
    logger.error(`Auth token generation failed for ${address}`);
    return null;
  }
};

const extractCookies = (headers) => {
  try {
    const rawCookies = headers['set-cookie'] || [];
    const skipKeys = ['expires', 'path', 'domain', 'samesite', 'secure', 'httponly', 'max-age'];
    const cookiesDict = {};

    for (const cookieStr of rawCookies) {
      const parts = cookieStr.split(';');
      for (const part of parts) {
        const cookie = part.trim();
        if (cookie.includes('=')) {
          const [name, value] = cookie.split('=', 2);
          if (name && value && !skipKeys.includes(name.toLowerCase())) {
            cookiesDict[name] = value;
          }
        }
      }
    }

    return Object.entries(cookiesDict).map(([k, v]) => `${k}=${v}`).join('; ') || null;
  } catch {
    return null;
  }
};

// The rest of the bot functions (solveRecaptcha, claimDailyFaucet, login, getUserProfile, etc.) should follow the same pattern:
// 1. Use backticks for `${...}` interpolation
// 2. Use optional chaining and fallback (`||`) for safe property access
// 3. Ensure arrays / objects have default values (e.g., `|| []`)
// 4. Logger calls use proper string templates

// Then call main
const main = async () => {
  try {
    proxies = await loadProxies();
    if (proxies.length === 0) logger.info('Running without proxies');
    // Call dailyRun() here
  } catch (error) {
    logger.error(`Bot error: ${error.response?.data?.error || error.message}`);
    // Schedule next run
  }
};

main().catch(error => logger.error(`Bot error: ${error.response?.data?.error || error.message}`));
