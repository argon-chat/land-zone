import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { SatoriOptions } from 'satori';

let fontData: ArrayBuffer | null = null;
let fontBoldData: ArrayBuffer | null = null;

const catSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#8b5cf6" d="M114.54,88.82c5.35-2.75,9.96-6.72,13.46-11.53c-4.67-3.14-9.86-5.56-15.4-7.09c0.01-24.5-6.29-48.6-18.25-69.73c-7.96,8.45-14.3,18.49-18.62,29.31c-7.66-1.22-15.65-1.06-23.27,0.31C48.13,19.15,41.74,9.02,33.71,0.47C21.76,21.62,15.45,45.7,15.46,70.2c-5.54,1.53-10.73,3.95-15.4,7.09c3.49,4.82,8.1,8.78,13.46,11.53c-3.64,2.85-6.74,6.37-9.14,10.33c5.87,4.32,12.67,7.48,20.05,9.09c19.68,25.4,59.51,25.41,79.2,0c7.38-1.61,14.18-4.78,20.05-9.09C121.28,95.19,118.18,91.68,114.54,88.82z M23.7,68.22c0,0,4.13-2.07,12.4-2.07c8.27,0,19.64,11.37,19.64,11.37s-8.27,6.2-19.64,9.3C32.11,87.91,26.8,77.52,23.7,68.22z M64,98.19c-5.71,0-10.33-4.13-10.33-12.4c1.04-0.35,2.16-0.62,3.3-0.85l3,6.02l1.21-6.61c1.9-0.14,3.84-0.14,5.75,0.01l1.22,6.65l3.01-6.05c1.1,0.23,2.17,0.49,3.18,0.82C74.33,94.05,69.71,98.19,64,98.19z M92.99,86.03c-11.37-3.1-19.63-9.3-19.63-9.3s11.37-11.37,19.63-11.37s12.4,2.07,12.4,2.07C102.29,76.73,96.98,87.12,92.99,86.03z"/></svg>`;
const catDataUri = `data:image/svg+xml,${encodeURIComponent(catSvg)}`;

async function loadFonts() {
  if (!fontData) {
    const [regular, bold] = await Promise.all([
      fetch('https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf'),
      fetch('https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf'),
    ]);
    fontData = await regular.arrayBuffer();
    fontBoldData = await bold.arrayBuffer();
  }
  return { fontData: fontData!, fontBoldData: fontBoldData! };
}

interface OgImageOptions {
  title: string;
  subtitle?: string;
  accent?: string;
}

export async function generateOgImage({ title, subtitle, accent = '#8b5cf6' }: OgImageOptions): Promise<Buffer> {
  const { fontData, fontBoldData } = await loadFonts();

  const options: SatoriOptions = {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: fontData, weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBoldData, weight: 700, style: 'normal' },
    ],
  };

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: '#020202',
          position: 'relative',
          overflow: 'hidden',
        },
        children: [
          // Background gradient orb
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '-120px',
                right: '-80px',
                width: '600px',
                height: '600px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
              },
            },
          },
          // Second orb bottom-left
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '-200px',
                left: '-100px',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
              },
            },
          },
          // Grid overlay
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              },
            },
          },
          // Top border accent line
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '4px',
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
              },
            },
          },
          // Logo + brand row
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '40px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: `${accent}1a`,
                      border: `2px solid ${accent}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    children: {
                      type: 'img',
                      props: {
                        src: catDataUri,
                        width: 32,
                        height: 32,
                      },
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '22px',
                      fontWeight: 700,
                      color: '#ebebeb',
                      letterSpacing: '-0.02em',
                    },
                    children: 'Argon Chat',
                  },
                },
              ],
            },
          },
          // Title
          {
            type: 'div',
            props: {
              style: {
                fontSize: title.length > 30 ? '52px' : '64px',
                fontWeight: 700,
                color: '#ebebeb',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                maxWidth: '900px',
              },
              children: title,
            },
          },
          // Subtitle
          ...(subtitle
            ? [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: '24px',
                      color: '#9a9a9a',
                      marginTop: '20px',
                      lineHeight: 1.5,
                      maxWidth: '750px',
                    },
                    children: subtitle,
                  },
                },
              ]
            : []),
          // Bottom domain
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '60px',
                right: '80px',
                fontSize: '18px',
                color: '#555555',
                letterSpacing: '0.05em',
              },
              children: 'argon.gl',
            },
          },
        ],
      },
    },
    options,
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
  });

  return resvg.render().asPng();
}
