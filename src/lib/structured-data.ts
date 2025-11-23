import type { UnitCategory } from '@/types';

export type FAQItem = { question: string; answer: string };

export const buildBreadcrumbJsonLd = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const buildFaqJsonLd = (faqs: FAQItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

export const buildWidgetBuilderJsonLd = (url: string) => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SwapUnits Widget Builder',
  applicationCategory: 'Utility',
  operatingSystem: 'Any',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url,
  potentialAction: {
    '@type': 'UseAction',
    target: url,
  },
});

export const defaultFaqForPair = (fromUnit: string, toUnit: string, category: UnitCategory): FAQItem[] => [
  {
    question: `How do I convert ${fromUnit} to ${toUnit}?`,
    answer: `Use the formula shown above or enter a value to see ${fromUnit} converted to ${toUnit} instantly.`,
  },
  {
    question: `What is the formula for ${fromUnit} to ${toUnit}?`,
    answer: `The converter calculates ${toUnit} by applying the category-specific conversion factor for ${category}.`,
  },
  {
    question: `When should I use ${fromUnit} vs ${toUnit}?`,
    answer: `${fromUnit} and ${toUnit} are both part of the ${category} category; pick the unit that matches your measurement context (e.g., scale, region, or industry standard).`,
  },
];
