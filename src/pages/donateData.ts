/** Donate methods - same info as starlinkatlas.davidtphung.com/about?tab=donate */

export const VENMO_URL = 'https://venmo.com/davidtphung';
export const X_PROFILE_URL = 'https://x.com/davidtphung';

export type CryptoMethod = {
  key: string;
  name: string;
  network: string;
  address: string;
};

export const CRYPTO_METHODS: CryptoMethod[] = [
  {
    key: 'btc',
    name: 'Bitcoin',
    network: 'Bitcoin Network',
    address: '3LmGHi5gvPbFYrstbBS5MTbLcQuWEBVBQq',
  },
  {
    key: 'cbbtc',
    name: 'cbBTC',
    network: 'Base Network',
    address: '0xF24594C7023A2a0b6dFb97F07ae1c1eb970a9816',
  },
  {
    key: 'usdc',
    name: 'USDC',
    network: 'Base Network',
    address: '0xb25eb698392eaE827b64EEB9cb124C62Be0D3dD7',
  },
  {
    key: 'eth',
    name: 'Ethereum',
    network: 'Ethereum Network',
    address: '0x1A1c37C145a1EaB58C43F003EBB55C18083b5987',
  },
];

export const DONATE_COPY = {
  title: 'Support Canvas Atelier',
  intro:
    'Independent creative software. No ads, no paywalls, no corporate sponsors, no user tracking. Your contribution funds development, data, and hosting.',
  methodsHeading: 'Donation methods',
  venmoLabel: 'Venmo',
  venmoHint: '@davidtphung',
  cryptoHeading: 'Crypto',
  disclaimers: [
    'Donations are voluntary and non-refundable.',
    'Crypto transactions are irreversible. Please double-check every address before sending.',
    'This is not a 501(c)(3) nonprofit. Contributions are not tax deductible.',
  ],
  questions: 'Questions or feedback?',
  onX: 'on X.',
} as const;
