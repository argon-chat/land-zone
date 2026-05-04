import type { APIRoute, GetStaticPaths } from 'astro';
import { generateOgImage } from '../../lib/og';

const pages: Record<string, { title: string; subtitle?: string }> = {
  index: {
    title: 'Talk. Play. Hang out.',
    subtitle: 'Voice, text, screen share and games — all in one place.',
  },
  download: {
    title: 'Download Argon Chat',
    subtitle: 'Currently in closed beta. Join the enrollment queue.',
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How Argon Chat handles your data.',
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Rules and conditions for using Argon Chat.',
  },
  branding: {
    title: 'Branding',
    subtitle: 'Logo, colors, typography, and usage guidelines.',
  },
  press: {
    title: 'Press Kit',
    subtitle: 'Logos, facts, and resources for media.',
  },
  contact: {
    title: 'Contact',
    subtitle: 'Get in touch with the Argon team.',
  },
};

export const getStaticPaths: GetStaticPaths = () => {
  return Object.keys(pages).map((slug) => ({ params: { slug } }));
};

export const GET: APIRoute = async ({ params }) => {
  const page = pages[params.slug!];
  if (!page) {
    return new Response('Not found', { status: 404 });
  }

  const png = await generateOgImage({
    title: page.title,
    subtitle: page.subtitle,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
